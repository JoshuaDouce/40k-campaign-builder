import { HONOURS, rankOf, SCARS } from "../../game/index.ts";
import type { Dispatch, SetStateAction } from "react";
import { DieControl } from "./DieControl.tsx";
import type { Evaluation, Rolls, UnitView } from "./pbLogic.ts";

interface Props {
  ev: Evaluation;
  rolls: Rolls;
  setRolls: Dispatch<SetStateAction<Rolls>>;
  onBack(): void;
  onCancel(): void;
  onConfirm(): void;
}

export function PostBattleResults({ ev, rolls, setRolls, onBack, onCancel, onConfirm }: Props) {
  const put = <K extends keyof Rolls>(kind: K, key: string, v: Rolls[K][string]) => setRolls((r) => ({ ...r, [kind]: { ...r[kind], [key]: v } }));
  const rankUps = ev.views.filter((v) => v.slots.length > 0);
  const fallen = ev.views.filter((v) => v.fallen);

  return (
    <>
      <h2>Post-battle results</h2>
      <p className="dim">Step 2 of 2. Roll the dice at the table and enter them, or let the app roll. Nothing is saved until you confirm.</p>
      <div className="tbl">
        <table>
          <thead>
            <tr>
              <th>Unit</th>
              <th>XP</th>
              <th>Rank</th>
            </tr>
          </thead>
          <tbody>
            {ev.views.map((v) => (
              <tr key={v.unit.id}>
                <td>{v.unit.name}</td>
                <td className="n">+{v.gain} XP</td>
                <td>{rankOf(v.newXp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 style={{ marginTop: 6 }}>Rank-ups</h3>
      {rankUps.length === 0 && <p className="dim">Nobody ranked up this time.</p>}
      {rankUps.map((v) => (
        <HonourSlots key={v.unit.id} v={v} rolls={rolls} put={put} />
      ))}

      <h3>Roll for the fallen</h3>
      {fallen.length === 0 && <p className="dim">No units were destroyed.</p>}
      {fallen.map((v) => (
        <Fallen key={v.unit.id} v={v} rolls={rolls} put={put} />
      ))}

      <div className="row sub">
        <button type="button" className="btn primary" disabled={ev.blocked} onClick={onConfirm}>
          Confirm and save
        </button>
        <button type="button" className="btn" onClick={onBack}>
          Back
        </button>
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
      </div>
      {ev.blocked && (
        <div className="msg" style={{ marginTop: 6 }}>
          Finish the rolls above to confirm.
        </div>
      )}
    </>
  );
}

type Put = <K extends keyof Rolls>(kind: K, key: string, v: Rolls[K][string]) => void;

function HonourSlots({ v, rolls, put }: { v: UnitView; rolls: Rolls; put: Put }) {
  const { unit } = v;
  return (
    <>
      {v.slots.map((s) => {
        const pick = rolls.honPick[s.key];
        const badPick = !!pick && !s.chosen;
        return (
          <div className="res" key={s.key}>
            <div className="rt">
              {unit.name} reaches {rankOf(v.newXp)}
            </div>
            <div className="mono dim" style={{ fontSize: 12 }}>
              {unit.xp} → {v.newXp} XP · NEW BATTLE HONOUR {v.slots.length > 1 ? `${s.index + 1} of ${v.slots.length}` : ""}
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              <DieControl
                faces={6}
                value={s.roll}
                label="honour D6"
                onChange={(d) => {
                  put("honRoll", s.key, d);
                  put("honPick", s.key, undefined);
                }}
              />
              <select aria-label="Pick an honour" value={pick ?? ""} onChange={(e) => put("honPick", s.key, e.target.value || undefined)}>
                <option value="">Pick from list</option>
                {HONOURS.map((h) => {
                  const held = s.held.includes(h.n);
                  return (
                    <option key={h.n} value={h.n} disabled={held}>
                      {h.n}
                      {held ? " (held)" : ""}
                    </option>
                  );
                })}
              </select>
            </div>
            {s.dupRoll && (
              <div className="out bad">
                Rolled {s.roll}: {s.rolledName}, already held. Re-roll, or pick another from the list.
              </div>
            )}
            {s.rolledName && !s.dupRoll && !s.chosen && !badPick && (
              <div className="out">
                Rolled {s.roll}: {s.rolledName}. {HONOURS[(s.roll ?? 1) - 1].e}{" "}
                <button type="button" className="btn sm" onClick={() => put("honPick", s.key, s.rolledName)}>
                  Take it
                </button>
              </div>
            )}
            {badPick && <div className="out bad">{pick} is already held. Pick another.</div>}
            {s.chosen && (
              <div className="out">
                Gains <b>{s.chosen}</b>. {HONOURS.find((h) => h.n === s.chosen)?.e}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

function Fallen({ v, rolls, put }: { v: UnitView; rolls: Rolls; put: Put }) {
  const { unit } = v;
  const f = v.fallen;
  if (!f) return null;
  const n = unit.scars.length;
  return (
    <div className="res">
      <div className="rt">{unit.name} was destroyed</div>
      <div className="mono dim" style={{ fontSize: 12 }}>
        {unit.isCharacter ? "CHARACTER: SCAR ON 1–2" : "SCAR ON A 1"}
        {f.mod ? " · HARD TO KILL: +1 TO THE ROLL" : ""} · HAS {n} SCAR{n === 1 ? "" : "S"}
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <DieControl faces={6} value={f.d6} label="fallen D6" onChange={(d) => put("fallen", unit.id, d)} />
      </div>
      {f.d6 !== undefined && (
        <div className={`out${f.scarred ? " bad" : ""}`}>
          D6 {f.d6}
          {f.mod ? ` +${f.mod} = ${f.total}` : ""}: {f.scarred ? `Scarred (needs ${f.threshold} or less).` : `No scar (needs ${f.threshold} or less). The unit lives to fight on.`}
        </div>
      )}
      {f.scarred && (
        <>
          <div className="row" style={{ marginTop: 8 }}>
            <span className="lbl">Battle Scar</span>
            <DieControl faces={3} value={f.scarRoll} label="scar D3" onChange={(d) => put("scar", unit.id, d)} />
          </div>
          {f.scarName && f.scarDup && (
            <div className="out bad">
              Rolled {f.scarRoll}: {f.scarName}, which the unit already has. Duplicates don't stack: re-roll the D3.
            </div>
          )}
          {f.scarName && !f.scarDup && (
            <div className="out bad">
              Rolled {f.scarRoll}: <b>{f.scarName}</b>. {SCARS[(f.scarRoll ?? 1) - 1].e}
            </div>
          )}
          {f.scarName && !f.scarDup && f.needsWeapon && (
            <div className="field" style={{ marginTop: 8 }}>
              <label htmlFor={`wg_${unit.id}`}>Which weapon is worn?</label>
              <input type="text" id={`wg_${unit.id}`} value={rolls.weapon[unit.id] ?? ""} placeholder="e.g. bolt rifles" onChange={(e) => put("weapon", unit.id, e.target.value)} />
            </div>
          )}
          {f.gone && <div className="out gone">THIRD SCAR: {unit.name} is removed from your roster.</div>}
        </>
      )}
    </div>
  );
}
