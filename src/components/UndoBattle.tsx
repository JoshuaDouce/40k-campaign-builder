import { useEffect, useRef, useState } from "react";
import { canPerform, getPlayer, getZone } from "../game/index.ts";
import type { Action, CampaignState } from "../game/index.ts";
import type { CampaignViewer } from "../store/useCampaign.ts";

/** Undo strip for the latest battle result, shown to the attacker, defender and owner while the window is open. */
export function UndoBattle({ state, dispatch, viewer }: { state: CampaignState; dispatch(a: Action): void; viewer: CampaignViewer }) {
  const [confirming, setConfirming] = useState(false);
  const keepRef = useRef<HTMLButtonElement>(null);
  // The Undo button unmounts when the confirm opens: move focus to the safe choice.
  useEffect(() => {
    if (confirming) keepRef.current?.focus();
  }, [confirming]);
  const u = state.undo;
  if (!u) return null;
  const undo: Action = { type: "undoBattle" };
  // Who may see it does not depend on whether a report has been filed.
  if (!canPerform({ ...state, undo: { ...u, reportFiled: false } }, undo, viewer)) return null;
  if (u.reportFiled) {
    return <div className="note">This result can&apos;t be undone because a post-battle report has been filed since it was recorded.</div>;
  }
  if (!confirming) {
    return (
      <div className="bh-undo">
        <button type="button" className="btn sm" onClick={() => setConfirming(true)}>
          Undo result
        </button>
        <p className="hint">Recorded by mistake? You can take it back until the next action.</p>
      </div>
    );
  }
  const pd = u.before.pend;
  const attacker = getPlayer(state, u.attacker)?.name ?? "The attacker";
  const defender = pd?.garrison ? "the garrison" : (getPlayer(state, u.defender)?.name ?? "the defender");
  const province = pd?.zone ? (getZone(state, pd.zone)?.name ?? "the province") : "the province";
  return (
    <div className="bh-confirm" role="group" aria-label="Undo this result?">
      <h4 className="bh-ttl">Undo this result?</h4>
      <p>
        {attacker} vs {defender} at {province} goes back to unresolved. RP, provinces, Fate Cards and the log return to how they were.
      </p>
      <div className="row">
        <button
          type="button"
          className="btn sm danger"
          onClick={() => {
            setConfirming(false);
            dispatch(undo);
          }}
        >
          Undo result
        </button>
        <button type="button" className="btn sm" ref={keepRef} onClick={() => setConfirming(false)}>
          Keep result
        </button>
      </div>
    </div>
  );
}
