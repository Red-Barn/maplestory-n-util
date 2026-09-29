// Captures real MSU API responses into docs/samples/ so types and the stat parser
// can be written against actual field names (the docs don't enumerate them).
//
// Usage: node --env-file=.env.local scripts/probe.mjs <walletAddress> [characterName]
// Without a name the first character in the wallet is used.

import { mkdir, writeFile } from "node:fs/promises";

const BASE = "https://openapi.msu.io/v1rc1";
const key = process.env.MSU_API_KEY;
const [wallet, name] = process.argv.slice(2);
if (!key || !wallet) {
  console.error("Usage: node --env-file=.env.local scripts/probe.mjs <walletAddress> [characterName]");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(path) {
  await sleep(600); // default tier is 2 RPS
  const res = await fetch(BASE + path, { headers: { "x-nxopen-api-key": key } });
  const json = await res.json().catch(() => null);
  console.log(res.status, path);
  return json;
}

// Replace the wallet address anywhere in the output so samples can be committed.
const scrub = (obj) => JSON.parse(JSON.stringify(obj).replaceAll(new RegExp(wallet, "gi"), "0xWALLET"));

async function save(file, obj) {
  await writeFile(`docs/samples/${file}.json`, JSON.stringify(scrub(obj), null, 2));
}

await mkdir("docs/samples", { recursive: true });

const list = await get(`/accounts/${wallet}/characters?size=10`);
await save("account-characters", list);

let target = list?.data?.characters?.[0];
if (name) {
  const byName = await get(`/accounts/${wallet}/characters?name=${encodeURIComponent(name)}`);
  target = byName?.data?.characters?.find((c) => c.name === name) ?? target;
}
const assetKey = target?.assetKey;
if (!assetKey) {
  console.error("캐릭터를 찾지 못했습니다. account-characters.json을 확인하세요.");
  process.exit(1);
}
console.log("target:", target.name, assetKey);

const detail = await get(`/characters/${assetKey}`);
await save("character", detail);
await save("character-items", await get(`/characters/${assetKey}/items`));
await save("character-skills", await get(`/characters/${assetKey}/skills`));
await save("character-hyper-skill", await get(`/characters/${assetKey}/hyper-skill`));

// Item list has no option values; /items/{assetKey} does.
const equip = detail?.data?.character?.wearing?.equip ?? {};
const itemDetails = {};
for (const [slot, it] of Object.entries(equip)) {
  if (it?.assetKey) itemDetails[slot] = (await get(`/items/${it.assetKey}`))?.data?.item ?? null;
}
await save("item-details", itemDetails);

// Non-mintable items (medals, event rings) have no detail, only game metadata.
const itemMetadata = {};
for (const [slot, it] of Object.entries(equip)) {
  if (it?.itemId && !it.assetKey) itemMetadata[slot] = (await get(`/gamemeta/items/${it.itemId}`))?.data?.item ?? null;
}
await save("item-metadata", itemMetadata);

// Set effects, one lookup per set via any equipped piece.
const setPieces = new Map();
for (const it of [...Object.values(itemDetails), ...Object.values(itemMetadata)]) {
  if (it?.common?.setItemId) setPieces.set(it.common.setItemId, it.common.itemId);
}
const itemSets = {};
for (const [setId, itemId] of setPieces) itemSets[setId] = (await get(`/gamemeta/items/${itemId}/set`))?.data?.itemSet ?? null;
await save("item-sets", itemSets);

// Market search ignores the name filter in practice; keep a small sample only.
const search = await get(`/search/characters?filter.name=${encodeURIComponent(name ?? target.name)}`);
if (search?.data?.characters) search.data.characters = search.data.characters.slice(0, 2);
await save("search-characters", search);

console.log("done → docs/samples/");
