// The War Round engine. Functions that take `s: CampaignState` MUTATE it: they are internal building
// blocks that `apply()` runs on a structuredClone. Never call them on state you want to keep.
import { drawCard, drawFor } from "./cards.ts";
import { TWISTS } from "./data.ts";
import { genSystem } from "./map.ts";
import { B, log } from "./log.ts";
import { newSeed } from "./rng.ts";
import type { Rng } from "./rng.ts";
import { isV12, LATEST_RULES, rpCap } from "./version.ts";
import { count, getPlanet, getZone, holdsType, hollOpen, laneLinked, provsOf, r50, supplyOf } from "./selectors.ts";
import type { ActionId, BattleSizeDef, CampaignState, Player, Zone } from "./types.ts";

/** Every player starts a campaign on this many Requisition Points. */
export const START_RP = 0;

export function examplePlayers(): Player[] {
  const mk = (id: string, name: string, faction: Player["faction"]): Player => ({
    id,
    name,
    faction,
    rp: START_RP,
    battles: 0,
    wins: 0,
    sup: 0,
    scout: false,
    hand: [],
  });
  return [
    mk("p1", "Player 1 (example)", "Space Marines"),
    mk("p2", "Player 2 (example)", "Orks"),
    mk("p3", "Player 3 (example)", "Necrons"),
  ];
}

/** A brand-new campaign. Pure: returns a new state. */
export function fresh(players: Player[] | undefined, rng: Rng): CampaignState {
  const pl = structuredClone(players ?? examplePlayers());
  const g = genSystem(pl, newSeed(rng), isV12({ rules: LATEST_RULES }));
  return {
    round: 0,
    phase: null,
    order: [],
    picks: {},
    log: [],
    won: null,
    fort: {},
    terr: g.terr,
    cap: g.cap,
    sys: g.sys,
    players: pl,
    hollOpened: false,
    rpStartZero: true,
    rosters: {},
    fallen: [],
    ready: {},
    history: [],
    rules: LATEST_RULES,
  };
}

/** Re-chart the whole Reach from scratch (mutates `s`). */
export function regen(s: CampaignState, rng: Rng): void {
  const g = genSystem(s.players, newSeed(rng), isV12(s));
  s.sys = g.sys;
  s.terr = g.terr;
  s.cap = g.cap;
  s.fort = {};
  s.hollOpened = false;
  log(s, `A new Reach is charted: ${g.sys.planets.length} worlds, ${g.sys.provs.length} provinces for ${s.players.length} players.`);
}

/** Provinces `p` could attack with action `act`. Read-only. */
export function targets(s: CampaignState, p: Player, act: ActionId): Zone[] {
  const mine = provsOf(s, p);
  const set = new Set<string>();
  if (!mine.length) {
    s.sys.provs
      .filter((v) => getPlanet(s, v.pl)?.orbit === "outer" && !s.terr[v.id])
      .forEach((v) => set.add(v.id));
  }
  mine.forEach((v) => v.nb.forEach((n) => set.add(n)));
  const ports = new Set(mine.filter((v) => v.type === "spaceport").map((v) => v.pl));
  ports.forEach((pl) =>
    laneLinked(s, pl).forEach((l) => s.sys.provs.filter((v) => v.pl === l).forEach((v) => set.add(v.id))),
  );
  if (hollOpen(s) && mine.some((v) => getPlanet(s, v.pl)?.orbit === "inner")) set.add("holl");
  return [...set]
    .map((id) => getZone(s, id))
    .filter((v): v is Zone => !!v)
    .filter((v) => s.terr[v.id] !== p.id && (act !== "raid" || (!!s.terr[v.id] && v.id !== "holl")));
}

export function beginRound(s: CampaignState, rng: Rng): void {
  s.round++;
  s.won = null;
  s.picks = {};
  s.ready = {};
  log(s, B(`War Round ${s.round} begins.`));
  s.players.forEach((p) => {
    const inc = holdsType(s, p, "capital") + holdsType(s, p, "hive");
    if (inc) {
      p.rp = Math.min(rpCap(s), p.rp + inc);
      log(s, B(p.name), ` collects ${inc} RP from their cities.`);
    }
    const refineries = holdsType(s, p, "refinery");
    if (refineries) drawFor(s, p, refineries, "Refinery", rng);
  });
  s.order = s.players
    .map((p) => ({ id: p.id, z: count(s, p), r: rng() }))
    .sort((a, b) => a.z - b.z || a.r - b.r)
    .map((x) => x.id);
  s.phase = "planning";
}

/** Index of the Light Forces Mission Twist in TWISTS. */
export const LIGHT_FORCES_TWIST = TWISTS.findIndex((t) => t.t === "Light Forces");
/** Battles of this many points or fewer automatically use Light Forces and Close Quarters. */
export const LIGHT_FORCES_MAX_PTS = 750;

/** Battle sizes by points, smallest first. Onslaught isn't used. */
export const BATTLE_SIZES: readonly BattleSizeDef[] = [
  { n: "Combat Patrol", pts: `Up to ${LIGHT_FORCES_MAX_PTS}`, max: LIGHT_FORCES_MAX_PTS, board: '44" x 30"', dp: 2 },
  { n: "Incursion", pts: "800–1450", max: 1499, board: '44" x 60"', dp: 2 },
  { n: "Strike Force", pts: "1500+", max: Infinity, board: '44" x 60"', dp: 3 },
];

export const CLOSE_QUARTERS_TWIST = TWISTS.findIndex((t) => t.t === "Close Quarters");
/** Twists every battle of LIGHT_FORCES_MAX_PTS or fewer uses, whether or not Mission Twists are on. */
export const SMALL_GAME_TWISTS: readonly number[] = [LIGHT_FORCES_TWIST, CLOSE_QUARTERS_TWIST];

/** The small-game twists a battle of `pts` gets on top of the ones it rolled (none above LIGHT_FORCES_MAX_PTS). */
export function autoTwists(pts: number, twists: readonly number[]): number[] {
  return pts <= LIGHT_FORCES_MAX_PTS ? SMALL_GAME_TWISTS.filter((i) => !twists.includes(i)) : [];
}

/**
 * The battle size for a battle of `pts` points (its own size, before Garrison or Underdog bonuses).
 * A rolled Close Quarters twist shrinks the board to the Combat Patrol one.
 */
export function battleSizeOf(pts: number, twists: readonly number[] = []): BattleSizeDef {
  const size = BATTLE_SIZES.find((b) => pts <= b.max) ?? BATTLE_SIZES[BATTLE_SIZES.length - 1];
  return twists.includes(CLOSE_QUARTERS_TWIST) ? { ...size, board: BATTLE_SIZES[0].board } : size;
}

/**
 * Late-arrival catch-up for a player who joins once the campaign is under way (round 1 or later):
 * 1 extra Fate Card, and a supply limit of the others' average (to the nearest 50) minus 150 if that
 * beats the starting 750. Call after the player has been added to `s.players`.
 */
export function lateArrivalBonus(s: CampaignState, p: Player, rng: Rng): void {
  const others = s.players.filter((x) => x.id !== p.id);
  const avg = others.length ? r50(others.reduce((n, x) => n + supplyOf(s, x), 0) / others.length) - 150 : 0;
  const target = avg > supplyOf(s, p) ? avg : 0;
  if (target) p.sup = (p.sup || 0) + target - supplyOf(s, p);
  drawCard(p, rng);
  log(
    s,
    B(p.name),
    target
      ? ` is given a late-arrival bonus: a supply limit of ${target} and 1 extra Fate Card.`
      : " is given a late-arrival bonus: 1 extra Fate Card.",
  );
}

/** One-time migration: an older round-0 save has its players' RP zeroed once. Pure. */
export function applyStartRp(state: CampaignState): CampaignState {
  if (state.rpStartZero) return state;
  return {
    ...state,
    rpStartZero: true,
    players: state.round === 0 ? state.players.map((p) => ({ ...p, rp: START_RP })) : state.players,
  };
}
