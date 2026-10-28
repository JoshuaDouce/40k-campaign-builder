import { Fragment } from "react";
import { ownerOf, polyCentroid, PTYPES, sizeOf, VTYPES } from "../game/index.ts";
import type { CampaignState, Planet, Province } from "../game/index.ts";
import { activateOnKey } from "./mapKeys.ts";
import { textWidth } from "./mapText.ts";

interface Props {
  state: CampaignState;
  planet: Planet;
  provs: Province[];
  selProv: string;
  colors: Record<string, string>;
  onSelect(id: string): void;
}

const SIZE = 360;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = 160;

const cellPoints = (v: Province): string => v.cell.map((q) => `${(CX + q[0] * R).toFixed(1)},${(CY + q[1] * R).toFixed(1)}`).join(" ");

export function PlanetMap({ state, planet: p, provs: vs, selProv, colors, onSelect }: Props) {
  const planetColor = PTYPES[p.type].c;
  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label="Campaign map of the Varkesh Reach">
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
              aria-label={`${v.name}, ${VTYPES[v.type].n}, ${sizeOf(v)} points${o ? `, held by ${o.name}` : ""}`}
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
      {vs.map((v, i) => {
        const ct = polyCentroid(v.cell);
        const x = CX + ct[0] * R;
        const y = CY + ct[1] * R;
        const selected = v.id === selProv;
        const typeLine = `${v.type === "capital" ? "◆ " : ""}${VTYPES[v.type].n.toUpperCase()} ${sizeOf(v)}`;
        // Keep the desktop label inside the viewBox (the .pnum badge stays at the centroid).
        const halfW = Math.max(textWidth(v.name, 15, "display"), textWidth(typeLine, 11.5, "mono")) / 2 + 2;
        const lx = Math.min(Math.max(x, halfW + 4), SIZE - halfW - 4);
        return (
          <Fragment key={v.id}>
            {/* Phones: a numbered badge keyed to the province list below the map (CSS swaps .plabel / .pnum). */}
            <g className="pnum" pointerEvents="none" textAnchor="middle" aria-hidden="true">
              <circle
                cx={x}
                cy={y}
                r="15"
                fill={selected ? "#d0a952" : "#16120f"}
                stroke={selected ? "#16120f" : "#ebdfc8"}
                strokeWidth="2"
              />
              <text x={x} y={y + 6.5} fontFamily="Share Tech Mono,monospace" fontSize="19" fill={selected ? "#16120f" : "#f3ead8"}>
                {i + 1}
              </text>
            </g>
            <g className="plabel" pointerEvents="none" fontFamily="Share Tech Mono,monospace" textAnchor="middle">
              <text
                x={lx}
                y={y - 5}
                fontFamily="Grenze Gothic,Georgia,serif"
                fontSize="15"
                fill="#f3ead8"
                paintOrder="stroke"
                stroke="#16120f"
                strokeWidth="3.5"
              >
                {v.name}
              </text>
              <text x={lx} y={y + 10} fontSize="11.5" fill="#f3ead8" paintOrder="stroke" stroke="#16120f" strokeWidth="3">
                {typeLine}
              </text>
            </g>
          </Fragment>
        );
      })}
    </svg>
  );
}
