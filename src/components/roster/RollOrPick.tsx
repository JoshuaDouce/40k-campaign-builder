import type { EffectRow } from "../../game/index.ts";
import { DieControl } from "./DieControl.tsx";
import { EffectSelect } from "./EffectSelect.tsx";

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

/** Roll the table's die, or pick a row from a two-line dropdown that shows what each one does. */
export function RollOrPick({ rows, held, label, roll, pick, onRoll, onPick }: Props) {
  const rolled = roll ? rows[roll - 1] : undefined;
  return (
    <>
      <div className="row" style={{ marginTop: 8 }}>
        <DieControl faces={rows.length} value={roll} label={`${label} D${rows.length}`} onChange={onRoll} />
      </div>
      {rolled && !pick && (held.includes(rolled.n) ? (
        <div className="out bad">Rolled {roll}: {rolled.n}, already held. Re-roll, or pick another below.</div>
      ) : (
        <div className="out">
          Rolled {roll}: <b>{rolled.n}</b>. {rolled.e}
        </div>
      ))}
      <EffectSelect
        label={`Or pick ${label}`}
        placeholder="Choose from the list…"
        groups={[{ items: rows.map((r) => (held.includes(r.n) ? { ...r, note: "Held" } : r)) }]}
        value={pick}
        onPick={onPick}
      />
    </>
  );
}
