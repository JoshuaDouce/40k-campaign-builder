import { fallenPlan, scarEffect, scarLabel, scarTableFor, WEAPON_MAX } from "../../game/index.ts";
import type { Unit, UnitTally } from "../../game/index.ts";
import { DieControl } from "../roster/DieControl.tsx";
import { EffectSelect } from "../roster/EffectSelect.tsx";

/** Every field of a unit's fallen roll, sent whole: a missing or null value clears it. */
export interface FallenValues {
  fallen: number | null;
  scarRoll: number | null;
  scarPick: string | null;
  weapon: string | null;
}

interface Props {
  unit: Unit;
  /** The unit's tally entry (it is Destroyed). */
  entry: UnitTally | undefined;
  /** Makes the rolls editable; otherwise they show as text. */
  editable: boolean;
  /** Unique per side and unit, for the weapon field's id. */
  uid: string;
  save(v: FallenValues): void;
}

/** A destroyed unit's fallen roll on the battle tracker: saved live on the shared tally, applied when the result is recorded. */
export function FallenRoll({ unit, entry, editable, uid, save }: Props) {
  const f = fallenPlan(unit, entry);
  const cur: FallenValues = { fallen: entry?.fallen ?? null, scarRoll: entry?.scarRoll ?? null, scarPick: entry?.scarPick ?? null, weapon: entry?.weapon ?? null };
  const put = (v: Partial<FallenValues>) => save({ ...cur, ...v });
  const n = f.warlord ? f.kept.length : unit.scars.length;
  const table = scarTableFor(unit);
  const scarNote = `HAS ${n} SCAR${n === 1 ? "" : "S"}`;
  const replaces = f.replaces ? scarLabel(f.replaces) : undefined;
  const nothing = f.warlord ? !f.scar : f.fallen === undefined;
  /** The entered scar, once it is one the unit can take (not a duplicate). */
  const newScar = f.scarDup ? undefined : f.scar;
  const ok = !!newScar;
  const scarLbl = unit.isCharacter ? "Character Battle Scar" : "Battle Scar";
  const notRolled = nothing && <div className="hint">{editable ? "Not rolled yet. The app rolls it if you leave it." : "No roll entered. The app will roll."}</div>;

  const scarOutcome = (
    <>
      {f.scar && f.scarDup && (
        <div className="out bad">
          {f.warlord || !entry?.scarRoll ? "" : `Rolled ${entry.scarRoll}: `}
          {f.scar}, which the unit already has. Duplicates don't stack: {f.warlord ? "re-roll the D3, or pick another from the list." : "re-roll the D3."}
        </div>
      )}
      {newScar && (
        <div className="out bad">
          {f.warlord ? "Takes" : `Rolled ${entry?.scarRoll}:`} <b>{newScar}</b>. {scarEffect(newScar)}
        </div>
      )}
      {ok && f.needsWeapon && editable && (
        <div className="field" style={{ marginTop: 8 }}>
          <label htmlFor={`wg_${uid}`}>Which weapon is worn?</label>
          <input
            type="text"
            id={`wg_${uid}`}
            key={cur.weapon ?? ""}
            defaultValue={cur.weapon ?? ""}
            maxLength={WEAPON_MAX}
            placeholder="e.g. bolt rifles"
            onBlur={(e) => {
              const w = e.target.value.trim();
              if (w !== (cur.weapon ?? "")) put({ weapon: w || null });
            }}
          />
        </div>
      )}
      {ok && f.needsWeapon && !editable && f.weapon && <div className="mono dim" style={{ fontSize: 12 }}>WEAPON: {f.weapon}</div>}
    </>
  );

  if (f.warlord) {
    return (
      <div className="warlord-row">
        <div className="rt">{unit.name} was destroyed</div>
        <div className="mono" style={{ fontSize: 12, color: "var(--brass)" }}>
          {unit.isCharacter ? "WARLORD — TAKES A CHARACTER BATTLE SCAR" : "WARLORD — TAKES A BATTLE SCAR"}
        </div>
        <div className="mono dim" style={{ fontSize: 12 }}>
          NO ROLL FOR THE FALLEN. NEVER REMOVED. NO RP PENALTY. {scarNote}.
        </div>
        {editable && (
          <>
            <div className="lbl" style={{ marginTop: 8 }}>
              {scarLbl}
            </div>
            <div className="row" style={{ marginTop: 4 }}>
              <DieControl faces={3} value={cur.scarPick ? undefined : (cur.scarRoll ?? undefined)} label="scar D3" onChange={(d) => put({ scarRoll: d ?? null, scarPick: null })} />
            </div>
            <EffectSelect
              label="Or pick a scar"
              placeholder="Choose a scar…"
              groups={[{ items: table }]}
              value={cur.scarPick ?? (cur.scarRoll ? (table[cur.scarRoll - 1]?.n ?? "") : "")}
              onPick={(s) => put({ scarPick: s || null, scarRoll: null })}
            />
          </>
        )}
        {scarOutcome}
        {replaces && ok && <div className="out bad">Replaces {replaces}.</div>}
        {notRolled}
        <div className="mono dim" style={{ fontSize: 11, marginTop: 8 }}>
          AT THREE SCARS, A NEW SCAR REPLACES THE OLDEST. RE-ROLL SCARS IT ALREADY HOLDS.
        </div>
      </div>
    );
  }

  return (
    <div className="res">
      <div className="rt">{unit.name} was destroyed</div>
      <div className="mono dim" style={{ fontSize: 12 }}>
        {unit.isCharacter ? "CHARACTER: SCAR ON 1–2" : "SCAR ON A 1"}
        {f.mod ? " · HARD TO KILL: +1 TO THE ROLL" : ""} · {scarNote}
      </div>
      {editable && (
        <div className="row" style={{ marginTop: 8 }}>
          <DieControl
            faces={6}
            value={f.fallen}
            label="fallen D6"
            enter
            // tallyFallen clears the scar entries when the roll doesn't scar.
            onChange={(d) => put({ fallen: d ?? null })}
          />
        </div>
      )}
      {f.fallen !== undefined && (
        <div className={`out${f.scarred ? " bad" : ""}`}>
          D6 {f.fallen}
          {f.mod ? ` +${f.mod} = ${f.total}` : ""}: {f.scarred ? `Scarred (needs ${f.threshold} or less).` : `No scar (needs ${f.threshold} or less). The unit lives to fight on.`}
        </div>
      )}
      {notRolled}
      {f.scarred && (
        <>
          <div className="row" style={{ marginTop: 8 }}>
            <span className="lbl">{scarLbl}</span>
            {editable && <DieControl faces={3} value={cur.scarRoll ?? undefined} label="scar D3" onChange={(d) => put({ scarRoll: d ?? null, scarPick: null })} />}
          </div>
          {scarOutcome}
          {f.gone && (
            <div className="out gone">
              THIRD SCAR: {unit.name} is removed from your roster.{unit.isCharacter ? " It is remembered in the Hall of Heroes." : ""}
            </div>
          )}
        </>
      )}
    </div>
  );
}
