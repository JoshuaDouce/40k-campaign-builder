import { useState } from "react";
import type { Unit } from "../../game/index.ts";
import { YS_BUTTON_LABEL, YellowscribeExport } from "../roster/YellowscribeExport.tsx";

/** One side's Yellowscribe button in the War Room: full size, so it is easy to find before and during the battle. */
export function YellowscribeButton({ candidates }: { candidates: readonly Unit[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn primary ys-btn" onClick={() => setOpen(true)}>
        {YS_BUTTON_LABEL}
      </button>
      {open && <YellowscribeExport candidates={candidates} absentLabel="Fielded but not in this army" onClose={() => setOpen(false)} />}
    </>
  );
}
