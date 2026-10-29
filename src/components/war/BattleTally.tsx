import { armyOf, getPlayer, rosterOf } from "../../game/index.ts";
import type { Action, CampaignState, LiveBattle } from "../../game/index.ts";
import { YellowscribeButton } from "./YellowscribeButton.tsx";

interface Props {
  state: CampaignState;
  dispatch(a: Action): void;
  can(a: Action): boolean;
  /** The attacker whose battle this is. */
  attackerId: string;
  /** The player whose tally this is. */
  side: string;
  battle: Pick<LiveBattle, "lists" | "tally">;
}

/** One side's tally while the battle is played: losses, kills and Marked for Glory, for the post-battle helper. */
export function BattleTally({ state, dispatch, can, attackerId, side, battle }: Props) {
  const fielded = new Set(armyOf(state, battle, side).units);
  const units = rosterOf(state, side).filter((u) => fielded.has(u.id));
  const t = battle.tally?.[side];
  const glory = t?.glory ?? null;
  const setGlory = (unitId: string | null): Action => ({ type: "markGlory", playerId: attackerId, side, unitId });
  const editable = can(setGlory(null));
  const name = getPlayer(state, side)?.name ?? "Unknown";
  const role = side === attackerId ? "ATTACKER" : "DEFENDER";
  const selId = `glory-${attackerId}-${side}`;

  return (
    <div className="tally">
      <div className="eyebrow">
        {name} · {role}
      </div>
      {editable && <YellowscribeButton candidates={units} />}
      <div className="field">
        <label htmlFor={selId}>Marked for Glory (name it before the game)</label>
        <select id={selId} value={glory ?? ""} disabled={!editable} onChange={(e) => dispatch(setGlory(e.target.value || null))}>
          <option value="">None yet</option>
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>
      {units.map((u) => {
        const r = t?.units[u.id];
        const destroyed = !!r?.destroyed;
        const kills = r?.kills ?? 0;
        const set = (d: boolean, k: number): Action => ({ type: "tallyUnit", playerId: attackerId, side, unitId: u.id, destroyed: d, kills: k });
        return (
          <div key={u.id} className={`pbunit${destroyed ? " off" : ""}`}>
            <div className="nm">
              {u.name}
              {glory === u.id && <span className="badge war">Glory</span>}
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              <button type="button" className="chip" aria-pressed={destroyed} disabled={!editable} onClick={() => dispatch(set(!destroyed, kills))}>
                Destroyed
              </button>
              <span className="stepper">
                <span className="lbl">Kills</span>
                <button type="button" className="btn sm" aria-label={`Fewer kills for ${u.name}`} disabled={!editable || kills <= 0} onClick={() => dispatch(set(destroyed, kills - 1))}>
                  −
                </button>
                <output>{kills}</output>
                <button type="button" className="btn sm" aria-label={`More kills for ${u.name}`} disabled={!editable || kills >= 99} onClick={() => dispatch(set(destroyed, kills + 1))}>
                  +
                </button>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
