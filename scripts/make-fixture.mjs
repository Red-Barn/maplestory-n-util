// Builds a trimmed, commit-safe test fixture from docs/samples (which is gitignored).
// Usage: node scripts/make-fixture.mjs <outName>   e.g. redbarn

import { readFile, writeFile } from "node:fs/promises";

const out = process.argv[2];
if (!out) throw new Error("Usage: node scripts/make-fixture.mjs <outName>");
const read = async (f) => JSON.parse(await readFile(`docs/samples/${f}.json`, "utf8"));

// Drop ownership / token identifiers; keep only what the stat engine reads.
const strip = (o) => {
  if (Array.isArray(o)) return o.map(strip);
  if (!o || typeof o !== "object") return o;
  const r = {};
  for (const [k, v] of Object.entries(o)) {
    if (["owner", "tokenInfo", "tokenId", "statusV2", "createdAt", "updatedAt", "hash", "mintingNo"].includes(k)) continue;
    r[k] = strip(v);
  }
  return r;
};

const character = (await read("character")).data.character;
const skills = [...(await read("character-skills")).data.skills, ...(await read("character-hyper-skill")).data.skills]
  .flatMap((t) => t.skills)
  .filter((s) => s.skillLevel > 0);
const bundle = {
  character: strip(character),
  items: strip(await read("item-details")),
  sets: Object.values(await read("item-sets")).filter(Boolean),
  skills,
};
await writeFile(`src/lib/stats/__tests__/fixtures/${out}.json`, JSON.stringify(bundle, null, 1));
console.log("wrote", out);
