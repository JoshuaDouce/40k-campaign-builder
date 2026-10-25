// Converts a save from before simultaneous turns (one `turnIdx` and one `pend`) to the new flow. Pure.
import { getPlayer } from "./selectors.ts";
import { checkRoundEnd, makeBattle } from "./round.ts";
import type { ActionId, CampaignState, RoundPick, RoundPhase } from "./types.ts";

/** The old single pending turn. */
interface LegacyPending {
  act: ActionId;
  actor: string;
  zone?: string;
  def?: string;
  twists?: number[];
  rolled?: boolean;
  garrison?: boolean;
}

/** What a save looked like before the feature. Anything newer is optional so one function reads both. */
export type LegacyState = Omit<CampaignState, "phase" | "picks"> & {
  phase?: RoundPhase | null;
  picks?: Record<string, RoundPick>;
  turnIdx?: number | null;
  pend?: LegacyPending | null;
};

/**
 * On load, a campaign that is mid-round under the old flow moves straight to the new one:
 * players whose slot has passed are Done; the player on the clock keeps a rolled battle as their pick, In battle
 * (an action chosen but not rolled is dropped); everyone else still to act plans. Between rounds nothing changes.
 * Already-converted saves pass through untouched.
 */
export function migrateLegacy(raw: LegacyState): CampaignState {
  const { turnIdx, pend, ...rest } = raw;
  const base: CampaignState = { ...rest, phase: rest.phase ?? null, picks: rest.picks ?? {} };
  if (turnIdx === undefined) return base;
  // The old Undo snapshot holds the old shape, so its window cannot carry over.
  delete base.undo;
  if (turnIdx === null) return base;

  const picks: Record<string, RoundPick> = {};
  let planning = 0;
  base.order.forEach((id, i) => {
    if (!getPlayer(base, id)) return;
    if (i < turnIdx) {
      picks[id] = { act: null, ready: true, done: true };
      return;
    }
    if (i === turnIdx && pend?.rolled && pend.actor === id && pend.zone && pend.def && pend.twists) {
      const battle = makeBattle(base, { attackerId: id, act: pend.act, zone: pend.zone, def: pend.def, garrison: !!pend.garrison, twists: pend.twists });
      if (battle) {
        picks[id] = { act: pend.act, zone: pend.zone, ready: true, battle };
        return;
      }
    }
    planning++;
  });
  const out: CampaignState = { ...base, phase: planning > 0 ? "planning" : "resolution", picks, log: [...base.log] };
  // Every remaining slot already played (e.g. the old turn pointed at a player who left): end the round now.
  checkRoundEnd(out);
  return out;
}
