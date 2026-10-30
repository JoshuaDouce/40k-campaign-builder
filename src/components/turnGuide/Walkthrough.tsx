import { useEffect, useMemo, useRef } from "react";
import { DesignNotes, Paras } from "./DesignNote.tsx";
import { EndSummary } from "./EndSummary.tsx";
import { RollPanel } from "./RollPanel.tsx";
import { SideActions } from "./SideActions.tsx";
import { STEPS } from "./stepGraph.ts";
import { Tally } from "./Tally.tsx";
import { carryOver, isTurnOver, optionAvailability, optionsOf, replay, stepText } from "./walk.ts";
import { KIND_LABEL } from "./guideTypes.ts";
import type { Scenario, SideUse, StepOption, TrailItem } from "./guideTypes.ts";

interface Props {
  sc: Scenario;
  trail: TrailItem[];
  setTrail(t: TrailItem[]): void;
  sides: SideUse[];
  setSides(s: SideUse[]): void;
  showNotes: boolean;
  onSeeInTree(): void;
  onNextTurn(next: Scenario): void;
}

/** One step at a time, as a player at the table would meet it. */
export function Walkthrough({ sc, trail, setTrail, sides, setSides, showNotes, onSeeInTree, onNextTurn }: Props) {
  const rep = useMemo(() => replay(sc, trail, sides), [sc, trail, sides]);
  const step = STEPS[rep.stepId];
  const heading = useRef<HTMLHeadingElement>(null);
  const seen = useRef({ stepId: rep.stepId, len: trail.length });

  useEffect(() => {
    const prev = seen.current;
    seen.current = { stepId: rep.stepId, len: trail.length };
    if (prev.stepId === rep.stepId && prev.len === trail.length) return;
    heading.current?.focus();
  }, [rep.stepId, trail.length]);

  const pick = (opt: StepOption) => setTrail([...trail, { stepId: step.id, optionId: opt.id }]);
  const back = () => {
    setTrail(trail.slice(0, -1));
    setSides(sides.filter((s) => s.at < trail.length));
  };
  const restart = () => {
    setTrail([]);
    setSides([]);
  };
  const opts = optionsOf(step, rep.env.sc);
  const single = opts.length === 1;
  const over = isTurnOver(step);

  return (
    <div className="tg-walk">
      {rep.crumbs.length > 0 && (
        <nav aria-label="Your choices so far">
          <ol className="tg-crumbs">
            {rep.crumbs.map((c, i) => (
              <li key={`${c.stepId}-${i}`}>{c.label}</li>
            ))}
          </ol>
        </nav>
      )}
      <Tally env={rep.env} />
      <div className="turn">
        <div className="eyebrow">{KIND_LABEL[step.kind]}</div>
        <h3 ref={heading} tabIndex={-1}>
          {step.title}
        </h3>
        {over ? (
          <EndSummary step={step} env={rep.env} crumbs={rep.crumbs} />
        ) : (
          <div style={{ marginTop: 10 }}>
            <Paras text={stepText(step, rep.env)} />
          </div>
        )}
        {step.kind === "roll" ? (
          <RollPanel key={`${step.id}-${trail.length}`} step={step} env={rep.env} onPick={pick} />
        ) : single ? (
          <button className="btn primary tg-tap" onClick={() => pick(opts[0])}>
            {opts[0].label}
          </button>
        ) : opts.length > 0 ? (
          <div className="acts-grid" role="group" aria-label={step.title}>
            {opts.map((o) => {
              const ok = optionAvailability(o, rep.env);
              return (
                <button key={o.id} className="act tg-tap" disabled={ok !== true} onClick={() => pick(o)}>
                  <span className="an">{o.label}</span>
                  {(ok !== true || o.hint) && <span className="ad">{ok === true ? o.hint : ok}</span>}
                </button>
              );
            })}
          </div>
        ) : null}
        {step.side && (
          <SideActions
            key={`${step.id}-${trail.length}`}
            groups={step.side}
            env={rep.env}
            uses={sides}
            onUse={(id) => setSides([...sides, { id, at: trail.length }])}
          />
        )}
        {showNotes && <DesignNotes notes={step.notes} />}
      </div>
      <div className="row tg-nav">
        <button className="btn tg-tap" disabled={!trail.length} onClick={back}>
          Back
        </button>
        <button className="btn tg-tap" disabled={!trail.length} onClick={restart}>
          {step.kind === "end" ? "Back to start" : "Restart"}
        </button>
        {over && (
          <button className="btn primary tg-tap" onClick={() => onNextTurn(carryOver(rep.env))}>
            Play another turn
          </button>
        )}
        {trail.length > 0 && (
          <button className="btn tg-tap" onClick={onSeeInTree}>
            See in tree
          </button>
        )}
      </div>
    </div>
  );
}
