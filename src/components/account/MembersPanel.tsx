import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { normaliseEmail } from "../../store/campaigns.ts";
import { localMode } from "../../store/localMode.ts";
import { useCampaign } from "../../store/useCampaign.ts";
import { LocalJoinFor } from "./LocalJoinFor.tsx";

/** Organiser only: who may open this campaign, and whether each has picked a faction yet. */
export function MembersPanel() {
  const { members, state, updateMembers, sync } = useCampaign();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState<string | null>(null);

  // The two-step Remove disarms itself after a few seconds.
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(null), 4000);
    return () => clearTimeout(t);
  }, [armed]);

  const save = (next: string[], done?: () => void) => {
    if (sync.offline) {
      setError("You're offline. Changes are paused until you reconnect.");
      return;
    }
    setBusy(true);
    setError("");
    updateMembers(next).then(
      () => {
        setBusy(false);
        done?.();
      },
      () => {
        setBusy(false);
        setError("Something went wrong. Please try again.");
      },
    );
  };

  const add = (e: FormEvent) => {
    e.preventDefault();
    const value = normaliseEmail(email);
    if (!value || !value.includes("@")) {
      setError("Enter an email address.");
      return;
    }
    if (members.includes(value)) {
      setError("That email is already a member.");
      return;
    }
    save([...members, value], () => setEmail(""));
  };

  const remove = (m: string) => {
    setArmed(null);
    save(members.filter((x) => x !== m));
  };

  return (
    <section className="ac-members" aria-label="Members">
      <h3>Members</h3>
      <form className="ac-add" onSubmit={add} noValidate>
        <div className="field">
          <label htmlFor="mem-email">Email</label>
          <input
            id="mem-email"
            type="email"
            autoComplete="off"
            placeholder="friend@example.com"
            value={email}
            className={error ? "ac-bad" : undefined}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "mem-err" : undefined}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <button className="btn primary" type="submit" disabled={busy}>
          Add
        </button>
      </form>
      {error ? (
        <p className="ac-err" id="mem-err" role="alert">
          {error}
        </p>
      ) : null}
      <p className="hint" style={{ margin: "-4px 0 0" }}>
        Create their login first (see the organiser guide).
      </p>
      <ul className="ac-mlist">
        {members.map((m) => {
          const player = state.players.find((p) => p.email === m);
          return (
            <li key={m}>
              <div className="who">
                <span className="em">{m}</span>
                <span className={`st${player ? "" : " wait"}`}>{player ? `Playing as ${player.name}` : "Choosing a faction"}</span>
              </div>
              {localMode && !player ? <LocalJoinFor email={m} /> : null}
              {armed === m ? (
                <button className="btn sm danger" disabled={busy} onBlur={() => setArmed(null)} onClick={() => remove(m)}>
                  Confirm remove
                </button>
              ) : (
                <button className="btn sm danger" disabled={busy} onClick={() => setArmed(m)}>
                  Remove
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
