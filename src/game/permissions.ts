// Who may send which action. Honour-system for the MVP: this is enforced in the UI only.
import { getPlayer } from "./selectors.ts";
import type { Action, CampaignState } from "./types.ts";

export interface PermissionContext {
  /** Signed-in user id, or null when not a member. */
  userId: string | null;
  isOwner: boolean;
}

/** True if this viewer may act for `playerId`: the owner always; anyone else only for their own player. */
export function canActFor(s: CampaignState, playerId: string, ctx: PermissionContext): boolean {
  return ctx.isOwner || controls(s, playerId, ctx.userId);
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

    case "readyPick":
    case "unreadyPick":
    case "rollPick":
    case "rerollPick":
    case "setGarrisonEdge":
    case "confirmQuietPick":
    case "switchPick":
      return controls(state, action.playerId, userId);

    case "resolvePick": {
      const b = state.picks[action.playerId]?.battle;
      return controls(state, action.playerId, userId) || (!!b && controls(state, b.def, userId));
    }

    case "undoBattle": {
      const u = state.undo;
      return !!u && !u.reportFiled && u.attacker === action.attacker && (controls(state, u.attacker, userId) || (u.defender !== undefined && controls(state, u.defender, userId)));
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

    case "revealPicks":
    case "adjustStat":
    case "setProvinceOwner":
    case "removePlayer":
    case "deleteFallen":
    case "setToggle":
    case "regen":
    case "reset":
      return false;
  }
}
