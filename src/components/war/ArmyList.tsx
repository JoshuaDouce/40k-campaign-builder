import { useState } from "react";
import { ARMY_BATTLELINE_MIN, armyLimit, armyLock, armyOf, armyPoints, effectivePoints, fieldedPoints, getPlayer, isBattleline, roleOf, rosterOf } from "../../game/index.ts";
import type { Action, ArmyList as List, ArmyLock, CampaignState, LiveBattle, Unit } from "../../game/index.ts";
import { Overlay } from "../roster/Overlay.tsx";
import { YellowscribeButton } from "./YellowscribeButton.tsx";

interface Props {
  state: CampaignState;
  dispatch(a: Action): void;
  can(a: Action): boolean;
  /** The attacker whose battle this is. */
  attackerId: string;
  /** The player whose list this is. */
  side: string;
  battle: Pick<LiveBattle, "lists" | "pts" | "attackerPts" | "defenderPts" | "garrison">;
}

const LOCK_TEXT: Record<NonNullable<ArmyLock>, string> = {
  warlord: "Warlord: always fielded",
  onlyBattleline: "Only Battleline on the roster: always fielded",
  battlelineMin: `${ARMY_BATTLELINE_MIN} Battleline minimum: tick another Battleline to swap`,
};

const fmt = (n: number): string => n.toLocaleString("en-GB");

function Points({ list, unit }: { list: List; unit: Unit }) {
  // Only fielded units carry a fielded value, so this is the full points for the rest.
  const full = effectivePoints(unit);
  const f = fieldedPoints(list, unit);
  return (
    <>
      {f < full && <s>{full}</s>}
      {f} <small>pts</small>
    </>
  );
}

function UnitName({ unit }: { unit: Unit }) {
  const role = roleOf(unit);
  return (
    <div className="nm">
      {unit.name}
      <span className="cv">{unit.datasheet}</span>
      {unit.isWarlord ? <span className="badge war">Warlord</span> : role && <span className="badge role">{role}</span>}
      {unit.ex && <span className="badge ex">Example</span>}
    </div>
  );
}

/** One side's army for a rolled battle: a summary line that opens the list in its own sheet. */
export function ArmyList({ state, dispatch, can, attackerId, side, battle }: Props) {
  const roster = rosterOf(state, side);
  const list = armyOf(state, battle, side);
  const save = (next: List): Action => ({ type: "setArmyList", playerId: attackerId, side, list: next });
  const editable = can(save(list));
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  // Blur first so a fielded value still being typed saves (it saves on blur) before the sheet unmounts.
  const close = () => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    setOpen(false);
  };

  const name = getPlayer(state, side)?.name ?? "Unknown";
  const total = armyPoints(list, roster);
  const limit = armyLimit(battle, attackerId, side);
  const over = total - limit;
  const n = list.units.length;
  const hasUnits = roster.length > 0;
  const battleline = roster.filter(isBattleline).length;
  const limitNote = limit === battle.pts ? null : `Limit ${fmt(limit)} pts: ${fmt(battle.pts)} + ${battle.garrison ? "20% garrison edge" : "10% Underdog"}`;

  // The engine drops a fielded value when its unit leaves the list.
  const toggle = (u: Unit) => {
    const units = list.units.includes(u.id) ? list.units.filter((id) => id !== u.id) : [...list.units, u.id];
    dispatch(save({ ...list, units }));
  };
  /** Saves a typed value (blank or out of range means full points) and returns what the input should now show. */
  const setField = (u: Unit, raw: string): string => {
    const v = Math.round(Number(raw));
    const { [u.id]: _, ...field } = list.field ?? {};
    if (raw.trim() !== "" && v >= 1 && v < effectivePoints(u)) field[u.id] = v;
    if (field[u.id] !== list.field?.[u.id]) dispatch(save({ ...list, field }));
    return field[u.id] === undefined ? "" : String(field[u.id]);
  };

  const shown = editable ? roster : roster.filter((u) => list.units.includes(u.id));
  const count = (
    <span className={over > 0 ? "state bad" : "state"}>
      {n} unit{n === 1 ? "" : "s"} · {fmt(total)} / {fmt(limit)} pts
    </span>
  );
  return (
    <div className="fo al-line">
      <span className="ttl">{name} · Army list</span>
      {count}
      <button type="button" className={editable ? "btn sm primary" : "btn sm"} onClick={() => setOpen(true)}>
        {editable ? "Choose force" : "View"}
      </button>
      {editable && <YellowscribeButton candidates={roster.filter((u) => list.units.includes(u.id))} />}
      {open && (
        <Overlay title={`${name} · Army list`} wide onClose={close}>
          <div className="al-sum">{count}</div>
          <div className="al-body">
            {!editable && <div className="ro">READ-ONLY: only {name} (or the campaign owner) can change this list.</div>}
            {limitNote && <div className="al-limit">{limitNote}</div>}
            {editable && hasUnits && battleline < ARMY_BATTLELINE_MIN && (
              <div className="al-note">
                {battleline === 0
                  ? `No Battleline on the roster. Add ${ARMY_BATTLELINE_MIN} on My Warband.`
                  : "Only 1 Battleline on the roster, so it stays fielded. Add another on My Warband to choose."}
              </div>
            )}
            {editable && hasUnits && !roster.some((u) => u.isWarlord) && <div className="al-note">No Warlord on the roster.</div>}
            {over > 0 && (
              <div className="overline" role="alert">
                Over by {fmt(over)} pts. Agree it with your opponent or trim the list.
              </div>
            )}
            {!hasUnits && (
              <div className="empty" style={{ margin: "10px 0" }}>
                <b>No units</b>
                <p className="dim" style={{ fontSize: 14.5 }}>
                  No units on your roster. Add them on My Warband.
                </p>
              </div>
            )}
            {shown.map((u) => {
              if (!editable) {
                return (
                  <div className="al-row ro-row" key={u.id}>
                    <UnitName unit={u} />
                    <div className="al-pts">
                      <Points list={list} unit={u} />
                    </div>
                  </div>
                );
              }
              const on = list.units.includes(u.id);
              const lock = armyLock(list, roster, u);
              const full = effectivePoints(u);
              const reveal = on && (editing === u.id || list.field?.[u.id] !== undefined);
              return (
                <div className={`al-row${on ? "" : " off"}${lock ? " locked" : ""}`} key={u.id}>
                  <button type="button" className="chip al-tick" aria-pressed={on} aria-label={u.name + (lock ? " (locked)" : "")} disabled={!!lock} onClick={() => toggle(u)}>
                    {on ? "In" : "Out"}
                  </button>
                  <UnitName unit={u} />
                  <div className="al-pts">
                    {on ? (
                      <button type="button" className="al-edit" aria-label={`Edit fielded points for ${u.name}`} onClick={() => setEditing(editing === u.id ? null : u.id)}>
                        <Points list={list} unit={u} />
                      </button>
                    ) : (
                      <Points list={list} unit={u} />
                    )}
                  </div>
                  {lock && <div className="al-lock">{LOCK_TEXT[lock]}</div>}
                  {reveal && (
                    <div className="al-more">
                      <label>
                        Fielded at
                        <input
                          key={list.field?.[u.id] ?? "full"}
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={full}
                          step={5}
                          placeholder={String(full)}
                          aria-label={`Fielded points for ${u.name}`}
                          defaultValue={list.field?.[u.id] ?? ""}
                          onBlur={(e) => (e.target.value = setField(u, e.target.value))}
                          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                        />
                        pts
                      </label>
                    </div>
                  )}
                </div>
              );
            })}
            {editable && hasUnits && (
              <div className="al-foot">
                <p className="hint">Field a unit smaller, never split it. Leave blank for full points. Changes save as you go.</p>
              </div>
            )}
          </div>
          <div className="row sub">
            <button type="button" className="btn primary" onClick={close}>
              Done
            </button>
          </div>
        </Overlay>
      )}
    </div>
  );
}
