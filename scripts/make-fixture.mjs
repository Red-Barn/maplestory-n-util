// Builds a trimmed, commit-safe test fixture from docs/samples (which is gitignored).
// Usage: node scripts/make-fixture.mjs <outName> [sampleDir]   e.g. redbarn, or brownbarn brownbarn
// sampleDir is the folder under docs/samples that probe.mjs wrote to in asset key mode.

import { readFile, writeFile } from "node:fs/promises";

const [out, sampleDir] = process.argv.slice(2);
if (!out) throw new Error("Usage: node scripts/make-fixture.mjs <outName> [sampleDir]");
const dir = sampleDir ? `docs/samples/${sampleDir}` : "docs/samples";
const read = async (f) => JSON.parse(await readFile(`${dir}/${f}.json`, "utf8"));

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
  // raw game metadata of non-mintable items; tests convert it with itemFromMetadata
  metadata: await read("item-metadata").catch(() => ({})),
};
await writeFile(`src/lib/stats/__tests__/fixtures/${out}.json`, JSON.stringify(bundle, null, 1));
console.log("wrote", out);
