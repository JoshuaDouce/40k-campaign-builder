import { useState } from "react";
import { CAUSE_MAX, DEFAULT_CAUSE } from "../../game/index.ts";
import type { Unit } from "../../game/index.ts";
import { Overlay, SheetFooter } from "./Overlay.tsx";

const CAUSE_CHIPS = ["Slain at the Cinderfall breach", "Lost to the Warp", DEFAULT_CAUSE];

/** "Why did they fall?": removing a Character moves it to the Hall of Heroes with a cause. */
export function FallSheet({ unit, onConfirm, onClose }: { unit: Unit; onConfirm(cause: string): void; onClose(): void }) {
  const [cause, setCause] = useState("");
  return (
    <Overlay title="Why did they fall?" onClose={onClose}>
      <p className="dim">
        {unit.name}
        {unit.title ? `, ${unit.title}` : ""} will be moved to the Hall of Heroes as a memorial.
      </p>
      <div className="field">
        <label htmlFor="f_cause">Cause (optional)</label>
        <input type="text" id="f_cause" maxLength={CAUSE_MAX} value={cause} placeholder={DEFAULT_CAUSE} onChange={(e) => setCause(e.target.value)} />
      </div>
      <div className="chips" style={{ marginTop: 8 }}>
        {CAUSE_CHIPS.map((c) => (
          <button key={c} type="button" className="chip" aria-pressed={cause === c} onClick={() => setCause(c)}>
            {c}
          </button>
        ))}
      </div>
      <SheetFooter label="Remove and remember" danger onGo={() => onConfirm(cause.trim() || DEFAULT_CAUSE)} onClose={onClose} />
    </Overlay>
  );
}
