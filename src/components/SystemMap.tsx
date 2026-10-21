import { getPlanet, hollOpen, ORBITS, ownerOf, PTYPES, systemScale } from "../game/index.ts";
import type { CampaignState } from "../game/index.ts";
import { activateOnKey } from "./mapKeys.ts";

interface Props {
  state: CampaignState;
  colors: Record<string, string>;
  onOpenPlanet(id: string): void;
}

function arcPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const x0 = cx + r * Math.cos(a0);
  const y0 = cy + r * Math.sin(a0);
  const x1 = cx + r * Math.cos(a1);
  const y1 = cy + r * Math.sin(a1);
  return `M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
}

/** Below this many CSS px per map unit, labels get too small on a phone; the map scrolls sideways instead. */
const MIN_PX_PER_UNIT = 0.85;

export function SystemMap({ state, colors, onOpenPlanet }: Props) {
  const sy = state.sys;
  const size = sy.size;
  const c = size / 2;
  const scale = systemScale(sy.planets);
  const open = hollOpen(state);
  const ho = ownerOf(state, "holl");

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="Campaign map of the Varkesh Reach"
      style={{ minWidth: Math.round(size * MIN_PX_PER_UNIT) }}
    >
      <defs>
        <radialGradient id="riftg">
          <stop offset="0" stopColor="#b8392e" stopOpacity=".95" />
          <stop offset="1" stopColor="#b8392e" stopOpacity="0" />
        </radialGradient>
      </defs>
      {Array.from({ length: 60 }, (_, i) => (
        <circle
          key={i}
          cx={(i * 97) % size}
          cy={(i * 53 + i * i) % size}
          r={i % 6 ? 0.6 : 1.2}
          fill="#a8977f"
          opacity=".4"
        />
      ))}
      {Object.entries(ORBITS).map(([k, o]) => (
        <circle key={k} cx={c} cy={c} r={o.r * scale} fill="none" stroke="#3d312a" strokeDasharray="2 4" />
      ))}
      <circle cx={c} cy={c} r={open ? 44 : 32} fill="url(#riftg)" />
      {sy.lanes.map(([a, b]) => {
        const A = getPlanet(state, a);
        const B = getPlanet(state, b);
        if (!A || !B) return null;
        return (
          <line key={`${a}|${b}`} x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke="#6a5848" strokeWidth="1.5" strokeDasharray="5 3" />
        );
      })}
      {sy.planets
        .filter((p) => p.orbit === "inner")
        .map((p) => (
          <line
            key={p.id}
            x1={p.x}
            y1={p.y}
            x2={c}
            y2={c}
            stroke="#b8392e"
            strokeWidth="1.2"
            strokeDasharray="2 3"
            opacity={open ? 0.9 : 0.35}
          />
        ))}
      <g aria-label="The Hollowgate">
        <circle className="ring" cx={c} cy={c} r="13" fill={ho ? (colors[ho.id] ?? "#16120f") : "#16120f"} stroke="#b8392e" strokeWidth="2" />
      </g>
      {sy.planets.map((p) => {
        const r = p.orbit === "inner" ? 14 : p.orbit === "middle" ? 16 : 18;
        const vs = sy.provs.filter((v) => v.pl === p.id);
        const tot = vs.length;
        const gap = 0.08;
        const groups = new Map<string, number>();
        vs.forEach((v) => {
          const o = state.terr[v.id] ?? "";
          groups.set(o, (groups.get(o) ?? 0) + 1);
        });
        const sorted = [...groups.entries()].sort((x, y) => (x[0] === "" ? 1 : 0) - (y[0] === "" ? 1 : 0));
        let a = -Math.PI / 2;
        const segs = sorted.map(([o, n]) => {
          const a1 = a + (n / tot) * Math.PI * 2;
          const d = arcPath(p.x, p.y, r + 5, a + gap / 2, a1 - gap / 2);
          a = a1;
          return (
            <path
              key={o || "none"}
              d={d}
              stroke={o ? (colors[o] ?? "#3d312a") : "#3d312a"}
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
            />
          );
        });
        const ly = p.y > c ? p.y + r + 19 : p.y - r - 11;
        const open1 = () => onOpenPlanet(p.id);
        return (
          <g
            key={p.id}
            className="terr"
            tabIndex={0}
            role="button"
            aria-label={`${p.name}, ${PTYPES[p.type].n}`}
            onClick={open1}
            onKeyDown={activateOnKey(open1)}
          >
            <circle className="hit" cx={p.x} cy={p.y} r={r + 14} />
            <circle className="ring" cx={p.x} cy={p.y} r={r} fill={PTYPES[p.type].c} />
            <circle cx={p.x - r * 0.35} cy={p.y - r * 0.35} r={r * 0.55} fill="#fff" opacity=".08" />
            {segs}
            <text
              x={p.x}
              y={ly}
              textAnchor="middle"
              fontFamily="Grenze Gothic,Georgia,serif"
              fontSize="15"
              fill="#ebdfc8"
              paintOrder="stroke"
              stroke="#211a16"
              strokeWidth="4"
            >
              {p.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
