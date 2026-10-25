import { useState } from "react";
import { canPerform, count, DATASHEET_COST, HAND_LIMIT, ROLE_NAMES, roleOf, countsAsSetupNine, datasheetLimit, distinctDatasheets, forceOrgFor, overStageCap, PROMOTION_COST, RECRUITS_COST, rosterOf, setupToughnessBlock, SURGEON_COST, supplyOf, toggleOn, totalEffective, toughStageActive, warlordNotCharacter } from "../../game/index.ts";
import type { Unit } from "../../game/index.ts";
import { useCampaign } from "../../store/useCampaign.ts";
import { FateHand } from "../FateHand.tsx";
import { ForceOrgChart } from "./ForceOrgChart.tsx";
import { HallOfHeroes } from "./HallOfHeroes.tsx";
import { PostBattleHelper } from "./PostBattleHelper.tsx";
import { FieldSurgeonDialog, PromotionDialog, SeasonedRecruitsDialog } from "./RpDialogs.tsx";
import { RelicDialog } from "./RelicDialog.tsx";
import { useIsEpicName } from "./useDatasheets.ts";
import { UnitCard } from "./UnitCard.tsx";
import { UnitFormSheet } from "./UnitFormSheet.tsx";

type Dialog = { kind: "add" } | { kind: "edit"; unit: Unit } | { kind: "relic"; unit: Unit } | { kind: "surgeon" | "promo" | "recruits" } | null;

export function RosterTab({ colors }: { colors: Record<string, string> }) {
  const { state, dispatch, viewer } = useCampaign();
  const [picked, setPicked] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [helper, setHelper] = useState(false);
  const [view, setView] = useState<"roster" | "hall">("roster");
  const [toast, setToast] = useState<{ pid: string; text: string } | null>(null);

  const own = state.players.find((p) => viewer.userId !== null && p.userId === viewer.userId);
  // Your own warband. Only the owner can switch, to act for a player without their phone.
  const player = (viewer.isOwner ? state.players.find((p) => p.id === picked) : undefined) ?? own ?? state.players[0];
  const isEpicName = useIsEpicName(player?.faction);

  if (!player) {
    return (
      <section className="tab" id="roster">
        <h2>My Warband</h2>
        <p>{state.round === 0 ? "Add players on the Setup tab first." : "Add players on the Players tab first."}</p>
      </section>
    );
  }

  const pid = player.id;
  const editable = canPerform(state, { type: "addExamples", playerId: pid }, viewer);
  const roster = rosterOf(state, pid);
  const fo = forceOrgFor(state, pid);
  // Setup: the second and later non-Battleline T9 units (roster order) are flagged; the first is the one allowed.
  const nineExtraIds = state.round === 0 ? roster.filter(countsAsSetupNine).slice(1).map((u) => u.id) : [];
  const sorted = [...roster].sort((a, b) => Number(b.isWarlord) - Number(a.isWarlord));
  // One group per role in chart order, then units with no role. Empty groups are left out.
  const groups = [...ROLE_NAMES, undefined]
    .map((role) => ({ role, units: sorted.filter((u) => roleOf(u) === role), row: fo.rows.find((r) => r.role === role) }))
    .filter((g) => g.units.length > 0);
  const total = totalEffective(roster);
  const provinces = count(state, player);
  const supply = supplyOf(state, player);
  const over = total > supply;
  const slots = toggleOn(state, "forceOrg");
  const dsCount = toggleOn(state, "datasheetLimit") ? { x: distinctDatasheets(roster), n: datasheetLimit(state, pid) } : null;
  const stage = toughStageActive(state, player);
  const stageOver = stage ? roster.filter((u) => overStageCap(u.t)).length : 0;
  const hasEx = roster.some((u) => u.ex);
  const say = (text: string) => setToast({ pid, text });
  const closeDialog = () => setDialog(null);
  const done = (text: string) => {
    say(text);
    closeDialog();
  };
  const addExamples = () => {
    dispatch({ type: "addExamples", playerId: pid });
    say("Example units added, tagged Example.");
  };

  if (helper) {
    return (
      <section className="tab" id="roster">
        <PostBattleHelper
          playerId={pid}
          roster={roster}
          onClose={(text) => {
            setHelper(false);
            if (text) say(text);
            window.scrollTo(0, 0);
          }}
        />
      </section>
    );
  }

  return (
    <section className="tab" id="roster">
      <h2>My Warband</h2>
      <p className="dim">Your hub: your Fate Cards, your RP and your units with their XP, honours and scars. Points over supply only warn, they never block.</p>
      <div className="seg hallseg" role="group" aria-label="Roster view">
        <button type="button" className="chip" aria-pressed={view === "roster"} onClick={() => setView("roster")}>
          Roster
        </button>
        <button type="button" className="chip" aria-pressed={view === "hall"} onClick={() => setView("hall")}>
          Hall of Heroes
        </button>
      </div>

      {view === "hall" ? (
        <HallOfHeroes colors={colors} />
      ) : (
        <>

      <div className="rhead">
        {viewer.isOwner && state.players.length > 1 ? (
          <>
            <div className="lbl">Acting for</div>
            <div className="pick" role="group" aria-label="Choose a player's warband">
              {state.players.map((p) => (
                <button key={p.id} className="chip" aria-pressed={p.id === pid} onClick={() => setPicked(p.id)}>
                  <span className="dot" style={{ background: colors[p.id] }}></span>
                  {p.name}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="row" style={{ gap: 8 }}>
            <span className="dot" style={{ background: colors[pid] }}></span>
            <b>{player.name}</b>
          </div>
        )}
        <div className="mono dim" style={{ fontSize: 12 }}>
          {player.faction.toUpperCase()} · {provinces} PROVINCE{provinces === 1 ? "" : "S"} · {player.battles} BATTLE{player.battles === 1 ? "" : "S"} · {player.wins} WIN{player.wins === 1 ? "" : "S"}
        </div>
        <div className="totals">
          <div className="stat">
            <div className="l">Total points</div>
            <div className={`v${over ? " over" : ""}`}>
              {total.toLocaleString()} <small>/ {supply.toLocaleString()} pts</small>
            </div>
            {over ? (
              <div className="overline">{total - supply} over supply. Allowed, but your opponent will notice.</div>
            ) : (
              <div className="mono dim" style={{ fontSize: 12, marginTop: 4 }}>
                {supply - total} pts to spare
              </div>
            )}
          </div>
          <div className="stat">
            <div className="l">RP available</div>
            <div className="v">{player.rp}</div>
          </div>
        </div>

        <FateHand key={pid} player={player} />

        {dsCount && (
          <div className={`rt-count${dsCount.x > dsCount.n ? " over" : ""}`}>
            <span>
              Datasheets {dsCount.x} / {dsCount.n}
            </span>
            {dsCount.x > dsCount.n && <span>! {dsCount.x - dsCount.n} over the datasheet limit</span>}
          </div>
        )}
        {stageOver > 0 && (
          <div className="rt-count over">
            <span>Toughness stages</span>
            <span>! {stageOver === 1 ? "1 unit" : `${stageOver} units`} over the War Round 1–2 limit</span>
          </div>
        )}

        {slots && <ForceOrgChart key={pid} fo={fo} />}

        {editable ? (
          <>
            <div className="row">
              <button className="btn primary" onClick={() => setDialog({ kind: "add" })}>
                Add unit
              </button>
              <button className="btn" disabled={roster.length === 0} onClick={() => setHelper(true)}>
                Post-battle helper
              </button>
              {hasEx ? (
                <button
                  className="btn danger"
                  onClick={() => {
                    dispatch({ type: "clearExamples", playerId: pid });
                    say("Examples cleared.");
                  }}
                >
                  Clear examples
                </button>
              ) : (
                <button className="btn" onClick={addExamples}>
                  Add example units
                </button>
              )}
            </div>
            <div className="lbl" style={{ marginTop: 12 }}>
              Spend Requisition
            </div>
            <div className="rp-row">
              <button
                className="btn sm"
                disabled={player.rp < 1}
                title="Spend 1 RP for +200 pts to your supply limit"
                onClick={() => {
                  dispatch({ type: "buyReinforcements", playerId: pid });
                  say("Reinforcements: +200 supply.");
                }}
              >
                Reinforcements · 1 RP
              </button>
              <button className="btn sm" disabled={player.rp < SURGEON_COST} onClick={() => setDialog({ kind: "surgeon" })}>
                Field Surgeon · {SURGEON_COST} RP
              </button>
              <button className="btn sm" disabled={player.rp < PROMOTION_COST} onClick={() => setDialog({ kind: "promo" })}>
                Promotion · {PROMOTION_COST} RP
              </button>
              <button className="btn sm" disabled={player.rp < RECRUITS_COST} onClick={() => setDialog({ kind: "recruits" })}>
                Seasoned Recruits · {RECRUITS_COST} RP
              </button>
              <button
                className="btn sm"
                disabled={player.rp < 1 || player.hand.length >= HAND_LIMIT}
                title={player.hand.length >= HAND_LIMIT ? "Hand full. Play or discard a card first." : "Spend 1 RP to draw one Fate Card"}
                onClick={() => {
                  dispatch({ type: "requisitionDeck", playerId: pid });
                  say("Drew a Fate Card.");
                }}
              >
                Requisition the Deck · 1 RP
              </button>
              {dsCount && (
                <button
                  className="btn sm"
                  disabled={player.rp < DATASHEET_COST}
                  title="Spend 1 RP for +1 to your datasheet limit, for the rest of the campaign"
                  onClick={() => {
                    dispatch({ type: "buyDatasheet", playerId: pid });
                    say(`Datasheet limit is now ${dsCount.n + 1}.`);
                  }}
                >
                  Extra Datasheet · {DATASHEET_COST} RP
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="ro">READ-ONLY: you're viewing {player.name}'s roster. Only they (or the campaign owner) can change it.</div>
        )}
        <div className="toast" role="status">
          {toast && toast.pid === pid ? toast.text : ""}
        </div>
      </div>

      {sorted.length ? (
        groups.map(({ role, units, row }) => {
          const over = slots && row ? row.over > 0 : false;
          return (
            <section key={role ?? "none"} aria-label={role ?? "Unassigned"}>
              <h3 className={`rgroup${over ? " over" : ""}`}>
                {role ?? "Unassigned"}
                <span>{slots && row?.slotsIn ? `${units.length} · min ${row.min} · in ${row.slotsIn} slots` : slots && row ? `${row.filled} / ${row.max} slots` : `${units.length} unit${units.length === 1 ? "" : "s"}`}</span>
              </h3>
              {units.map((u) => (
                <UnitCard
                  key={u.id}
                  unit={u}
                  editable={editable}
                  memorial={state.round !== 0}
                  overLimit={slots && fo.overLimitIds.includes(u.id)}
                  toughOver={setupToughnessBlock(state, u.t)}
                  toughNineExtra={nineExtraIds.includes(u.id)}
                  epic={isEpicName(u.datasheet)}
                  toughStage={stage && overStageCap(u.t)}
                  warlordNotChar={warlordNotCharacter(state, player, u)}
                  onEdit={() => setDialog({ kind: "edit", unit: u })}
                  onRollRelic={() => setDialog({ kind: "relic", unit: u })}
                  onRemoveRelic={(relic) => {
                    dispatch({ type: "removeRelic", playerId: pid, unitId: u.id, relic });
                    say(`${relic} removed from ${u.name}.`);
                  }}
                  onRemove={(cause) => {
                    dispatch({ type: "removeUnit", playerId: pid, unitId: u.id, cause });
                    say(u.isCharacter && state.round !== 0 ? `${u.name} moved to the Hall of Heroes.` : "Unit removed.");
                  }}
                />
              ))}
            </section>
          );
        })
      ) : editable ? (
        <div className="empty">
          <b>No units yet</b>
          <p className="dim">The muster roll is blank. Add your first squad, or drop in a handful of example units to see how a roster looks. You can clear them in one tap.</p>
          <div className="row" style={{ justifyContent: "center" }}>
            <button className="btn primary" onClick={() => setDialog({ kind: "add" })}>
              Add unit
            </button>
            <button className="btn" onClick={addExamples}>
              Add example units
            </button>
          </div>
        </div>
      ) : (
        <div className="empty">
          <b>Nothing mustered</b>
          <p className="dim">{player.name} hasn't added any units yet.</p>
        </div>
      )}

        </>
      )}

      {editable && dialog?.kind === "relic" && <RelicDialog playerId={pid} unit={dialog.unit} onDone={done} onClose={closeDialog} />}
      {editable && dialog?.kind === "add" && (
        <UnitFormSheet
          mode="add"
          playerId={pid}
          faction={player.faction}
          roster={roster}
          fo={fo}
          onClose={closeDialog}
          onSave={(unit) => {
            dispatch({ type: "addUnit", playerId: pid, unit });
            done("Unit added.");
          }}
        />
      )}
      {editable && dialog?.kind === "edit" && (
        <UnitFormSheet
          mode="edit"
          playerId={pid}
          faction={player.faction}
          existing={dialog.unit}
          roster={roster}
          fo={fo}
          onClose={closeDialog}
          onSave={(unit) => {
            dispatch({ type: "updateUnit", playerId: pid, unit });
            done("Unit updated.");
          }}
        />
      )}
      {editable && dialog?.kind === "surgeon" && <FieldSurgeonDialog playerId={pid} roster={roster} rp={player.rp} onDone={done} onClose={closeDialog} />}
      {editable && dialog?.kind === "promo" && <PromotionDialog playerId={pid} roster={roster} rp={player.rp} onDone={done} onClose={closeDialog} />}
      {editable && dialog?.kind === "recruits" && <SeasonedRecruitsDialog playerId={pid} roster={roster} rp={player.rp} onDone={done} onClose={closeDialog} />}
    </section>
  );
}
