import { rollDie } from "../../game/index.ts";
import { useRng } from "./useRng.ts";

interface Props {
  faces: number;
  value: number | undefined;
  label: string;
  onChange(v: number | undefined): void;
}

/** Roll a die with the app's RNG, or enter the result rolled at the table. */
export function DieControl({ faces, value, label, onChange }: Props) {
  const rng = useRng();
  return (
    <span className="diebtn">
      <button type="button" className="btn sm" onClick={() => onChange(rollDie(rng, faces))}>
        Roll D{faces}
      </button>
      <select aria-label={`Enter ${label} result`} value={value ?? ""} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}>
        <option value="">or enter</option>
        {Array.from({ length: faces }, (_, i) => (
          <option key={i} value={i + 1}>
            {i + 1}
          </option>
        ))}
      </select>
      <span className="die">{value ?? "·"}</span>
    </span>
  );
}
