import type { ReactNode } from "react";
import { CampaignContext } from "./useCampaign.ts";
import type { CampaignStore } from "./useCampaign.ts";

export function CampaignProvider({ store, children }: { store: CampaignStore; children: ReactNode }) {
  return <CampaignContext value={store}>{children}</CampaignContext>;
}
