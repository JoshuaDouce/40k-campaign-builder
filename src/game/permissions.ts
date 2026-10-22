// Who may send which action. Honour-system for the MVP: this is enforced in the UI only.
import { currentActor, getPlayer } from "./selectors.ts";
import type { Action, CampaignState } from "./types.ts";

export interface PermissionContext {
  /** Signed-in user id, or null when not a member. */
  userId: string | null;
  isOwner: boolean;
}

/** True if `playerId` exists, has a userId, and it is `userId`. Players without a userId are owner-only. */
function controls(s: CampaignState, playerId: string, userId: string | null): boolean {
  const p = getPlayer(s, playerId);
  return !!p && userId !== null && p.userId !== undefined && p.userId === userId;
}

export function canPerform(state: CampaignState, action: Action, ctx: PermissionContext): boolean {
  if (ctx.isOwner) return true;
  const { userId } = ctx;
  switch (action.type) {
    case "beginRound":
      return userId !== null;

    case "chooseAction":
    case "cancelAction":
    case "rollBattle":
    case "rerollTwists":
    case "confirmQuiet": {
      const actor = currentActor(state);
      return actor !== undefined && controls(state, actor.id, userId);
    }

    case "resolveBattle": {
      const pd = state.pend;
      return !!pd && (controls(state, pd.actor, userId) || (pd.def !== undefined && controls(state, pd.def, userId)));
    }

    case "drawCard":
    case "playCard":
    case "discardCard":
    case "buyReinforcements":
    case "addUnit":
    case "updateUnit":
    case "removeUnit":
    case "addRelic":
    case "removeRelic":
    case "applyPostBattle":
    case "addExamples":
    case "clearExamples":
    case "fieldSurgeon":
    case "promotion":
    case "seasonedRecruits":
    case "updatePlayer":
    case "setReady":
      return controls(state, action.playerId, userId);

    case "addPlayer":
      return userId !== null && action.userId === userId && !state.players.some((p) => p.userId === userId);

    case "adjustStat":
    case "setProvinceOwner":
    case "removePlayer":
    case "deleteFallen":
    case "regen":
    case "reset":
      return false;
  }
}
