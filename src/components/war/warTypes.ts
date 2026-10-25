import type { Action, CampaignState } from "../../game/index.ts";
import type { CampaignViewer } from "../../store/useCampaign.ts";

/** What every War Room piece needs. */
export interface WarCtx {
  state: CampaignState;
  dispatch(a: Action): void;
  viewer: CampaignViewer;
  colors: Record<string, string>;
  can(a: Action): boolean;
  /** True if the viewer may act for this player (their own player, or anyone for the owner). */
  canActFor(playerId: string): boolean;
}
