// Captures real MSU API responses into docs/samples/ so types and the stat parser
// can be written against actual field names (the docs don't enumerate them).
//
// Usage: node --env-file=.env.local scripts/probe.mjs <walletAddress> [characterName]

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

const first = list?.data?.characters?.[0];
const assetKey = first?.assetKey ?? first?.asset_key ?? first?.tokenId;
if (!assetKey) {
  console.error("캐릭터를 찾지 못했습니다. account-characters.json을 확인하세요.");
  process.exit(1);
}

await save("character", await get(`/characters/${assetKey}`));
await save("character-items", await get(`/characters/${assetKey}/items`));
await save("character-skills", await get(`/characters/${assetKey}/skills`));
await save("character-hyper-skill", await get(`/characters/${assetKey}/hyper-skill`));
if (name) await save("search-characters", await get(`/search/characters?filter.name=${encodeURIComponent(name)}`));

console.log("done → docs/samples/");
