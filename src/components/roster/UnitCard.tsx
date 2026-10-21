import { useEffect, useState } from "react";
import { effectivePoints, HONOURS, rankIndex, RANKS, SCARS, scarName, scarWeapon, xpToNext } from "../../game/index.ts";
import type { Unit } from "../../game/index.ts";

interface Props {
  unit: Unit;
  editable: boolean;
  onEdit(): void;
  onRemove(): void;
}

export function UnitCard({ unit, editable, onEdit, onRemove }: Props) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);

  const ri = rankIndex(unit.xp);
  const rank = RANKS[ri];
  const next = RANKS[ri + 1];
  const legend = !next;
  const danger = unit.scars.length >= 2;
  const toNext = xpToNext(unit.xp);
  const pct = next ? Math.round(((unit.xp - rank.xp) / (next.xp - rank.xp)) * 100) : 100;
  const eff = effectivePoints(unit);
  const cls = ["unit", legend ? "legend" : "", danger ? "danger" : ""].filter(Boolean).join(" ");

  return (
    <article className={cls}>
      <div className="top">
        <div style={{ minWidth: 0 }}>
          <div className="k">
            <span>{unit.datasheet}</span>
          </div>
          <div className="t">{unit.name}</div>
        </div>
        <div className="pts">
          <b>{eff} pts</b>
          {unit.honours.length ? (
            <>
              <s>{unit.points} base</s> +{eff - unit.points}
            </>
          ) : (
            <span className="dim">{unit.points} base</span>
          )}
        </div>
      </div>
      <div className="badges">
        {unit.ex && <span className="badge ex">Example</span>}
        {legend ? <span className="badge legend">Legend of the Reach</span> : <span className="badge">{rank.n}</span>}
        {unit.isWarlord && <span className="badge war">Warlord</span>}
        {unit.isCharacter && <span className="badge char">Character</span>}
      </div>
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
            <span key={h} className="badge hon" title={HONOURS.find((x) => x.n === h)?.e}>
              {h}
            </span>
          ))}
          {unit.scars.map((s) => {
            const w = scarWeapon(s);
            const name = scarName(s);
            const effect = SCARS.find((x) => x.n === name)?.e;
            return (
              <span key={s} className="badge scar" title={w ? `${effect} (Worn Gear: ${w})` : effect}>
                {w ? `${name}: ${w}` : name}
              </span>
            );
          })}
        </div>
      )}
      {unit.enhancement && (
        <div className="enh">
          <span>Enhancement</span>
          {unit.enhancement}
        </div>
      )}
      {legend && (
        <div className="warnline" style={{ color: "var(--brass)" }}>
          Named in the campaign log: {unit.name}
        </div>
      )}
      {danger && <div className="warnline">2 scars. One more and this unit is gone.</div>}
      {editable && (
        <div className="acts">
          <button className="btn sm" onClick={onEdit}>
            Edit
          </button>
          <button
            className="btn sm danger"
            onClick={() => {
              if (armed) onRemove();
              else setArmed(true);
            }}
          >
            {armed ? "Confirm remove" : "Remove"}
          </button>
        </div>
      )}
    </article>
  );
}
