import { useState } from "react";
import { HOLDING_CAP } from "../../game/index.ts";
import type { ForceOrg, ForceOrgRow } from "../../game/index.ts";

const SHOWN = 3;

function problemsOf(row: ForceOrgRow) {
  return { short: Math.max(0, row.min - row.filled), over: Math.max(0, row.filled - row.max) };
}

const needRole = (n: number) => (n === 1 ? "1 unit needs a role" : `${n} units need a role`);

function summaryOf(fo: ForceOrg): { text: string; bad: boolean } {
  const probs = fo.rows.map(problemsOf);
  const unmet = probs.filter((p) => p.short).length;
  const over = probs.filter((p) => p.over).length;
  const parts: string[] = [];
  if (unmet) parts.push(`${unmet} minimum${unmet === 1 ? "" : "s"} unmet`);
  if (over) parts.push(`${over} over limit`);
  const bad = parts.length > 0;
  let text = bad ? `! ${parts.join(" · ")}` : "Minimums met, within limits";
  if (fo.unassigned) text += ` · ${needRole(fo.unassigned)}`;
  return { text, bad };
}

function Row({ row }: { row: ForceOrgRow }) {
  const { short, over } = problemsOf(row);
  const warn = short > 0 || over > 0;
  const shown = row.sources.slice(0, SHOWN);
  return (
    <div className={`fo-row${warn ? " warn" : ""}`}>
      <div className="nm">
        {row.role}
        {row.covers && <span className="cv">{row.covers}</span>}
      </div>
      <div className="ct">
        {row.filled}
        <small> / {row.max}</small>
      </div>
      <div className="src">
        {row.note ? (
          row.note
        ) : shown.length === 0 ? (
          "Base slots only"
        ) : (
          <>
            Base {row.base}
            {shown.map((s, i) => (
              <span key={`${s.province}-${i}`}>
                {" · "}
                <b>+1 {s.label}</b> ({s.province})
              </span>
            ))}
            {row.matching === HOLDING_CAP && " · cap reached"}
            {row.matching > HOLDING_CAP && ` · ${row.matching} held, capped at +${HOLDING_CAP}`}
          </>
        )}
      </div>
      {short > 0 && <div className="flag">! Needs {short} more {row.role}</div>}
      {over > 0 && <div className="flag">! Over limit by {over}</div>}
      {row.min > 0 && <div className="mn">min {row.min}</div>}
    </div>
  );
}

export function ForceOrgChart({ fo }: { fo: ForceOrg }) {
  const sum = summaryOf(fo);
  const [open, setOpen] = useState(sum.bad);
  const [wasBad, setWasBad] = useState(sum.bad);
  // Open whenever the warnings change from none to some. The user can still toggle it.
  if (sum.bad !== wasBad) {
    setWasBad(sum.bad);
    if (sum.bad) setOpen(true);
  }
  return (
    <details className="fo" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>
        <span className="ttl">Force Organisation</span>
        <span className={`state${sum.bad ? " bad" : ""}`}>{sum.text}</span>
        <span className="chev" aria-hidden="true"></span>
      </summary>
      {fo.rows.map((r) => (
        <Row key={r.role} row={r} />
      ))}
      <div className="fo-foot">
        {fo.unassigned > 0 && (
          <div className="nudge">
            {needRole(fo.unassigned)}. Unassigned units fill no slot.
          </div>
        )}
        Holdings add up to +{HOLDING_CAP} per role. Slots follow the provinces you hold right now. Guidance only: nothing is blocked.
      </div>
    </details>
  );
}
