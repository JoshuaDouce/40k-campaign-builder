import { ownerOf, polyCentroid, PTYPES, sizeOf, VTYPES } from "../game/index.ts";
import type { CampaignState, Planet, Province } from "../game/index.ts";
import { activateOnKey } from "./mapKeys.ts";

interface Props {
  state: CampaignState;
  planet: Planet;
  provs: Province[];
  selProv: string;
  colors: Record<string, string>;
  onSelect(id: string): void;
}

const CX = 180;
const CY = 180;
const R = 160;

const cellPoints = (v: Province): string => v.cell.map((q) => `${(CX + q[0] * R).toFixed(1)},${(CY + q[1] * R).toFixed(1)}`).join(" ");

export function PlanetMap({ state, planet: p, provs: vs, selProv, colors, onSelect }: Props) {
  const planetColor = PTYPES[p.type].c;
  return (
    <svg viewBox="0 0 360 360" role="img" aria-label="Campaign map of the Varkesh Reach">
      <defs>
        <clipPath id="disc">
          <circle cx={CX} cy={CY} r={R} />
        </clipPath>
        <radialGradient id="shade" cx=".35" cy=".3">
          <stop offset="0" stopColor="#fff" stopOpacity=".10" />
          <stop offset=".7" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".45" />
        </radialGradient>
      </defs>
      <circle cx={CX} cy={CY} r={R + 6} fill="none" stroke={planetColor} strokeOpacity=".35" strokeWidth="10" />
      <g clipPath="url(#disc)">
        <circle cx={CX} cy={CY} r={R} fill={planetColor} />
        {vs.map((v) => {
          const o = ownerOf(state, v.id);
          const select = () => onSelect(v.id);
          return (
            <polygon
              key={v.id}
              className="terr"
              tabIndex={0}
              role="button"
              aria-label={`${v.name}, ${VTYPES[v.type].n}, ${sizeOf(state, v)} points${o ? `, held by ${o.name}` : ""}`}
              points={cellPoints(v)}
              fill={o ? (colors[o.id] ?? planetColor) : planetColor}
              fillOpacity={o ? 0.82 : 0.55}
              stroke="#16120f"
              strokeWidth="2.5"
              onClick={select}
              onKeyDown={activateOnKey(select)}
            />
          );
        })}
        <circle cx={CX} cy={CY} r={R} fill="url(#shade)" pointerEvents="none" />
      </g>
      {vs.map((v) => {
        const selected = v.id === selProv;
        if (!state.fort[v.id] && !selected) return null;
        return (
          <polygon
            key={v.id}
            points={cellPoints(v)}
            fill="none"
            stroke={selected ? "#d0a952" : "#6f9a86"}
            strokeWidth="3"
            strokeDasharray={selected ? 0 : "6 4"}
            clipPath="url(#disc)"
            pointerEvents="none"
          />
        );
      })}
      {vs.map((v) => {
        const ct = polyCentroid(v.cell);
        const x = CX + ct[0] * R;
        const y = CY + ct[1] * R;
        return (
          <g key={v.id} pointerEvents="none" fontFamily="Share Tech Mono,monospace" textAnchor="middle">
            <text
              x={x}
              y={y - 4}
              fontFamily="Grenze Gothic,Georgia,serif"
              fontSize="13.5"
              fill="#f3ead8"
              paintOrder="stroke"
              stroke="#16120f"
              strokeWidth="3.5"
            >
              {v.name}
            </text>
            <text x={x} y={y + 10} fontSize="10" fill="#f3ead8" paintOrder="stroke" stroke="#16120f" strokeWidth="3">
              {v.type === "capital" ? "◆ " : ""}
              {VTYPES[v.type].n.toUpperCase()} {sizeOf(state, v)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
