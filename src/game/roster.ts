// Unit rosters: ranks, honours, scars and the post-battle / Requisition rules. Pure; dice come from the UI
// (through an injected Rng) and arrive here already resolved.
import { CHAR_HONOURS, CHAR_SCARS, HONOURS, RANKS, RELICS, SCARS } from "./data.ts";
import { B, log } from "./log.ts";
import { isRole } from "./forceOrg.ts";
import { rollInt } from "./rng.ts";
import type { Rng } from "./rng.ts";
import { getPlayer } from "./selectors.ts";
import type { CampaignState, FallenCharacter, PostBattleResult, Unit } from "./types.ts";

/** XP at which a unit becomes a Legend of the Reach. */
export const LEGEND_XP = 25;
/** A unit that would reach this many scars is removed from the roster. */
export const SCARS_TO_REMOVE = 3;
export const SURGEON_COST = 1;
export const PROMOTION_COST = 1;
export const RECRUITS_COST = 2;
export const RECRUITS_XP = 3;
/** Minimum XP (Veteran) for a non-Character to be promoted to Character. */
export const PROMOTION_MIN_XP = 8;
/** Relics a Character can hold, and the points each adds (flat, after honours). */
export const MAX_RELICS = 3;
export const RELIC_PTS = 10;
export const BACKSTORY_MAX = 280;
export const TITLE_MAX = 60;
export const TRAIT_MAX = 200;
export const CAUSE_MAX = 80;
export const DEFAULT_CAUSE = "Retired from the roster";
export const THIRD_SCAR_CAUSE = "Third Battle Scar";
/** The only temporary scar: it heals after the next battle the unit fights. */
export const GRIEVOUS_WOUND = "Grievous Wound";

/* ---------- Dice ---------- */

/** Roll a die with `n` faces: an integer in [1, n]. */
export function rollDie(rng: Rng, n: number): number {
  return rollInt(rng, n) + 1;
}

/* ---------- Ranks and points ---------- */

/** Index into `RANKS` for an XP total. */
export function rankIndex(xp: number): number {
  return RANKS.reduce((acc, r, i) => (xp >= r.xp ? i : acc), 0);
}
export function rankOf(xp: number): string {
  return RANKS[rankIndex(xp)].n;
}
/** Battle Honour slots earned at this XP. */
export function honourSlots(xp: number): number {
  return RANKS[rankIndex(xp)].slots;
}
/** XP still needed for the next rank, or null at max rank. */
export function xpToNext(xp: number): number | null {
  const next = RANKS[rankIndex(xp) + 1];
  return next ? next.xp - xp : null;
}
/** Honours the unit is owed at `newXp` that it does not yet hold. Over-slot units owe 0. */
export function honoursOwed(unit: Pick<Unit, "honours">, newXp: number): number {
  return Math.max(0, honourSlots(newXp) - unit.honours.length);
}
/** Base points plus 10% per honour, rounded to the nearest 5 (no relics). */
export function honourPoints(unit: Pick<Unit, "points" | "honours">): number {
  return Math.round((unit.points * (1 + 0.1 * unit.honours.length)) / 5) * 5;
}
/** Honour-adjusted points (rounded to 5) plus 10 per relic. */
export function effectivePoints(unit: Pick<Unit, "points" | "honours" | "relics">): number {
  return honourPoints(unit) + RELIC_PTS * (unit.relics?.length ?? 0);
}
export function totalEffective(units: readonly Unit[]): number {
  return units.reduce((a, u) => a + effectivePoints(u), 0);
}
/** +1 if it fought and survived, +1 per kill (counted if it fought or is Marked for Glory), +2 for Glory. */
export function computeXpGain(fought: boolean, destroyed: boolean, kills: number, glory: boolean): number {
  return (fought && !destroyed ? 1 : 0) + (fought || glory ? Math.max(0, kills) : 0) + (glory ? 2 : 0);
}

/* ---------- Scars ---------- */

export const WORN_GEAR = "Worn Gear";

/** Stored scar string: the name, or "Worn Gear (weapon)" when a weapon is given. */
export function makeScar(name: string, weapon?: string): string {
  const w = weapon?.trim();
  return name === WORN_GEAR && w ? `${name} (${w})` : name;
}
/** Display label for a stored scar: "Worn Gear: bolters", or just the name. */
export function scarLabel(scar: string): string {
  const w = scarWeapon(scar);
  return w ? `${scarName(scar)}: ${w}` : scarName(scar);
}
export function scarName(scar: string): string {
  const i = scar.indexOf(" (");
  return i === -1 ? scar : scar.slice(0, i);
}
export function scarWeapon(scar: string): string | undefined {
  const i = scar.indexOf(" (");
  return i === -1 || !scar.endsWith(")") ? undefined : scar.slice(i + 2, -1);
}
/** Highest D6 total that leaves a destroyed unit scarred (Characters 2, others 1). */
export function fallenThreshold(unit: Pick<Unit, "isCharacter">): number {
  return unit.isCharacter ? 2 : 1;
}
/** Bonus to the fallen roll: +1 if the unit holds Hard to Kill. Pass the unit as it was BEFORE the battle. */
export function fallenModifier(unit: Pick<Unit, "honours">): number {
  return unit.honours.includes("Hard to Kill") ? 1 : 0;
}
/** True if a fallen D6 (before the modifier) leaves the unit scarred. */
export function isScarred(unit: Pick<Unit, "isCharacter" | "honours">, d6: number): boolean {
  return d6 + fallenModifier(unit) <= fallenThreshold(unit);
}

/* ---------- Character tables ---------- */

/** The table a unit rolls honours on: Character table for Characters, generic otherwise. */
export function honourTableFor(unit: Pick<Unit, "isCharacter">): readonly { n: string; e: string }[] {
  return unit.isCharacter ? CHAR_HONOURS : HONOURS;
}
/** The table a unit rolls scars on: Character table for Characters, generic otherwise. */
export function scarTableFor(unit: Pick<Unit, "isCharacter">): readonly { n: string; e: string }[] {
  return unit.isCharacter ? CHAR_SCARS : SCARS;
}
/** Every honour / scar, Character table first. */
export const ALL_HONOURS: readonly { n: string; e: string }[] = [...CHAR_HONOURS, ...HONOURS];
export const ALL_SCARS: readonly { n: string; e: string }[] = [...CHAR_SCARS, ...SCARS];
/** Honours / scars a unit may hold: Characters may hold both tables (legacy generic ones stay valid); others generic only. */
export function allowedHonours(unit: Pick<Unit, "isCharacter">): readonly { n: string; e: string }[] {
  return unit.isCharacter ? ALL_HONOURS : HONOURS;
}
export function allowedScars(unit: Pick<Unit, "isCharacter">): readonly { n: string; e: string }[] {
  return unit.isCharacter ? ALL_SCARS : SCARS;
}

const effects = (t: readonly { n: string; e: string }[]): Map<string, string> => new Map(t.map((x) => [x.n, x.e]));
const HONOUR_FX = effects(ALL_HONOURS);
const SCAR_FX = effects(ALL_SCARS);
const RELIC_FX = effects(RELICS);
/** Effect text for an honour name from either table (undefined if unknown). */
export function honourEffect(name: string): string | undefined {
  return HONOUR_FX.get(name);
}
/** Effect text for a stored scar (name or "Worn Gear (weapon)") from either table (undefined if unknown). */
export function scarEffect(scar: string): string | undefined {
  return SCAR_FX.get(scarName(scar));
}
export function relicEffect(name: string): string | undefined {
  return RELIC_FX.get(name);
}
/** True if the unit will lose Grievous Wound after a battle it fights (it must hold it BEFORE the battle). */
export function healsGrievous(unit: Pick<Unit, "scars">): boolean {
  return unit.scars.some((s) => scarName(s) === GRIEVOUS_WOUND);
}
/** The unit's scars after Grievous Wound has healed (what a scar gained this battle is added to). */
export function scarsAfterHeal(unit: Pick<Unit, "scars">): string[] {
  return unit.scars.filter((s) => scarName(s) !== GRIEVOUS_WOUND);
}
/**
 * What one new scar does to a unit destroyed in a battle it fought (pass the unit as it was BEFORE the battle).
 * `kept`: scars it joins (Grievous Wound healed). `gone`: it removes the unit (never the Warlord).
 * `replaces`: the oldest scar a Warlord at three scars loses.
 */
export function scarOutcome(unit: Pick<Unit, "scars" | "isWarlord">): { kept: string[]; gone: boolean; replaces?: string } {
  const kept = scarsAfterHeal(unit);
  if (unit.isWarlord) return { kept, gone: false, replaces: kept.length >= SCARS_TO_REMOVE ? kept[0] : undefined };
  return { kept, gone: kept.length + 1 >= SCARS_TO_REMOVE };
}

/* ---------- Roster access ---------- */

const EMPTY: readonly Unit[] = [];

/** A player's roster (empty if none). Read-only: do not mutate the result. */
export function rosterOf(state: CampaignState, playerId: string): readonly Unit[] {
  return state.rosters?.[playerId] ?? EMPTY;
}

/** Unused unit id for a roster. */
export function newUnitId(rng: Rng, existing: readonly Unit[]): string {
  let id: string;
  do id = `u${rollInt(rng, 1e9).toString(36)}`;
  while (existing.some((u) => u.id === id));
  return id;
}

/** The seven example units from the design, all tagged `ex`. Ids are generated from `rng`. */
export function exampleUnits(rng: Rng, existing: readonly Unit[] = EMPTY): Unit[] {
  const out: Unit[] = [];
  const mk = (name: string, datasheet: string, points: number, xp: number, honours: string[], scars: string[], o: Partial<Unit> = {}): void => {
    out.push({
      id: newUnitId(rng, [...existing, ...out]),
      name,
      datasheet,
      points,
      xp,
      honours,
      scars,
      isCharacter: false,
      isWarlord: false,
      ex: true,
      ...o,
    });
  };
  mk("Anvil Squad", "Intercessor Squad", 180, 1, [], [], { role: "Battleline" });
  mk("Red Hand Assault", "Assault Intercessor Squad", 150, 4, ["Brawlers"], [], { role: "Battleline" });
  mk("Ashfall Gun-Line", "Hellblasters", 110, 9, ["Steady Aim", "Fleet"], ["Shaken"], { role: "Infantry" });
  mk("Captain Idris Valen", "Captain", 85, 6, ["Grizzled"], [], {
    role: "Character",
    isCharacter: true,
    isWarlord: true,
    enhancement: 'Gilded Standard of the Ninth: friendly units within 6" re-roll Battle-shock tests.',
    title: "the Unbroken",
    backstory: "Held the Cinderfall breach for nine days with a broken company. He has not spoken of it since.",
    warlordTrait: 'Stoic Commander: friendly units within 6" ignore the first failed Battle-shock test each battle.',
    relics: ["Orrin's Ward", "Thessaly Blade"],
    battles: 7,
    kills: 12,
  });
  mk("Gatekeepers", "Bladeguard Veteran Squad", 150, 7, ["Objective Hunters"], [], { role: "Infantry" });
  mk("Breach Team Seven", "Eradicator Squad", 100, 4, ["Hard to Kill"], ["Crippled", makeScar("Worn Gear", "melta rifles")], { role: "Infantry" });
  mk("The Anvil of Kharst", "Redemptor Dreadnought", 210, 26, ["Steady Aim", "Grizzled", "Hard to Kill", "Objective Hunters"], [], { role: "Vehicle" });
  return out;
}

/* ---------- Validation ---------- */

const isHonour = (h: string): boolean => HONOUR_FX.has(h);
const isScar = (s: string): boolean => SCAR_FX.has(scarName(s));
const isRelic = (r: string): boolean => RELICS.some((x) => x.n === r);
const isCount = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= 0;
const unique = (a: readonly string[]): boolean => new Set(a).size === a.length;

/** Returns a cleaned copy of `u` (ex/legendLogged are NOT taken from it), or null if it is invalid. */
function cleanUnit(u: Unit): Unit | null {
  if (typeof u.id !== "string" || !u.id) return null;
  if (typeof u.name !== "string" || typeof u.datasheet !== "string") return null;
  if (!Number.isFinite(u.points) || u.points < 0) return null;
  if (!Number.isInteger(u.xp) || u.xp < 0) return null;
  if (!Array.isArray(u.honours) || !u.honours.every(isHonour) || !unique(u.honours)) return null;
  if (!Array.isArray(u.scars) || !u.scars.every((s) => typeof s === "string" && isScar(s))) return null;
  // Role and Character stay in sync: a non-Character role cannot be a Character (or Warlord).
  const role = isRole(u.role) ? u.role : undefined;
  const isChar = role === "Character" ? true : role ? false : !!u.isCharacter;
  // A Warlord with no role must be a Character; a non-Character role just drops the Warlord flag.
  if (u.isWarlord && !isChar && !role) return null;
  if (u.battles !== undefined && !isCount(u.battles)) return null;
  if (u.kills !== undefined && !isCount(u.kills)) return null;
  if (isChar && u.relics !== undefined) {
    if (!Array.isArray(u.relics) || u.relics.length > MAX_RELICS || !u.relics.every((r) => typeof r === "string" && isRelic(r)) || !unique(u.relics)) return null;
  }
  const out: Unit = {
    id: u.id,
    name: u.name.trim() || "Unnamed squad",
    datasheet: u.datasheet.trim(),
    points: u.points,
    xp: u.xp,
    honours: [...u.honours],
    scars: [...u.scars],
    isCharacter: isChar,
    isWarlord: isChar && !!u.isWarlord,
  };
  if (role) out.role = role;
  const enh = u.enhancement?.trim();
  if (out.isCharacter && enh) out.enhancement = enh;
  if (out.isCharacter) {
    const title = typeof u.title === "string" ? u.title.trim().slice(0, TITLE_MAX) : "";
    const story = typeof u.backstory === "string" ? u.backstory.trim().slice(0, BACKSTORY_MAX) : "";
    if (title) out.title = title;
    if (story) out.backstory = story;
    if (out.isWarlord) {
      const trait = typeof u.warlordTrait === "string" ? u.warlordTrait.trim().slice(0, TRAIT_MAX) : "";
      if (trait) out.warlordTrait = trait;
    }
    if (u.relics?.length) out.relics = [...u.relics];
  }
  if (u.battles !== undefined) out.battles = u.battles;
  if (u.kills !== undefined) out.kills = u.kills;
  return out;
}

/**
 * Setup (round 0) allows one Character per roster, and it must be the Warlord. Returns the Character already on
 * the roster that stops `unit` being a Character too, or null (after round 0, or if `unit` is no Character).
 * Callers decide whether a save is adding a Character; saves to an existing Character skip this check.
 */
export function setupCharacterBlock(state: CampaignState, playerId: string, unit: Pick<Unit, "id" | "isCharacter">): Unit | null {
  if (state.round !== 0 || !unit.isCharacter) return null;
  return rosterOf(state, playerId).find((x) => x.isCharacter && x.id !== unit.id) ?? null;
}

/** True if saving `u` would break the Setup rule: a second Character, or a Character that is not the Warlord. */
function breaksSetupRule(s: CampaignState, playerId: string, u: Unit): boolean {
  return s.round === 0 && u.isCharacter && (!u.isWarlord || !!setupCharacterBlock(s, playerId, u));
}

function rosterFor(s: CampaignState, playerId: string): Unit[] {
  s.rosters ??= {};
  return (s.rosters[playerId] ??= []);
}

/** Saving a Warlord clears every other Warlord on the roster. */
function enforceWarlord(roster: Unit[], saved: Unit): void {
  if (!saved.isWarlord) return;
  for (const x of roster) if (x.id !== saved.id) x.isWarlord = false;
}

/** Log the Legend line the first time a non-example unit reaches 25 XP. */
function checkLegend(s: CampaignState, playerName: string, u: Unit): void {
  if (u.ex || u.legendLogged || u.xp < LEGEND_XP) return;
  u.legendLogged = true;
  log(s, B(u.name), " of ", B(playerName), " becomes a Legend of the Reach.");
}

function spendRp(s: CampaignState, playerId: string, cost: number): boolean {
  const p = getPlayer(s, playerId);
  if (!p || p.rp < cost) return false;
  p.rp -= cost;
  return true;
}

/* ---------- Actions (all mutate the draft `s`; return false if invalid) ---------- */

export function addUnitTo(s: CampaignState, playerId: string, unit: Unit): boolean {
  if (!getPlayer(s, playerId)) return false;
  const u = cleanUnit(unit);
  const roster = rosterFor(s, playerId);
  if (!u || roster.some((x) => x.id === u.id)) return false;
  if (breaksSetupRule(s, playerId, u)) return false;
  roster.push(u);
  enforceWarlord(roster, u);
  checkLegend(s, getPlayer(s, playerId)?.name ?? "", u);
  return true;
}

export function updateUnitIn(s: CampaignState, playerId: string, unit: Unit): boolean {
  const p = getPlayer(s, playerId);
  const roster = rosterFor(s, playerId);
  const i = roster.findIndex((x) => x.id === unit.id);
  const u = cleanUnit(unit);
  if (!p || i === -1 || !u) return false;
  const old = roster[i];
  // A legacy Setup roster with 2+ Characters can still edit them; only a save that adds a Character is stopped.
  if (!old.isCharacter && breaksSetupRule(s, playerId, u)) return false;
  if (old.ex) u.ex = true;
  if (old.legendLogged) u.legendLogged = true;
  roster[i] = u;
  enforceWarlord(roster, u);
  checkLegend(s, p.name, u);
  return true;
}

/** Unused id for a memorial entry. Deterministic (no rng needed). */
function newFallenId(s: CampaignState, unitId: string): string {
  const used = new Set((s.fallen ?? []).map((f) => f.id));
  let n = s.fallen?.length ?? 0;
  while (used.has(`f${s.round}-${unitId}-${n}`)) n++;
  return `f${s.round}-${unitId}-${n}`;
}

/** Stores a Character's memorial snapshot (the unit as it is now). */
function remember(s: CampaignState, playerName: string, playerId: string, u: Unit, cause: string): void {
  const f: FallenCharacter = {
    id: newFallenId(s, u.id),
    playerId,
    playerName,
    name: u.name,
    datasheet: u.datasheet,
    rank: rankOf(u.xp),
    battles: u.battles ?? 0,
    kills: u.kills ?? 0,
    relics: [...(u.relics ?? [])],
    cause,
    round: s.round,
  };
  if (u.title) f.title = u.title;
  if (u.ex) f.ex = true;
  (s.fallen ??= []).push(f);
}

/** Removes a unit. A Character is first moved to the Hall of Heroes with `cause` (default "Retired from the roster"). */
export function removeUnitFrom(s: CampaignState, playerId: string, unitId: string, cause?: string): boolean {
  const p = getPlayer(s, playerId);
  if (!p) return false;
  const roster = rosterFor(s, playerId);
  const u = roster.find((x) => x.id === unitId);
  if (!u) return false;
  // No battles are fought in Setup, so nothing is memorialised.
  if (u.isCharacter && s.round !== 0) remember(s, p.name, playerId, u, (typeof cause === "string" ? cause.trim().slice(0, CAUSE_MAX) : "") || DEFAULT_CAUSE);
  s.rosters![playerId] = roster.filter((x) => x.id !== unitId);
  return true;
}

export function addRelicTo(s: CampaignState, playerId: string, unitId: string, relic: string, source: "shrine" | "fate"): boolean {
  const p = getPlayer(s, playerId);
  const u = rosterFor(s, playerId).find((x) => x.id === unitId);
  if (!p || !u || !u.isCharacter || !isRelic(relic) || (source !== "shrine" && source !== "fate")) return false;
  const held = u.relics ?? [];
  if (held.length >= MAX_RELICS || held.includes(relic)) return false;
  u.relics = [...held, relic];
  log(s, B(u.name), " of ", B(p.name), ` finds ${relic} (${source === "shrine" ? "Shrine" : "Fate Card"}).`);
  return true;
}

/** Mistake fix: no log. */
export function removeRelicFrom(s: CampaignState, playerId: string, unitId: string, relic: string): boolean {
  const u = rosterFor(s, playerId).find((x) => x.id === unitId);
  if (!getPlayer(s, playerId) || !u?.relics?.includes(relic)) return false;
  u.relics = u.relics.filter((r) => r !== relic);
  if (!u.relics.length) delete u.relics;
  return true;
}

export function deleteFallenEntry(s: CampaignState, id: string): boolean {
  if (!s.fallen?.some((f) => f.id === id)) return false;
  s.fallen = s.fallen.filter((f) => f.id !== id);
  return true;
}

/** Replaces the player's existing examples with fresh ones, keeping their own units. */
export function addExamplesTo(s: CampaignState, playerId: string, rng: Rng): boolean {
  if (!getPlayer(s, playerId)) return false;
  const kept = rosterFor(s, playerId).filter((x) => !x.ex);
  const examples = exampleUnits(rng, kept);
  // The example Captain is a Warlord; only keep that if the player has no Warlord of their own.
  if (kept.some((x) => x.isWarlord)) for (const x of examples) x.isWarlord = false;
  // Setup allows one Character: leave the example Captain out if the player already has one.
  const final = s.round === 0 && kept.some((x) => x.isCharacter) ? examples.filter((x) => !x.isCharacter) : examples;
  s.rosters![playerId] = [...kept, ...final];
  const p = getPlayer(s, playerId);
  s.fallen = (s.fallen ?? []).filter((f) => !(f.ex && f.playerId === playerId));
  s.fallen.push({
    id: newFallenId(s, "example"),
    playerId,
    playerName: p?.name ?? "",
    name: "Sergeant Maro Tev",
    title: "the Steadfast",
    datasheet: "Intercessor Sergeant",
    rank: "Veteran",
    battles: 6,
    kills: 9,
    relics: ["Choirhold Bell"],
    cause: "Slain at the Cinderfall breach",
    round: s.round,
    ex: true,
  });
  return true;
}

export function clearExamplesFrom(s: CampaignState, playerId: string): boolean {
  if (!getPlayer(s, playerId)) return false;
  const roster = rosterFor(s, playerId);
  s.rosters![playerId] = roster.filter((x) => !x.ex);
  if (s.fallen) s.fallen = s.fallen.filter((f) => !(f.ex && f.playerId === playerId));
  return true;
}

export function removePlayerRoster(s: CampaignState, playerId: string): void {
  if (s.rosters) delete s.rosters[playerId];
}

export function applyPostBattleTo(s: CampaignState, playerId: string, results: PostBattleResult[]): boolean {
  const p = getPlayer(s, playerId);
  if (!p || !Array.isArray(results)) return false;
  const roster = rosterFor(s, playerId);
  const seen = new Set<string>();
  let glories = 0;
  const removed = new Set<string>();

  for (const r of results) {
    const u = roster.find((x) => x.id === r.unitId);
    if (!u || seen.has(r.unitId)) return false;
    seen.add(r.unitId);
    if (r.destroyed && !r.fought) return false;
    if (!Number.isInteger(r.kills) || r.kills < 0) return false;
    if (r.xpOverride !== undefined && (!Number.isInteger(r.xpOverride) || r.xpOverride < 0)) return false;
    if (r.glory && ++glories > 1) return false;
    if (!r.fought && !r.glory) continue; // nothing happened to this unit

    const before = { honours: [...u.honours], isCharacter: u.isCharacter };
    const heals = r.fought && healsGrievous(u);
    const gain = r.xpOverride ?? computeXpGain(r.fought, r.destroyed, r.kills, r.glory);
    const newXp = u.xp + gain;

    // Honours
    const newHon = r.honours ?? [];
    const honOk = allowedHonours(u);
    if (!newHon.every((h) => honOk.some((x) => x.n === h)) || !unique(newHon) || newHon.some((h) => u.honours.includes(h))) return false;
    if (newHon.length > honoursOwed(u, newXp)) return false;

    // Fallen (the Warlord never rolls: it always takes a scar)
    let scar: string | null = null;
    const outcome = scarOutcome(u);
    if (r.destroyed) {
      if (!u.isWarlord && (!Number.isInteger(r.fallenRoll) || (r.fallenRoll ?? 0) < 1 || (r.fallenRoll ?? 0) > 6)) return false;
      if (u.isWarlord || isScarred(before, r.fallenRoll as number)) {
        if (r.scar === undefined || !allowedScars(u).some((x) => x.n === r.scar)) return false;
        if (outcome.kept.some((x) => scarName(x) === r.scar)) return false; // a Grievous Wound healing now may be taken again
        if (r.scar === WORN_GEAR && !r.scarWeapon?.trim()) return false;
        scar = makeScar(r.scar, r.scarWeapon);
      }
    }
    const say = (msg: string): void => log(s, B(u.name), " of ", B(p.name), msg);

    // Apply
    const oldRank = rankIndex(u.xp);
    u.xp = newXp;
    u.honours.push(...newHon);
    if (r.fought) u.battles = (u.battles ?? 0) + 1;
    u.kills = (u.kills ?? 0) + (r.fought || r.glory ? r.kills : 0);
    if (heals) {
      u.scars = scarsAfterHeal(u);
      say(" recovers from a Grievous Wound.");
    }
    if (rankIndex(newXp) > oldRank) {
      say(` reaches ${rankOf(newXp)}` + (newHon.length ? ` and gains ${newHon.join(", ")}.` : "."));
    } else if (newHon.length) {
      say(` gains ${newHon.join(", ")}.`);
    }
    if (scar) {
      u.scars = [...outcome.kept.filter((x) => x !== outcome.replaces), scar];
      if (u.isWarlord) {
        say(` is destroyed and takes ${scar}${outcome.replaces ? `, replacing ${outcome.replaces}` : ""}. The Warlord lives on.`);
      } else if (outcome.gone) {
        removed.add(u.id);
        if (u.isCharacter) remember(s, p.name, playerId, u, THIRD_SCAR_CAUSE);
        say(` takes a third Battle Scar (${scar}) and is lost.${u.isCharacter ? " It is remembered in the Hall of Heroes." : ""}`);
      } else {
        say(` is scarred: ${scar}.`);
      }
    }
    if (!removed.has(u.id)) checkLegend(s, p.name, u);
  }

  if (removed.size) s.rosters![playerId] = roster.filter((x) => !removed.has(x.id));
  return true;
}

export function fieldSurgeonOn(s: CampaignState, playerId: string, unitId: string, scar: string): boolean {
  const p = getPlayer(s, playerId);
  const u = rosterFor(s, playerId).find((x) => x.id === unitId);
  if (!p || !u) return false;
  const i = u.scars.indexOf(scar);
  if (i === -1 || p.rp < SURGEON_COST) return false;
  spendRp(s, playerId, SURGEON_COST);
  u.scars.splice(i, 1);
  log(s, B(p.name), ` spends ${SURGEON_COST} RP on a Field Surgeon: `, B(u.name), ` no longer has ${scar}.`);
  return true;
}

export function promoteUnit(s: CampaignState, playerId: string, unitId: string, enhancement?: string): boolean {
  const p = getPlayer(s, playerId);
  const u = rosterFor(s, playerId).find((x) => x.id === unitId);
  if (!p || !u || p.rp < PROMOTION_COST) return false;
  if (u.isCharacter) {
    const enh = enhancement?.trim();
    if (!enh) return false;
    spendRp(s, playerId, PROMOTION_COST);
    u.enhancement = enh;
    log(s, B(p.name), ` spends ${PROMOTION_COST} RP on a Promotion: `, B(u.name), " gains an enhancement.");
  } else {
    if (s.round === 0 || u.xp < PROMOTION_MIN_XP) return false; // Setup allows no new Character
    spendRp(s, playerId, PROMOTION_COST);
    u.isCharacter = true;
    u.role = "Character";
    log(s, B(p.name), ` spends ${PROMOTION_COST} RP on a Promotion: `, B(u.name), " is now a Character.");
  }
  return true;
}

export function recruitUnit(s: CampaignState, playerId: string, unit: Unit): boolean {
  const p = getPlayer(s, playerId);
  if (!p || p.rp < RECRUITS_COST) return false;
  if (!Array.isArray(unit.honours) || unit.honours.length !== 1) return false;
  const draft: Unit = { ...unit, xp: RECRUITS_XP, scars: [] };
  const u = cleanUnit(draft);
  const roster = rosterFor(s, playerId);
  if (!u || roster.some((x) => x.id === u.id)) return false;
  if (breaksSetupRule(s, playerId, u)) return false;
  spendRp(s, playerId, RECRUITS_COST);
  roster.push(u);
  enforceWarlord(roster, u);
  log(s, B(p.name), ` spends ${RECRUITS_COST} RP on Seasoned Recruits: `, B(u.name), ` joins at ${RECRUITS_XP} XP.`);
  return true;
}
