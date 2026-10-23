// Refreshes src/data/mfm/*.json from the BSData Munitorum Field Manual repo.
// Usage: npm run update-points
import { mkdir, writeFile } from "node:fs/promises";
import { parse } from "yaml";
import { MFM_SLUGS } from "../src/data/mfm/slugs.ts";

const REPO = "https://github.com/BSData/wh40k-11e-mfm";
const RAW = "https://raw.githubusercontent.com/BSData/wh40k-11e-mfm/main/data";
const SKIP = new Set(["titan-legions", "chaos-titan-legions"]);
const OUT = new URL("../src/data/mfm/", import.meta.url);

const known = new Set(Object.values(MFM_SLUGS).flat());

async function fetchYaml(name) {
  const res = await fetch(`${RAW}/${name}.yaml`);
  if (!res.ok) throw new Error(`Fetch failed for ${name}.yaml: HTTP ${res.status}`);
  return parse(await res.text());
}

const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const json = (v) => JSON.stringify(v, null, 2) + "\n";
// One unit per line, so a points change is a one-line diff.
const unitsJson = (units) => `{"units":[\n${units.map((u) => `  ${JSON.stringify(u)}`).join(",\n")}\n]}\n`;

const meta = await fetchYaml("meta");
if (!meta.version || !Array.isArray(meta.factions)) throw new Error("meta.yaml has no version or factions list");

const slugs = meta.factions.filter((s) => !SKIP.has(s));
const unmapped = slugs.filter((s) => !known.has(s));
if (unmapped.length) throw new Error(`Slugs in meta.yaml not mapped in MFM_SLUGS: ${unmapped.join(", ")}`);
const missing = [...known].filter((s) => !slugs.includes(s));
if (missing.length) throw new Error(`Slugs in MFM_SLUGS missing from meta.yaml: ${missing.join(", ")}`);

await mkdir(OUT, { recursive: true });
const docs = await Promise.all(slugs.map(fetchYaml));
for (const [i, slug] of slugs.entries()) {
  const doc = docs[i];
  const units = [];
  for (const u of doc.units ?? []) {
    const costs = u.pricing?.[0]?.costs ?? [];
    if (!u.name || !costs.length) continue;
    const p = costs.map((c) => [c.models, c.points]);
    if (!p.every(([m, pts]) => Number.isFinite(m) && m > 0 && Number.isFinite(pts) && pts >= 0)) {
      throw new Error(`${slug}: unexpected costs for ${u.name}: ${JSON.stringify(u.pricing[0])}`);
    }
    const unit = { n: String(u.name), p };
    if (u.legends) unit.l = 1;
    units.push(unit);
  }
  units.sort((a, b) => cmp(a.n, b.n));
  await writeFile(new URL(`${slug}.json`, OUT), unitsJson(units));
  console.log(`${slug}: ${units.length} units`);
}
await writeFile(new URL("meta.json", OUT), json({ version: String(meta.version), source: REPO, licence: "MIT" }));
console.log(`MFM version ${meta.version}`);
