import { useState } from "react";
import { RECUPERATE_SCARS, rosterOf, scarEffect, scarLabel } from "../../game/index.ts";
import type { CampaignState } from "../../game/index.ts";
import { Overlay, SheetFooter } from "../roster/Overlay.tsx";

interface Props {
  state: CampaignState;
  playerId: string;
  onGo(scars: { unitId: string; scar: string }[]): void;
  onClose(): void;
}

/** Recuperate: +1 RP, and pick up to two Battle Scars from the roster to remove, like a Field Surgeon. */
export function RecuperateDialog({ state, playerId, onGo, onClose }: Props) {
  const [picked, setPicked] = useState<{ unitId: string; scar: string }[]>([]);
  const scarred = rosterOf(state, playerId).filter((u) => u.scars.length > 0);
  const isPicked = (unitId: string, scar: string) => picked.some((p) => p.unitId === unitId && p.scar === scar);
  const toggle = (unitId: string, scar: string) =>
    setPicked((prev) => (isPicked(unitId, scar) ? prev.filter((p) => !(p.unitId === unitId && p.scar === scar)) : prev.length < RECUPERATE_SCARS ? [...prev, { unitId, scar }] : prev));
  const full = picked.length >= RECUPERATE_SCARS;

  return (
    <Overlay title="Recuperate" onClose={onClose}>
      <p className="dim">
        Gain 1 RP and remove up to {RECUPERATE_SCARS} Battle Scars from your roster. {picked.length} of {RECUPERATE_SCARS} picked.
      </p>
      {scarred.length ? (
        scarred.map((u) => (
          <div key={u.id}>
            <div className="lbl" style={{ marginTop: 12 }}>
              {u.name}
            </div>
            <div className="picklist">
              {u.scars.map((s) => {
                const on = isPicked(u.id, s);
                return (
                  <button key={s} type="button" className="opt" aria-pressed={on} disabled={!on && full} onClick={() => toggle(u.id, s)}>
                    <div>
                      <b>{scarLabel(s)}</b>
                      <small>{scarEffect(s)}</small>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))
      ) : (
        <p className="dim">No unit has a scar. You still gain 1 RP.</p>
      )}
      <SheetFooter label={picked.length ? `Recuperate · remove ${picked.length} scar${picked.length > 1 ? "s" : ""}` : "Recuperate"} onGo={() => onGo(picked)} onClose={onClose} />
    </Overlay>
  );
}
