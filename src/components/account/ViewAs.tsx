import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { CampaignProvider } from "../../store/CampaignProvider.tsx";
import type { CampaignStore } from "../../store/useCampaign.ts";

interface Props {
  store: CampaignStore;
  /** The signed-in user is the organiser: only they get the picker. */
  canSwitch: boolean;
  children: ReactNode;
}

/**
 * Organiser tool: see every tab as one player does (their hand, their buttons, no owner powers). It only swaps the
 * viewer the tabs read. Saves still go through as the organiser, so anything done here is done for that player.
 */
export function ViewAsProvider({ store, canSwitch, children }: Props) {
  const [povId, setPovId] = useState("");
  const pov = canSwitch ? store.state.players.find((p) => p.id === povId) : undefined;
  const shown = useMemo<CampaignStore>(
    () => (pov ? { ...store, viewer: { userId: pov.userId ?? null, email: pov.email ?? "", isOwner: false } } : store),
    [store, pov],
  );

  return (
    <>
      {canSwitch && store.state.players.length ? (
        <div className={pov ? "view-as on" : "view-as"}>
          <label className="lbl" htmlFor="view-as">
            View as
          </label>
          <select id="view-as" value={pov?.id ?? ""} onChange={(e) => setPovId(e.target.value)}>
            <option value="">Organiser (you)</option>
            {store.state.players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {pov ? <span className="mono dim">Anything you do here is done for {pov.name}.</span> : null}
        </div>
      ) : null}
      {/* Remount on switch, so pickers and drafts don't carry over from the other view. */}
      <CampaignProvider key={pov?.id ?? ""} store={shown}>
        {children}
      </CampaignProvider>
    </>
  );
}
