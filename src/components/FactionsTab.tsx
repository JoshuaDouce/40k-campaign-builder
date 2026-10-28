import { BATTLES, FACTION_GROUPS, FACTIONS, SIDE_HOOK } from "../game/index.ts";
import type { FactionName, Side, SideKey } from "../game/index.ts";
import { useOptionalCampaign } from "../store/useCampaign.ts";
import { useWebFac } from "../store/useDevicePrefs.ts";

const REL_COL: Record<SideKey, string> = {
  "imp-imp": "#d0a952",
  "cha-cha": "#b8392e",
  "imp-cha": "#b8392e",
  "imp-xen": "#a8977f",
  "cha-xen": "#a8977f",
  "xen-xen": "#6f9a86",
};
const SIDE_ORDER: Record<Side, number> = { imp: 0, cha: 1, xen: 2 };

function sideKey(a: FactionName, b: FactionName): SideKey {
  const s = [FACTIONS[a].side, FACTIONS[b].side].sort((x, y) => SIDE_ORDER[x] - SIDE_ORDER[y]);
  return `${s[0]}-${s[1]}` as SideKey;
}

export function FactionsTab() {
  const campaign = useOptionalCampaign();
  const [webFac, setWebFac] = useWebFac();

  const toggle = (f: FactionName) => setWebFac(webFac.includes(f) ? webFac.filter((x) => x !== f) : [...webFac, f]);
  const fromPlayers = () => {
    if (campaign) setWebFac([...new Set(campaign.state.players.map((p) => p.faction))]);
  };

  const n = webFac.length;
  const cx = 180;
  const cy = 150;
  const R = n > 6 ? 108 : 96;
  // Past this, names would overlap on a phone: the dots are numbered and the list below is the key.
  const numbered = n > 10;
  const pos = webFac.map((f, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / Math.max(n, 1);
    return { f, x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) };
  });
  const pairs: Array<{ a: FactionName; b: FactionName; k: SideKey; ax: number; ay: number; bx: number; by: number }> = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = pos[i];
      const b = pos[j];
      pairs.push({ a: a.f, b: b.f, k: sideKey(a.f, b.f), ax: a.x, ay: a.y, bx: b.x, by: b.y });
    }
  }

  return (
    <section className="tab" id="factions">
      <h2>How the factions intertwine</h2>
      <p className="dim">Pick what your group plays. Each pairing gets a reason to fight and a first battle to play.</p>
      <div role="group" aria-label="Factions in play">
        {FACTION_GROUPS.map((g) => (
          <div key={g.side}>
            <div className="lbl" style={{ margin: "14px 0 6px" }}>
              {g.label}
            </div>
            <div className="chips">
              {g.factions.map((f) => (
                <button key={f} className="chip" aria-pressed={webFac.includes(f)} onClick={() => toggle(f)}>
                  <span className="dot" style={{ background: FACTIONS[f].c }}></span>
                  {f}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {campaign ? (
        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn sm" onClick={fromPlayers}>
            Use factions from Players
          </button>
        </div>
      ) : null}
      <div className="web mapbox" style={{ marginTop: 14 }}>
        <svg viewBox="0 0 360 300" role="img" aria-label="Web of faction relationships">
          {n === 0 ? (
            <text x={cx} y={cy} textAnchor="middle" fill="#a8977f" fontFamily="Alegreya Sans,sans-serif" fontSize="15">
              Pick at least two factions above
            </text>
          ) : (
            <>
              {pairs.map((p) => (
                <line
                  key={`${p.a}|${p.b}`}
                  x1={p.ax}
                  y1={p.ay}
                  x2={p.bx}
                  y2={p.by}
                  stroke={REL_COL[p.k]}
                  strokeWidth="1.5"
                  opacity=".7"
                  strokeDasharray={p.k.includes("xen") && p.k !== "xen-xen" ? "5 4" : "0"}
                />
              ))}
              {pos.map((p, i) => {
                const right = p.x >= cx;
                const mid = Math.abs(p.x - cx) < 5;
                return (
                  <g key={p.f}>
                    <circle cx={p.x} cy={p.y} r="9" fill={FACTIONS[p.f].c} stroke="#16120f" strokeWidth="2" />
                    <text
                      x={p.x + (mid ? 0 : right ? 14 : -14)}
                      y={p.y + (mid ? (p.y < cy ? -14 : 22) : 5)}
                      textAnchor={mid ? "middle" : right ? "start" : "end"}
                      fontFamily="Alegreya Sans,sans-serif"
                      fontSize="13"
                      fill="#ebdfc8"
                    >
                      {numbered ? i + 1 : p.f}
                    </text>
                  </g>
                );
              })}
            </>
          )}
        </svg>
      </div>
      <div style={{ marginTop: 8 }}>
        {webFac.map((f, i) => (
          <p key={f} style={{ fontSize: 15 }}>
            <span className="dot" style={{ background: FACTIONS[f].c }}></span> <b>{numbered ? `${i + 1}. ${f}` : f}</b> want {FACTIONS[f].want}.{" "}
            <span className="dim">First force: {FACTIONS[f].open}</span>
          </p>
        ))}
      </div>
      <h3>Rivalries</h3>
      <div className="cols2">
        {pairs.length ? (
          pairs.map(({ a, b, k }, i) => {
            const [lab, txt] = SIDE_HOOK[k];
            return (
              <div className="pair" key={`${a}|${b}`}>
                <b>
                  {a} vs {b}
                </b>
                <span className="rel" style={{ background: REL_COL[k], color: "#16120f" }}>
                  {lab}
                </span>
                <p style={{ marginTop: 6 }}>
                  {txt} The {a} want {FACTIONS[a].want}; the {b} want {FACTIONS[b].want}. Neither can do it while the other is in the Reach.
                </p>
                <p className="dim" style={{ fontSize: 14.5, margin: 0 }}>
                  <b style={{ fontFamily: "var(--f-mono)", fontSize: 12, color: "var(--brass)" }}>FIRST 600 PT BATTLE</b>{" "}
                  {BATTLES[(i + a.length + b.length) % BATTLES.length]}
                </p>
              </div>
            );
          })
        ) : (
          <p className="dim">Select two or more factions to see their rivalries.</p>
        )}
      </div>
    </section>
  );
}
