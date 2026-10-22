import { useEffect, useRef, useState } from "react";
import { deleteCampaign } from "../../store/campaigns.ts";
import { useCampaign } from "../../store/useCampaign.ts";

/** Organiser only: the "Organiser only" box at the very bottom of the Players tab, with a confirm step. */
export function DeleteCampaign({ onDeleted }: { onDeleted: () => void }) {
  const { campaignId, name, sync } = useCampaign();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const keepRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (confirming) keepRef.current?.focus();
  }, [confirming]);

  const remove = () => {
    if (sync.offline) {
      setError("You're offline. Changes are paused until you reconnect.");
      return;
    }
    setBusy(true);
    setError("");
    deleteCampaign(campaignId).then(onDeleted, () => {
      setBusy(false);
      setError("Something went wrong. Please try again.");
    });
  };

  if (confirming) {
    return (
      <div className="ac-modal" role="alertdialog" aria-labelledby="dc-title" style={{ marginTop: 22 }}>
        <div className="t" id="dc-title">
          Delete {name}? This removes it for every player and can't be undone.
        </div>
        {error ? (
          <p className="ac-err" role="alert">
            {error}
          </p>
        ) : null}
        <div className="ac-actions">
          <button ref={keepRef} className="btn primary" disabled={busy} onClick={() => setConfirming(false)}>
            Keep campaign
          </button>
          <button className="btn danger" disabled={busy} onClick={remove}>
            Delete campaign
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="ac-danger">
      <span className="lbl">Organiser only</span>
      <button className="btn danger" onClick={() => setConfirming(true)}>
        Delete campaign
      </button>
    </div>
  );
}
