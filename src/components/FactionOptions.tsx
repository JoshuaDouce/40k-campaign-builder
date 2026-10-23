import { FACTION_GROUPS } from "../game/index.ts";

/** The faction `<option>`s for a `<select>`, grouped by side. */
export function FactionOptions() {
  return FACTION_GROUPS.map((g) => (
    <optgroup key={g.side} label={g.label}>
      {g.factions.map((f) => (
        <option key={f}>{f}</option>
      ))}
    </optgroup>
  ));
}
