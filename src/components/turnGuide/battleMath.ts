// Battle size arithmetic as a player does it at the table. Pure.
import { LIGHT_FORCES_MAX_PTS, LIGHT_FORCES_TWIST, r5, r50, TWISTS, VTYPES } from "../../game/index.ts";
import type { Env } from "./guideTypes.ts";

export const RP_CAP = 10;
const HOLLOWGATE_PTS = 2000;
export const SUPPLY_SHORTAGE = TWISTS.findIndex((t) => t.t === "Supply Shortage");

interface SizeInfo {
  base: number;
  raid: boolean;
  garrison: boolean;
  /** After twists, Raid halving, rounding and the 500 pt floor. */
  size: number;
  /** After your supply limit (garrison fights are capped by yours alone). */
  playable: number;
  capped: boolean;
  /** Your own points: +20% in a garrison battle, +10% as the Underdog. */
  yours: number;
  /** The garrison's points if you take -20% off them instead of +20% for you. */
  garrisonLess: number;
  light: boolean;
  supply: number;
}

export function sizeInfo(env: Env): SizeInfo {
  const { ctx, sc, tally } = env;
  const holl = ctx.tier === "holl";
  const base = holl || !ctx.prov ? HOLLOWGATE_PTS : VTYPES[ctx.prov].size;
  const twistMult = ctx.twists.reduce((m, i) => m * TWISTS[i].m, 1);
  const raid = ctx.action === "raid";
  const size = Math.max(500, r50(base * twistMult * (raid ? 0.5 : 1)));
  const garrison = ctx.holder === "unclaimed" && ctx.action === "conquer";
  const supply = sc.supply + tally.supply;
  const playable = supply < size ? Math.floor(supply / 50) * 50 : size;
  const yours = garrison ? r5(playable * 1.2) : ctx.underdog ? r5(playable * 1.1) : playable;
  const hasLightTwist = ctx.twists.includes(LIGHT_FORCES_TWIST);
  return { base, raid, garrison, size, playable, capped: playable < size, yours, garrisonLess: r5(playable * 0.8), light: playable <= LIGHT_FORCES_MAX_PTS && !hasLightTwist, supply };
}

/** Fate Cards each side may play: 1 per 500 pts, minimum 1; Supply Shortage allows only 1. */
export function cardLimit(env: Env): number {
  if (env.ctx.twists.includes(SUPPLY_SHORTAGE)) return 1;
  return Math.max(1, Math.floor(sizeInfo(env).playable / 500));
}
