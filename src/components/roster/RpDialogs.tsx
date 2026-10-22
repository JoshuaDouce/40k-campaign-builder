import { useState } from "react";
import { PROMOTION_COST, PROMOTION_MIN_XP, rankOf, RECRUITS_COST, scarEffect, SURGEON_COST, scarLabel, scarName } from "../../game/index.ts";
import type { Unit } from "../../game/index.ts";
import { useCampaign } from "../../store/useCampaign.ts";
import { Overlay, SheetFooter } from "./Overlay.tsx";
import { UnitFormSheet } from "./UnitFormSheet.tsx";

interface Props {
  playerId: string;
  roster: readonly Unit[];
  rp: number;
  onDone(toast: string): void;
  onClose(): void;
}

export function FieldSurgeonDialog({ playerId, roster, rp, onDone, onClose }: Props) {
  const { dispatch } = useCampaign();
  const [uid, setUid] = useState<string | null>(null);
  const [si, setSi] = useState<number | null>(null);
  const cands = roster.filter((u) => u.scars.length > 0);
  const unit = cands.find((u) => u.id === uid);
  const scar = unit && si !== null ? unit.scars[si] : undefined;

  const go = () => {
    if (!unit || scar === undefined || rp < SURGEON_COST) return;
    dispatch({ type: "fieldSurgeon", playerId, unitId: unit.id, scar });
    onDone(`Field Surgeon: ${unit.name} no longer has ${scarName(scar)} (-${SURGEON_COST} RP)`);
  };

  return (
    <Overlay title="Field Surgeon" onClose={onClose}>
      <p className="dim">
        {SURGEON_COST} RP. Remove one Battle Scar. You have {rp} RP.
      </p>
      <div className="lbl">1. Choose a unit with scars</div>
      <div className="picklist">
        {cands.length ? (
          cands.map((c) => (
            <button
              key={c.id}
              type="button"
              className="opt"
              aria-pressed={c.id === uid}
              onClick={() => {
                setUid(c.id);
                setSi(null);
              }}
            >
              <div>
                <b>{c.name}</b>
                <small>
                  {c.datasheet} · {c.scars.length} scar{c.scars.length > 1 ? "s" : ""}
                </small>
              </div>
            </button>
          ))
        ) : (
          <p className="dim">No unit has a scar. Nothing to mend.</p>
        )}
      </div>
      {unit && (
        <>
          <div className="lbl" style={{ marginTop: 12 }}>
            2. Choose the scar to remove
          </div>
          <div className="picklist">
            {unit.scars.map((s, i) => {
              return (
                <button key={s} type="button" className="opt" aria-pressed={i === si} onClick={() => setSi(i)}>
                  <div>
                    <b>{scarLabel(s)}</b>
                    <small>{scarEffect(s)}</small>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
      <SheetFooter label={`Spend ${SURGEON_COST} RP`} disabled={!unit || scar === undefined || rp < SURGEON_COST} onGo={go} onClose={onClose} />
    </Overlay>
  );
}

type PromoMode = "char" | "vet";

export function PromotionDialog({ playerId, roster, rp, onDone, onClose }: Props) {
  const { dispatch } = useCampaign();
  const [mode, setMode] = useState<PromoMode>("char");
  const [uid, setUid] = useState<string | null>(null);
  const [enh, setEnh] = useState("");
  const list = mode === "char" ? roster.filter((u) => u.isCharacter) : roster.filter((u) => !u.isCharacter && u.xp >= PROMOTION_MIN_XP);
  const unit = list.find((u) => u.id === uid);
  const ready = !!unit && rp >= PROMOTION_COST && (mode === "vet" || enh.trim() !== "");

  const go = () => {
    if (!unit || !ready) return;
    dispatch({ type: "promotion", playerId, unitId: unit.id, enhancement: mode === "char" ? enh.trim() : undefined });
    onDone(mode === "char" ? `Promotion: ${unit.name} gains an enhancement (-${PROMOTION_COST} RP)` : `Promotion: ${unit.name} is now a Character (-${PROMOTION_COST} RP)`);
  };
  const pickMode = (m: PromoMode) => {
    setMode(m);
    setUid(null);
    setEnh("");
  };

  return (
    <Overlay title="Promotion" onClose={onClose}>
      <p className="dim">
        {PROMOTION_COST} RP. Give a Character an enhancement, or make a Veteran unit's sergeant a Character. You have {rp} RP.
      </p>
      <div className="seg" role="group" aria-label="Promotion type">
        <button type="button" className="chip" aria-pressed={mode === "char"} onClick={() => pickMode("char")}>
          Character enhancement
        </button>
        <button type="button" className="chip" aria-pressed={mode === "vet"} onClick={() => pickMode("vet")}>
          Veteran becomes Character
        </button>
      </div>
      <div className="picklist" style={{ marginTop: 12 }}>
        {list.length ? (
          list.map((c) => (
            <button key={c.id} type="button" className="opt" aria-pressed={c.id === uid} onClick={() => setUid(c.id)}>
              <div>
                <b>{c.name}</b>
                <small>
                  {c.datasheet} · {rankOf(c.xp)}
                  {c.enhancement ? " · has an enhancement already" : ""}
                </small>
              </div>
            </button>
          ))
        ) : (
          <p className="dim">{mode === "char" ? "No Characters on the roster." : "No Veteran units that aren't already Characters."}</p>
        )}
      </div>
      {mode === "char" && uid && (
        <div className="field">
          <label htmlFor="p_enh">Enhancement</label>
          <input type="text" id="p_enh" value={enh} placeholder="Enhancement name and effect" onChange={(e) => setEnh(e.target.value)} />
        </div>
      )}
      {mode === "vet" && uid && (
        <p className="mono" style={{ fontSize: 12, color: "var(--brass)" }}>
          THE SERGEANT STEPS UP. THE UNIT GAINS THE CHARACTER BADGE.
        </p>
      )}
      <SheetFooter label={`Spend ${PROMOTION_COST} RP`} disabled={!ready} onGo={go} onClose={onClose} />
    </Overlay>
  );
}

export function SeasonedRecruitsDialog({ playerId, roster, rp, onDone, onClose }: Props) {
  const { dispatch } = useCampaign();
  return (
    <UnitFormSheet
      mode="recruits"
      roster={roster}
      rp={rp}
      onClose={onClose}
      onSave={(unit) => {
        if (rp < RECRUITS_COST) return;
        dispatch({ type: "seasonedRecruits", playerId, unit });
        onDone(`Seasoned Recruits: ${unit.name} joins at 3 XP (-${RECRUITS_COST} RP)`);
      }}
    />
  );
}
