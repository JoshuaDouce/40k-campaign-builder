import { fallenPlan, fieldedUnits, getPlayer } from "../../game/index.ts";
import type { CampaignState, LiveBattle } from "../../game/index.ts";
import { Overlay, SheetFooter } from "../roster/Overlay.tsx";

interface Props {
  state: CampaignState;
  battle: Pick<LiveBattle, "lists" | "tally">;
  /** The players with a list in this battle. */
  sides: readonly string[];
  /** The result as the button said it, e.g. "Varn won", or null for a draw. */
  label: string | null;
  onGo(): void;
  onClose(): void;
}

/** The check before a result is recorded: what to have entered, which fallen rolls the app will make, and who a third scar removes. */
export function ConfirmRecord({ state, battle, sides, label, onGo, onClose }: Props) {
  // Per side: the destroyed units the app will roll for, and the ones an entered roll removes (third scar).
  const rollFor = sides.map((side) => {
    const units = battle.tally?.[side]?.units;
    const plans = fieldedUnits(state, battle, side)
      .filter((u) => units?.[u.id]?.destroyed)
      .map((u) => ({ u, plan: fallenPlan(u, units?.[u.id]) }));
    return {
      side,
      name: getPlayer(state, side)?.name ?? "Unknown",
      pending: plans.filter((x) => !x.plan.complete).map((x) => x.u.name),
      gone: plans.filter((x) => x.plan.scarred && x.plan.gone && x.plan.fallen !== undefined).map((x) => x.u.name),
    };
  });
  const withPending = rollFor.filter((x) => x.pending.length > 0).length;
  return (
    <Overlay title="Record the result?" onClose={onClose}>
      <p>{label === null ? "A draw." : `${label}.`}</p>
      <p className="dim">Before you record it, check that everything from the battle is in:</p>
      <ul className="rl">
        <li>Units lost (Destroyed)</li>
        <li>Kills</li>
        <li>Marked for Glory</li>
        <li>Fallen rolls for destroyed units</li>
      </ul>
      {rollFor.map(
        (x) =>
          x.pending.length > 0 && (
            <div className="hint" key={x.side}>
              The app will roll for: {withPending > 1 ? `${x.name}: ` : ""}
              {x.pending.join(", ")}.
            </div>
          ),
      )}
      {rollFor.flatMap((x) => x.gone.map((n) => <div className="warnline" key={`${x.side}-${n}`}>{n} will be removed from the roster (third scar).</div>))}
      <SheetFooter label="Record result" closeLabel="Go back" onGo={onGo} onClose={onClose} />
    </Overlay>
  );
}
