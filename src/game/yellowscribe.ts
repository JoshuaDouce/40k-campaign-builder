// Export to Tabletop Simulator via Yellowscribe (yellowscribe.link). Pure functions only: the army JSON that
// Yellowscribe hands back is typed loosely (unknown fields pass through untouched) and edited on a deep copy.
// Data model reference (Yellowscribe 10e/11e): units is { [uuid]: unit } with
//   unit.name, unit.keywords[], unit.abilities { [name]: { name, desc } }, unit.modelProfiles { [name]: { m,t,sv,w,ld,oc,insv } },
//   unit.weapons { [name]: { name, range ("Melee" or "24\""), bsws ("3+"), s, ... } },
//   unit.models.models { [id]: { name, abilities: string[] (names), weapons: [{ name, number }] } }.
import { RELICS, TRAINING } from "./data.ts";
import { ALL_HONOURS, ALL_SCARS, scarLabel, scarName, scarWeapon } from "./roster.ts";
import { foldDatasheet } from "./toggles.ts";
import type { EffectRow, StatChange, Unit } from "./types.ts";

/* ---------- Types ---------- */

interface YsUnit {
  name: string;
  [k: string]: unknown;
}
export interface YsFetched {
  edition: string;
  order: string[];
  units: Record<string, unknown>;
  modules: "MatchedPlay" | "MatchedPlay,Crusade";
  uiHeight: number;
  uiWidth: number;
  decorativeNames: boolean;
}

type Rec = Record<string, unknown>;
function isRec(v: unknown): v is Rec {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function isYsUnit(v: unknown): v is YsUnit {
  return isRec(v) && typeof v.name === "string";
}

/** Case, accents, spaces and punctuation folded away, for matching names. */
function fold(s: string): string {
  return foldDatasheet(s).replace(/[^\p{L}\p{N}]/gu, "");
}

/* ---------- Parsing the fetched army ---------- */

function intOr(v: unknown, def: number): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v.trim()) : NaN;
  return Number.isInteger(n) && n > 0 ? n : def;
}

/** Turns the yellowscribeArmy JSON ({edition,order,armyData,uiHeight,uiWidth,decorativeNames,crusade}) into YsFetched. */
export function parseFetched(raw: unknown): { ok: true; fetched: YsFetched } | { ok: false; error: string } {
  try {
    if (!isRec(raw)) return { ok: false, error: "That code did not return an army." };
    const edition = raw.edition;
    if (edition !== "10e" && edition !== "11e") {
      return { ok: false, error: "Only 10th and 11th edition armies can be exported." };
    }
    const units = raw.armyData;
    if (!isRec(units)) return { ok: false, error: "That army has no units." };
    const orderRaw = Array.isArray(raw.order) ? raw.order.filter((k): k is string => typeof k === "string") : [];
    // Keep only keys that exist, then add any unit missing from the order so nothing is silently dropped.
    const order = orderRaw.filter((k) => k in units);
    for (const k of Object.keys(units)) if (!order.includes(k)) order.push(k);
    if (order.length === 0) return { ok: false, error: "That army has no units." };
    const deco = raw.decorativeNames;
    return {
      ok: true,
      fetched: {
        edition,
        order,
        units,
        modules: raw.crusade === true ? "MatchedPlay,Crusade" : "MatchedPlay",
        uiHeight: intOr(raw.uiHeight, 700),
        uiWidth: intOr(raw.uiWidth, 1200),
        decorativeNames: deco === true || deco === "true",
      },
    };
  } catch {
    return { ok: false, error: "That code did not return an army." };
  }
}

/* ---------- Imported units and matching ---------- */

export interface ImportedUnit {
  key: string;
  name: string;
  isCharacter: boolean;
}

/** The army's units in order (units without a readable name are skipped). */
export function importedUnits(f: Pick<YsFetched, "order" | "units">): ImportedUnit[] {
  const out: ImportedUnit[] = [];
  for (const key of f.order) {
    const u = f.units[key];
    if (!isYsUnit(u)) continue;
    const kw = Array.isArray(u.keywords) ? u.keywords : [];
    out.push({ key, name: u.name, isCharacter: kw.some((k) => typeof k === "string" && k.trim().toLowerCase() === "character") });
  }
  return out;
}

/** Army key -> roster Unit.id, or null when nothing matched. */
export type UnitMatches = Record<string, string | null>;

/**
 * Match by the roster unit's datasheet, its real name, never the player's own name for it (case, spaces and punctuation
 * ignored). A unit with no datasheet is left for the player to match by hand. Duplicates are assigned in order; a
 * roster unit is never reused.
 */
export function matchUnits(imported: readonly ImportedUnit[], candidates: readonly Unit[]): UnitMatches {
  const used = new Set<string>();
  const matches: UnitMatches = {};
  for (const imp of imported) {
    const n = fold(imp.name);
    const hit = n ? candidates.find((c) => !used.has(c.id) && fold(c.datasheet) === n) : undefined;
    matches[imp.key] = hit ? hit.id : null;
    if (hit) used.add(hit.id);
  }
  return matches;
}

/** Matches `key` to `rosterId` (null for no match). A roster unit is never used twice: taking it from another card clears that card. */
export function reassign(matches: Readonly<UnitMatches>, key: string, rosterId: string | null): UnitMatches {
  const next: UnitMatches = {};
  for (const [k, v] of Object.entries(matches)) next[k] = rosterId !== null && v === rosterId ? null : v;
  next[key] = rosterId;
  return next;
}

/* ---------- Campaign effects ---------- */

export type EffectKind = "honour" | "scar" | "relic" | "training" | "enhancement" | "warlord" | "title";

/** Display label per kind; also the prefix of the ability name in the exported army. */
export const EFFECT_LABEL: Record<EffectKind, string> = {
  honour: "Battle Honour",
  scar: "Battle Scar",
  relic: "Relic",
  training: "Training",
  enhancement: "Enhancement",
  warlord: "Warlord trait",
  title: "Title",
};

export interface CampaignEffect {
  id: string;
  kind: EffectKind;
  name: string;
  rule: string;
  /** False for the warlord trait and enhancement: always applied, never unticked. */
  optional: boolean;
  stat?: StatChange;
  temporary?: boolean;
}

/** "Name, the Title" when the unit has a title, otherwise its name. */
export function titledName(unit: Pick<Unit, "name" | "title">): string {
  const title = unit.title?.trim();
  return title ? `${unit.name}, the ${title}` : unit.name;
}

/** Short chip text for a stat change, e.g. +1" M or -1 BS ranged. */
export function statChip(s: StatChange): string {
  const signed = (n: number) => `${n > 0 ? "+" : "-"}${Math.abs(n)}`;
  switch (s.stat) {
    case "M":
      return `${signed(s.delta)}" M`;
    case "OC":
    case "W":
      return `${signed(s.delta)} ${s.stat}`;
    case "BS":
    case "S":
      return `${signed(s.delta)} ${s.stat} ${s.scope}`;
    case "InSv":
      return "5+ invuln";
    case "WeaponSkill":
      return `BS/WS worse: ${s.weapon ?? "one weapon"}`;
  }
}

const rowsByName = (t: readonly EffectRow[]): Map<string, EffectRow> => new Map(t.map((r) => [r.n, r]));
const HONOUR_ROWS = rowsByName(ALL_HONOURS);
const SCAR_ROWS = rowsByName(ALL_SCARS);
const RELIC_ROWS = rowsByName(RELICS);
const TRAINING_ROWS = rowsByName(TRAINING);

/** An optional effect from a table row. A weapon stat change (Worn Gear) only applies when the scar names the weapon. */
function rowEffect(id: string, kind: EffectKind, name: string, row: EffectRow, weapon?: string): CampaignEffect {
  const stat: StatChange | undefined = row.fx?.stat === "WeaponSkill" ? (weapon ? { stat: "WeaponSkill", weapon } : undefined) : row.fx;
  return { id, kind, name, rule: row.e, optional: true, ...(stat ? { stat } : {}), ...(row.temporary ? { temporary: true } : {}) };
}

/** Everything the roster unit carries that can go onto its Tabletop Simulator datasheet, in display order. */
export function campaignEffects(unit: Unit): CampaignEffect[] {
  const out: CampaignEffect[] = [];
  for (const h of unit.honours) {
    const row = HONOUR_ROWS.get(h);
    if (row) out.push(rowEffect(`honour:${h}`, "honour", h, row));
  }
  for (const s of unit.scars) {
    const row = SCAR_ROWS.get(scarName(s));
    if (row) out.push(rowEffect(`scar:${s}`, "scar", scarLabel(s), row, scarWeapon(s)));
  }
  for (const r of unit.relics ?? []) {
    const row = RELIC_ROWS.get(r);
    if (row) out.push(rowEffect(`relic:${r}`, "relic", r, row));
  }
  for (const t of unit.training ?? []) {
    const row = TRAINING_ROWS.get(t);
    if (row) out.push(rowEffect(`training:${t}`, "training", t, row));
  }
  const enh = unit.enhancement?.trim();
  if (enh) out.push({ id: "enhancement", kind: "enhancement", name: enh, rule: enh, optional: false });
  const trait = unit.warlordTrait?.trim();
  if (unit.isWarlord && trait) out.push({ id: "warlord", kind: "warlord", name: EFFECT_LABEL.warlord, rule: trait, optional: false });
  if (unit.isCharacter && unit.title?.trim()) {
    out.push({ id: "title", kind: "title", name: EFFECT_LABEL.title, rule: `Renamed to "${titledName(unit)}"`, optional: true });
  }
  return out;
}

/* ---------- Applying effects ---------- */

export type EffectChoices = Record<string, { unit: Unit; effectIds: string[] } | null>;

function abilityName(e: CampaignEffect): string {
  if (e.kind === "warlord") return EFFECT_LABEL.warlord;
  if (e.kind === "enhancement" && e.name.length > 50) return EFFECT_LABEL.enhancement;
  return `${EFFECT_LABEL[e.kind]}: ${e.name}`;
}

/**
 * Yellowscribe pastes ability text into the TTS Lua script inside [[...]] and [=[...]=] strings, and the unit name
 * inside "...", so square brackets, double quotes and backslashes in campaign text would break the army.
 */
const luaSafe = (s: string): string => s.replace(/\[/g, "(").replace(/\]/g, ")").replace(/["\\]/g, "'");

function records(v: unknown): Rec[] {
  return isRec(v) ? Object.values(v).filter(isRec) : [];
}

/** Adds the ability to the unit and to every model (models list ability names). Existing names are left alone. */
function addAbility(u: YsUnit, rawName: string, rawDesc: string): void {
  const name = luaSafe(rawName);
  const desc = luaSafe(rawDesc);
  const abilities = u.abilities;
  if (Array.isArray(abilities)) {
    if (!abilities.some((a) => isRec(a) && a.name === name)) abilities.push({ name, desc, keywords: [] });
  } else {
    const rec: Rec = isRec(abilities) ? abilities : {};
    if (!(name in rec)) rec[name] = { name, desc, keywords: [] };
    u.abilities = rec;
  }
  const models = isRec(u.models) ? u.models.models : undefined;
  for (const m of records(models)) {
    if (Array.isArray(m.abilities)) {
      if (!m.abilities.includes(name)) m.abilities.push(name);
    } else if (m.abilities === undefined) {
      m.abilities = [name];
    }
  }
}

/** Shifts a plain number such as 6" or 5, keeping the inch mark. Returns undefined when the text is not a plain number. */
function shiftNumber(v: unknown, delta: number, min: number): string | number | undefined {
  if (typeof v === "number") return Math.max(min, v + delta);
  if (typeof v !== "string") return undefined;
  const m = /^\s*(\d+(?:\.\d+)?)\s*(["”″])?\s*$/.exec(v);
  if (!m) return undefined;
  return `${Math.max(min, Number(m[1]) + delta)}${m[2] ?? ""}`;
}

/** "3+" -> "4+" (worse by one, capped at 6+). Anything else is left alone. */
function worsenSkill(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const m = /^\s*(\d)\+\s*$/.exec(v);
  if (!m) return undefined;
  return `${Math.min(6, Number(m[1]) + 1)}+`;
}

function isMelee(w: Rec): boolean {
  return typeof w.range === "string" && w.range.trim().toLowerCase() === "melee";
}

/**
 * Stat changes go on every model profile of the unit: Tabletop Simulator shows one stat line per profile and the
 * campaign tracks one set of honours per unit, not per model, so the whole unit carries the change. Anything that
 * cannot be read as a plain number is skipped (the text ability is still added).
 */
function applyStat(u: YsUnit, s: StatChange): void {
  if (s.stat === "M" || s.stat === "OC" || s.stat === "W") {
    const key = s.stat === "M" ? "m" : s.stat === "OC" ? "oc" : "w";
    const min = s.stat === "W" ? 1 : 0;
    for (const p of records(u.modelProfiles)) {
      const v = shiftNumber(p[key], s.delta, min);
      if (v !== undefined) p[key] = v;
    }
    return;
  }
  if (s.stat === "InSv") {
    for (const p of records(u.modelProfiles)) {
      const cur = typeof p.insv === "string" ? p.insv.trim() : "";
      const m = /^(\d)\+{1,2}$/.exec(cur);
      // Improve by one, but never past `best`, and never make a save that is already better than `best` worse.
      if (m) p.insv = `${Math.min(Number(m[1]), Math.max(s.best, Number(m[1]) - 1))}+`;
      else if (cur === "" || cur === "-" || cur === "–" || cur.toLowerCase() === "n/a") p.insv = "5+";
    }
    return;
  }
  for (const w of records(u.weapons)) {
    if (s.stat === "BS") {
      if (isMelee(w)) continue;
      const v = worsenSkill(w.bsws);
      if (v !== undefined) w.bsws = v;
    } else if (s.stat === "S") {
      if (!isMelee(w)) continue;
      const cur = typeof w.s === "string" ? w.s.trim() : "";
      if (/^\d+$/.test(cur)) w.s = String(Math.max(1, Number(cur) - 1));
    } else if (s.stat === "WeaponSkill" && s.weapon && typeof w.name === "string" && fold(w.name) === fold(s.weapon)) {
      const v = worsenSkill(w.bsws);
      if (v !== undefined) w.bsws = v;
    }
  }
}

/**
 * Returns a NEW units object (deep copy; the input is untouched) with the ticked effects (and every non-optional one)
 * added to the matched units.
 * Each effect adds one ability; stat effects also adjust the profiles/weapons. A ticked title renames the unit to
 * "Name, the Title" (the unit's `name` field only: model and profile names are what Tabletop Simulator looks up, so they stay).
 */
export function applyEffects(f: Pick<YsFetched, "order" | "units">, choices: EffectChoices): Record<string, unknown> {
  const units: Record<string, unknown> = structuredClone(f.units);
  for (const key of f.order) {
    const choice = choices[key];
    const u = units[key];
    if (!choice || !isYsUnit(u)) continue;
    const ticked = new Set(choice.effectIds);
    for (const e of campaignEffects(choice.unit)) {
      if (e.optional && !ticked.has(e.id)) continue;
      if (e.kind === "title") {
        u.name = luaSafe(titledName(choice.unit));
        continue;
      }
      addAbility(u, abilityName(e), e.rule);
      if (e.stat) applyStat(u, e.stat);
    }
  }
  return units;
}
