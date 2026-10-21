import { useEffect, useRef, useState } from "react";
import { optionAvailability, rollFor } from "./walk.ts";
import type { Env, Step, StepOption } from "./guideTypes.ts";

interface Props {
  step: Step;
  env: Env;
  /** Outcomes that can be picked right now. */
  onPick(opt: StepOption): void;
}

/** A random step: roll for me, or choose the outcome. */
export function RollPanel({ step, env, onPick }: Props) {
  const [rolled, setRolled] = useState<{ value: number; optionId: string } | null>(null);
  const [choosing, setChoosing] = useState(false);
  const continueBtn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (rolled) continueBtn.current?.focus();
  }, [rolled]);
  const die = step.roll?.die ?? 6;
  const hit = rolled ? step.options.find((o) => o.id === rolled.optionId) : undefined;

  return (
    <div className="tg-roll">
      <div className="row">
        {!rolled && (
          <button className="btn primary tg-tap" onClick={() => {
              const allowed = (id: string) => {
                const o = step.options.find((x) => x.id === id);
                return !o || optionAvailability(o, env) === true;
              };
              setRolled(rollFor(step, Math.random, allowed));
            }}
          >
            Roll D{die} for me
          </button>
        )}
        <button className="btn tg-tap" aria-expanded={choosing} onClick={() => setChoosing(!choosing)}>
          Choose
        </button>
      </div>
      {step.roll?.legend && <p className="dim" style={{ fontSize: 14, margin: "8px 0 0" }}>{step.roll.legend}</p>}
      <div role="status" aria-live="polite">
        {rolled && hit ? (
          <div className="twist">
            <span className="mono" style={{ fontSize: 11, color: "var(--blood)" }}>
              ROLLED {rolled.value} ON THE D{die}
            </span>
            <br />
            <b>{hit.crumb ?? hit.label}</b>
            {hit.hint ? (
              <>
                <br />
                {hit.hint}
              </>
            ) : null}
          </div>
        ) : null}
      </div>
      {rolled && hit && (
        <button ref={continueBtn} className="btn primary tg-tap" onClick={() => onPick(hit)}>
          Continue
        </button>
      )}
      {choosing && (
        <div className="acts-grid" role="group" aria-label="Choose the result">
          {step.options.map((o) => {
            const ok = optionAvailability(o, env);
            return (
              <button key={o.id} className="act tg-tap" disabled={ok !== true} onClick={() => onPick(o)}>
                <span className="an">{o.label}</span>
                {(ok !== true || o.hint) && <span className="ad">{ok === true ? o.hint : ok}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
