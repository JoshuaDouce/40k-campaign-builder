// Moving a Varkesh Reach 1.1 campaign to 1.2. Like the rest of the engine, upgradeRules MUTATES `s`: apply() runs it
// on a structuredClone.
import { PTYPES, VTYPES } from "./data.ts";
import { B, log } from "./log.ts";
import { orbitTypes } from "./map.ts";
import { rollInt, shuffle } from "./rng.ts";
import type { Rng } from "./rng.ts";
import { hollOpen } from "./selectors.ts";
import type { CampaignState, Player } from "./types.ts";
import { isV12, REINFORCE_SUPPLY, rpCap } from "./version.ts";

/** Supply a 1.1 Reinforcements is worth once repriced at 2 RP: half of it comes off. */
export const REINFORCE_CUT = REINFORCE_SUPPLY / 2;

/** Reinforcements `p` bought that the log still shows (it keeps only the latest 60 entries). */
export function reinforcementsInLog(s: CampaignState, p: Player): number {
  return s.log.filter((e) => e.segs[0]?.t === p.name && e.segs[1]?.t.includes(" on Reinforcements ")).length;
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
  s.rules = "1.2";
  log(s, B("The Reach moves to Varkesh Reach 1.2."), " Reinforcements cost 2 RP, RP banks up to 6, and the Hollowgate opens by War Round 12.");

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
    if (p.rp > cap) {
      log(s, B(p.name), ` can bank only ${cap} RP and loses ${p.rp - cap}.`);
      p.rp = cap;
    }
  }
  return true;
}
