import { useState } from "react";
import { FACTION_GROUPS } from "../../game/index.ts";
import type { FactionName } from "../../game/index.ts";
import { localUserFor } from "../../store/localMode.ts";
import { useCampaign } from "../../store/useCampaign.ts";
import { newId } from "../newId.ts";

/**
 * Local dev mode only: the organiser picks a faction for a member who has not joined yet, so a test campaign can get
 * past setup without signing in as everyone. The player gets the member's pretend user id, as if they had joined.
 */
export function LocalJoinFor({ email }: { email: string }) {
  const { dispatch, sync } = useCampaign();
  const [faction, setFaction] = useState<FactionName | "">("");

  const join = () => {
    if (!faction) return;
    const name = email.split("@")[0].slice(0, 30) || email;
    dispatch({ type: "addPlayer", id: newId(), name, faction, userId: localUserFor(email, false).userId, email });
  };

  return (
    <div className="ac-ljoin">
      <select aria-label={`Faction for ${email}`} value={faction} onChange={(e) => setFaction(e.target.value as FactionName | "")}>
        <option value="">Pick a faction…</option>
        {FACTION_GROUPS.map((g) => (
          <optgroup key={g.side} label={g.label}>
            {g.factions.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <button className="btn sm" disabled={!faction || sync.saving || sync.offline} onClick={join}>
        Join for them
      </button>
    </div>
  );
}
