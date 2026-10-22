import { createContext, useContext } from "react";
import type { Action, CampaignState, Player } from "../game/index.ts";

/** Who is looking at the campaign. `userId` is the Cognito user id; the organiser acts as owner. */
export interface CampaignViewer {
  userId: string | null;
  email: string;
  isOwner: boolean;
}

/** A message shown under the campaign header: a lost save race, or any other failed save. */
export type SyncNotice = "conflict" | "error" | null;

export interface SyncInfo {
  /** A change is being saved. */
  saving: boolean;
  /** The device has no connection: changes are paused. */
  offline: boolean;
  notice: SyncNotice;
  dismissNotice(): void;
}

/** What every component needs. The Amplify-backed implementation is `useRemoteCampaign`. */
export interface CampaignStore {
  campaignId: string;
  name: string;
  /** Lowercase member emails. */
  members: string[];
  state: CampaignState;
  /** Applies the action locally, saves it with a version check, and only then shows the result. */
  dispatch(action: Action): void;
  viewer: CampaignViewer;
  sync: SyncInfo;
  /** Organiser only: replace the member email list. Rejects if the save fails. */
  updateMembers(members: string[]): Promise<void>;
}

export const CampaignContext = createContext<CampaignStore | null>(null);

export function useCampaign(): CampaignStore {
  const store = useContext(CampaignContext);
  if (!store) throw new Error("useCampaign must be used inside a CampaignProvider");
  return store;
}

/** For public screens that show campaign data when inside a campaign and fall back when not. */
export function useOptionalCampaign(): CampaignStore | null {
  return useContext(CampaignContext);
}

/** Hands are private to their player. Only the signed-in owner of the hand sees the faces, organiser included. */
export function canSeeHand(player: Player, viewer: CampaignViewer): boolean {
  return viewer.userId !== null && player.userId === viewer.userId;
}
