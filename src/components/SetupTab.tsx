import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { actionList, canPerform, chartMatches, hollowgateRound, SETUP_MAX_TOUGHNESS, setupChecklist, setupReadyCount, togglesOn, TOGGLE_NAMES } from "../game/index.ts";
import type { Action, CampaignState, FactionName, Player, SetupChecklist } from "../game/index.ts";
import { useCampaign } from "../store/useCampaign.ts";
import type { TabId } from "../store/useDevicePrefs.ts";
import { useIsEpicName } from "./roster/useDatasheets.ts";
import { FactionOptions } from "./FactionOptions.tsx";
import { PlayerNameInput } from "./PlayerNameInput.tsx";

const BRIEF: ReadonlyArray<readonly [string, string]> = [
  ["The setting.", "The Hollowgate rift tore open three years ago and the Reach is a scatter of worlds, each split into provinces. More players, more worlds."],
  ["Your start.", "A 750 pt roster led by one Warlord with at least 2 Battleline, 0 Requisition Points (earn them from your Capital and by winning battles), and a Capital province on an outer world. No Epic Heroes."],
  ["The War Round.", "Everyone collects RP from Capitals and Hive Cities, then everyone plans in secret and plays at the same time; only players on the same province wait."],
  ["Your move.", "Pick one action: {acts}. Conquer and Raid start a battle."],
  ["Winning.", "Once 60% of the Reach is claimed (or by War Round {holl}) the Hollowgate opens. Hold it at the end of a War Round to win."],
];

type MarkKind = "done" | "todo" | "next" | "ood" | "count";
type MarkList = ReadonlyArray<readonly [MarkKind, string]>;

function Marks({ marks }: { marks: MarkList }) {
  return (
    <div className="su-marks">
      {marks.map(([k, label]) => (
        <span key={label} className={`badge ${k === "count" ? "su-todo" : `su-${k}`}`}>
          {label}
        </span>
      ))}
    </div>
  );
}

function Step({ n, title, next, marks, children }: { n: number; title: string; next: boolean; marks?: MarkList; children: ReactNode }) {
  return (
    <article className={`card su-step${next ? " next" : ""}`}>
      <div className="su-head">
        <h3 className="su-title">
          <span className="n">{n} ·</span>
          {title}
        </h3>
        {marks ? <Marks marks={marks} /> : null}
      </div>
      {children}
    </article>
  );
}

const NEXT: MarkList = [["next", "Next"]];

export function SetupTab({ colors, onNavigate }: { colors: Record<string, string>; onNavigate: (tab: TabId) => void }) {
  const { state, dispatch, viewer } = useCampaign();
  const can = (a: Action) => canPerform(state, a, viewer);
  const n = state.players.length;
  const readyCount = setupReadyCount(state);
  const rulesOn = togglesOn(state);

  const playersDone = n >= 2;
  const chartDone = chartMatches(state);
  const readyDone = n >= 1 && readyCount === n;
  const reason = n < 2 ? "You need at least 2 players." : !chartDone ? "Chart the Reach for the current players first." : null;
  const nextStep = !playersDone ? 2 : !chartDone ? 3 : !readyDone ? 4 : reason === null ? 5 : 0;

  const regen: Action = { type: "regen" };
  const notReady = state.players.filter((p) => state.ready?.[p.id] !== true).map((p) => p.name);
  const hasWarns = notReady.length > 0;

  const begin = () => {
    dispatch({ type: "beginRound" });
    onNavigate("war");
  };
  const chartButton = (primary: boolean) => (
    <div className="row">
      <button className={`btn su-btn${primary ? " primary" : " sm"}`} disabled={!can(regen)} onClick={() => dispatch(regen)}>
        Chart a new Reach for {n} players
      </button>
    </div>
  );

  const step4Marks: MarkList = readyDone
    ? [["done", "Done"]]
    : [
        ["todo", "To do"],
        ...(readyCount > 0 ? ([["count", `${readyCount} of ${n} ready`]] as MarkList) : []),
        ...(nextStep === 4 ? NEXT : []),
      ];

  return (
    <section className="tab" id="setup">
      <h2>Campaign Setup</h2>
      <p className="dim">Get the warbands ready for War Round 1. Read up on the other tabs any time.</p>
      <div className="su-steps">
        <Step n={1} title="Briefing" next={false}>
          <ol className="su-brief">
            {BRIEF.map(([lead, body]) => (
              <li key={lead}>
                <div>
                  <b>{lead}</b> {body.replace("{holl}", String(hollowgateRound(state))).replace("{acts}", actionList(state))}
                </div>
              </li>
            ))}
          </ol>
          <div className="su-links">
            <button className="btn sm" onClick={() => onNavigate("pitch")}>
              Read the full Pitch
            </button>
            <button className="btn sm" onClick={() => onNavigate("rules")}>
              Rules
            </button>
            <button className="btn sm" onClick={() => onNavigate("turn")}>
              Turn Guide
            </button>
          </div>
        </Step>

        <Step n={2} title="Players" next={nextStep === 2} marks={[playersDone ? ["done", "Done"] : ["todo", "To do"], ...(nextStep === 2 ? NEXT : [])]}>
          <p className="su-sub">Add members on the Players tab. Each one picks a warband and faction when they open the campaign.</p>
          {state.players.map((p) => (
            <PlayerRow key={p.id} player={p} state={state} color={colors[p.id]} />
          ))}
        </Step>

        <Step n={3} title="Chart the Reach" next={nextStep === 3} marks={[chartDone ? ["done", "Done"] : ["ood", "Out of date"], ...(nextStep === 3 ? NEXT : [])]}>
          {chartDone ? (
            <>
              <p className="su-sub">Every player has a Capital on the current Reach.</p>
              {can(regen) ? chartButton(false) : null}
            </>
          ) : (
            <>
              <p className="su-sub">The Reach does not match your players. Chart a new Reach so everyone has a Capital.</p>
              {can(regen) ? chartButton(true) : <p className="su-sub">Waiting for the owner to chart the Reach.</p>}
            </>
          )}
        </Step>

        <Step n={4} title="Starting positions" next={nextStep === 4} marks={step4Marks}>
          <p className="su-sub">Each warband needs exactly one Character (its Warlord), at least 2 Battleline, a 750 pt roster and a Capital. No unit may be Toughness 10 or higher, and only one non-Battleline unit may be Toughness 9. No Epic Heroes. With the Datasheet limit on, use at most 5 different datasheets. Build rosters on the My Warband tab. Get it right now: once War Round 1 begins, units can't be removed or made smaller.</p>
          <div className="su-rules-line">
            <span>
              <b>Campaign rules:</b> {rulesOn.length === 0 ? "No optional rules" : rulesOn.map((k) => TOGGLE_NAMES[k]).join(", ")}
            </span>
            {viewer.isOwner ? (
              <button className="btn sm" onClick={() => onNavigate("rules")}>
                Campaign rules
              </button>
            ) : null}
          </div>
          <div className="su-blist">
            {state.players.map((p) => (
              <PlayerBlock key={p.id} player={p} state={state} color={colors[p.id]} onNavigate={onNavigate} />
            ))}
          </div>
        </Step>

        <Step n={5} title="Begin" next={nextStep === 5} marks={[["todo", "To do"], ...(nextStep === 5 ? NEXT : [])]}>
          {reason !== null ? (
            <>
              <p className="su-reason">{reason}</p>
              <div className="row">
                <button className="btn primary su-btn" disabled>
                  Begin War Round 1
                </button>
              </div>
            </>
          ) : (
            <>
              {hasWarns ? (
                <div className="su-warns">
                  {notReady.length > 0 ? (
                    <p>
                      {notReady.length} {notReady.length === 1 ? "player is" : "players are"} not ready: {notReady.join(", ")}
                    </p>
                  ) : null}
                  <p className="mono">You can still begin. This is a reminder, not a rule.</p>
                  <p className="mono">Rosters lock when War Round 1 begins: no removing units, no shrinking them.</p>
                </div>
              ) : null}
              <div className="row">
                <button className="btn primary su-btn" disabled={!can({ type: "beginRound" })} onClick={begin}>
                  Begin War Round 1
                </button>
              </div>
              <p className="su-who">{viewer.isOwner ? "Only you, the campaign owner, can begin." : "Only the campaign owner can begin."}</p>
            </>
          )}
        </Step>
      </div>
    </section>
  );
}

function PlayerRow({ player: p, state, color }: { player: Player; state: CampaignState; color: string | undefined }) {
  const { dispatch, viewer } = useCampaign();
  const [armedAt, setArmedAt] = useState<CampaignState | null>(null);
  const can = (a: Action) => canPerform(state, a, viewer);
  const canEdit = can({ type: "updatePlayer", playerId: p.id });
  const remove: Action = { type: "removePlayer", playerId: p.id };

  // Any state change disarms the two-step Remove, as on the Players tab.
  const armed = armedAt === state;
  useEffect(() => {
    if (!armedAt) return;
    const t = setTimeout(() => setArmedAt(null), 4000);
    return () => clearTimeout(t);
  }, [armedAt]);

  return (
    <div className="su-prow">
      <div className="su-pline">
        <span className="dot" style={{ background: color }}></span>
        <PlayerNameInput playerId={p.id} name={p.name} disabled={!canEdit} label="Warband name" />
      </div>
      <div className="su-pline">
        <select
          aria-label="Faction"
          value={p.faction}
          disabled={!canEdit}
          onChange={(e) => dispatch({ type: "updatePlayer", playerId: p.id, faction: e.target.value as FactionName })}
        >
          <FactionOptions />
        </select>
        {armed ? (
          <button className="btn sm su-btn danger" disabled={!can(remove)} onBlur={() => setArmedAt(null)} onClick={() => dispatch(remove)}>
            Confirm remove
          </button>
        ) : (
          <button className="btn sm su-btn danger" disabled={!can(remove)} onClick={() => setArmedAt(state)}>
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

/** Toughness checklist text: a T10+ unit wins, then the one-T9 rule. */
function toughText({ toughOver: o, toughNine: n }: SetupChecklist): string {
  const T = SETUP_MAX_TOUGHNESS;
  if (o.count === 1) return `${o.name ?? "A unit"} is T${o.t ?? ""}`;
  if (o.count > 1) return `${o.count} units over T${T}`;
  if (n.count === 0) return `No unit over T${T}`;
  return n.count === 1 ? `One unit at T${T}` : `${n.count} units at T${T}: keep one`;
}

function Check({ label, ok, value, over }: { label: string; ok: boolean; value: string; over?: boolean }) {
  return (
    <div className={`su-check ${ok ? "ok" : "no"}${over ? " over" : ""}`}>
      <span className="tk" aria-hidden="true">
        {ok ? "✓" : "☐"}
      </span>
      <span className="lb">
        {label}
        <span className="su-sr">{ok ? ": done" : ": not done"}</span>
      </span>
      <span className="vl">{value}</span>
    </div>
  );
}

function PlayerBlock({ player: p, state, color, onNavigate }: { player: Player; state: CampaignState; color: string | undefined; onNavigate: (tab: TabId) => void }) {
  const { dispatch, viewer } = useCampaign();
  const isEpicName = useIsEpicName(p.faction);
  const c = setupChecklist(state, p.id, isEpicName);
  const ready = state.ready?.[p.id] === true;
  const setReady: Action = { type: "setReady", playerId: p.id, ready: !ready };
  return (
    <div className="su-block" style={{ borderLeftColor: color }}>
      <div className="su-bhead">
        <div className="su-bname">
          <span className="dot" style={{ background: color }}></span>
          <span>{p.name}</span>
        </div>
      </div>
      <Check
        label="Character"
        ok={(c.character.count === 1 && c.character.isWarlord) || !!c.character.knightWarlord}
        over={c.character.count >= 2}
        value={
          c.character.knightWarlord
            ? `${c.character.knightWarlord}: Warlord (Knight)`
            : c.character.count === 0
            ? "No Character yet"
            : c.character.count >= 2
              ? `${c.character.count} Characters: keep only the Warlord`
              : c.character.isWarlord
                ? (c.character.name ?? "")
                : "Not the Warlord"
        }
      />
      {c.character.notCharacter && <div className="su-flag">! Warlord is not a Character</div>}
      {c.datasheets && <Check label="Datasheets" ok={c.datasheets.count <= c.datasheets.limit} over={c.datasheets.count > c.datasheets.limit} value={`${c.datasheets.count} / ${c.datasheets.limit}`} />}
      <Check label="750 pt roster" ok={c.rosterOk} value={`${c.rosterTotal} / ${c.supply} pts`} over={c.rosterTotal > c.supply} />
      {c.foShort.map((f) => (
        <div key={f.role} className="su-flag">
          ! Needs {f.n} more {f.role}
        </div>
      ))}
      <Check
        label="Toughness"
        ok={c.toughOver.count === 0 && c.toughNine.count <= 1}
        over={c.toughOver.count > 0 || c.toughNine.count > 1}
        value={toughText(c)}
      />
      <Check
        label="Heroes"
        ok={c.epic.count === 0}
        over={c.epic.count > 0}
        value={c.epic.count === 0 ? "No Epic Heroes" : c.epic.count === 1 ? `${c.epic.name ?? "A unit"} is an Epic Hero` : `${c.epic.count} Epic Heroes on the roster`}
      />
      <Check label="Capital" ok={!!c.capital} value={c.capital ?? "Chart the Reach first (step 3)"} />
      <div className="su-bfoot">
        <button className="lnk" onClick={() => onNavigate("roster")}>
          Build roster
        </button>
        <label className="tg-check">
          <input type="checkbox" aria-label={`Ready: ${p.name}`} checked={ready} disabled={!canPerform(state, setReady, viewer)} onChange={() => dispatch(setReady)} /> Ready
        </label>
      </div>
    </div>
  );
}
