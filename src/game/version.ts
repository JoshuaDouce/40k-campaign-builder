// Rules versions. A campaign with no `rules` plays Varkesh Reach 1.1; new campaigns start on the latest.
import { ACTIONS, VTYPES } from "./data.ts";
import type { ActionDef, CampaignState, ProvinceType, RulesVersion } from "./types.ts";

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

/** Supply a Muster gives. */
export function musterSupply(state: Pick<CampaignState, "rules">): number {
  return isV12(state) ? 150 : 250;
}

/** Extra supply a Muster gives to a player holding a Forge. */
export function forgeMusterBonus(state: Pick<CampaignState, "rules">): number {
  return isV12(state) ? 50 : 150;
}

/** Supply a Muster gives in all: the base, plus the Forge bonus when the player holds one. */
export function musterGain(state: Pick<CampaignState, "rules">, forge: boolean): number {
  return musterSupply(state) + (forge ? forgeMusterBonus(state) : 0);
}

// Titan Graveyards exist only in 1.2, so their VTYPES figure is already the 1.2 one.
const V12_PROVINCE_SUPPLY: Partial<Record<ProvinceType, number>> = { outpost: 50, ruins: 100 };

/** Supply holding a province of this type gives, in this campaign's rules. */
export function provinceSupply(state: Pick<CampaignState, "rules">, type: ProvinceType): number {
  return (isV12(state) ? V12_PROVINCE_SUPPLY[type] : undefined) ?? VTYPES[type].supply ?? 0;
}

/** A province type's holder bonus text in this campaign's rules (the supply figures and the Forge line change in 1.2). */
export function provinceBonus(state: Pick<CampaignState, "rules">, type: ProvinceType): string {
  const def = VTYPES[type];
  if (type === "forge") return `Your Muster action gives +${forgeMusterBonus(state)} more supply.`;
  if (def.supply === undefined) return def.bonus;
  return def.bonus.replace(/^\+\d+ pts/, `+${provinceSupply(state, type)} pts`);
}

/** The campaign actions a player can pick in this campaign's rules: Scout is gone in 1.2. */
export function actionsFor(state: Pick<CampaignState, "rules">): readonly ActionDef[] {
  return isV12(state) ? ACTIONS.filter((a) => a.id !== "scout") : ACTIONS;
}

/** "Conquer, Raid, Recuperate, Muster or Fortify": every action a player can pick, as one phrase. */
export function actionList(state: Pick<CampaignState, "rules">): string {
  const names = actionsFor(state).map((a) => a.n);
  return `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}`;
}
