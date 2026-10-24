import { useEffect, useState } from "react";
import {
  honourEffect,
  honourPoints,
  MAX_RELICS,
  rankIndex,
  RANKS,
  RELIC_PTS,
  roleOf,
  relicEffect,
  scarEffect,
  scarLabel,
  scarWeapon,
  xpToNext,
} from "../../game/index.ts";
import type { Unit } from "../../game/index.ts";
import { FallSheet } from "./FallSheet.tsx";

interface Props {
  unit: Unit;
  editable: boolean;
  /** False in Setup: removing a Character there leaves no Hall of Heroes memorial. */
  memorial: boolean;
  overLimit?: boolean;
  /** In Setup, the unit is T10 or higher. */
  toughOver?: boolean;
  onEdit(): void;
  /** Characters pass the cause entered on the "Why did they fall?" sheet. */
  onRemove(cause?: string): void;
  onRollRelic(): void;
  onRemoveRelic(relic: string): void;
}

export function UnitCard({ unit, editable, memorial, overLimit, toughOver, onEdit, onRemove, onRollRelic, onRemoveRelic }: Props) {
  const [armed, setArmed] = useState(false);
  const [asking, setAsking] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);

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
  const hp = honourPoints(unit);
  const honourDelta = hp - unit.points;
  const eff = hp + RELIC_PTS * relics.length;
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
          {unit.isCharacter && (unit.honours.length > 0 || relics.length > 0) ? (
            <>
              <s>{unit.points} base</s>
              <em>
                {honourDelta > 0 && `+${honourDelta} honour`}
                {honourDelta > 0 && relics.length > 0 && " "}
                {relics.length > 0 && `+${RELIC_PTS * relics.length} relics`}
              </em>
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
      {(unit.honours.length > 0 || unit.scars.length > 0) && (
        <div className="badges">
          {unit.honours.map((h) => (
            <span key={h} className="badge hon" title={honourEffect(h)}>
              {h}
            </span>
          ))}
          {unit.scars.map((s) => {
            const w = scarWeapon(s);
            const effect = scarEffect(s);
            return (
              <span key={s} className="badge scar" title={w ? `${effect} (Worn Gear: ${w})` : effect}>
                {scarLabel(s)}
              </span>
            );
          })}
        </div>
      )}
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
      {editable && (
        <div className="acts">
          <button className="btn sm" onClick={onEdit}>
            Edit
          </button>
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
