import { defendingLines, pickStatus } from "../../game/index.ts";
import { BattleCard } from "./BattleCard.tsx";
import { ClashTag, PickBadge } from "./PickBadge.tsx";
import type { WarCtx } from "./warTypes.ts";

interface Props extends WarCtx {
  /** The player being attacked. */
  playerId: string;
  /** True when this is the viewer's own player (wording "you"). */
  isYou: boolean;
  /** Name used when it is not the viewer. */
  name: string;
}

/** One line for each battle where this player defends. An In-battle fight shows its card so the result can be recorded. */
export function DefenderLines({ playerId, isYou, name, ...ctx }: Props) {
  const { state } = ctx;
  const lines = defendingLines(state, playerId);
  if (!lines.length) return null;
  return (
    <>
      <ul className="st-defs" aria-label="Battles you defend">
        {lines.map((l) => {
          const status = pickStatus(state, l.attackerId);
          return (
            <li key={l.attackerId} className="st-def">
              <b>{l.attacker}</b> attacks {isYou ? "you" : name} at <b>{l.zoneName}</b>
              <div className="bd">
                <PickBadge status={status} />
                <ClashTag state={state} playerId={l.attackerId} />
              </div>
              {status?.kind === "battle" ? <BattleCard state={state} dispatch={ctx.dispatch} can={ctx.can} playerId={l.attackerId} /> : null}
            </li>
          );
        })}
      </ul>
      {lines.length > 1 && isYou ? <p className="hint">You are defending two battles. That is allowed; the table decides how to play them in turn.</p> : null}
    </>
  );
}
