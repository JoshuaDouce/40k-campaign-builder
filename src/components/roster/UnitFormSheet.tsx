import { useState } from "react";
import {
  BACKSTORY_MAX,
  allowedHonours,
  allowedScars,
  effectivePoints,
  honourSlots,
  makeScar,
  newUnitId,
  rankOf,
  RECRUITS_COST,
  RECRUITS_XP,
  ROLE_NAMES,
  roleOf,
  scarName,
  scarWeapon,
  setupCharacterBlock,
  SETUP_MAX_TOUGHNESS,
  setupToughnessBlock,
  setupToughnessNineBlock,
  TITLE_MAX,
  TRAIT_MAX,
  WORN_GEAR,
} from "../../game/index.ts";
import type { FactionName, ForceOrg, Role, Unit } from "../../game/index.ts";
import { useCampaign } from "../../store/useCampaign.ts";
import { DatasheetPicker } from "./DatasheetPicker.tsx";
import { useIsEpicName } from "./useDatasheets.ts";
import { Overlay } from "./Overlay.tsx";
import { useRng } from "./useRng.ts";

export type FormMode = "add" | "edit" | "recruits";

interface Props {
  mode: FormMode;
  existing?: Unit;
  /** Whose roster this is, for the Setup Character rule. */
  playerId: string;
  roster: readonly Unit[];
  /** The player's faction, for the datasheet pick-list. Without data the field is plain text. */
  faction?: FactionName;
  /** Slot counts for the Role hint. */
  fo: ForceOrg;
  /** Shown in the Seasoned Recruits intro. */
  rp?: number;
  onSave(unit: Unit): void;
  onClose(): void;
}

interface Draft {
  name: string;
  datasheet: string;
  points: string;
  xp: string;
  toughness: string;
  role: Role | "";
  isCharacter: boolean;
  isWarlord: boolean;
  enhancement: string;
  title: string;
  backstory: string;
  warlordTrait: string;
  battles: string;
  kills: string;
  honours: string[];
  scars: string[];
  weapon: string;
}

function initial(existing: Unit | undefined, mode: FormMode): Draft {
  if (!existing) {
    return {
      name: "",
      datasheet: "",
      points: "100",
      xp: String(mode === "recruits" ? RECRUITS_XP : 0),
      toughness: "",
      role: "",
      isCharacter: false,
      isWarlord: false,
      enhancement: "",
      title: "",
      backstory: "",
      warlordTrait: "",
      battles: "0",
      kills: "0",
      honours: [],
      scars: [],
      weapon: "",
    };
  }
  const worn = existing.scars.find((s) => scarName(s) === WORN_GEAR);
  return {
    name: existing.name,
    datasheet: existing.datasheet,
    points: String(existing.points),
    xp: String(existing.xp),
    toughness: existing.t != null ? String(existing.t) : "",
    role: roleOf(existing) ?? "",
    isCharacter: existing.isCharacter,
    isWarlord: existing.isWarlord,
    enhancement: existing.enhancement ?? "",
    title: existing.title ?? "",
    backstory: existing.backstory ?? "",
    warlordTrait: existing.warlordTrait ?? "",
    battles: String(existing.battles ?? 0),
    kills: String(existing.kills ?? 0),
    honours: [...existing.honours],
    scars: existing.scars.map(scarName),
    weapon: worn ? (scarWeapon(worn) ?? "") : "",
  };
}

const toggle = (list: string[], v: string): string[] => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

/** Empty counts as valid (the field is left unset); otherwise a whole number, 0 or more. */
const wholeOrEmpty = (v: string): boolean => v.trim() === "" || (Number.isInteger(Number(v)) && Number(v) >= 0);

const COPY: Record<FormMode, { title: string; cta: string }> = {
  add: { title: "Add unit", cta: "Add to roster" },
  edit: { title: "Edit unit", cta: "Save changes" },
  recruits: { title: "Seasoned Recruits", cta: `Spend ${RECRUITS_COST} RP and add unit` },
};

export function UnitFormSheet({ mode, existing, playerId, roster, faction, fo, rp, onSave, onClose }: Props) {
  const rng = useRng();
  const { state } = useCampaign();
  const [d, setD] = useState<Draft>(() => initial(existing, mode));
  const set = (patch: Partial<Draft>) => setD((prev) => ({ ...prev, ...patch }));
  const recruits = mode === "recruits";

  const points = d.points.trim() === "" ? NaN : Number(d.points);
  const xp = recruits ? RECRUITS_XP : d.xp.trim() === "" ? NaN : Number(d.xp);
  const shownXp = Number.isFinite(xp) ? xp : 0;
  const allowed = honourSlots(shownXp);
  const hasWorn = d.scars.includes(WORN_GEAR);
  // In Setup the only Character is the Warlord: making a unit a Character ticks Warlord, which then stays on.
  const setup = state.round === 0;
  const warlord = d.isCharacter && d.isWarlord;
  const relics = d.isCharacter ? (existing?.relics ?? []) : [];
  const honourList = allowedHonours(d);
  const scarList = allowedScars(d);
  const clearChar = { isCharacter: false, isWarlord: false, enhancement: "", warlordTrait: "" } as const;
  const pickRole = (r: Role | "") => set(r === "Character" ? { role: r, isCharacter: true, ...(setup && { isWarlord: true }) } : { role: r, ...clearChar });
  const roleMax = fo.rows.find((r) => r.role === d.role)?.max ?? 0;
  const others = roster.filter((u) => u.id !== existing?.id && roleOf(u) === d.role).length;
  const projected = others + 1;
  const losesDetails = !!existing?.isCharacter && !d.isCharacter && !!(existing.relics?.length || existing.title || existing.backstory || existing.enhancement);

  // In Setup, a save that makes this unit a Character is stopped if the roster already has one. Saving an existing Character is fine.
  const charBlock = existing?.isCharacter ? null : setupCharacterBlock(state, playerId, { id: existing?.id ?? "", isCharacter: d.isCharacter });

  const toughBlank = d.toughness.trim() === "";
  const toughNum = toughBlank ? NaN : Number(d.toughness);
  const toughBad = !toughBlank && !(Number.isInteger(toughNum) && toughNum >= 1);
  const toughBlock = !toughBad && setupToughnessBlock(state, toughBlank ? undefined : toughNum);
  // T10+ wins over the one-T9 rule: only one message is shown, under the same id.
  const nineBlock = !toughBad && !toughBlock ? setupToughnessNineBlock(state, playerId, { id: existing?.id ?? "", t: toughBlank ? undefined : toughNum }) : null;
  const toughStop = toughBlock || !!nineBlock;
  const epicBlock = useIsEpicName(faction)(d.datasheet);
  const describedBy = [charBlock ? "f_charblock" : "", toughStop ? "f_toughblock" : "", epicBlock ? "f_epicblock" : ""].filter(Boolean).join(" ") || undefined;

  let problem = "";
  if (!Number.isFinite(points) || points < 0) problem = "Base points must be 0 or more.";
  else if (!Number.isInteger(xp) || xp < 0) problem = "XP must be a whole number, 0 or more.";
  else if (toughBad) problem = "Toughness must be a whole number, 1 or more.";
  else if (!wholeOrEmpty(d.battles)) problem = "Battles must be a whole number, 0 or more.";
  else if (!wholeOrEmpty(d.kills)) problem = "Kills must be a whole number, 0 or more.";
  else if (hasWorn && !d.weapon.trim()) problem = "Worn Gear needs a weapon.";
  else if (recruits && d.honours.length !== 1) problem = "Pick exactly one Battle Honour.";

  const save = () => {
    if (problem || charBlock || toughStop || epicBlock) return;
    const enh = d.isCharacter ? d.enhancement.trim() : "";
    const unit: Unit = {
      ...existing,
      id: existing?.id ?? newUnitId(rng, roster),
      name: d.name.trim() || (recruits ? "Seasoned recruits" : "Unnamed squad"),
      datasheet: d.datasheet.trim(),
      points,
      xp,
      honours: d.honours,
      scars: recruits ? [] : d.scars.map((s) => makeScar(s, s === WORN_GEAR ? d.weapon : undefined)),
      isCharacter: d.isCharacter,
      isWarlord: warlord,
    };
    if (d.role) unit.role = d.role;
    else delete unit.role;
    if (enh) unit.enhancement = enh;
    else delete unit.enhancement;
    const text = (key: "title" | "backstory" | "warlordTrait", value: string, keep: boolean) => {
      const v = value.trim();
      if (keep && v) unit[key] = v;
      else delete unit[key];
    };
    text("title", d.title, d.isCharacter);
    text("backstory", d.backstory, d.isCharacter);
    text("warlordTrait", d.warlordTrait, warlord);
    if (!d.isCharacter) delete unit.relics;
    if (!toughBlank) unit.t = toughNum;
    else delete unit.t;
    if (d.battles.trim() !== "") unit.battles = Number(d.battles);
    else delete unit.battles;
    if (d.kills.trim() !== "") unit.kills = Number(d.kills);
    else delete unit.kills;
    onSave(unit);
  };

  const shownName = (d.name.trim() || "Unnamed squad").toUpperCase();

  return (
    <Overlay title={COPY[mode].title} onClose={onClose}>
      <p className="dim">
        {recruits
          ? `${RECRUITS_COST} RP. Add a new unit that starts at 3 XP (Blooded), with its first Battle Honour. You have ${rp ?? 0} RP.`
          : "Rank is worked out from XP. Effective points add 10% per honour, rounded to the nearest 5, plus 10 per relic."}
      </p>
      <div className="formgrid">
        <div className="field">
          <label htmlFor="f_name">Unit name</label>
          <input type="text" id="f_name" value={d.name} placeholder="e.g. Anvil Squad" onChange={(e) => set({ name: e.target.value })} />
        </div>
        <DatasheetPicker
          id="f_ds"
          faction={faction}
          value={d.datasheet}
          points={d.points}
          onText={(datasheet) => set({ datasheet })}
          onPoints={(points) => set({ points })}
          onToughness={(toughness) => set({ toughness })}
          setup={setup}
          epicBlock={epicBlock}
        />
        <div className="field" style={{ flex: "1 1 120px" }}>
          <label htmlFor="f_base">Base points</label>
          <input type="number" id="f_base" inputMode="numeric" min={0} step={5} value={d.points} onChange={(e) => set({ points: e.target.value })} />
        </div>
        <div className="field" style={{ flex: "1 1 120px" }}>
          <label htmlFor="f_xp">XP</label>
          {recruits ? <input type="number" id="f_xp" value={RECRUITS_XP} disabled /> : <input type="number" id="f_xp" inputMode="numeric" min={0} step={1} value={d.xp} onChange={(e) => set({ xp: e.target.value })} />}
        </div>
        <div className="field" style={{ flex: "1 1 120px" }}>
          <label htmlFor="f_tough">Toughness (T)</label>
          <input
            type="number"
            id="f_tough"
            inputMode="numeric"
            min={1}
            step={1}
            value={d.toughness}
            aria-invalid={toughBad || toughStop ? true : undefined}
            aria-describedby={toughStop ? "f_toughblock" : setup ? "f_toughhint" : undefined}
            onChange={(e) => set({ toughness: e.target.value })}
          />
          {setup && (
            <div className="mono dim" id="f_toughhint" style={{ fontSize: 11 }}>
              Setup allows Toughness {SETUP_MAX_TOUGHNESS} or lower, and only one unit at Toughness {SETUP_MAX_TOUGHNESS}.
            </div>
          )}
          {toughBlock && (
            <div className="hint bad" id="f_toughblock" role="alert">
              ! Setup allows Toughness {SETUP_MAX_TOUGHNESS} or lower. This unit is T{toughNum}. Lower its Toughness or pick another unit.
            </div>
          )}
          {nineBlock && (
            <div className="hint bad" id="f_toughblock" role="alert">
              ! Setup allows only one unit at Toughness {SETUP_MAX_TOUGHNESS}, and {nineBlock.name} is already T{SETUP_MAX_TOUGHNESS}. Lower this unit's Toughness or pick another unit.
            </div>
          )}
        </div>
      </div>
      <div className="mono" style={{ fontSize: 12 }}>
        RANK: <span style={{ color: "var(--brass)" }}>{rankOf(shownXp).toUpperCase()}</span> · {allowed} HONOUR SLOT{allowed === 1 ? "" : "S"} · EFFECTIVE{" "}
        {effectivePoints({ points: Number.isFinite(points) ? points : 0, honours: d.honours, relics })} PTS
        {relics.length > 0 ? ` (${relics.length} RELIC${relics.length === 1 ? "" : "S"})` : ""}
      </div>

      <div className="sub">
        <div className="lbl">Role</div>
        <div className="chips" style={{ marginTop: 6 }}>
          <button type="button" className="chip unassigned" aria-pressed={d.role === ""} onClick={() => pickRole("")}>
            Unassigned
          </button>
          {ROLE_NAMES.map((r) => (
            <button key={r} type="button" className="chip" aria-pressed={d.role === r} onClick={() => pickRole(r)}>
              {r}
            </button>
          ))}
        </div>
        <div className="hint">Beasts and Swarms are Infantry. Walkers are Vehicle / Monster. Bikes and cavalry are Mounted. Transports, Aircraft and Fortifications are Other. A unit fills one slot only.</div>
        {charBlock ? null : d.role === "" ? (
          <div className="hint">Unassigned units fill no slot. You can set a role later.</div>
        ) : projected > roleMax ? (
          <div className="hint bad">
            ! {d.role} slots are full ({others} / {roleMax}). You can still save; this unit would be over limit.
          </div>
        ) : (
          <div className="hint">
            {d.role}: {projected} of {roleMax} slots used with this unit.
          </div>
        )}
        <div className="rolelink">
          <div className="tag">Linked to the Character role</div>
          <div className="chips" style={{ marginTop: 4 }}>
            <button
              type="button"
              className="chip"
              aria-pressed={d.isCharacter}
              onClick={() => set(d.isCharacter ? { ...clearChar, role: d.role === "Character" ? "" : d.role } : { isCharacter: true, role: "Character", ...(setup && { isWarlord: true }) })}
            >
              Character
            </button>
            <button type="button" className="chip" aria-pressed={warlord} aria-describedby={setup && warlord ? "f_warhint" : undefined} disabled={!d.isCharacter || (setup && warlord)} onClick={() => set({ isWarlord: !d.isWarlord })}>
              Warlord
            </button>
          </div>
          <div className="hint" style={{ marginTop: 6 }}>
            {d.isCharacter ? "Character ticked, so the role is Character. Choosing any other role clears Character and Warlord." : "Ticking Character sets the role to Character. Warlord is only for Characters."}
          </div>
          {losesDetails && <div className="hint bad">! Saving without Character removes this unit's title, backstory, enhancement and relics.</div>}
          {charBlock && (
            <div className="hint bad" id="f_charblock" role="alert">
              ! Setup allows one Character: your {charBlock.isWarlord ? "Warlord" : "Character"} ({charBlock.name}). Change or remove them first.
            </div>
          )}
        </div>
        {warlord && (
          <div className="mono dim" id="f_warhint" style={{ fontSize: 12, marginTop: 6 }}>
            {setup ? "In Setup your only Character is your Warlord." : "One Warlord per roster. Saving makes this unit the Warlord."}
          </div>
        )}
        {d.isCharacter && (
          <div className="field" style={{ marginTop: 10 }}>
            <label htmlFor="f_enh">Enhancement (optional)</label>
            <input type="text" id="f_enh" value={d.enhancement} placeholder="Enhancement name and effect" onChange={(e) => set({ enhancement: e.target.value })} />
          </div>
        )}
      </div>

      {d.isCharacter && (
        <div className="sub">
          <div className="lbl">Identity · Characters only</div>
          <div className="field" style={{ marginTop: 6 }}>
            <label htmlFor="f_title">Title (optional)</label>
            <input type="text" id="f_title" maxLength={TITLE_MAX} value={d.title} placeholder="e.g. the Unbroken" onChange={(e) => set({ title: e.target.value })} />
            {d.title.trim() && (
              <div className="mono dim" style={{ fontSize: 11 }}>
                {`SHOWS AS "${shownName}, ${d.title.trim().toUpperCase()}"`}
              </div>
            )}
          </div>
          <div className="field" style={{ marginTop: 10 }}>
            <label htmlFor="f_story">Backstory (optional)</label>
            <textarea id="f_story" maxLength={BACKSTORY_MAX} value={d.backstory} placeholder="A few lines of history. Plain text." onChange={(e) => set({ backstory: e.target.value })} />
            <div className={`counter${d.backstory.length >= BACKSTORY_MAX ? " over" : ""}`}>
              {d.backstory.length} / {BACKSTORY_MAX}
            </div>
          </div>
          {warlord && (
            <div className="field" style={{ marginTop: 10 }}>
              <label htmlFor="f_trait">Warlord trait (optional) · Warlord only</label>
              <input type="text" id="f_trait" maxLength={TRAIT_MAX} value={d.warlordTrait} placeholder="Trait name and effect" onChange={(e) => set({ warlordTrait: e.target.value })} />
            </div>
          )}
        </div>
      )}

      <div className="sub">
        <div className="lbl">Career record · every unit</div>
        <div className="formgrid" style={{ marginBlock: 6 }}>
          <div className="field" style={{ flex: "1 1 120px" }}>
            <label htmlFor="f_battles">Battles</label>
            <input type="number" id="f_battles" inputMode="numeric" min={0} step={1} value={d.battles} onChange={(e) => set({ battles: e.target.value })} />
          </div>
          <div className="field" style={{ flex: "1 1 120px" }}>
            <label htmlFor="f_kills">Kills</label>
            <input type="number" id="f_kills" inputMode="numeric" min={0} step={1} value={d.kills} onChange={(e) => set({ kills: e.target.value })} />
          </div>
        </div>
        <div className="mono dim" style={{ fontSize: 11 }}>
          THE POST-BATTLE HELPER ADDS TO THESE. EDIT ONLY TO CORRECT THEM.
        </div>
      </div>

      <div className="sub">
        <div className="lbl">
          Battle Honours · {d.honours.length} of {allowed} for this rank
        </div>
        <div className="chips" style={{ marginTop: 6 }}>
          {honourList.map((h) => (
            <button key={h.n} type="button" className="chip" aria-pressed={d.honours.includes(h.n)} title={h.e} onClick={() => set({ honours: toggle(d.honours, h.n) })}>
              {h.n}
            </button>
          ))}
        </div>
        {d.honours.length > allowed && <div className="overline">More honours than this rank earns. Allowed, just check it's right.</div>}
      </div>

      {!recruits && (
        <div className="sub">
          <div className="lbl">
            {warlord
              ? `Battle Scars · ${d.scars.length} (the Warlord is never removed; at three, a new scar replaces the oldest)`
              : `Battle Scars · ${d.scars.length} of 2 (a third removes the unit)`}
          </div>
          <div className="chips" style={{ marginTop: 6 }}>
            {scarList.map((s) => (
              <button key={s.n} type="button" className="chip" aria-pressed={d.scars.includes(s.n)} title={s.e} onClick={() => set({ scars: toggle(d.scars, s.n) })}>
                {s.n}
              </button>
            ))}
          </div>
          {hasWorn && (
            <div className="field" style={{ marginTop: 10 }}>
              <label htmlFor="f_wgw">Worn Gear: which weapon?</label>
              <input type="text" id="f_wgw" value={d.weapon} placeholder="e.g. bolt rifles" onChange={(e) => set({ weapon: e.target.value })} />
            </div>
          )}
          {d.scars.length >= 3 && !warlord && <div className="overline">Three scars and the unit is gone. Remove it from your roster instead.</div>}
        </div>
      )}

      <div className="row sub">
        <button type="button" className="btn primary" disabled={!!problem || !!charBlock || toughStop || epicBlock} aria-describedby={describedBy} onClick={save}>
          {COPY[mode].cta}
        </button>
        <button type="button" className="btn" onClick={onClose}>
          Cancel
        </button>
      </div>
      {problem && (
        <div className="msg" style={{ marginTop: 6 }}>
          {problem}
        </div>
      )}
    </Overlay>
  );
}
