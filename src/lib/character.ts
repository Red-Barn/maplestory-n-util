import "server-only";

import { itemFromMetadata, type ItemMetadata } from "@/lib/itemMeta";
import { withManualItems } from "@/lib/manualItems";
import { MsuApiError, msuFetch } from "@/lib/msu";
import type {
  AccountCharactersResponse,
  CharacterBundle,
  CharacterDetail,
  EquipSlotRef,
  ItemDetail,
  ItemSet,
  SkillsResponse,
} from "@/types/msu";

export const WALLET_RE = /^0x[0-9a-fA-F]{40}$/;
export const ASSET_KEY_RE = /^CHAR[0-9a-z]{20}$/;

export function assertWallet(wallet: string) {
  if (!WALLET_RE.test(wallet)) throw new MsuApiError("지갑 주소 형식이 올바르지 않습니다 (0x + 40자리 16진수).", 400);
}

export function assertAssetKey(assetKey: string) {
  if (!ASSET_KEY_RE.test(assetKey)) throw new MsuApiError("캐릭터 키 형식이 올바르지 않습니다.", 400);
}

/** All characters in a wallet (follows cursor pages). `name` is an exact-match filter applied by MSU. */
export async function getAccountCharacters(wallet: string, name?: string) {
  assertWallet(wallet);
  const out: AccountCharactersResponse["characters"] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 10; page++) {
    const res = await msuFetch<AccountCharactersResponse>(`/accounts/${wallet}/characters`, {
      size: 50,
      name,
      cursor,
    });
    out.push(...res.characters);
    if (!res.hasMore || !res.nextCursor) break;
    cursor = res.nextCursor;
  }
  return out;
}

// Item options change rarely compared with how many calls a page view costs (1 per slot).
const ITEM_REVALIDATE = 600;
const META_REVALIDATE = 86400; // static game metadata

/** Minted items have a full detail; non-mintable ones (medals, event rings) only game metadata. */
function getEquippedItem(ref: EquipSlotRef): Promise<ItemDetail | null> {
  if (!ref) return Promise.resolve(null);
  const req = ref.assetKey
    ? msuFetch<{ item: ItemDetail }>(`/items/${ref.assetKey}`, {}, ITEM_REVALIDATE).then((r) => r.item)
    : msuFetch<{ item: ItemMetadata }>(`/gamemeta/items/${ref.itemId}`, {}, META_REVALIDATE).then((r) =>
        itemFromMetadata(r.item),
      );
  return req.catch(() => null);
}

export async function getCharacterBundle(assetKey: string): Promise<CharacterBundle> {
  assertAssetKey(assetKey);
  const { character } = await msuFetch<{ character: CharacterDetail }>(`/characters/${assetKey}`);

  const slots = Object.entries(character.wearing.equip).filter(([, ref]) => ref?.itemId);
  const [itemResults, skills, hyper] = await Promise.all([
    Promise.all(slots.map(([, ref]) => getEquippedItem(ref))),
    msuFetch<SkillsResponse>(`/characters/${assetKey}/skills`, {}, ITEM_REVALIDATE),
    msuFetch<SkillsResponse>(`/characters/${assetKey}/hyper-skill`, {}, ITEM_REVALIDATE).catch(() => ({ skills: [] })),
  ]);

  const items: CharacterBundle["items"] = {};
  slots.forEach(([slot], i) => (items[slot] = itemResults[i]));

  // One lookup per set, using any equipped piece of it.
  const setPieces = new Map<number, number>();
  for (const item of itemResults) if (item?.common.setItemId) setPieces.set(item.common.setItemId, item.common.itemId);
  const sets = (
    await Promise.all(
      [...setPieces.values()].map((itemId) =>
        msuFetch<{ itemSet: ItemSet }>(`/gamemeta/items/${itemId}/set`, {}, META_REVALIDATE)
          .then((r) => r.itemSet)
          .catch(() => null),
      ),
    )
  ).filter((s): s is ItemSet => s != null);

  const learned = [...skills.skills, ...hyper.skills].flatMap((t) => t.skills).filter((s) => s.skillLevel > 0);
  return { character, items: withManualItems(items), sets, skills: learned };
}
