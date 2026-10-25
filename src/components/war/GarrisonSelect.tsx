import type { CampaignState } from "../../game/index.ts";

interface Props {
  state: CampaignState;
  /** The attacker, who cannot garrison their own target. */
  playerId: string;
  id: string;
  /** The resolved choice, from `garrisonFor` in pickText.ts. */
  value: string;
  onChange(id: string): void;
  /** Lay the field out in a row (the planning form). */
  inRow?: boolean;
}

/** Garrison player picker for a Conquer on an unclaimed province, with the rule text. */
export function GarrisonSelect({ state, playerId, id, value, onChange, inRow }: Props) {
  const others = state.players.filter((p) => p.id !== playerId);
  const field = (
    <div className="field">
      <label htmlFor={id}>Garrison player</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {others.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  );
  return (
    <>
      {inRow ? (
        <div className="row" style={{ alignItems: "flex-end" }}>
          {field}
        </div>
      ) : (
        field
      )}
      <p className="dim" style={inRow ? { fontSize: 14, marginTop: 8 } : { fontSize: 14 }}>
        Unclaimed province: another player fields the garrison. They gain no RP, Fate Cards or stats from this fight, so pick whoever is free to play. When the battle is rolled you choose: +20% points for you, or -20% points for the garrison.
      </p>
    </>
  );
}
