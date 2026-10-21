import { Paras } from "./DesignNote.tsx";
import { afterReminders } from "./stepGraph.ts";
import { stepText } from "./walk.ts";
import type { Crumb } from "./walk.ts";
import type { Env, Step } from "./guideTypes.ts";

const GAIN_LABEL: ReadonlyArray<readonly [keyof Env["tally"], string]> = [
  ["rp", "RP"],
  ["cards", "Fate Cards"],
  ["provinces", "provinces"],
  ["supply", "pts of supply"],
];

/** The turn-end summary: what you did, what changed, what to remember, what comes next. */
export function EndSummary({ step, env, crumbs }: { step: Step; env: Env; crumbs: Crumb[] }) {
  const gains = GAIN_LABEL.filter(([k]) => env.tally[k] !== 0);
  const reminders = afterReminders(env.ctx, env.sc);
  return (
    <div className="tg-end">
      <h5>What you did</h5>
      <p>{crumbs.length ? crumbs.map((c) => c.label).join(" › ") : "Nothing yet."}</p>
      <h5>Gains and losses</h5>
      {gains.length ? (
        <ul className="tg-list">
          {gains.map(([k, label]) => (
            <li key={k}>
              {env.tally[k] > 0 ? "+" : ""}
              {env.tally[k]} {label}
            </li>
          ))}
        </ul>
      ) : (
        <p>None this turn.</p>
      )}
      {reminders.length > 0 && (
        <>
          <h5>Remember at the table</h5>
          <ul className="tg-list">
            {reminders.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          {env.ctx.result && (
            <button className="btn sm tg-tap" onClick={() => (location.hash = "roster")}>
              Open the Roster tab
            </button>
          )}
        </>
      )}
      <h5>What happens next</h5>
      <Paras text={stepText(step, env)} />
    </div>
  );
}
