import { useId, useState } from "react";
import type { ReactNode } from "react";
import { ACTIONS, actionAvailable, buildPick, pickZones, tiedUp } from "../../game/index.ts";
import type { ActionId, CampaignState, PickChoice, Player, RoundPick, Zone } from "../../game/index.ts";
import { GarrisonSelect } from "./GarrisonSelect.tsx";
import { garrisonFor } from "./pickText.ts";
import { TargetList } from "./TargetList.tsx";

interface Props {
  state: CampaignState;
  player: Player;
  /** Start from this pick (Planning, after Unready). */
  initial?: RoundPick;
  /** Greys provinces another unfinished pick is on (switching in Resolution). */
  greyTiedUp?: boolean;
  submitLabel: string;
  /** Extra permission check for the submit button. */
  allowed: boolean;
  onSubmit(choice: PickChoice): void;
  /** Hint shown under the target list. */
  hint?: string;
  /** Extra button beside the submit button. */
  extra?: ReactNode;
}

/** Action picker, legal targets and garrison player. Used to plan, to switch and to choose again. */
export function PickPicker({ state, player, initial, greyTiedUp, submitLabel, allowed, onSubmit, hint, extra }: Props) {
  const [act, setAct] = useState<ActionId | null>(initial?.act ?? null);
  const [zoneSel, setZoneSel] = useState<string | null>(initial?.zone ?? null);
  const [defSel, setDefSel] = useState<string | null>(initial?.def ?? null);
  const defId = useId();

  const def = ACTIONS.find((a) => a.id === act);
  const used = (id: string) => !!greyTiedUp && tiedUp(state, id, player.id);
  // Each action's targets, worked out once per render.
  const zonesFor = new Map<ActionId, Zone[]>(ACTIONS.map((a) => [a.id, pickZones(state, player, a.id)]));
  const zones: Zone[] = (act && zonesFor.get(act)) || [];
  const hasTarget = !!def && (def.battle || def.id === "fortify");
  const zoneId = zoneSel && zones.some((v) => v.id === zoneSel && !used(v.id)) ? zoneSel : null;
  const unclaimedConquer = act === "conquer" && !!zoneId && !state.terr[zoneId];
  const garrisonId = garrisonFor(state, player.id, defSel);
  const choice: PickChoice | null = act ? { act, zone: hasTarget ? (zoneId ?? undefined) : undefined, def: unclaimedConquer ? garrisonId : undefined } : null;
  const complete = !!choice && !!buildPick(state, player, choice);

  return (
    <>
      <div className="acts-grid">
        {ACTIONS.map((a) => {
          const ok = actionAvailable(state, player, a.id, zonesFor.get(a.id));
          const sel = a.id === act;
          return (
            <button
              key={a.id}
              type="button"
              className={`act${sel ? " sel" : ""}`}
              aria-pressed={sel}
              disabled={!ok}
              style={ok ? undefined : { opacity: 0.4, cursor: "not-allowed" }}
              onClick={() => {
                setAct(a.id);
                setZoneSel(null);
              }}
            >
              <span className={`at ${a.battle ? "b" : "q"}`}>{a.battle ? "Battle" : "No battle"}</span>
              <span className="an">{a.n}</span>
              <span className="ad">{a.d}</span>
            </button>
          );
        })}
      </div>
      {def && hasTarget ? (
        <>
          <div className="eyebrow">{def.n} · choose a province</div>
          <TargetList state={state} zones={zones} selected={zoneId} onSelect={setZoneSel} tiedUp={used} label={`${def.n} targets`} />
        </>
      ) : null}
      {unclaimedConquer ? <GarrisonSelect state={state} playerId={player.id} id={defId} value={garrisonId} onChange={setDefSel} inRow /> : null}
      {hint ? (
        <p className="dim" style={{ fontSize: 14, margin: "8px 0 0" }}>
          {hint}
        </p>
      ) : null}
      <div className="row" style={{ marginTop: 12 }}>
        <button type="button" className="btn primary" disabled={!complete || !allowed} onClick={() => choice && onSubmit(choice)}>
          {submitLabel}
        </button>
        {extra}
      </div>
    </>
  );
}
