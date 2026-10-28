import { FACCARDS, GENERIC } from "./data.ts";
import { log, B } from "./log.ts";
import { rollInt } from "./rng.ts";
import type { Rng } from "./rng.ts";
import type { CampaignState, Card, Player } from "./types.ts";

export const HAND_LIMIT = 5;

/** The full draw pool for a player: generic deck plus two copies of each of their faction cards. */
export function poolFor(p: Player): Card[] {
  const pool: Card[] = [];
  GENERIC.forEach((c) => {
    for (let i = 0; i < c.n; i++) pool.push({ t: c.t, e: c.e });
  });
  (FACCARDS[p.faction] ?? []).forEach((c) => {
    for (let i = 0; i < 2; i++) pool.push({ t: c.t, e: c.e, fac: p.faction });
  });
  return pool;
}

/** Draw one card into the player's hand (mutates `p`). Null if the hand is full. */
export function drawCard(p: Player, rng: Rng): Card | null {
  if (p.hand.length >= HAND_LIMIT) return null;
  const pool = poolFor(p);
  const c = pool[rollInt(rng, pool.length)];
  p.hand.push(c);
  return c;
}

/** Draw `n` cards for `why` and log it (mutates `s`). */
export function drawFor(s: CampaignState, p: Player, n: number, why: string, rng: Rng): void {
  let got = 0;
  for (let i = 0; i < n; i++) if (drawCard(p, rng)) got++;
  if (got) log(s, B(p.name), ` drew ${got > 1 ? got + " Fate Cards" : "a Fate Card"} (${why}).`);
  else log(s, B(p.name), `'s hand is full, no card drawn (${why}).`);
}
