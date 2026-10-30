import { useEffect, useState } from "react";
import { rankOf, rosterOf, toggleOn } from "../../game/index.ts";
import { useCampaign } from "../../store/useCampaign.ts";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Every Character in the Reach: the living by player, then the fallen as memorials (newest first). */
export function HallOfHeroes({ colors }: { colors: Record<string, string> }) {
  const { state, dispatch, viewer } = useCampaign();
  const relicsOn = toggleOn(state, "relics");
  const fallen = [...(state.fallen ?? [])].reverse();
  const [armed, setArmed] = useState<string | null>(null);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(null), 4000);
    return () => clearTimeout(t);
  }, [armed]);

  return (
    <>
      <p className="dim">Every Character in the Reach, the living and the fallen.</p>

      <h3>Living</h3>
      {state.players.map((p) => {
        const heroes = rosterOf(state, p.id)
          .filter((u) => u.isCharacter)
          .sort((a, b) => Number(b.isWarlord) - Number(a.isWarlord));
        return (
          <div key={p.id}>
            <div className="hp">
              <span className="dot" style={{ background: colors[p.id] }}></span>
              {p.name}
              <small>
                {p.faction} · {plural(heroes.length, "Character", "Characters")}
              </small>
            </div>
            {heroes.length === 0 && <div className="ro">No living Characters.</div>}
            {heroes.map((u) => (
              <div className="hero-row" key={u.id} style={{ borderLeftColor: colors[p.id] }}>
                <div className="nm">
                  {u.name}
                  {u.title && <span className="title-sub">, {u.title}</span>}
                </div>
                <div className="meta">
                  <span>{u.datasheet}</span>
                  <span>{rankOf(u.xp)}</span>
                  {u.isWarlord && <span className="badge war">Warlord</span>}
                </div>
                <div className="meta">
                  <span>
                    <b>{u.battles ?? 0}</b> battles
                  </span>
                  <span>
                    <b>{u.kills ?? 0}</b> kills
                  </span>
                  {relicsOn && (
                    <span>
                      <b>{u.relics?.length ?? 0}</b> {u.relics?.length === 1 ? "relic" : "relics"}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        );
      })}

      <h3>Fallen</h3>
      <p className="dim">Newest first.</p>
      {fallen.length === 0 && <div className="ro">No Characters have fallen yet.</div>}
      {fallen.map((f) => (
        <div className="mem" key={f.id}>
          <div className="top">
            <div className="nm">
              {f.name}
              {f.title && <span className="title-sub">, {f.title}</span>}
            </div>
            <span className="rnd">ROUND {f.round}</span>
          </div>
          <div className="meta">
            <span>{f.datasheet}</span>
            <span>{f.rank} at death</span>
            <span>{f.playerName}</span>
          </div>
          <div className="meta">
            <span>{plural(f.battles, "battle", "battles")}</span>
            <span>{plural(f.kills, "kill", "kills")}</span>
            {relicsOn && <span>{plural(f.relics.length, "relic", "relics")}</span>}
          </div>
          <div className="cause">{f.cause}</div>
          {viewer.isOwner && (
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="button" className="btn sm danger" onClick={() => (armed === f.id ? dispatch({ type: "deleteFallen", id: f.id }) : setArmed(f.id))}>
                {armed === f.id ? "Confirm delete" : "Delete entry"}
              </button>
            </div>
          )}
        </div>
      ))}
      {!viewer.isOwner && fallen.length > 0 && <div className="ro">READ-ONLY: only the campaign owner can delete a memorial entry.</div>}
    </>
  );
}
