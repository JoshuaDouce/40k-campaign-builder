import { useState } from "react";
import { HAND_LIMIT } from "../../game/index.ts";
import { RP_CAP } from "./battleMath.ts";
import { DEFAULT_SCENARIO } from "./stepGraph.ts";
import type { Scenario } from "./guideTypes.ts";

interface Props {
  sc: Scenario;
  onChange(sc: Scenario): void;
}

type BoolKey = {
  [K in keyof Scenario]: Scenario[K] extends boolean ? K : never;
}[keyof Scenario];

type NumKey = "players" | "rp" | "hand" | "supply";

interface NumFieldProps {
  id: NumKey;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onCommit(n: number): void;
}

/** A number box that keeps what is being typed, and only clamps and commits once the entry is finished. */
function NumField({ id, label, value, min, max, step, onCommit }: NumFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    const n = Number(draft);
    if (draft.trim() !== "" && Number.isFinite(n)) onCommit(Math.min(max, Math.max(min, Math.round(n))));
    setDraft(null);
  };
  return (
    <div className="field">
      <label htmlFor={`tg-${id}`}>{label}</label>
      <input
        id={`tg-${id}`}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={step}
        value={draft ?? value}
        onChange={(e) => {
          setDraft(e.target.value);
          const n = e.target.valueAsNumber;
          if (Number.isInteger(n) && n >= min && n <= max) onCommit(n);
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
        }}
      />
    </div>
  );
}

const summary = (sc: Scenario): string => {
  const parts = [`${sc.players} players`, sc.provinces ? "holding provinces" : "no provinces", `${sc.rp} RP`, `${sc.hand} cards`, `${sc.supply} pts supply`];
  if (sc.hollowOpen) parts.push("Hollowgate open");
  return parts.join(" · ");
};

export function ScenarioPanel({ sc, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const set = (patch: Partial<Scenario>) => onChange({ ...sc, ...patch });
  const check = (key: BoolKey, label: string) => (
    <label className="tg-check">
      <input type="checkbox" checked={sc[key]} onChange={(e) => set({ [key]: e.target.checked })} />
      <span>{label}</span>
    </label>
  );
  const num = (key: NumKey, label: string, min: number, max: number, step = 1) => (
    <NumField key={key} id={key} label={label} value={sc[key]} min={min} max={max} step={step} onCommit={(n) => set({ [key]: n })} />
  );

  return (
    <div className="tg-scenario">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <p className="mono dim tg-scsum">
          <span className="eyebrow">Your situation</span>
          <br />
          {summary(sc)}
        </p>
        <button className="btn sm tg-tap" aria-expanded={open} aria-controls="tg-scform" onClick={() => setOpen(!open)}>
          {open ? "Hide" : "Change"}
        </button>
      </div>
      {open && (
        <div id="tg-scform" className="tg-scform">
          <p className="dim" style={{ fontSize: 14 }}>
            Optional. Describe where you stand and options you can't take show why. Changing this restarts the walkthrough.
          </p>
          <div className="row">
            {num("players", "Players", 2, 12)}
            {num("rp", "Your RP (max 10)", 0, RP_CAP)}
            {num("hand", "Fate Cards in hand (max 5)", 0, HAND_LIMIT)}
            {num("supply", "Your supply limit (pts)", 500, 3000, 50)}
          </div>
          <div className="tg-checks">
            {check("provinces", "I hold at least one province")}
            {sc.provinces ? (
              <>
                {check("spaceport", "I hold my Capital or a Spaceport")}
                {check("middleHold", "I hold a province on a middle world")}
                {check("innerHold", "I hold a province on an inner world")}
                {check("enemyInReach", "An enemy holds a province I could reach")}
              </>
            ) : (
              check("unclaimedOuter", "Unclaimed outer-world provinces remain")
            )}
            {check("forge", "I hold a Forge")}
            {check("hollowOpen", "The Hollowgate is open")}
            {check("scouted", "I scouted last turn")}
          </div>
          <button className="btn sm tg-tap" onClick={() => onChange(DEFAULT_SCENARIO)}>
            Reset to defaults
          </button>
        </div>
      )}
    </div>
  );
}
