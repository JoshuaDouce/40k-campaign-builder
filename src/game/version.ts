// Rules versions. A campaign with no `rules` plays Varkesh Reach 1.1; new campaigns start on the latest.
import type { CampaignState, RulesVersion } from "./types.ts";

export const LATEST_RULES: RulesVersion = "1.2";

export function rulesVersion(state: Pick<CampaignState, "rules">): RulesVersion {
  return state.rules ?? "1.1";
}

/** True for a campaign on Varkesh Reach 1.2: orbit-sized worlds, dearer Reinforcements, a 6 RP bank, a later Hollowgate. */
export function isV12(state: Pick<CampaignState, "rules">): boolean {
  return rulesVersion(state) === "1.2";
}

/** Most RP a player can bank. */
export function rpCap(state: Pick<CampaignState, "rules">): number {
  return isV12(state) ? 6 : 10;
}

/** Supply one Reinforcements buys. */
export const REINFORCE_SUPPLY = 200;

/** RP cost of one Reinforcements. */
export function reinforceCost(state: Pick<CampaignState, "rules">): number {
  return isV12(state) ? 2 : 1;
}

/** The War Round by which the Hollowgate opens, whatever is claimed. */
export function hollowgateRound(state: Pick<CampaignState, "rules">): number {
  return isV12(state) ? 12 : 8;
}
