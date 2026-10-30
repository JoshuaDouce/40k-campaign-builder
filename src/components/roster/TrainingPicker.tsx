import { useState } from "react";
import { capProblem, getPlayer, MAX_TRAINING, PROMOTION_COST, promoted, rosterOf, toggleOn, TRAINING, TRAINING_PTS, trainingEffect, withUnit } from "../../game/index.ts";
import { useCampaign } from "../../store/useCampaign.ts";
import { EffectSelect } from "./EffectSelect.tsx";
import { HeldList } from "./HeldList.tsx";

/**
 * Battle Training in the unit dialog: what the Character holds, as text, and a dropdown to buy one more as a
 * Promotion (1 RP, +10 pts). Reads the live unit, so a buy shows straight away and a later Save keeps it.
 */
export function TrainingPicker({ playerId, unitId }: { playerId: string; unitId: string }) {
  const { state, dispatch, sync } = useCampaign();
  const [pick, setPick] = useState("");
  const [note, setNote] = useState("");
  const roster = rosterOf(state, playerId);
  const unit = roster.find((u) => u.id === unitId);
  const rp = getPlayer(state, playerId)?.rp ?? 0;
  if (!unit?.isCharacter) return null;
  const held = unit.training ?? [];
  const block = !toggleOn(state, "training")
    ? "Battle Training is off in this campaign: none can be bought."
    : held.length >= MAX_TRAINING ? `This Character has the most Battle Training it can hold (${MAX_TRAINING}).` : rp < PROMOTION_COST ? `Adding Battle Training costs ${PROMOTION_COST} RP. You have ${rp}.` : null;
  const capBlock = pick && !block ? capProblem(state, playerId, withUnit(roster, promoted(unit, pick))) : null;

  const buy = () => {
    if (!pick || block || capBlock) return;
    dispatch({ type: "promotion", playerId, unitId, training: pick });
    setNote(`${pick} added (−${PROMOTION_COST} RP, +${TRAINING_PTS} pts).`);
    setPick("");
  };

  return (
    <div className="sub">
      <div className="lbl">
        Battle Training · {held.length} of {MAX_TRAINING}
      </div>
      {held.length ? <HeldList items={held.map((n) => ({ n, e: trainingEffect(n), locked: true }))} tone="train" /> : <p className="hint">None yet.</p>}
      {block ? (
        <p className="hint">{block}</p>
      ) : (
        <>
          <EffectSelect
            label={`Add Battle Training · ${PROMOTION_COST} RP, +${TRAINING_PTS} pts · you have ${rp} RP`}
            placeholder="Choose training…"
            groups={[{ items: TRAINING.map((t) => (held.includes(t.n) ? { ...t, note: "Trained" } : t)) }]}
            value={pick}
            onPick={(n) => {
              setPick(n);
              setNote("");
            }}
          />
          {pick && (
            <div className="tp-confirm">
              {capBlock ? (
                <p className="hint bad">! {capBlock}</p>
              ) : (
                <p className="hint">You'll have {rp - PROMOTION_COST} RP left. Only the organiser can remove it, refunding the RP.</p>
              )}
              <div className="row">
                <button type="button" className="btn sm primary" disabled={!!capBlock || sync.saving || sync.offline} onClick={buy}>
                  Spend {PROMOTION_COST} RP
                </button>
                <button type="button" className="btn sm" onClick={() => setPick("")}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}
      <div className="toast" role="status">
        {note}
      </div>
    </div>
  );
}
