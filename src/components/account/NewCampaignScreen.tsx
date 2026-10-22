import { useState } from "react";
import type { FormEvent } from "react";
import { createCampaign } from "../../store/campaigns.ts";

export function NewCampaignScreen({ onBack, onCreated }: { onBack: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name your campaign.");
      return;
    }
    setBusy(true);
    setError("");
    createCampaign(trimmed).then(
      (rec) => onCreated(rec.id),
      () => {
        setBusy(false);
        setError("Something went wrong. Please try again.");
      },
    );
  };

  return (
    <div className="ac-screen">
      <button className="ac-back" onClick={onBack}>
        ← Campaigns
      </button>
      <h2>New campaign</h2>
      <div className="ac-panel">
        <form className="ac-form" onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor="nc-name">Campaign name</label>
            <input
              id="nc-name"
              type="text"
              maxLength={60}
              value={name}
              className={error ? "ac-bad" : undefined}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "nc-err" : undefined}
              autoComplete="off"
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          {error ? (
            <p className="ac-err" id="nc-err" role="alert">
              {error}
            </p>
          ) : null}
          <div className="ac-actions">
            <button className="btn primary" type="submit" disabled={busy}>
              Create campaign
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
