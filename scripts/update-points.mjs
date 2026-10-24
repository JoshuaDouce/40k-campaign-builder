// Refreshes src/data/mfm/*.json from the BSData Munitorum Field Manual repo (points) and the BSData
// wh40k-11e datasheet catalogues (Toughness, written as "t": the highest T among a unit's models).
// Usage: npm run update-points
import { mkdir, writeFile } from "node:fs/promises";
import { parse } from "yaml";
import { MFM_SLUGS } from "../src/data/mfm/slugs.ts";

const REPO = "https://github.com/BSData/wh40k-11e-mfm";
const RAW = "https://raw.githubusercontent.com/BSData/wh40k-11e-mfm/main/data";
const T_REPO = "https://github.com/BSData/wh40k-11e";
const T_API = "https://api.github.com/repos/BSData/wh40k-11e/contents";
const T_RAW = "https://raw.githubusercontent.com/BSData/wh40k-11e/main";
const SKIP = new Set(["titan-legions", "chaos-titan-legions"]);
const OUT = new URL("../src/data/mfm/", import.meta.url);

const MFM_SLUGS_CHAPTER = new Set(["black-templars", "blood-angels", "dark-angels", "deathwatch", "space-wolves"]);
let matched = 0;
let total = 0;
const known = new Set(Object.values(MFM_SLUGS).flat());

async function fetchYaml(name) {
  const res = await fetch(`${RAW}/${name}.yaml`);
  if (!res.ok) throw new Error(`Fetch failed for ${name}.yaml: HTTP ${res.status}`);
  return parse(await res.text());
}

/* ---------- Toughness from the BSData 11e catalogues ---------- */

async function fetchText(url) {
  const res = await fetch(url, { headers: { "User-Agent": "update-points" } });
  if (!res.ok) throw new Error(`Fetch failed for ${url}: HTTP ${res.status}`);
  return res.text();
}

/** Lower case, curly quotes to ', non-breaking and other dashes to -, trimmed. */
const norm = (n) =>
  String(n)
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[‐-―−]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
/** Loose faction key: drop the "Imperium - " style prefix, then keep letters and digits only. */
const factionKey = (s) => norm(s).replace(/^[^-]*-\s+/, "").replace(/\.json$/, "").replace(/library/g, "").replace(/[^a-z0-9]/g, "");

async function loadToughness() {
  const listing = JSON.parse(await fetchText(T_API));
  const names = listing.filter((f) => f.type === "file" && f.name.endsWith(".json")).map((f) => f.name).sort();
  if (!names.length) throw new Error("No JSON catalogues found in BSData/wh40k-11e");
  const cats = await Promise.all(
    names.map(async (name) => {
      const doc = JSON.parse(await fetchText(`${T_RAW}/${encodeURIComponent(name)}`));
      return [name, doc.catalogue ?? doc.gameSystem ?? {}];
    }),
  );
  const shared = new Map();
  for (const [, c] of cats) for (const p of c.sharedProfiles ?? []) shared.set(p.id, p);
  const tOf = (p) => {
    if (p.typeName !== "Unit") return null;
    const n = parseInt((p.characteristics ?? []).find((x) => x.name === "T")?.$text, 10);
    return Number.isFinite(n) ? n : null;
  };
  const maxT = (e) => {
    let m = null;
    const bump = (v) => {
      if (v != null && (m == null || v > m)) m = v;
    };
    for (const p of e.profiles ?? []) bump(tOf(p));
    for (const l of e.infoLinks ?? []) if (l.type === "profile" && shared.has(l.targetId)) bump(tOf(shared.get(l.targetId)));
    for (const k of ["selectionEntries", "selectionEntryGroups"]) for (const c of e[k] ?? []) bump(maxT(c));
    return m;
  };
  const hasEpic = (e) =>
    (e.categoryLinks ?? []).some((l) => l.name === "Epic Hero") ||
    ["selectionEntries", "selectionEntryGroups"].some((k) => (e[k] ?? []).some(hasEpic));
  // normalised unit name -> catalogue factionKey -> max T
  const byName = new Map();
  // normalised unit name -> catalogue factionKey -> is an Epic Hero
  const epicByName = new Map();
  for (const [file, c] of cats) {
    const fk = factionKey(file);
    for (const e of c.sharedSelectionEntries ?? []) {
      if (e.type !== "unit" && e.type !== "model") continue;
      const n = norm(e.name);
      const epic = hasEpic(e);
      if (!epicByName.has(n)) epicByName.set(n, new Map());
      const em = epicByName.get(n);
      em.set(fk, (em.get(fk) ?? false) || epic);
      const t = maxT(e);
      if (t == null) continue;
      if (!byName.has(n)) byName.set(n, new Map());
      const m = byName.get(n);
      m.set(fk, Math.max(m.get(fk) ?? 0, t));
    }
  }
  return { byName, epicByName };
}

/** T for a unit name in a faction's list, or undefined if unknown or conflicting. */
function toughnessFor(byName, name, ownKeys) {
  const m = byName.get(norm(name));
  if (!m) return undefined;
  const all = new Set(m.values());
  if (all.size === 1) return [...all][0];
  const own = new Set([...m].filter(([k]) => ownKeys.includes(k)).map(([, t]) => t));
  return own.size === 1 ? [...own][0] : undefined;
}

/** True if the unit is an Epic Hero in its faction's list; on a conflict between catalogues, only its own count. */
function epicFor(epicByName, name, ownKeys) {
  const m = epicByName.get(norm(name));
  if (!m) return false;
  const all = new Set(m.values());
  if (all.size === 1) return [...all][0];
  const own = new Set([...m].filter(([k]) => ownKeys.includes(k)).map(([, v]) => v));
  return own.size === 1 ? [...own][0] : false;
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

const { byName: toughness, epicByName } = await loadToughness();
let epicTotal = 0;
await mkdir(OUT, { recursive: true });
const docs = await Promise.all(slugs.map(fetchYaml));
for (const [i, slug] of slugs.entries()) {
  const doc = docs[i];
  const units = [];
  // Catalogues counted as "the same faction": the slug's own, plus Space Marines for the chapters.
  const ownKeys = [factionKey(slug), ...(MFM_SLUGS_CHAPTER.has(slug) ? ["spacemarines"] : [])];
  const noT = [];
  for (const u of doc.units ?? []) {
    const costs = u.pricing?.[0]?.costs ?? [];
    if (!u.name || !costs.length) continue;
    const p = costs.map((c) => [c.models, c.points]);
    if (!p.every(([m, pts]) => Number.isFinite(m) && m > 0 && Number.isFinite(pts) && pts >= 0)) {
      throw new Error(`${slug}: unexpected costs for ${u.name}: ${JSON.stringify(u.pricing[0])}`);
    }
    const unit = { n: String(u.name), p };
    const t = toughnessFor(toughness, u.name, ownKeys);
    if (t !== undefined) unit.t = t;
    else if (!u.legends) noT.push(unit.n);
    if (u.legends) unit.l = 1;
    if (epicFor(epicByName, u.name, ownKeys)) unit.e = 1;
    units.push(unit);
  }
  units.sort((a, b) => cmp(a.n, b.n));
  await writeFile(new URL(`${slug}.json`, OUT), unitsJson(units));
  const noTAll = units.filter((x) => x.t === undefined).length;
  matched += units.length - noTAll;
  total += units.length;
  const epics = units.filter((x) => x.e === 1).length;
  epicTotal += epics;
  console.log(`${slug}: ${units.length} units, ${noTAll} without T (${noT.length} non-Legends), ${epics} Epic Heroes`);
  if (noT.length) console.log(`  non-Legends without T: ${noT.join("; ")}`);
}
await writeFile(new URL("meta.json", OUT), json({ version: String(meta.version), source: REPO, licence: "MIT", toughnessSource: T_REPO }));
console.log(`MFM version ${meta.version}; Toughness matched for ${matched} of ${total} units (source ${T_REPO}); ${epicTotal} Epic Heroes flagged`);
