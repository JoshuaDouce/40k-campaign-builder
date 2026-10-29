import { useEffect, useState } from "react";
import {
  honourEffect,
  extrasPoints,
  honourPoints,
  MAX_RELICS,
  rankIndex,
  RANKS,
  RELIC_PTS,
  TRAINING_PTS,
  trainingEffect,
  roleOf,
  relicEffect,
  scarEffect,
  scarLabel,
  scarWeapon,
  xpToNext,
} from "../../game/index.ts";
import type { Unit } from "../../game/index.ts";
import { EffectList } from "./EffectList.tsx";
import { FallSheet } from "./FallSheet.tsx";

interface Props {
  unit: Unit;
  editable: boolean;
  /** False in Setup: removing a Character there leaves no Hall of Heroes memorial. */
  memorial: boolean;
  overLimit?: boolean;
  /** In Setup, the unit is T10 or higher. */
  toughOver?: boolean;
  /** Setup: a second or later non-Battleline unit at Toughness 9. */
  toughNineExtra?: boolean;
  /** The unit is an Epic Hero (any round). */
  epic?: boolean;
  /** Toughness stages is active for this player and the unit is T12 or higher. */
  toughStage?: boolean;
  /** The unit is a Warlord but not a Character, and the Knights exemption does not cover it. */
  warlordNotChar?: boolean;
  onEdit(): void;
  /** False once the campaign has started (example units excepted): no Remove button. */
  removable: boolean;
  /** Characters pass the cause entered on the "Why did they fall?" sheet. */
  onRemove(cause?: string): void;
  /** The organiser's delete for a locked unit (owner only): removes it outright, no Hall of Heroes. */
  onOrganiserDelete?(): void;
  onRollRelic(): void;
  onRemoveRelic(relic: string): void;
}

export function UnitCard({ unit, editable, memorial, overLimit, toughOver, toughNineExtra, epic, toughStage, warlordNotChar, removable, onEdit, onRemove, onOrganiserDelete, onRollRelic, onRemoveRelic }: Props) {
  const [armed, setArmed] = useState(false);
  const [armedDelete, setArmedDelete] = useState(false);
  const [asking, setAsking] = useState(false);
  // Honour or scar whose effect is shown under the badges: tap a badge to show it (phones can't hover).
  const [shownFx, setShownFx] = useState<string | null>(null);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);
  useEffect(() => {
    if (!armedDelete) return;
    const t = setTimeout(() => setArmedDelete(false), 4000);
    return () => clearTimeout(t);
  }, [armedDelete]);

  const role = roleOf(unit);
  const ri = rankIndex(unit.xp);
  const rank = RANKS[ri];
  const next = RANKS[ri + 1];
  const legend = !next;
  const danger = unit.scars.length >= 2;
  const toNext = xpToNext(unit.xp);
  const remembered = unit.isCharacter && memorial;
  const pct = next ? Math.round(((unit.xp - rank.xp) / (next.xp - rank.xp)) * 100) : 100;
  const relics = unit.relics ?? [];
  const training = unit.isCharacter ? (unit.training ?? []) : [];
  // The tapped badge's name and effect, while it is still on the unit.
  const shown = !shownFx
    ? null
    : unit.honours.includes(shownFx)
      ? { n: shownFx, e: honourEffect(shownFx), tone: "hon" as const }
      : unit.scars.includes(shownFx)
        ? { n: scarLabel(shownFx), e: scarEffect(shownFx), tone: "scar" as const }
        : training.includes(shownFx)
          ? { n: shownFx, e: trainingEffect(shownFx), tone: "train" as const }
          : null;
  const hp = honourPoints(unit);
  const honourDelta = hp - unit.points;
  const eff = hp + extrasPoints(unit);
  const addOns = [
    honourDelta > 0 && `+${honourDelta} honour`,
    relics.length > 0 && `+${RELIC_PTS * relics.length} relics`,
    training.length > 0 && `+${TRAINING_PTS * training.length} training`,
  ].filter(Boolean);
  const battles = unit.battles ?? 0;
  const kills = unit.kills ?? 0;
  const hasDetails = !!((unit.isWarlord && unit.warlordTrait) || unit.enhancement || unit.backstory);
  const cls = ["unit", legend ? "legend" : "", danger ? "danger" : ""].filter(Boolean).join(" ");

  return (
    <article className={cls}>
      <div className="top">
        <div style={{ minWidth: 0 }}>
          <div className="k">
            <span>{unit.datasheet}</span>
            {unit.t != null && (
              <>
                {" · "}
                <span className="mono dim">T{unit.t}</span>
              </>
            )}
          </div>
          <div className="t">
            {unit.name}
            {unit.isCharacter && unit.title && <span className="title-sub">, {unit.title}</span>}
          </div>
        </div>
        <div className="pts">
          <b>{eff} pts</b>
          {unit.isCharacter && (unit.honours.length > 0 || relics.length > 0 || training.length > 0) ? (
            <>
              <s>{unit.points} base</s>
              <em>{addOns.join(" ")}</em>
            </>
          ) : unit.honours.length ? (
            <>
              <s>{unit.points} base</s> +{eff - unit.points}
            </>
          ) : (
            <span className="dim">{unit.points} base</span>
          )}
        </div>
      </div>
      <div className="badges">
        {role === "Character" ? (
          <span className="badge char">Character</span>
        ) : role ? (
          <span className="badge role">{role}</span>
        ) : (
          <span className="badge none">No role</span>
        )}
        {overLimit && <span className="badge warn">Over limit</span>}
        {unit.ex && <span className="badge ex">Example</span>}
        {legend ? <span className="badge legend">Legend of the Reach</span> : <span className="badge">{rank.n}</span>}
        {unit.isWarlord && <span className="badge war">Warlord</span>}
      </div>
      {unit.isCharacter ? (
        <div className="career">
          <span>
            <b>{battles}</b> battles
          </span>
          <span className="sep">·</span>
          <span>
            <b>{kills}</b> kills
          </span>
        </div>
      ) : (
        <div className="career-sm">
          CAREER · {battles} battles · {kills} kills
        </div>
      )}
      <div className="xp">
        <span>{unit.xp} XP</span>
        <div className={`bar${toNext === 1 ? " close" : ""}`} role="progressbar" aria-label="XP to next rank" aria-valuemin={rank.xp} aria-valuenow={unit.xp} aria-valuemax={next ? next.xp : unit.xp}>
          <i style={{ width: `${pct}%` }}></i>
        </div>
        <span>
          {next ? toNext === 1 ? <b style={{ color: "var(--verd)" }}>1 XP to {next.n}</b> : `${toNext} to ${next.n}` : "Max rank"}
        </span>
      </div>
      {(unit.honours.length > 0 || unit.scars.length > 0 || training.length > 0) && (
        <div className="badges">
          {unit.honours.map((h) => (
            <button key={h} type="button" className="badge hon tap" aria-expanded={shownFx === h} title={honourEffect(h)} onClick={() => setShownFx(shownFx === h ? null : h)}>
              {h}
            </button>
          ))}
          {unit.scars.map((s) => {
            const w = scarWeapon(s);
            const effect = scarEffect(s);
            return (
              <button key={s} type="button" className="badge scar tap" aria-expanded={shownFx === s} title={w ? `${effect} (Worn Gear: ${w})` : effect} onClick={() => setShownFx(shownFx === s ? null : s)}>
                {scarLabel(s)}
              </button>
            );
          })}
          {training.map((t) => (
            <button key={t} type="button" className="badge train tap" aria-expanded={shownFx === t} title={trainingEffect(t)} onClick={() => setShownFx(shownFx === t ? null : t)}>
              {t}
            </button>
          ))}
        </div>
      )}
      {shown && <EffectList items={[shown]} tone={shown.tone} />}
      {unit.isCharacter && hasDetails && (
        <details className="more">
          <summary>
            <span>Details · trait, enhancement, backstory</span>
          </summary>
          <div className="inner">
            {unit.isWarlord && unit.warlordTrait && (
              <div className="enh">
                <span>Warlord trait</span>
                {unit.warlordTrait}
              </div>
            )}
            {unit.enhancement && (
              <div className="enh">
                <span>Enhancement</span>
                {unit.enhancement}
              </div>
            )}
            {unit.backstory && (
              <div>
                <div className="lbl">Backstory</div>
                <div className="story">{unit.backstory}</div>
              </div>
            )}
          </div>
        </details>
      )}
      {!unit.isCharacter && unit.isWarlord && unit.warlordTrait && (
        <div className="enh">
          <span>Warlord trait</span>
          {unit.warlordTrait}
        </div>
      )}
      {!unit.isCharacter && unit.enhancement && (
        <div className="enh">
          <span>Enhancement</span>
          {unit.enhancement}
        </div>
      )}
      {unit.isCharacter && (relics.length > 0 || editable) && (
        <>
          <div className="lbl">
            Relics · {relics.length} of {MAX_RELICS}
          </div>
          {relics.length > 0 && (
            <div className="relics">
              {relics.map((r) => (
                <div className="relic" key={r}>
                  <div>
                    <b>{r}</b>
                    {relicEffect(r)}
                  </div>
                  {editable && (
                    <button type="button" className="btn sm danger x" aria-label={`Remove relic ${r}`} onClick={() => onRemoveRelic(r)}>
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          {editable && (
            <div className="relicbar">
              <button type="button" className="btn sm primary" disabled={relics.length >= MAX_RELICS} onClick={onRollRelic}>
                Roll a relic
              </button>
              <span className="mono">{relics.length >= MAX_RELICS ? "At the limit: remove a relic to earn another." : `+${RELIC_PTS} pts each`}</span>
            </div>
          )}
        </>
      )}
      {legend && (
        <div className="warnline" style={{ color: "var(--brass)" }}>
          Named in the campaign log: {unit.name}
        </div>
      )}
      {danger && !unit.isWarlord && <div className="warnline">2 scars. One more and this unit is gone.</div>}
      {toughOver && unit.t != null && <div className="warnline">! T{unit.t}: over the Setup limit</div>}
      {toughNineExtra && !toughOver && <div className="warnline">! T9: only one non-Battleline unit at T9 in Setup</div>}
      {toughStage && unit.t != null && <div className="warnline">! T{unit.t}: over the War Round 1–2 limit</div>}
      {warlordNotChar && <div className="warnline">! Warlord is not a Character</div>}
      {epic && <div className="warnline">! Epic Hero: not allowed in this campaign</div>}
      {editable && (
        <div className="acts">
          <button className="btn sm" onClick={onEdit}>
            Edit
          </button>
          {removable && (
            <button
              className="btn sm danger"
              onClick={() => {
                if (remembered) setAsking(true);
                else if (armed) onRemove();
                else setArmed(true);
              }}
            >
              {armed && !remembered ? "Confirm remove" : "Remove"}
            </button>
          )}
          {!removable && onOrganiserDelete && (
            <button
              className="btn sm danger"
              onClick={() => {
                if (armedDelete) onOrganiserDelete();
                else setArmedDelete(true);
              }}
            >
              {armedDelete ? "Confirm delete" : "Delete (organiser)"}
            </button>
          )}
        </div>
      )}
      {asking && (
        <FallSheet
          unit={unit}
          onClose={() => setAsking(false)}
          onConfirm={(cause) => {
            setAsking(false);
            onRemove(cause);
          }}
        />
      )}
    </article>
  );
}
