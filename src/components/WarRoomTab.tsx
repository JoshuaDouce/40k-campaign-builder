import { useState } from "react";
import {
  ACTIONS,
  battleInfo,
  canPerform,
  count,
  currentActor,
  getPlanet,
  getPlayer,
  getZone,
  LIGHT_FORCES_MAX_PTS,
  LIGHT_FORCES_TWIST,
  ownerOf,
  provsOf,
  PTYPES,
  sizeOf,
  stageText,
  supplyOf,
  targets,
  TWISTS,
  VTYPES,
} from "../game/index.ts";
import type { Action, ActionDef, CampaignState, Player, Zone } from "../game/index.ts";
import { useCampaign } from "../store/useCampaign.ts";
import type { CampaignViewer } from "../store/useCampaign.ts";
import type { TabId } from "../store/useDevicePrefs.ts";

interface Props {
  colors: Record<string, string>;
  onNavigate: (tab: TabId) => void;
}

export function WarRoomTab({ colors, onNavigate }: Props) {
  const { state, dispatch, viewer } = useCampaign();
  const can = (a: Action) => canPerform(state, a, viewer);

  return (
    <section className="tab" id="war">
      <h2>War Room</h2>
      <p className="dim">Runs the campaign turn by turn. Battle results update the map and players automatically. Record XP and scars on your own rosters.</p>
      <div>
        {state.players.length === 0 ? (
          <p>{state.round === 0 ? "Add players on the Setup tab first." : "Add players on the Players tab first."}</p>
        ) : (
          <WarBody state={state} dispatch={dispatch} viewer={viewer} colors={colors} can={can} onNavigate={onNavigate} />
        )}
      </div>
      <h3>Campaign log</h3>
      <ul className="log">
        {state.log.length ? (
          state.log.slice(0, 25).map((l, i) => (
            <li key={`${state.log.length - i}`}>
              <span className="r">R{l.r}</span>
              {l.segs.map((seg, j) => (seg.b ? <b key={j}>{seg.t}</b> : <span key={j}>{seg.t}</span>))}
            </li>
          ))
        ) : (
          <li>Nothing yet. Begin the first War Round.</li>
        )}
      </ul>
    </section>
  );
}

interface BodyProps {
  state: CampaignState;
  dispatch(a: Action): void;
  viewer: CampaignViewer;
  colors: Record<string, string>;
  can(a: Action): boolean;
  onNavigate: (tab: TabId) => void;
}

function WarBody({ state, dispatch, colors, can, onNavigate }: BodyProps) {
  const winner = getPlayer(state, state.won);
  const actor = currentActor(state);
  return (
    <>
      <div className="row mono" style={{ fontSize: 13, color: "var(--brass)" }}>
        {stageText(state)}
      </div>
      {state.won ? (
        <div className="win">
          <span className="eyebrow">The Reach is taken</span>
          <b>{winner ? winner.name : "Someone"}</b>holds the Hollowgate. Play on for a rematch, or reset the campaign.
        </div>
      ) : null}
      {state.turnIdx === null && state.round === 0 ? (
        <div className="card" style={{ margin: "12px 0" }}>
          <div className="k">
            <span>Round 0</span>
          </div>
          <div className="t">Campaign setup is under way</div>
          <p className="e dim" style={{ margin: "0 0 6px" }}>
            Finish it on the Setup tab to start War Round 1.
          </p>
          <div className="row">
            <button className="btn primary" onClick={() => onNavigate("setup")}>
              Go to Setup
            </button>
          </div>
        </div>
      ) : state.turnIdx === null ? (
        <BetweenRounds state={state} dispatch={dispatch} can={can} />
      ) : (
        <>
          <div className="strip">
            {state.order.map((id, i) => {
              const p = getPlayer(state, id);
              if (!p || state.turnIdx === null) return null;
              const cls = i < state.turnIdx ? "done" : i === state.turnIdx ? "cur" : "";
              return (
                <span key={id} className={`chip ${cls}`}>
                  <span className="dot" style={{ background: colors[p.id] }}></span>
                  {p.name}
                </span>
              );
            })}
          </div>
          {actor ? (
            <TurnPanel state={state} dispatch={dispatch} actor={actor} can={can} />
          ) : (
            <div className="turn">
              <p className="dim" style={{ margin: 0 }}>
                That player has left, so there is no one to take this turn. Reset the campaign from the Players tab to start over.
              </p>
            </div>
          )}
        </>
      )}
    </>
  );
}

function BetweenRounds({ state, dispatch, can }: Pick<BodyProps, "state" | "dispatch" | "can">) {
  const homeless = state.players.filter((p) => !provsOf(state, p).length);
  return (
    <div className="turn">
      <div className="eyebrow">War Round {state.round} complete</div>
      <h4>War Round {state.round + 1}</h4>
      {homeless.length ? (
        <p style={{ marginTop: 8, color: "var(--blood)" }}>
          {homeless.map((p) => p.name).join(", ")} hold no provinces. They can Conquer any unclaimed province on an outer world.
        </p>
      ) : null}
      <p>Everyone draws a Fate Card and collects RP from Capitals and Hive Cities. Then each player takes a turn, fewest provinces first.</p>
      <button className="btn primary" disabled={!can({ type: "beginRound" })} onClick={() => dispatch({ type: "beginRound" })}>
        Begin War Round {state.round + 1}
      </button>
    </div>
  );
}

function TurnPanel({ state, dispatch, actor, can }: { state: CampaignState; dispatch(a: Action): void; actor: Player; can(a: Action): boolean }) {
  const pd = state.pend;
  const def = pd ? ACTIONS.find((x) => x.id === pd.act) : undefined;
  return (
    <div className="turn">
      <div className="eyebrow">
        War Round {state.round} · Turn {(state.turnIdx ?? 0) + 1} of {state.order.length}
      </div>
      <h4>{actor.name}</h4>
      <p className="dim mono" style={{ fontSize: 12, marginTop: 4 }}>
        {actor.faction.toUpperCase()} · {actor.rp} RP · SUPPLY {supplyOf(actor)} · {count(state, actor)} PROVINCES · HAND {actor.hand.length}/5
      </p>
      {!pd || !def ? (
        <>
          <p style={{ margin: "10px 0 0" }}>Choose a campaign action.</p>
          <div className="acts-grid">
            {ACTIONS.map((a) => {
              const ok = a.battle
                ? targets(state, actor, a.id).length > 0 && state.players.length > 1
                : a.id === "fortify"
                  ? provsOf(state, actor).length > 0
                  : true;
              const enabled = ok && can({ type: "chooseAction", act: a.id });
              return (
                <button
                  key={a.id}
                  className="act"
                  disabled={!enabled}
                  style={enabled ? undefined : { opacity: 0.4, cursor: "not-allowed" }}
                  onClick={() => dispatch({ type: "chooseAction", act: a.id })}
                >
                  <span className={`at ${a.battle ? "b" : "q"}`}>{a.battle ? "Battle" : "No battle"}</span>
                  <span className="an">{a.n}</span>
                  <span className="ad">{a.d}</span>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div className="row" style={{ justifyContent: "space-between", marginTop: 10 }}>
            <span style={{ fontFamily: "var(--f-display)", fontSize: 24, color: "var(--brass)" }}>{def.n}</span>
            {pd.rolled ? null : (
              <button className="btn sm" disabled={!can({ type: "cancelAction" })} onClick={() => dispatch({ type: "cancelAction" })}>
                Change action
              </button>
            )}
          </div>
          {def.battle ? (
            pd.rolled ? (
              <BattleCard key={`${state.round}-${state.turnIdx}`} state={state} dispatch={dispatch} can={can} />
            ) : (
              <BattleSetup key={`${state.round}-${state.turnIdx}-${pd.act}`} state={state} dispatch={dispatch} actor={actor} act={def.id} can={can} />
            )
          ) : (
            <QuietConfirm key={`${state.round}-${state.turnIdx}-${pd.act}`} state={state} dispatch={dispatch} actor={actor} def={def} can={can} />
          )}
        </>
      )}
    </div>
  );
}

function groupName(state: CampaignState, v: Zone): string {
  if (v.type === "rift") return "The Rift";
  return getPlanet(state, v.pl)?.name ?? "";
}

function BattleSetup({ state, dispatch, actor, act, can }: { state: CampaignState; dispatch(a: Action): void; actor: Player; act: ActionDef["id"]; can(a: Action): boolean }) {
  const [zoneSel, setZoneSel] = useState<string | null>(null);
  const [defSel, setDefSel] = useState<string | null>(null);
  const tg = targets(state, actor, act);
  const zoneId = zoneSel && tg.some((v) => v.id === zoneSel) ? zoneSel : (tg[0]?.id ?? "");
  const zv = getZone(state, zoneId);
  const holder = ownerOf(state, zoneId);
  const others = state.players.filter((p) => p.id !== actor.id);
  const defId = holder ? holder.id : defSel && others.some((p) => p.id === defSel) ? defSel : (others[0]?.id ?? "");
  const groups = new Map<string, Zone[]>();
  tg.forEach((v) => {
    const k = groupName(state, v);
    groups.set(k, [...(groups.get(k) ?? []), v]);
  });
  const roll: Action = { type: "rollBattle", zone: zoneId, def: defId };
  const zonePlanet = zv && zv.type !== "rift" ? getPlanet(state, zv.pl) : undefined;

  return (
    <>
      <div className="row" style={{ marginTop: 10, alignItems: "flex-end" }}>
        <div className="field">
          <label htmlFor="zoneSel">Province</label>
          <select id="zoneSel" value={zoneId} onChange={(e) => setZoneSel(e.target.value)}>
            {[...groups.entries()].map(([g, list]) => (
              <optgroup key={g} label={g}>
                {list.map((v) => {
                  const o = ownerOf(state, v.id);
                  return (
                    <option key={v.id} value={v.id}>
                      {v.name} · {sizeOf(state, v)} pts{o ? ` · ${o.name}` : ""}
                    </option>
                  );
                })}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="defSel">{holder ? "Defender" : "Garrison player"}</label>
          {holder ? (
            <div style={{ padding: "7px 0" }}>{holder.name} (holds it)</div>
          ) : (
            <select id="defSel" value={defId} onChange={(e) => setDefSel(e.target.value)}>
              {others.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
      {holder || act !== "conquer" ? null : (
        <p className="dim" style={{ fontSize: 14, marginTop: 8 }}>
          Unclaimed province: another player fields the garrison. They gain no RP, Fate Cards or stats from this fight, so pick whoever is free to play. You fight with +20% points.
        </p>
      )}
      {zv ? (
        <p style={{ fontSize: 14.5 }}>
          <b>{zv.type !== "rift" ? `${VTYPES[zv.type].n} on ${zonePlanet?.name ?? ""}` : "Warp rift"}.</b>{" "}
          {zonePlanet ? PTYPES[zonePlanet.type].trait : ""}
        </p>
      ) : null}
      <button className="btn primary" disabled={!defId || !zoneId || !can(roll)} onClick={() => dispatch(roll)}>
        Generate battle
      </button>
    </>
  );
}

function BattleCard({ state, dispatch, can }: { state: CampaignState; dispatch(a: Action): void; can(a: Action): boolean }) {
  const B = battleInfo(state);
  const pd = state.pend;
  const [decisive, setDecisive] = useState(false);
  if (!B || !pd) return null;
  const planet = B.v.type !== "rift" ? getPlanet(state, B.v.pl) : undefined;
  const results: Array<{ result: "a" | "d" | "x"; label: string; primary: boolean }> = [
    { result: "a", label: `${B.a.name} won`, primary: true },
    { result: "d", label: `${B.d.name} won${B.garrison ? " (garrison)" : ""}`, primary: true },
    { result: "x", label: "Draw", primary: false },
  ];
  return (
    <div className="battle">
      <div className="eyebrow">
        {planet && B.v.type !== "rift" ? `${planet.name} · ${VTYPES[B.v.type].n}` : "The Hollowgate"} · {B.v.name}
        {B.garrison ? " · Garrison battle" : ""}
      </div>
      <div className="size">{B.pts} pts</div>
      {B.garrison && (
        <p className="mono dim" style={{ fontSize: 12 }}>
          GARRISON {B.pts} PTS · {B.a.name.toUpperCase()} {B.attackerPts} PTS (+20%)
        </p>
      )}
      <p className="mono dim" style={{ fontSize: 12 }}>
        {B.a.name.toUpperCase()} (ATTACKER) VS {B.d.name.toUpperCase()} ({B.garrison ? "GARRISON" : "DEFENDER"}) · FATE CARDS: UP TO {B.cards} EACH
      </p>
      {(pd.twists ?? []).map((i) => (
        <div className="twist" key={i}>
          <span className="mono" style={{ fontSize: 11, color: "var(--blood)" }}>
            TWIST · D12 {i + 1}
          </span>
          <br />
          <b>{TWISTS[i].t}</b>
          <br />
          {TWISTS[i].e}
        </div>
      ))}
      {B.lightForces && (
        <div className="twist" style={{ borderColor: "var(--verd)" }}>
          <span className="mono" style={{ fontSize: 11, color: "var(--verd)" }}>
            LIGHT FORCES · {LIGHT_FORCES_MAX_PTS} PTS OR FEWER
          </span>
          <br />
          {TWISTS[LIGHT_FORCES_TWIST].e}
        </div>
      )}
      <div className="twist" style={{ borderColor: "var(--verd)" }}>
        <span className="mono" style={{ fontSize: 11, color: "var(--verd)" }}>
          WORLD · {B.trait.n.toUpperCase()}
        </span>
        <br />
        {B.trait.trait}
      </div>
      {B.notes.map((n) => (
        <p key={n} style={{ fontSize: 14.5, margin: "4px 0" }}>
          {n}
        </p>
      ))}
      <p className="mono" style={{ fontSize: 12, color: "var(--brass)", marginTop: 12 }}>
        PLAY THE BATTLE WITH NORMAL FORCE RULES, THEN RECORD THE RESULT
      </p>
      {B.garrison && (
        <>
          <div className="field">
            <label htmlFor="decisiveSel">Decisive win? (attacker lost under 25% of their army)</label>
            <select id="decisiveSel" value={decisive ? "yes" : "no"} onChange={(e) => setDecisive(e.target.value === "yes")}>
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>
          <p className="dim" style={{ fontSize: 14 }}>
            Only counts if {B.a.name} wins. Yes gives {B.a.name} +1 extra RP.
          </p>
        </>
      )}
      <div className="row">
        {results.map((r) => {
          const a: Action = { type: "resolveBattle", result: r.result, decisive };
          return (
            <button key={r.result} className={r.primary ? "btn primary" : "btn"} disabled={!can(a)} onClick={() => dispatch(a)}>
              {r.label}
            </button>
          );
        })}
        <button className="btn sm" disabled={!can({ type: "rerollTwists" })} onClick={() => dispatch({ type: "rerollTwists" })}>
          Re-roll twists
        </button>
      </div>
    </div>
  );
}

function QuietConfirm({ state, dispatch, actor, def, can }: { state: CampaignState; dispatch(a: Action): void; actor: Player; def: ActionDef; can(a: Action): boolean }) {
  const [fortSel, setFortSel] = useState<string | null>(null);
  const mine = provsOf(state, actor);
  const fortId = fortSel && mine.some((v) => v.id === fortSel) ? fortSel : mine[0]?.id;
  const confirm: Action = def.id === "fortify" ? { type: "confirmQuiet", fortZone: fortId } : { type: "confirmQuiet" };
  return (
    <>
      {def.id === "fortify" ? (
        <div className="field" style={{ marginTop: 10 }}>
          <label htmlFor="fortSel">Province to fortify</label>
          <select id="fortSel" value={fortId ?? ""} onChange={(e) => setFortSel(e.target.value)}>
            {mine.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} ({getPlanet(state, v.pl)?.name})
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <p style={{ marginTop: 10 }}>{def.d}</p>
      <button className="btn primary" disabled={!can(confirm) || (def.id === "fortify" && !fortId)} onClick={() => dispatch(confirm)}>
        Confirm {def.n}
      </button>
    </>
  );
}
