import { getPlayer, pickStatus, planetOf, slotIds } from "../../game/index.ts";
import { ClashTag, PickBadge } from "./PickBadge.tsx";
import { againstText, pickLine } from "./pickText.ts";
import type { WarCtx } from "./warTypes.ts";

interface Props extends WarCtx {
  /** The viewer's own player, marked "(you)". */
  myId?: string;
  /** The player shown in the move panel. */
  actingId: string | null;
  /** Owner only: show this player's pick in the move panel. */
  onActFor(id: string): void;
}

/** Every pick in round-start order, with live status. Visible all through Resolution. */
export function OrdersList({ state, viewer, colors, myId, actingId, onActFor }: Props) {
  return (
    <>
      <h3 style={{ marginTop: 16 }}>The orders, weakest first</h3>
      <ol className="st-order">
        {slotIds(state).map((id, i) => {
          const p = getPlayer(state, id);
          const pk = state.picks[id];
          if (!p) return null;
          const status = pickStatus(state, id);
          const done = status?.kind === "done";
          const world = pk ? planetOf(state, pk.zone)?.name : undefined;
          const against = againstText(state, id);
          const sub = [world, against ? `against ${against}` : null].filter(Boolean).join(" · ");
          return (
            <li key={id} className={`st-o${done ? " done" : ""}${id === myId ? " me" : ""}`} style={{ borderLeftColor: colors[id] }}>
              <span className="n">{i + 1}</span>
              <div>
                <div className="who">
                  <span className="dot" style={{ background: colors[id] }}></span>
                  <b>{p.name}</b>
                  {id === myId ? <span className="st-you">(you)</span> : null}
                </div>
                <div className="act-l">{pk ? (pk.act ? pickLine(state, pk) : "Played earlier") : "No pick"}</div>
                {sub ? <div className="st-sub">{sub}</div> : null}
                <div className="bd">
                  <PickBadge status={status} />
                  {done ? null : <ClashTag state={state} playerId={id} />}
                  {viewer.isOwner && !done && id !== actingId ? (
                    <button type="button" className="btn sm" onClick={() => onActFor(id)}>
                      Act for them
                    </button>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );
}
