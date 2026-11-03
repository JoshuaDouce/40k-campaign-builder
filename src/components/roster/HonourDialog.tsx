import { useState } from "react";
import { HONOUR_PTS, honoursOwed, honourTableFor, rankOf } from "../../game/index.ts";
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

/** Take one Battle Honour a unit is owed: roll the table's die or pick. Honours always apply (no supply or slot check). */
export function HonourDialog({ playerId, unit, onDone, onClose }: Props) {
  const { dispatch } = useCampaign();
  const [roll, setRoll] = useState<number | undefined>();
  const [pick, setPick] = useState("");
  const table = honourTableFor(unit);
  const held = unit.honours;
  const owed = honoursOwed(unit, unit.xp);
  const rolledName = roll ? table[roll - 1]?.n : undefined;
  const candidate = pick || rolledName;
  const chosen = candidate && !held.includes(candidate) ? candidate : undefined;

  const go = () => {
    if (!chosen) return;
    dispatch({ type: "takeHonour", playerId, unitId: unit.id, honour: chosen });
    onDone(`${unit.name} gains ${chosen}.`);
  };

  return (
    <Overlay title="Take a Battle Honour" onClose={onClose}>
      <p className="dim">
        {unit.name} reached {rankOf(unit.xp)} and is owed {owed} Battle Honour{owed === 1 ? "" : "s"}. Each adds {HONOUR_PTS} pts.
      </p>
      {unit.isCharacter && (
        <div className="mono dim" style={{ fontSize: 11 }}>
          TABLE: CHARACTER BATTLE HONOURS (D6). NO DUPLICATES ACROSS CHARACTER AND GENERIC HONOURS.
        </div>
      )}
      <RollOrPick
        rows={table}
        held={held}
        label="Honour"
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
      <SheetFooter label={`Take honour (+${HONOUR_PTS} pts)`} disabled={!chosen} onGo={go} onClose={onClose} />
    </Overlay>
  );
}
