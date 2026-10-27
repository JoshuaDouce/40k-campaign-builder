import { computeXpGain, fallenModifier, fallenThreshold, healsGrievous, honoursOwed, honourTableFor, isScarred, scarName, scarOutcome, scarTableFor, WORN_GEAR, xpThisRound } from "../../game/index.ts";
import type { PostBattleResult, Unit } from "../../game/index.ts";

export interface Row {
  fought: boolean;
  destroyed: boolean;
  kills: number;
  /** XP override as typed; empty = automatic. */
  ov: string;
}
export const BLANK_ROW: Row = { fought: false, destroyed: false, kills: 0, ov: "" };

/** Every die and pick the player has made in step 2. Honour slots are keyed `${unitId}:${i}`. */
export interface Rolls {
  honRoll: Record<string, number | undefined>;
  honPick: Record<string, string | undefined>;
  fallen: Record<string, number | undefined>;
  scar: Record<string, number | undefined>;
  weapon: Record<string, string | undefined>;
}
export const NO_ROLLS: Rolls = { honRoll: {}, honPick: {}, fallen: {}, scar: {}, weapon: {} };

export interface SlotView {
  key: string;
  index: number;
  roll?: number;
  rolledName?: string;
  /** Honours held at this point (current + accepted earlier in the batch). */
  held: string[];
  /** The accepted honour, if valid. */
  chosen?: string;
  /** Rolled an honour already held and nothing else taken. */
  dupRoll: boolean;
}

export interface FallenView {
  d6?: number;
  mod: number;
  threshold: number;
  total?: number;
  scarred: boolean;
  scarRoll?: number;
  scarName?: string;
  scarDup: boolean;
  weapon: string;
  needsWeapon: boolean;
  gone: boolean;
  /** The Warlord never rolls for the fallen: it takes a Character scar directly. */
  warlord: boolean;
  /** Scars held once Grievous Wound has healed (what a new scar is added to). */
  scarsAfter: number;
  /** Warlord at three scars: the scar a new one replaces (as stored, e.g. "Worn Gear (bolters)"). */
  replaces?: string;
}

export interface UnitView {
  unit: Unit;
  gain: number;
  newXp: number;
  /** Career after this battle. */
  battles: number;
  kills: number;
  /** Holds Grievous Wound before the battle, so it heals now. */
  heals: boolean;
  slots: SlotView[];
  fallen?: FallenView;
  done: boolean;
}

export interface Evaluation {
  views: UnitView[];
  blocked: boolean;
  anyGone: boolean;
  results: PostBattleResult[];
}

const validOv = (ov: string): number | null => {
  if (ov.trim() === "") return null;
  const n = Number(ov);
  return Number.isInteger(n) && n >= 0 ? n : null;
};

/** The XP a row gives (an override as typed, never capped), and whether the round cap cut it. */
export function xpGainFor(row: Row, glory: boolean, already: number): { gain: number; capped: boolean } {
  const ov = validOv(row.ov);
  const calc = computeXpGain(row.fought, row.destroyed, row.kills, glory, already);
  return ov === null ? { gain: calc.total, capped: calc.capped } : { gain: ov, capped: false };
}

/** Works out step 2 for the units that fought, and the finished results to send once nothing is blocked. */
export function evaluate(roster: readonly Unit[], rows: Record<string, Row | undefined>, glory: string | null, rolls: Rolls, round: number): Evaluation {
  const views: UnitView[] = [];
  const results: PostBattleResult[] = [];
  for (const unit of roster) {
    const row = rows[unit.id] ?? BLANK_ROW;
    if (!row.fought) continue;
    const isGlory = glory === unit.id;
    const { gain } = xpGainFor(row, isGlory, xpThisRound(unit, round));
    const newXp = unit.xp + gain;
    const owed = honoursOwed(unit, newXp);
    let done = true;

    const held = new Set(unit.honours);
    const taken: string[] = [];
    const slots: SlotView[] = [];
    const honTable = honourTableFor(unit);
    for (let i = 0; i < owed; i++) {
      const key = `${unit.id}:${i}`;
      const roll = rolls.honRoll[key];
      const rolledName = roll ? honTable[roll - 1]?.n : undefined;
      const pick = rolls.honPick[key];
      const chosen = pick && !held.has(pick) ? pick : undefined;
      slots.push({ key, index: i, roll, rolledName, held: [...held], chosen, dupRoll: !!rolledName && held.has(rolledName) && !pick });
      if (chosen) {
        held.add(chosen);
        taken.push(chosen);
      } else done = false;
    }

    let fallen: FallenView | undefined;
    let scar: string | undefined;
    let scarWeapon: string | undefined;
    if (row.destroyed) {
      const warlord = unit.isWarlord;
      const d6 = warlord ? undefined : rolls.fallen[unit.id];
      const mod = fallenModifier(unit);
      const scarred = warlord || (d6 !== undefined && isScarred(unit, d6));
      const scarRoll = scarred ? rolls.scar[unit.id] : undefined;
      const sName = scarRoll ? scarTableFor(unit)[scarRoll - 1]?.n : undefined;
      const outcome = scarOutcome(unit);
      const scarDup = !!sName && outcome.kept.some((s) => scarName(s) === sName);
      const weapon = rolls.weapon[unit.id] ?? "";
      const needsWeapon = sName === WORN_GEAR;
      const scarOk = !!sName && !scarDup && (!needsWeapon || weapon.trim() !== "");
      fallen = {
        d6,
        mod,
        threshold: fallenThreshold(unit),
        total: d6 === undefined ? undefined : d6 + mod,
        scarred,
        scarRoll,
        scarName: sName,
        scarDup,
        weapon,
        needsWeapon,
        gone: scarOk && outcome.gone,
        warlord,
        scarsAfter: outcome.kept.length,
        replaces: outcome.replaces,
      };
      if (!warlord && d6 === undefined) done = false;
      else if (scarred && !scarOk) done = false;
      else if (scarred) {
        scar = sName;
        scarWeapon = needsWeapon ? weapon.trim() : undefined;
      }
    }

    views.push({ unit, gain, newXp, battles: (unit.battles ?? 0) + 1, kills: (unit.kills ?? 0) + row.kills, heals: healsGrievous(unit), slots, fallen, done });
    const ov = validOv(row.ov);
    const result: PostBattleResult = { unitId: unit.id, fought: true, destroyed: row.destroyed, kills: row.kills, glory: isGlory };
    if (ov !== null) result.xpOverride = ov;
    if (taken.length) result.honours = taken;
    if (row.destroyed && fallen?.d6 !== undefined) result.fallenRoll = fallen.d6;
    if (scar) result.scar = scar;
    if (scarWeapon) result.scarWeapon = scarWeapon;
    results.push(result);
  }
  return { views, blocked: views.some((v) => !v.done), anyGone: views.some((v) => v.fallen?.gone), results };
}
