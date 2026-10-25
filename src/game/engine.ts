// The War Round engine. Functions that take `s: CampaignState` MUTATE it: they are internal building
// blocks that `apply()` runs on a structuredClone. Never call them on state you want to keep.
import { drawCard, drawFor } from "./cards.ts";
import { TWISTS } from "./data.ts";
import { genSystem } from "./map.ts";
import { B, log } from "./log.ts";
import { newSeed } from "./rng.ts";
import type { Rng } from "./rng.ts";
import { count, getPlanet, getZone, holdsType, hollOpen, laneLinked, provsOf, r50, supplyOf } from "./selectors.ts";
import type { ActionId, CampaignState, Player, Zone } from "./types.ts";

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
  const g = genSystem(pl, newSeed(rng));
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
  };
}

/** Re-chart the whole Reach from scratch (mutates `s`). */
export function regen(s: CampaignState, rng: Rng): void {
  const g = genSystem(s.players, newSeed(rng));
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
  const ports = new Set(mine.filter((v) => v.type === "spaceport" || v.type === "capital").map((v) => v.pl));
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
      p.rp = Math.min(10, p.rp + inc);
      log(s, B(p.name), ` collects ${inc} RP from their cities.`);
    }
    drawFor(s, p, 1 + holdsType(s, p, "refinery"), "start of War Round", rng);
  });
  s.order = s.players
    .map((p) => ({ id: p.id, z: count(s, p), r: rng() }))
    .sort((a, b) => a.z - b.z || a.r - b.r)
    .map((x) => x.id);
  s.phase = "planning";
}

/** Index of the Light Forces Mission Twist in TWISTS. */
export const LIGHT_FORCES_TWIST = TWISTS.findIndex((t) => t.t === "Light Forces");
/** Battles of this many points or fewer automatically use Light Forces. */
export const LIGHT_FORCES_MAX_PTS = 750;

/**
 * Late-arrival catch-up for a player who joins once the campaign is under way (round 1 or later):
 * 1 extra Fate Card, and a supply limit of the others' average (to the nearest 50) minus 150 if that
 * beats the starting 750. Call after the player has been added to `s.players`.
 */
export function lateArrivalBonus(s: CampaignState, p: Player, rng: Rng): void {
  const others = s.players.filter((x) => x.id !== p.id);
  const avg = others.length ? r50(others.reduce((n, x) => n + supplyOf(x), 0) / others.length) - 150 : 0;
  const target = avg > supplyOf(p) ? avg : 0;
  if (target) p.sup = (p.sup || 0) + target - supplyOf(p);
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
