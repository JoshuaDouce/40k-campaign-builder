import { useState } from "react";
import { canPerform, forceOrgFor, PROMOTION_COST, RECRUITS_COST, rosterOf, SURGEON_COST, supplyOf, totalEffective } from "../../game/index.ts";
import type { Unit } from "../../game/index.ts";
import { useCampaign } from "../../store/useCampaign.ts";
import { ForceOrgChart } from "./ForceOrgChart.tsx";
import { HallOfHeroes } from "./HallOfHeroes.tsx";
import { PostBattleHelper } from "./PostBattleHelper.tsx";
import { FieldSurgeonDialog, PromotionDialog, SeasonedRecruitsDialog } from "./RpDialogs.tsx";
import { RelicDialog } from "./RelicDialog.tsx";
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
  const player = state.players.find((p) => p.id === picked) ?? own ?? state.players[0];

  if (!player) {
    return (
      <section className="tab" id="roster">
        <h2>Roster</h2>
        <p>Add players on the Players tab first.</p>
      </section>
    );
  }

  const pid = player.id;
  const editable = canPerform(state, { type: "addExamples", playerId: pid }, viewer);
  const roster = rosterOf(state, pid);
  const fo = forceOrgFor(state, pid);
  const sorted = [...roster].sort((a, b) => Number(b.isWarlord) - Number(a.isWarlord));
  const total = totalEffective(roster);
  const supply = supplyOf(player);
  const over = total > supply;
  const hasEx = roster.some((u) => u.ex);
  const say = (text: string) => setToast({ pid, text });
  const closeDialog = () => setDialog(null);
  const done = (text: string) => {
    say(text);
    closeDialog();
  };
  const addExamples = () => {
    dispatch({ type: "addExamples", playerId: pid });
    say("Seven example units added, tagged Example.");
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
      <h2>Roster</h2>
      <p className="dim">Your units, their XP, honours and scars. The War Room doesn't track these; this is your paper roster made digital. Points over supply only warn, they never block.</p>
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
        <div className="lbl">Roster of</div>
        <div className="pick" role="group" aria-label="Choose a player's roster">
          {state.players.map((p) => (
            <button key={p.id} className="chip" aria-pressed={p.id === pid} onClick={() => setPicked(p.id)}>
              <span className="dot" style={{ background: colors[p.id] }}></span>
              {p.name}
            </button>
          ))}
        </div>
        <div className="mono dim" style={{ fontSize: 12 }}>
          {player.faction.toUpperCase()}
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

        <ForceOrgChart key={pid} fo={fo} />

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
              <button className="btn sm" disabled={player.rp < SURGEON_COST} onClick={() => setDialog({ kind: "surgeon" })}>
                Field Surgeon · {SURGEON_COST} RP
              </button>
              <button className="btn sm" disabled={player.rp < PROMOTION_COST} onClick={() => setDialog({ kind: "promo" })}>
                Promotion · {PROMOTION_COST} RP
              </button>
              <button className="btn sm" disabled={player.rp < RECRUITS_COST} onClick={() => setDialog({ kind: "recruits" })}>
                Seasoned Recruits · {RECRUITS_COST} RP
              </button>
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
        sorted.map((u) => (
          <UnitCard
            key={u.id}
            unit={u}
            editable={editable}
            overLimit={fo.overLimitIds.includes(u.id)}
            onEdit={() => setDialog({ kind: "edit", unit: u })}
            onRollRelic={() => setDialog({ kind: "relic", unit: u })}
            onRemoveRelic={(relic) => {
              dispatch({ type: "removeRelic", playerId: pid, unitId: u.id, relic });
              say(`${relic} removed from ${u.name}.`);
            }}
            onRemove={(cause) => {
              dispatch({ type: "removeUnit", playerId: pid, unitId: u.id, cause });
              say(u.isCharacter ? `${u.name} moved to the Hall of Heroes.` : "Unit removed.");
            }}
          />
        ))
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
