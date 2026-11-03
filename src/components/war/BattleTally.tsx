import { fieldedUnits, getPlayer } from "../../game/index.ts";
import type { Action, CampaignState, LiveBattle } from "../../game/index.ts";
import { FallenRoll } from "./FallenRoll.tsx";
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

/** One side's tally while the battle is played: losses, kills, Marked for Glory and the fallen rolls. All of it is applied when the result is recorded. */
export function BattleTally({ state, dispatch, can, attackerId, side, battle }: Props) {
  const units = fieldedUnits(state, battle, side);
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
      <p className="hint">When the result is recorded, battles, kills and XP go onto your units automatically. Enter fallen rolls for destroyed units here, or leave them and the app rolls them. Honours are taken from the unit on My Warband.</p>
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
          // Not dimmed when destroyed: the fallen rolls inside must not look disabled.
          <div key={u.id} className="pbunit">
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
            {destroyed && (
              <FallenRoll
                unit={u}
                entry={r}
                editable={editable}
                uid={`${attackerId}-${side}-${u.id}`}
                save={(v) => dispatch({ type: "tallyFallen", playerId: attackerId, side, unitId: u.id, ...v })}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
