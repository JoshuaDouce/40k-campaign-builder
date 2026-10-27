import { useState } from "react";
import { rankOf } from "../../game/index.ts";
import type { Unit } from "../../game/index.ts";
import { useCampaign } from "../../store/useCampaign.ts";
import { BLANK_ROW, evaluate, NO_ROLLS, xpGainFor } from "./pbLogic.ts";
import type { Rolls, Row } from "./pbLogic.ts";
import { PostBattleResults } from "./PostBattleResults.tsx";

interface Props {
  playerId: string;
  roster: readonly Unit[];
  onClose(toast?: string): void;
}

/** Two steps: who fought and what they did, then the rank-up and fallen rolls. Nothing is saved until Confirm. */
export function PostBattleHelper({ playerId, roster, onClose }: Props) {
  const { state, dispatch } = useCampaign();
  const [step, setStep] = useState<1 | 2>(1);
  // Units on the player's latest army list start as fought.
  const [preset] = useState(() => (state.lastArmy?.[playerId] ?? []).filter((id) => roster.some((u) => u.id === id)));
  const [rows, setRows] = useState<Record<string, Row | undefined>>(() => Object.fromEntries(preset.map((id) => [id, { ...BLANK_ROW, fought: true }])));
  const [glory, setGlory] = useState<string | null>(null);
  const [rolls, setRolls] = useState<Rolls>(NO_ROLLS);

  const row = (id: string): Row => rows[id] ?? BLANK_ROW;
  const patch = (id: string, p: Partial<Row>) => setRows((r) => ({ ...r, [id]: { ...(r[id] ?? BLANK_ROW), ...p } }));
  const anyFought = roster.some((u) => row(u.id).fought);
  const ev = evaluate(roster, rows, glory, rolls);

  const confirm = () => {
    if (ev.blocked || !ev.results.length) return;
    dispatch({ type: "applyPostBattle", playerId, results: ev.results });
    onClose("Battle recorded: XP, career, honours and scars saved." + (ev.anyGone ? " A unit was lost to its third scar." : ""));
  };

  if (step === 2) {
    return <PostBattleResults ev={ev} rolls={rolls} setRolls={setRolls} onBack={() => setStep(1)} onCancel={() => onClose()} onConfirm={confirm} />;
  }

  return (
    <>
      <h2>Post-battle helper</h2>
      <p className="dim">Step 1 of 2. Who fought? Award XP the way the rules say: +1 to every unit that fought and survived, +1 per enemy unit destroyed, +2 to the one unit Marked for Glory.</p>
      {preset.length > 0 && (
        <p className="hint" style={{ margin: "0 0 8px" }}>
          Preselected from your army list.
        </p>
      )}
      {roster.map((u) => {
        const r = row(u.id);
        const g = xpGainFor(r, glory === u.id);
        return (
          <div key={u.id} className={`pbunit${r.fought ? "" : " off"}`}>
            <div className="nm">{u.name}</div>
            <div className="mono dim" style={{ fontSize: 11 }}>
              {u.datasheet.toUpperCase()} · {u.xp} XP · {rankOf(u.xp).toUpperCase()}
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              <button
                type="button"
                className="chip"
                aria-pressed={r.fought}
                onClick={() => {
                  if (r.fought) {
                    patch(u.id, BLANK_ROW);
                    if (glory === u.id) setGlory(null);
                  } else patch(u.id, { fought: true });
                }}
              >
                Fought
              </button>
              <button type="button" className="chip" aria-pressed={r.destroyed} disabled={!r.fought} onClick={() => patch(u.id, { destroyed: !r.destroyed })}>
                Destroyed
              </button>
              <span className="stepper">
                <span className="lbl">Kills</span>
                <button type="button" className="btn sm" aria-label="Fewer kills" disabled={!r.fought || r.kills <= 0} onClick={() => patch(u.id, { kills: r.kills - 1 })}>
                  −
                </button>
                <output>{r.kills}</output>
                <button type="button" className="btn sm" aria-label="More kills" disabled={!r.fought} onClick={() => patch(u.id, { kills: r.kills + 1 })}>
                  +
                </button>
              </span>
              <button type="button" className="chip" aria-pressed={glory === u.id} disabled={!r.fought} onClick={() => setGlory(glory === u.id ? null : u.id)}>
                Marked for Glory
              </button>
            </div>
            <div className="xpprev">
              <span>XP GAIN</span>
              <span className="gain">+{g}</span>
              <span className="dim">
                {u.xp} → {u.xp + g}
              </span>
              <label className="dim" style={{ marginLeft: "auto" }}>
                Override{" "}
                <input type="number" min={0} step={1} inputMode="numeric" placeholder="auto" disabled={!r.fought} value={r.ov} onChange={(e) => patch(u.id, { ov: e.target.value })} />
              </label>
            </div>
          </div>
        );
      })}
      <div className="row" style={{ marginTop: 14 }}>
        <button type="button" className="btn primary" disabled={!anyFought} onClick={() => setStep(2)}>
          Next: results
        </button>
        <button type="button" className="btn" onClick={() => onClose()}>
          Cancel
        </button>
      </div>
      {!anyFought && (
        <div className="msg" style={{ marginTop: 6 }}>
          Tick at least one unit that fought.
        </div>
      )}
    </>
  );
}
