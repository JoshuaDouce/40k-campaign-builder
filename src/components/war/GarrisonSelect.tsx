import type { CampaignState } from "../../game/index.ts";
import { doingText } from "./pickText.ts";

interface Props {
  state: CampaignState;
  /** The attacker, who cannot garrison their own target. */
  playerId: string;
  id: string;
  /** The resolved choice, from `garrisonFor` in pickText.ts ("" for none yet). */
  value: string;
  onChange(id: string): void;
  /** Only the attacker or the owner may choose. */
  disabled?: boolean;
}

/** Garrison player picker for a Conquer on an unclaimed province, with what each player is doing and the rule text. */
export function GarrisonSelect({ state, playerId, id, value, onChange, disabled }: Props) {
  const others = state.players.filter((p) => p.id !== playerId);
  return (
    <>
      <div className="field">
        <label htmlFor={id}>Garrison player</label>
        <select id={id} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
          <option value="" disabled>
            Choose a player…
          </option>
          {others.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {doingText(state, p.id)}
            </option>
          ))}
        </select>
      </div>
      <p className="dim" style={{ fontSize: 14 }}>
        Unclaimed province: another player fields the garrison. They gain no RP, Fate Cards or stats from this fight. Each name shows what they are doing this round, so choose someone who is free to play. When the battle is rolled you choose: +20% points for you, or -20% points for the garrison.
      </p>
    </>
  );
}
