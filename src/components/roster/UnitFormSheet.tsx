import { useState } from "react";
import {
  BACKSTORY_MAX,
  capProblem,
  withUnit,
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
  slotRole,
  scarName,
  scarWeapon,
  setupCharacterBlock,
  SETUP_MAX_TOUGHNESS,
  setupToughnessBlock,
  setupToughnessNineBlock,
  datasheetLimit,
  minPointsFor,
  datasheetLimitBlock,
  distinctDatasheets,
  isKnightsExempt,
  STAGE_MAX_TOUGHNESS,
  STAGE_SUPPLY,
  toggleOn,
  toughStageActive,
  toughStageBlock,
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
  // Kills give XP one for one: a whole-number change to Kills moves XP by the same amount (never below 0).
  const setKills = (kills: string) =>
    setD((prev) => {
      const whole = (v: string) => (v.trim() === "" ? 0 : Number.isInteger(Number(v)) ? Number(v) : NaN);
      const delta = whole(kills) - whole(prev.kills);
      const xpNow = whole(prev.xp);
      if (recruits || !Number.isFinite(delta) || !Number.isFinite(xpNow) || prev.xp.trim() === "") return { ...prev, kills };
      return { ...prev, kills, xp: String(Math.max(0, xpNow + delta)) };
    });

  const points = d.points.trim() === "" ? NaN : Number(d.points);
  const xp = recruits ? RECRUITS_XP : d.xp.trim() === "" ? NaN : Number(d.xp);
  const shownXp = Number.isFinite(xp) ? xp : 0;
  const allowed = honourSlots(shownXp);
  const hasWorn = d.scars.includes(WORN_GEAR);
  // In Setup the only Character is the Warlord: making a unit a Character ticks Warlord, which then stays on.
  const setup = state.round === 0;
  const playerObj = state.players.find((p) => p.id === playerId);
  const exemptDs = isKnightsExempt(state, playerObj, d.datasheet);
  const wasSoftWarlord = !!existing?.isWarlord && !existing.isCharacter;
  // A non-Character Warlord is allowed for an exempt Knights unit in Setup, or kept if the unit already was one.
  const softAllowed = (setup && exemptDs) || wasSoftWarlord;
  const warlord = d.isWarlord && (d.isCharacter || softAllowed);
  const slots = toggleOn(state, "forceOrg");
  const relics = d.isCharacter ? (existing?.relics ?? []) : [];
  const training = d.isCharacter ? (existing?.training ?? []) : [];
  const honourList = allowedHonours(d);
  const scarList = allowedScars(d);
  const clearChar = { isCharacter: false, isWarlord: false, enhancement: "", warlordTrait: "" } as const;
  // Leaving the Character role clears Warlord too, except a non-Character Warlord, which stays one.
  const keepSoft = d.isWarlord && !d.isCharacter;
  const pickRole = (r: Role | "") =>
    set(r === "Character" ? { role: r, isCharacter: true, ...(setup && { isWarlord: true }) } : { role: r, ...clearChar, isWarlord: keepSoft, warlordTrait: keepSoft ? d.warlordTrait : "" });
  // Picking an Armiger / War Dog datasheet (for a Knights player, rule on) sets Battleline. The player can change it.
  const onDatasheetText = (datasheet: string) =>
    set({ datasheet, ...(!d.isCharacter && !exemptDs && isKnightsExempt(state, playerObj, datasheet) && { role: "Battleline" as Role }) });
  // Picking a datasheet with keyword data sets its role. A Character stays one (a promoted Veteran keeps its slot),
  // and the Knights exemption above wins over the keywords.
  const onDatasheetRole = (role: Role, datasheet: string) => {
    if (d.isCharacter || (role !== "Character" && isKnightsExempt(state, playerObj, datasheet))) return;
    pickRole(role);
  };
  // Battleline fills Non-Monster / Vehicle slots, so the hint counts the shared slots.
  const slotR = d.role ? slotRole(d.role) : "";
  const roleMax = fo.rows.find((r) => r.role === slotR)?.max ?? 0;
  const others = roster.filter((u) => {
    const r = roleOf(u);
    return u.id !== existing?.id && !!r && slotRole(r) === slotR;
  }).length;
  const projected = others + 1;
  const losesDetails = !!existing?.isCharacter && !d.isCharacter && !!(existing.relics?.length || existing.training?.length || existing.title || existing.backstory || existing.enhancement);

  // In Setup, a save that makes this unit a Character is stopped if the roster already has one. Saving an existing Character is fine.
  // A non-Character Warlord added in Setup is the one Character: it is refused beside a Character or another Warlord.
  const addingSoft = setup && warlord && !d.isCharacter && !wasSoftWarlord;
  const softBlock = addingSoft ? (roster.find((x) => x.id !== existing?.id && (x.isCharacter || x.isWarlord)) ?? null) : null;
  const charBlock = (existing?.isCharacter ? null : setupCharacterBlock(state, playerId, { id: existing?.id ?? "", isCharacter: d.isCharacter })) ?? softBlock;

  const toughBlank = d.toughness.trim() === "";
  const toughNum = toughBlank ? NaN : Number(d.toughness);
  const toughBad = !toughBlank && !(Number.isInteger(toughNum) && toughNum >= 1);
  const toughBlock = !toughBad && setupToughnessBlock(state, toughBlank ? undefined : toughNum);
  // T10+ wins over the one-T9 rule: only one message is shown, under the same id.
  const nineBlock = !toughBad && !toughBlock ? setupToughnessNineBlock(state, playerId, { id: existing?.id ?? "", t: toughBlank ? undefined : toughNum, role: d.role || undefined, isCharacter: d.isCharacter }) : null;
  // Precedence: Setup T10, then the Setup T9 rule, then the War Round 1-2 stage cap. One message at a time.
  const stageActive = toughStageActive(state, playerObj);
  const stageBlock = !toughBad && !toughBlock && !nineBlock && toughStageBlock(state, playerId, toughBlank ? undefined : toughNum);
  const toughStop = toughBlock || !!nineBlock || stageBlock;
  const epicBlock = useIsEpicName(faction)(d.datasheet);
  const dsBlock = datasheetLimitBlock(state, playerId, { id: existing?.id ?? "", datasheet: d.datasheet });
  const dsN = datasheetLimit(state, playerId);
  const dsUsed = distinctDatasheets(roster.filter((u) => u.id !== existing?.id));
  const dsMessage = dsBlock ? "! Your roster already uses " + Math.min(dsUsed, dsN) + " of " + dsN + " datasheets, and " + d.datasheet.trim() + " would be a new one. Pick a datasheet you already field, or spend 1 RP on an Extra Datasheet to raise the limit." : undefined;
  const describedBy = [charBlock ? "f_charblock" : "", toughStop ? "f_toughblock" : "", epicBlock ? "f_epicblock" : "", dsBlock && !epicBlock ? "f_dsblock" : ""].filter(Boolean).join(" ") || undefined;

  let problem = "";
  const minPts = minPointsFor(state, existing);
  if (!Number.isFinite(points) || points < 0) problem = "Base points must be 0 or more.";
  else if (points < minPts) problem = `The campaign has started: a unit can grow but not shrink. Base points must be ${minPts} or more.`;
  else if (!Number.isInteger(xp) || xp < 0) problem = "XP must be a whole number, 0 or more.";
  else if (toughBad) problem = "Toughness must be a whole number, 1 or more.";
  else if (!wholeOrEmpty(d.battles)) problem = "Battles must be a whole number, 0 or more.";
  else if (!wholeOrEmpty(d.kills)) problem = "Kills must be a whole number, 0 or more.";
  else if (hasWorn && !d.weapon.trim()) problem = "Worn Gear needs a weapon.";
  else if (recruits && d.honours.length !== 1) problem = "Pick exactly one Battle Honour.";

  /** The unit as the form would save it, under `id`. */
  const build = (id: string): Unit => {
    const enh = d.isCharacter ? d.enhancement.trim() : "";
    const unit: Unit = {
      ...existing,
      id,
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
    if (!d.isCharacter) {
      delete unit.relics;
      delete unit.training;
    }
    if (!toughBlank) unit.t = toughNum;
    else delete unit.t;
    if (d.battles.trim() !== "") unit.battles = Number(d.battles);
    else delete unit.battles;
    if (d.kills.trim() !== "") unit.kills = Number(d.kills);
    else delete unit.kills;
    return unit;
  };
  // Supply and slot caps, checked on the roster as this save would leave it.
  const capBlock = problem ? null : capProblem(state, playerId, withUnit(roster, build(existing?.id ?? "")));
  const blocked = !!problem || !!charBlock || toughStop || epicBlock || dsBlock || !!capBlock;

  const save = () => {
    if (blocked) return;
    onSave(build(existing?.id ?? newUnitId(rng, roster)));
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
          onText={onDatasheetText}
          onPoints={(points) => set({ points })}
          onToughness={(toughness) => set({ toughness })}
          onRole={onDatasheetRole}
          setup={setup}
          epicBlock={epicBlock}
          stage={stageActive}
          limitBlock={dsMessage}
          minPoints={minPts}
        />
        <div className="field" style={{ flex: "1 1 120px" }}>
          <label htmlFor="f_base">Base points</label>
          <input type="number" id="f_base" inputMode="numeric" min={minPts} step={5} value={d.points} onChange={(e) => set({ points: e.target.value })} />
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
            aria-describedby={toughStop ? "f_toughblock" : setup || stageActive ? "f_toughhint" : undefined}
            onChange={(e) => set({ toughness: e.target.value })}
          />
          {setup && (
            <div className="mono dim" id="f_toughhint" style={{ fontSize: 11 }}>
              Setup allows Toughness {SETUP_MAX_TOUGHNESS} or lower, and only one unit at Toughness {SETUP_MAX_TOUGHNESS} (Battleline excepted).
            </div>
          )}
          {stageActive && !setup && (
            <div className="mono dim" id="f_toughhint" style={{ fontSize: 11 }}>
              War Rounds 1 and 2 allow Toughness {STAGE_MAX_TOUGHNESS} or lower, until your supply limit reaches {STAGE_SUPPLY} pts.
            </div>
          )}
          {stageBlock && (
            <div className="hint bad" id="f_toughblock" role="alert">
              ! War Rounds 1 and 2 allow Toughness {STAGE_MAX_TOUGHNESS} or lower until your supply limit reaches {STAGE_SUPPLY} pts. This unit is T{toughNum}. Lower its Toughness or pick another unit.
            </div>
          )}
          {toughBlock && (
            <div className="hint bad" id="f_toughblock" role="alert">
              ! Setup allows Toughness {SETUP_MAX_TOUGHNESS} or lower. This unit is T{toughNum}. Lower its Toughness or pick another unit.
            </div>
          )}
          {nineBlock && (
            <div className="hint bad" id="f_toughblock" role="alert">
              ! Setup allows only one unit at Toughness {SETUP_MAX_TOUGHNESS} (Battleline excepted), and {nineBlock.name} is already T{SETUP_MAX_TOUGHNESS}. Lower this unit's Toughness, make it Battleline if its datasheet is, or pick another unit.
            </div>
          )}
        </div>
      </div>
      <div className="mono" style={{ fontSize: 12 }}>
        RANK: <span style={{ color: "var(--brass)" }}>{rankOf(shownXp).toUpperCase()}</span> · {allowed} HONOUR SLOT{allowed === 1 ? "" : "S"} · EFFECTIVE{" "}
        {effectivePoints({ points: Number.isFinite(points) ? points : 0, honours: d.honours, relics, training })} PTS
        {relics.length > 0 ? ` (${relics.length} RELIC${relics.length === 1 ? "" : "S"})` : ""}
        {training.length > 0 ? ` (${training.length} TRAINING)` : ""}
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
        <div className="hint">Picking a datasheet fills this in from its keywords; you can change it. A Character always fills a Character slot. Beasts and Swarms are Non-Monster / Vehicle. Walkers and Aircraft are Vehicle / Monster. Transports and Fortifications are Other.{slots ? " A unit fills one slot only." : ""}</div>
        {exemptDs && d.role === "Battleline" && !d.isCharacter && <div className="rt-note">Armigers and War Dogs count as Battleline in this campaign.</div>}
        {!slots || charBlock ? null : d.role === "" ? (
          <div className="hint">Unassigned units fill no slot. You can set a role later.</div>
        ) : projected > roleMax ? (
          // A save that grows the row is refused with the cap message below; a level edit of an over-full row may save.
          capBlock ? null : (
            <div className="hint bad">
              ! {slotR} slots are over the limit ({projected} / {roleMax}). This save doesn't add to it.
            </div>
          )
        ) : (
          <div className="hint">
            {slotR}: {projected} of {roleMax} slots used with this unit.{slotR !== d.role ? ` ${d.role} fills these slots.` : ""}
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
            <button type="button" className="chip" aria-pressed={warlord} aria-describedby={setup && warlord ? "f_warhint" : exemptDs && setup ? "f_knighthint" : undefined} disabled={!(d.isCharacter || softAllowed) || (setup && warlord && d.isCharacter)} onClick={() => set({ isWarlord: !d.isWarlord })}>
              Warlord
            </button>
          </div>
          <div className="hint" style={{ marginTop: 6 }}>
            {d.isCharacter ? "Character ticked, so the role is Character. Choosing any other role clears Character and Warlord." : "Ticking Character sets the role to Character. Warlord is only for Characters."}
          </div>
          {exemptDs && setup && !d.isCharacter && (
            <div className="hint" id="f_knighthint" style={{ marginTop: 6 }}>
              Knights exemption: this Armiger can be your Setup Warlord without being a Character. It counts as your one Character.
            </div>
          )}
          {losesDetails && <div className="hint bad">! Saving without Character removes this unit's title, backstory, enhancement, relics and Battle Training.</div>}
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

      {warlord && !d.isCharacter && (
        <div className="rt-trait">
          <label className="lbl" htmlFor="f_trait">
            Warlord trait (optional) · Warlord only
          </label>
          <input type="text" id="f_trait" maxLength={TRAIT_MAX} value={d.warlordTrait} placeholder="Trait name and effect" onChange={(e) => set({ warlordTrait: e.target.value })} />
        </div>
      )}

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
            <input type="number" id="f_kills" inputMode="numeric" min={0} step={1} value={d.kills} onChange={(e) => setKills(e.target.value)} />
          </div>
        </div>
        <div className="mono dim" style={{ fontSize: 11 }}>
          THE POST-BATTLE HELPER ADDS TO THESE. EDIT ONLY TO CORRECT THEM. EACH KILL ADDED OR REMOVED HERE MOVES XP BY 1; ADD MARKED FOR GLORY'S +1 XP BY HAND.
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
        <button type="button" className="btn primary" disabled={blocked} aria-describedby={describedBy} onClick={save}>
          {COPY[mode].cta}
        </button>
        <button type="button" className="btn" onClick={onClose}>
          Cancel
        </button>
      </div>
      {capBlock && (
        <div className="hint bad" role="alert">
          ! {capBlock}
        </div>
      )}
      {problem && (
        <div className="msg" style={{ marginTop: 6 }}>
          {problem}
        </div>
      )}
    </Overlay>
  );
}
