import { Fragment, useState } from "react";
import type { FormEvent } from "react";
import { FACTIONS, FACTION_GROUPS, SIDE_LABEL } from "../../game/index.ts";
import type { FactionName } from "../../game/index.ts";
import { useCampaign } from "../../store/useCampaign.ts";
import { newId } from "../newId.ts";

/** First open: name your warband and pick a faction. Adds the signed-in user as a player. */
export function JoinScreen({ backLabel, onBack }: { backLabel: string; onBack: () => void }) {
  const { name: campaignName, dispatch, viewer, sync } = useCampaign();
  const [warband, setWarband] = useState("");
  const [faction, setFaction] = useState<FactionName | null>(null);
  const [error, setError] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = warband.trim();
    if (!trimmed || trimmed.length > 30) {
      setError("Name your warband (up to 30 characters).");
      return;
    }
    if (!faction || viewer.userId === null) return;
    if (sync.offline) {
      setError("You're offline. Changes are paused until you reconnect.");
      return;
    }
    setError("");
    dispatch({ type: "addPlayer", id: newId(), name: trimmed, faction, userId: viewer.userId, email: viewer.email });
  };

  const sideLabel = faction ? SIDE_LABEL[FACTIONS[faction].side] : undefined;

  return (
    <form className="ac-screen" onSubmit={submit} noValidate>
      <button type="button" className="ac-back" onClick={onBack}>
        {backLabel}
      </button>
      <h2>Join {campaignName}</h2>
      <div className="ac-panel">
        <div className="field">
          <label htmlFor="jn-name">Your warband</label>
          <input
            id="jn-name"
            type="text"
            maxLength={30}
            value={warband}
            className={error ? "ac-bad" : undefined}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "jn-err" : undefined}
            autoComplete="off"
            onChange={(e) => setWarband(e.target.value)}
          />
        </div>
      </div>
      <div role="group" aria-label="Faction">
        {FACTION_GROUPS.map((g) => (
          <Fragment key={g.side}>
            <h3 className="mf-side">
              {g.label}
              <small>{g.factions.length} factions</small>
            </h3>
            <div className="ac-facs mf-grp">
              {g.factions.map((f) => (
                <button type="button" key={f} className="ac-fac" aria-pressed={faction === f} onClick={() => setFaction(f)}>
                  <div className="k">
                    <span className="mf-kl">
                      <span className="dot" style={{ background: FACTIONS[f].c }}></span>
                      {g.label}
                    </span>
                    <span>{faction === f ? "✓ Chosen" : ""}</span>
                  </div>
                  <div className="t">{f}</div>
                  <div className="e">Wants {FACTIONS[f].want}</div>
                </button>
              ))}
            </div>
          </Fragment>
        ))}
      </div>
      <div className="mf-foot">
        {error ? (
          <p className="ac-err" id="jn-err" role="alert">
            {error}
          </p>
        ) : sync.notice ? (
          <p className="ac-err" role="alert">
            {sync.notice === "conflict" ? "Updated, please try again" : "Something went wrong. Please try again."}
          </p>
        ) : null}
        <div className="ac-actions">
          <button className="btn primary" type="submit" disabled={!faction || sync.saving}>
            Join campaign
          </button>
        </div>
        <p className="hint">{faction ? `${faction} · ${sideLabel ?? ""}` : "Pick a faction"}</p>
      </div>
    </form>
  );
}
