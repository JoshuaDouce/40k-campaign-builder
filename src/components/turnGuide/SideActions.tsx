import { useState } from "react";
import { SIDE_ACTIONS } from "./sideActions.ts";
import type { Env, SideGroup, SideUse } from "./guideTypes.ts";

interface Props {
  groups: SideGroup[];
  env: Env;
  uses: SideUse[];
  onUse(id: string): void;
}

/** Optional "any time" choices: spend RP, play Fate Cards. */
export function SideActions({ groups, env, uses, onUse }: Props) {
  const [open, setOpen] = useState(false);
  const list = SIDE_ACTIONS.filter((a) => groups.includes(a.group));
  const battle = groups.includes("battle");
  return (
    <div className="tg-side">
      <button className="btn sm tg-tap" aria-expanded={open} onClick={() => setOpen(!open)}>
        {battle ? "Play Fate Cards (optional)" : "Spend RP now (optional)"}
      </button>
      {open && (
        <div className="acts-grid">
          {list.map((a) => {
            const used = uses.filter((u) => u.id === a.id).length;
            const ok = a.available(env, used);
            return (
              <button key={a.id} className="act tg-tap" disabled={ok !== true} onClick={() => onUse(a.id)}>
                <span className="an">
                  {a.label}
                  {used ? ` ×${used}` : ""}
                </span>
                <span className="ad">{ok === true ? (typeof a.hint === "function" ? a.hint(env.sc) : a.hint) : ok}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
