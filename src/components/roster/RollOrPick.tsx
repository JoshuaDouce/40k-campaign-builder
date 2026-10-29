import type { EffectRow } from "../../game/index.ts";
import { DieControl } from "./DieControl.tsx";

interface Props {
  /** The table in die order (row 0 = a roll of 1); its length is the die size. */
  rows: readonly EffectRow[];
  /** Names already held: shown greyed out, and a roll of one is refused. */
  held: readonly string[];
  label: string;
  roll: number | undefined;
  pick: string;
  onRoll(v: number | undefined): void;
  onPick(name: string): void;
}

/** Roll the table's die, or pick a row from a list that shows what each one does. */
export function RollOrPick({ rows, held, label, roll, pick, onRoll, onPick }: Props) {
  const rolled = roll ? rows[roll - 1] : undefined;
  const chosen = pick || rolled?.n;
  return (
    <>
      <div className="row" style={{ marginTop: 8 }}>
        <DieControl faces={rows.length} value={roll} label={`${label} D${rows.length}`} enter={false} onChange={onRoll} />
        <span className="dim">or pick one below</span>
      </div>
      {rolled && !pick && (held.includes(rolled.n) ? (
        <div className="out bad">Rolled {roll}: {rolled.n}, already held. Re-roll, or pick another below.</div>
      ) : (
        <div className="out">
          Rolled {roll}: <b>{rolled.n}</b>. {rolled.e}
        </div>
      ))}
      <div className="picklist" role="group" aria-label={`Pick ${label}`}>
        {rows.map((r, i) => {
          const isHeld = held.includes(r.n);
          return (
            <button key={r.n} type="button" className="opt" aria-pressed={chosen === r.n} disabled={isHeld} onClick={() => onPick(r.n)}>
              <div>
                <b>
                  {i + 1}. {r.n}
                  {isHeld ? " (held)" : ""}
                </b>
                <small>{r.e}</small>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}
