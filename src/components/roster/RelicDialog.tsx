import { useState } from "react";
import { capProblem, MAX_RELICS, RELIC_PTS, RELICS, rosterOf, withUnit } from "../../game/index.ts";
import type { Unit } from "../../game/index.ts";
import { useCampaign } from "../../store/useCampaign.ts";
import { RollOrPick } from "./RollOrPick.tsx";
import { Overlay, SheetFooter } from "./Overlay.tsx";

interface Props {
  playerId: string;
  unit: Unit;
  onDone(toast: string): void;
  onClose(): void;
}

type Source = "shrine" | "fate";

export function RelicDialog({ playerId, unit, onDone, onClose }: Props) {
  const { state, dispatch } = useCampaign();
  const [source, setSource] = useState<Source | null>(null);
  const [roll, setRoll] = useState<number | undefined>();
  const [pick, setPick] = useState("");
  const held = unit.relics ?? [];
  const rolledName = roll ? RELICS[roll - 1]?.n : undefined;
  const candidate = pick || rolledName;
  const chosen = candidate && !held.includes(candidate) ? candidate : undefined;
  const capBlock = chosen ? capProblem(state, playerId, withUnit(rosterOf(state, playerId), { ...unit, relics: [...held, chosen] })) : null;

  const go = () => {
    if (!source || !chosen) return;
    dispatch({ type: "addRelic", playerId, unitId: unit.id, relic: chosen, source });
    onDone(`${unit.name} finds ${chosen}.`);
  };

  return (
    <Overlay title="Roll a relic" onClose={onClose}>
      <p className="dim">
        {unit.name} holds {held.length} of {MAX_RELICS} relics. Each adds {RELIC_PTS} pts.
      </p>
      <div className="lbl">1. How was it earned?</div>
      <div className="picklist">
        <button type="button" className="opt" aria-pressed={source === "shrine"} onClick={() => setSource("shrine")}>
          <div>
            <b>Claimed a Shrine</b>
            <small>You claimed a Shrine province.</small>
          </div>
        </button>
        <button type="button" className="opt" aria-pressed={source === "fate"} onClick={() => setSource("fate")}>
          <div>
            <b>Played a Fate Card</b>
            <small>A Fate Card granted a relic.</small>
          </div>
        </button>
      </div>
      <div className="lbl" style={{ marginTop: 12 }}>
        2. Roll or pick
      </div>
      <RollOrPick
        rows={RELICS}
        held={held}
        label="Relic"
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
      {capBlock && (
        <div className="hint bad" role="alert">
          ! {capBlock}
        </div>
      )}
      <SheetFooter label={`Add relic (+${RELIC_PTS} pts)`} disabled={!source || !chosen || !!capBlock} onGo={go} onClose={onClose} />
    </Overlay>
  );
}
