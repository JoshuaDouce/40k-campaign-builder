// The organiser's Player log: why each player's RP, supply limit or Fate Card count changed. Recorded in apply().
import { controls, OWNER_ONLY } from "./permissions.ts";
import { supplyOf } from "./selectors.ts";
import type { Action, ActionType, CampaignState, LogSeg, PlayerLogEntry } from "./types.ts";

/** Most entries kept per player (newest first). */
const PLAYER_LOG_MAX = 200;
/** Entries kept across all players, so the log stays small inside the one campaign document (DynamoDB's 400 KB item). */
const PLAYER_LOG_BUDGET = 800;

/** Entries kept per player: 200, fewer in a campaign of more than 4 players. */
export function playerLogCap(players: number): number {
  return Math.min(PLAYER_LOG_MAX, Math.floor(PLAYER_LOG_BUDGET / Math.max(1, players)));
}

/** The three numbers the log watches for one player. */
export interface PlayerFigures {
  rp: number;
  sup: number;
  hand: number;
}

/** The figures in display order. */
export const FIGURE_KEYS = ["rp", "sup", "hand"] as const;

export interface PlayerLogActor {
  userId: string;
  isOwner: boolean;
}

export function figuresOf(s: CampaignState): Record<string, PlayerFigures> {
  const out: Record<string, PlayerFigures> = {};
  for (const p of s.players) out[p.id] = { rp: p.rp, sup: supplyOf(s, p), hand: p.hand.length };
  return out;
}

/** Actions where the change is the game's doing (income, results, their knock-on effects), whoever pressed the button. */
const GAME_DRIVEN: ReadonlySet<ActionType> = new Set<ActionType>(["beginRound", "revealPicks", "resolvePick", "undoBattle", "confirmQuietPick", "switchPick"]);

/**
 * Who caused a change to player `pid`. Game-driven actions are "g", other owner-only tools "o". Anything else is "p"
 * when the actor controls that player, "o" when the organiser acted for someone else, "g" otherwise.
 * No actor (a local or scripted call) = no tag.
 */
function tagFor(s: CampaignState, pid: string, type: ActionType, actor: PlayerLogActor | undefined): PlayerLogEntry["by"] {
  if (!actor) return undefined;
  if (GAME_DRIVEN.has(type)) return "g";
  if (OWNER_ONLY.has(type)) return "o";
  if (controls(s, pid, actor.userId)) return "p";
  return actor.isOwner ? "o" : "g";
}

/** "at War Round N", or "before War Round 1" while the campaign is in setup. */
function atRound(r: number): string {
  return r ? `at War Round ${r}` : "before War Round 1";
}

/** Used when an action changed a figure without adding a campaign log line. */
function fallbackText(a: Action): string {
  switch (a.type) {
    case "playCard":
      return "A Fate Card was played.";
    case "discardCard":
      return "A Fate Card was discarded.";
    case "undoBattle":
      return "Battle result undone.";
    case "adjustStat":
      return "Organiser changed RP.";
    case "setProvinceOwner":
      return "Organiser changed who holds a province.";
    case "removePlayer":
      return "A player was removed from the campaign.";
    case "reset":
      return "Campaign reset.";
    default:
      return "Changed by the campaign.";
  }
}

/** The log lines `added` by this action, about `name` when any mention them, joined with a space. */
function textFor(added: Array<{ segs: LogSeg[] }>, name: string, a: Action): LogSeg[] {
  const about = added.filter((l) => l.segs.some((g) => g.b && g.t === name));
  const lines = (about.length ? about : added).slice().reverse(); // oldest first reads in order
  if (!lines.length) return [{ t: fallbackText(a) }];
  return lines.flatMap((l, i) => (i ? [{ t: " " }, ...l.segs] : l.segs));
}

/**
 * Put `entry` on top of player `id`'s log, keeping it within the cap (mutates `s`). A player with no log yet first gets
 * the opening entry, from their figures now (so call it before changing them).
 */
export function pushPlayerLog(s: CampaignState, id: string, entry: PlayerLogEntry): void {
  const plog = (s.plog ??= {});
  const list = plog[id] ?? [];
  const at = figuresOf(s)[id];
  if (!plog[id] && at) {
    const start: PlayerLogEntry = { r: s.round, segs: [{ t: `History begins ${atRound(s.round)}. Earlier changes were not recorded.` }], start: true };
    for (const k of FIGURE_KEYS) start[k] = [at[k], at[k]];
    list.unshift(start);
  }
  list.unshift(entry);
  list.length = Math.min(list.length, playerLogCap(s.players.length));
  plog[id] = list;
}

/**
 * Record what `action` changed for each player (mutates `s`, the state `apply()` just ran it on; `state` is the one it
 * started from). `added` is how many log lines the action put on top of `s.log`.
 */
export function recordPlayerLog(state: CampaignState, s: CampaignState, action: Action, added: number, actor: PlayerLogActor | undefined): void {
  const after = figuresOf(s);
  // A reset starts the log over from the new figures; undoBattle rewrites s.log, so its lines are not "added".
  const reset = action.type === "reset";
  const before = reset ? after : figuresOf(state);
  const startRound = reset ? s.round : state.round;
  const lines = action.type === "undoBattle" ? [] : s.log.slice(0, added);
  const cap = playerLogCap(s.players.length);
  const plog = s.plog ?? {};
  for (const id of Object.keys(plog)) if (!s.players.some((p) => p.id === id)) delete plog[id];
  for (const p of s.players) {
    const was = before[p.id];
    const now = after[p.id];
    const list = plog[p.id] ?? [];
    if (!plog[p.id]) {
      // First sight of this player: an opening entry, so the log reads from a known starting point.
      const at = was ?? now;
      const start: PlayerLogEntry = {
        r: was ? startRound : s.round,
        segs: [{ t: reset ? "Campaign reset. History starts again." : was ? `History begins ${atRound(startRound)}. Earlier changes were not recorded.` : `Joined ${atRound(s.round)}.` }],
        start: true,
      };
      for (const k of FIGURE_KEYS) start[k] = [at[k], at[k]];
      list.unshift(start);
    }
    const changed = was ? FIGURE_KEYS.filter((k) => was[k] !== now[k]) : [];
    if (was && changed.length) {
      const e: PlayerLogEntry = { r: s.round, segs: textFor(lines, p.name, action) };
      const by = tagFor(s, p.id, action.type, actor);
      if (by) e.by = by;
      for (const k of changed) e[k] = [was[k], now[k]];
      list.unshift(e);
    }
    if (list.length > cap) list.length = cap;
    plog[p.id] = list;
  }
  s.plog = plog;
}
