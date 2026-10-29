import { useState } from "react";
import { capProblem, forceOrgFor, promoted, withUnit, MAX_TRAINING, TRAINING, TRAINING_PTS, PROMOTION_COST, PROMOTION_MIN_XP, rankOf, RECRUITS_COST, scarEffect, SURGEON_COST, scarLabel, scarName } from "../../game/index.ts";
import type { Action, Unit } from "../../game/index.ts";
import { useCampaign } from "../../store/useCampaign.ts";
import { RollOrPick } from "./RollOrPick.tsx";
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
  const { state, dispatch } = useCampaign();
  // Setup allows one Character, the Warlord: no Veteran can be promoted until War Round 1.
  const setup = state.round === 0;
  const [mode, setMode] = useState<PromoMode>("char");
  const [uid, setUid] = useState<string | null>(null);
  const [roll, setRoll] = useState<number | undefined>();
  const [pick, setPick] = useState("");
  const trained = (u: Unit) => (u.training ?? []).length;
  const list = mode === "char" ? roster.filter((u) => u.isCharacter && trained(u) < MAX_TRAINING) : setup ? [] : roster.filter((u) => !u.isCharacter && u.xp >= PROMOTION_MIN_XP);
  const unit = list.find((u) => u.id === uid);
  // Battle Training: roll a D12 or pick; a name the Character already holds can't be taken again.
  const held = unit?.training ?? [];
  const rolledName = roll ? TRAINING[roll - 1]?.n : undefined;
  const candidate = pick || rolledName;
  const training = candidate && !held.includes(candidate) ? candidate : undefined;
  const capBlock = unit && (mode === "vet" || training) ? capProblem(state, playerId, withUnit(roster, promoted(unit, training))) : null;
  const ready = !!unit && rp >= PROMOTION_COST && (mode === "vet" || !!training) && !capBlock;

  const go = () => {
    if (!unit || !ready) return;
    dispatch({ type: "promotion", playerId, unitId: unit.id, training: mode === "char" ? training : undefined });
    onDone(mode === "char" ? `Promotion: ${unit.name} completes ${training} (-${PROMOTION_COST} RP)` : `Promotion: ${unit.name} is now a Character (-${PROMOTION_COST} RP)`);
  };
  const pickMode = (m: PromoMode) => {
    setMode(m);
    pickUnit(null);
  };
  const pickUnit = (id: string | null) => {
    setUid(id);
    setRoll(undefined);
    setPick("");
  };

  return (
    <Overlay title="Promotion" onClose={onClose}>
      <p className="dim">
        {PROMOTION_COST} RP. Give a Character Battle Training (+{TRAINING_PTS} pts each, up to {MAX_TRAINING}), or make a Veteran unit's sergeant a Character. You have {rp} RP.
      </p>
      <div className="seg" role="group" aria-label="Promotion type">
        <button type="button" className="chip" aria-pressed={mode === "char"} onClick={() => pickMode("char")}>
          Battle Training
        </button>
        <button type="button" className="chip" aria-pressed={mode === "vet"} onClick={() => pickMode("vet")}>
          Veteran becomes Character
        </button>
      </div>
      <div className="picklist" style={{ marginTop: 12 }}>
        {list.length ? (
          list.map((c) => (
            <button key={c.id} type="button" className="opt" aria-pressed={c.id === uid} onClick={() => pickUnit(c.id)}>
              <div>
                <b>{c.name}</b>
                <small>
                  {c.datasheet} · {rankOf(c.xp)}
                  {trained(c) ? ` · ${trained(c)} of ${MAX_TRAINING} Battle Training` : ""}
                </small>
              </div>
            </button>
          ))
        ) : (
          <p className="dim">{mode === "char" ? `No Characters on the roster with room for Battle Training (${MAX_TRAINING} at most).` : setup ? "Setup allows one Character: your Warlord. Veterans can be promoted from War Round 1." : "No Veteran units that aren't already Characters."}</p>
        )}
      </div>
      {mode === "char" && uid && (
        <>
          <RollOrPick
            rows={TRAINING}
            held={held}
            label="Battle Training"
            roll={roll}
            pick={pick}
            onRoll={(v) => {
              setRoll(v);
              setPick("");
            }}
            onPick={(n) => {
              setPick(n);
              setRoll(undefined);
            }}
          />
        </>
      )}
      {mode === "vet" && uid && (
        <p className="mono" style={{ fontSize: 12, color: "var(--brass)" }}>
          THE SERGEANT STEPS UP. THE UNIT GAINS THE CHARACTER BADGE.
        </p>
      )}
      {capBlock && (
        <div className="hint bad" role="alert">
          ! {capBlock}
        </div>
      )}
      <SheetFooter label={`Spend ${PROMOTION_COST} RP`} disabled={!ready} onGo={go} onClose={onClose} />
    </Overlay>
  );
}

export function SeasonedRecruitsDialog({ playerId, roster, rp, onDone, onClose }: Props) {
  const { state, dispatch } = useCampaign();
  return (
    <UnitFormSheet
      mode="recruits"
      playerId={playerId}
      faction={state.players.find((p) => p.id === playerId)?.faction}
      roster={roster}
      fo={forceOrgFor(state, playerId)}
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

/** A one-step RP spend (Reinforcements, Requisition the Deck, Extra Datasheet): what it costs and does, then confirm. */
export interface QuickSpend {
  title: string;
  cost: number;
  effect: string;
  action: Action;
  toast: string;
}

export function ConfirmSpendDialog({ spend, rp, onDone, onClose }: { spend: QuickSpend; rp: number; onDone(toast: string): void; onClose(): void }) {
  const { dispatch } = useCampaign();
  return (
    <Overlay title={spend.title} onClose={onClose}>
      <p>{spend.effect}</p>
      <p className="dim">
        Costs {spend.cost} RP. You have {rp} RP, leaving {rp - spend.cost}.
      </p>
      <SheetFooter
        label={`Spend ${spend.cost} RP`}
        disabled={rp < spend.cost}
        onGo={() => {
          dispatch(spend.action);
          onDone(spend.toast);
        }}
        onClose={onClose}
      />
    </Overlay>
  );
}
