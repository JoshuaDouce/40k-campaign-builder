// Unit rosters: ranks, honours, scars and the post-battle / Requisition rules. Pure; dice come from the UI
// (through an injected Rng) and arrive here already resolved.
import { HONOURS, RANKS, SCARS } from "./data.ts";
import { B, log } from "./log.ts";
import { rollInt } from "./rng.ts";
import type { Rng } from "./rng.ts";
import { getPlayer } from "./selectors.ts";
import type { CampaignState, PostBattleResult, Unit } from "./types.ts";

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
/** Base points plus 10% per honour, rounded to the nearest 5. */
export function effectivePoints(unit: Pick<Unit, "points" | "honours">): number {
  return Math.round((unit.points * (1 + 0.1 * unit.honours.length)) / 5) * 5;
}
export function totalEffective(units: readonly Unit[]): number {
  return units.reduce((a, u) => a + effectivePoints(u), 0);
}
/** +1 if it fought and survived, +1 per kill (counted if it fought or is Marked for Glory), +2 for Glory. */
export function computeXpGain(fought: boolean, destroyed: boolean, kills: number, glory: boolean): number {
  return (fought && !destroyed ? 1 : 0) + (fought || glory ? Math.max(0, kills) : 0) + (glory ? 2 : 0);
}

/* ---------- Scars ---------- */

/** Stored scar string: the name, or "Worn Gear (weapon)" when a weapon is given. */
export function makeScar(name: string, weapon?: string): string {
  const w = weapon?.trim();
  return name === "Worn Gear" && w ? `${name} (${w})` : name;
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
  mk("Anvil Squad", "Intercessor Squad", 180, 1, [], []);
  mk("Red Hand Assault", "Assault Intercessor Squad", 150, 4, ["Brawlers"], []);
  mk("Ashfall Gun-Line", "Hellblasters", 110, 9, ["Steady Aim", "Fleet"], ["Shaken"]);
  mk("Captain Idris Valen", "Captain", 85, 6, ["Grizzled"], [], {
    isCharacter: true,
    isWarlord: true,
    enhancement: 'Gilded Standard of the Ninth: friendly units within 6" re-roll Battle-shock tests.',
  });
  mk("Gatekeepers", "Bladeguard Veteran Squad", 150, 7, ["Objective Hunters"], []);
  mk("Breach Team Seven", "Eradicator Squad", 100, 4, ["Hard to Kill"], ["Crippled", makeScar("Worn Gear", "melta rifles")]);
  mk("The Anvil of Kharst", "Redemptor Dreadnought", 210, 26, ["Steady Aim", "Grizzled", "Hard to Kill", "Objective Hunters"], []);
  return out;
}

/* ---------- Validation ---------- */

const isHonour = (h: string): boolean => HONOURS.some((x) => x.n === h);
const isScar = (s: string): boolean => SCARS.some((x) => x.n === scarName(s));
const unique = (a: readonly string[]): boolean => new Set(a).size === a.length;

/** Returns a cleaned copy of `u` (ex/legendLogged are NOT taken from it), or null if it is invalid. */
function cleanUnit(u: Unit): Unit | null {
  if (typeof u.id !== "string" || !u.id) return null;
  if (typeof u.name !== "string" || typeof u.datasheet !== "string") return null;
  if (!Number.isFinite(u.points) || u.points < 0) return null;
  if (!Number.isInteger(u.xp) || u.xp < 0) return null;
  if (!Array.isArray(u.honours) || !u.honours.every(isHonour) || !unique(u.honours)) return null;
  if (!Array.isArray(u.scars) || !u.scars.every((s) => typeof s === "string" && isScar(s))) return null;
  if (u.isWarlord && !u.isCharacter) return null;
  const out: Unit = {
    id: u.id,
    name: u.name.trim() || "Unnamed squad",
    datasheet: u.datasheet.trim(),
    points: u.points,
    xp: u.xp,
    honours: [...u.honours],
    scars: [...u.scars],
    isCharacter: !!u.isCharacter,
    isWarlord: !!u.isWarlord,
  };
  const enh = u.enhancement?.trim();
  if (out.isCharacter && enh) out.enhancement = enh;
  return out;
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
  if (old.ex) u.ex = true;
  if (old.legendLogged) u.legendLogged = true;
  roster[i] = u;
  enforceWarlord(roster, u);
  checkLegend(s, p.name, u);
  return true;
}

export function removeUnitFrom(s: CampaignState, playerId: string, unitId: string): boolean {
  if (!getPlayer(s, playerId)) return false;
  const roster = rosterFor(s, playerId);
  if (!roster.some((x) => x.id === unitId)) return false;
  s.rosters![playerId] = roster.filter((x) => x.id !== unitId);
  return true;
}

/** Replaces the player's existing examples with fresh ones, keeping their own units. */
export function addExamplesTo(s: CampaignState, playerId: string, rng: Rng): boolean {
  if (!getPlayer(s, playerId)) return false;
  const kept = rosterFor(s, playerId).filter((x) => !x.ex);
  const examples = exampleUnits(rng, kept);
  // The example Captain is a Warlord; only keep that if the player has no Warlord of their own.
  if (kept.some((x) => x.isWarlord)) for (const x of examples) x.isWarlord = false;
  s.rosters![playerId] = [...kept, ...examples];
  return true;
}

export function clearExamplesFrom(s: CampaignState, playerId: string): boolean {
  if (!getPlayer(s, playerId)) return false;
  const roster = rosterFor(s, playerId);
  s.rosters![playerId] = roster.filter((x) => !x.ex);
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
    const gain = r.xpOverride ?? computeXpGain(r.fought, r.destroyed, r.kills, r.glory);
    const newXp = u.xp + gain;

    // Honours
    const newHon = r.honours ?? [];
    if (!newHon.every(isHonour) || !unique(newHon) || newHon.some((h) => u.honours.includes(h))) return false;
    if (newHon.length > honoursOwed(u, newXp)) return false;

    // Fallen
    let scar: string | null = null;
    if (r.destroyed) {
      if (!Number.isInteger(r.fallenRoll) || (r.fallenRoll ?? 0) < 1 || (r.fallenRoll ?? 0) > 6) return false;
      if (isScarred(before, r.fallenRoll as number)) {
        if (r.scar === undefined || !SCARS.some((x) => x.n === r.scar)) return false;
        if (u.scars.some((x) => scarName(x) === r.scar)) return false;
        if (r.scar === "Worn Gear" && !r.scarWeapon?.trim()) return false;
        scar = makeScar(r.scar, r.scarWeapon);
      }
    }

    // Apply
    const oldRank = rankIndex(u.xp);
    u.xp = newXp;
    u.honours.push(...newHon);
    if (rankIndex(newXp) > oldRank) {
      log(
        s,
        B(u.name),
        " of ",
        B(p.name),
        ` reaches ${rankOf(newXp)}`,
        newHon.length ? ` and gains ${newHon.join(", ")}.` : ".",
      );
    } else if (newHon.length) {
      log(s, B(u.name), " of ", B(p.name), ` gains ${newHon.join(", ")}.`);
    }
    if (scar) {
      u.scars.push(scar);
      if (u.scars.length >= SCARS_TO_REMOVE) {
        removed.add(u.id);
        log(s, B(u.name), " of ", B(p.name), ` takes a third Battle Scar (${scar}) and is lost.`);
      } else {
        log(s, B(u.name), " of ", B(p.name), ` is scarred: ${scar}.`);
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
    if (u.xp < PROMOTION_MIN_XP) return false;
    spendRp(s, playerId, PROMOTION_COST);
    u.isCharacter = true;
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
  spendRp(s, playerId, RECRUITS_COST);
  roster.push(u);
  enforceWarlord(roster, u);
  log(s, B(p.name), ` spends ${RECRUITS_COST} RP on Seasoned Recruits: `, B(u.name), ` joins at ${RECRUITS_XP} XP.`);
  return true;
}
