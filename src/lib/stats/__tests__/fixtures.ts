import { itemFromMetadata, type ItemMetadata } from "@/lib/itemMeta";
import { withManualItems } from "@/lib/manualItems";
import type { CharacterBundle } from "@/types/msu";
import brownBarnJson from "./fixtures/brownbarn.json";
import orangeBarnJson from "./fixtures/orangebarn.json";
import redBarnJson from "./fixtures/redbarn.json";

type Fixture = CharacterBundle & { metadata: Record<string, ItemMetadata> };

function load(json: unknown): CharacterBundle {
  const { metadata, ...bundle } = json as Fixture;
  const fromMeta = Object.fromEntries(Object.entries(metadata ?? {}).map(([slot, m]) => [slot, itemFromMetadata(m)]));
  // same as getCharacterBundle: metadata items + manual items
  return { ...bundle, items: withManualItems({ ...bundle.items, ...fromMeta }) };
}

/** RedBarn (Bowmaster Lv.244) — built by scripts/make-fixture.mjs from scripts/probe.mjs output */
export const redBarn = load(redBarnJson);
/** BrownBarn (Aran Lv.225) */
export const brownBarn = load(brownBarnJson);
/** OrangeBarn (Shade Lv.225) */
export const orangeBarn = load(orangeBarnJson);
