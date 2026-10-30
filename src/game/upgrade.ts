// Moving a Varkesh Reach 1.1 campaign to 1.2. Like the rest of the engine, upgradeRules MUTATES `s`: apply() runs it
// on a structuredClone.
import { PTYPES, VTYPES } from "./data.ts";
import { B, log } from "./log.ts";
import { orbitTypes } from "./map.ts";
import { rollInt, shuffle } from "./rng.ts";
import type { Rng } from "./rng.ts";
import { pushPlayerLog } from "./playerLog.ts";
import { hollOpen, supplyOf } from "./selectors.ts";
import type { CampaignState, Player } from "./types.ts";
import { forgeMusterBonus, hollowgateRound, isV12, musterGain, musterSupply, reinforceCost, REINFORCE_SUPPLY, rpCap } from "./version.ts";

/** Supply a 1.1 Reinforcements is worth once repriced at 2 RP: half of it comes off. */
export const REINFORCE_CUT = REINFORCE_SUPPLY / 2;

/** Reinforcements `p` bought that the log still shows (it keeps only the latest 60 entries). */
export function reinforcementsInLog(s: CampaignState, p: Player): number {
  return s.log.filter((e) => e.segs[0]?.t === p.name && e.segs[1]?.t.includes(" on Reinforcements ")).length;
}

/** Each 1.1 Muster amount (plain, and with a Forge) mapped to the cut that brings it to the 1.2 amount. */
const MUSTER_CUTS = new Map(
  [false, true].map((forge) => [musterGain({}, forge), musterGain({}, forge) - musterGain({ rules: "1.2" }, forge)]),
);

/**
 * Supply to take back for Musters `p` took under 1.1, counted from the log (which keeps only the latest 60 entries):
 * +250 becomes +150 (cut 100) and +400 with a Forge becomes +200 (cut 200). Any other amount is already a 1.2 Muster.
 * Never more than the player's own supply bonus. Pure.
 */
export function musterCutFromLog(s: CampaignState, p: Player): number {
  let sum = 0;
  for (const e of s.log) {
    if (e.segs[0]?.t !== p.name) continue;
    const m = /musters: \+(\d+) supply\./.exec(e.segs[1]?.t ?? "");
    if (!m) continue;
    sum += MUSTER_CUTS.get(Number(m[1])) ?? 0;
  }
  return Math.min(sum, Math.max(0, p.sup || 0));
}

/**
 * One-time load migration: a campaign already on 1.2 whose Musters were taken at the 1.1 price gets the automatic
 * supply cut, once (`musterRepriced`). A 1.1 campaign is left alone: the upgrade does it. Pure: returns a new state.
 */
export function repriceMusters(state: CampaignState): CampaignState {
  if (state.musterRepriced || !isV12(state)) return state;
  const s = structuredClone(state);
  s.musterRepriced = true;
  for (const p of s.players) {
    const cut = musterCutFromLog(state, p);
    if (!cut) continue;
    const before = supplyOf(s, p);
    const text = `'s Musters are repriced to match Varkesh Reach 1.2: supply limit -${cut}.`;
    pushPlayerLog(s, p.id, { r: s.round, segs: [B(p.name), { t: text }], by: "g", sup: [before, before - cut] });
    p.sup = (p.sup || 0) - cut;
    log(s, B(p.name), text);
    // An undo of a battle recorded before this would otherwise restore the old supply.
    const undone = s.undo?.before.players.find((u) => u.id === p.id);
    if (undone) undone.sup = Math.max(0, (undone.sup || 0) - cut);
  }
  return s;
}

/**
 * Move the campaign to Varkesh Reach 1.2. Held provinces, Capitals and Spaceports keep their type; every other
 * unclaimed province is re-charted to its orbit's sizes. Each player loses `cuts[id]` supply (never below the base)
 * and any RP over the new bank cap. Returns false if the campaign is already on 1.2.
 */
export function upgradeRules(s: CampaignState, cuts: Record<string, number>, rng: Rng): boolean {
  if (isV12(s)) return false;
  // A Hollowgate already open under 1.1 (round 8) stays open, though 1.2 opens it at round 12.
  if (hollOpen(s)) s.hollOpened = true;
  // Musters are counted before the log gets new lines (it keeps only the latest 60).
  const musterCuts = new Map(s.players.map((p) => [p.id, musterCutFromLog(s, p)]));
  s.rules = "1.2";
  s.musterRepriced = true;
  log(
    s,
    B("The Reach moves to Varkesh Reach 1.2."),
    ` Reinforcements cost ${reinforceCost(s)} RP, Muster gives +${musterSupply(s)} supply (+${forgeMusterBonus(s)} more with a Forge), Scout is gone, province supply bonuses drop, RP banks up to ${rpCap(s)}, and the Hollowgate opens by War Round ${hollowgateRound(s)}.`,
  );

  let changed = 0;
  for (const pl of s.sys.planets) {
    const onWorld = s.sys.provs.filter((v) => v.pl === pl.id);
    const spare = onWorld.filter((v) => !s.terr[v.id] && v.type !== "capital" && v.type !== "spaceport");
    if (!spare.length) continue;
    const kept = onWorld.filter((v) => !spare.includes(v)).map((v) => v.type);
    const types = shuffle(orbitTypes(pl.orbit, PTYPES[pl.type].fav, kept, spare.length, rng), rng);
    spare.forEach((v, i) => {
      if (v.type === types[i]) return;
      v.type = types[i];
      const suf = VTYPES[v.type].suf;
      v.name = v.name.split(" ")[0] + " " + suf[rollInt(rng, suf.length)];
      changed++;
    });
  }
  if (changed) log(s, `${changed} unclaimed provinces are re-charted: small fights on the outer worlds, the biggest at the centre.`);

  const cap = rpCap(s);
  for (const p of s.players) {
    const want = cuts[p.id];
    const cut = Number.isFinite(want) && want > 0 ? Math.min(Math.round(want), p.sup || 0) : 0;
    if (cut) {
      p.sup = (p.sup || 0) - cut;
      log(s, B(p.name), `'s Reinforcements are repriced: supply limit -${cut}.`);
    }
    const mcut = Math.min(musterCuts.get(p.id) ?? 0, p.sup || 0);
    if (mcut) {
      p.sup = (p.sup || 0) - mcut;
      log(s, B(p.name), `'s Musters are repriced: supply limit -${mcut}.`);
    }
    if (p.rp > cap) {
      log(s, B(p.name), ` can bank only ${cap} RP and loses ${p.rp - cap}.`);
      p.rp = cap;
    }
  }
  return true;
}
