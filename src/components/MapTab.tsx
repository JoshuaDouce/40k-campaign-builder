import { Fragment } from "react";
import {
  canPerform,
  count,
  getPlanet,
  getProvince,
  holderGains,
  hollOpen,
  laneLinked,
  ORBITS,
  ownerOf,
  PTYPES,
  sizeOf,
  stageText,
  toggleOn,
  VTYPES,
} from "../game/index.ts";
import type { Planet, Province } from "../game/index.ts";
import { useCampaign } from "../store/useCampaign.ts";
import { PlanetMap } from "./PlanetMap.tsx";
import { SystemMap } from "./SystemMap.tsx";

export interface MapViewState {
  /** "system" or a planet id. */
  view: string;
  selProv: string | null;
  setView(view: string): void;
  setSelProv(id: string | null): void;
}

interface Props {
  colors: Record<string, string>;
  map: MapViewState;
}

export function MapTab({ colors, map }: Props) {
  const { state } = useCampaign();
  const planet = map.view === "system" ? undefined : getPlanet(state, map.view);
  const provs = planet ? state.sys.provs.filter((v) => v.pl === planet.id) : [];
  const selId = planet ? (provs.find((v) => v.id === map.selProv) ?? provs[0])?.id : undefined;

  const openPlanet = (id: string) => {
    map.setView(id);
    map.setSelProv(null);
  };

  return (
    <section className="tab" id="map">
      <h2>The Reach</h2>
      <p className="dim">The War Room updates who holds what, but you can correct any province here. Chart a new Reach from the War Room before round 1 if your group size changes.</p>
      <div className="row mono" style={{ fontSize: 13, marginBottom: 10, color: "var(--brass)" }}>
        {stageText(state)}
      </div>
      <div style={{ marginBottom: 10 }}>
        {planet ? <PlanetHead planet={planet} onBack={() => map.setView("system")} /> : <SystemHead />}
      </div>
      <div className={planet ? "mapbox" : "mapbox scroll"}>
        {planet && selId ? (
          <PlanetMap state={state} planet={planet} provs={provs} selProv={selId} colors={colors} onSelect={map.setSelProv} />
        ) : (
          <SystemMap state={state} colors={colors} onOpenPlanet={openPlanet} />
        )}
      </div>
      {planet && selId ? <ProvinceKey provs={provs} selProv={selId} colors={colors} onSelect={map.setSelProv} /> : null}
      <div className="info">
        {planet && selId ? (
          <ProvinceInfo provId={selId} planet={planet} />
        ) : (
          <SystemInfo onOpen={openPlanet} colors={colors} />
        )}
      </div>
      <div className="row" style={{ marginTop: 12 }}>
        {state.players.map((p) => (
          <span key={p.id} className="chip" style={{ cursor: "default" }}>
            <span className="dot" style={{ background: colors[p.id] }}></span>
            {p.name} · {count(state, p)}
          </span>
        ))}
      </div>
    </section>
  );
}

/** Phone-only key for the numbered badges on the planet map; tapping a row selects that province. */
function ProvinceKey({
  provs,
  selProv,
  colors,
  onSelect,
}: {
  provs: Province[];
  selProv: string;
  colors: Record<string, string>;
  onSelect(id: string): void;
}) {
  const { state } = useCampaign();
  return (
    <ol className="provkey">
      {provs.map((v, i) => {
        const o = ownerOf(state, v.id);
        return (
          <li key={v.id}>
            <button aria-pressed={v.id === selProv} onClick={() => onSelect(v.id)}>
              <span className="n">{i + 1}</span>
              <span className="nm">
                {v.type === "capital" ? "◆ " : ""}
                {v.name}
              </span>
              <span className="mono dim t">
                {VTYPES[v.type].n.toUpperCase()} {sizeOf(v)}
              </span>
              <span
                className="dot"
                style={{ background: o ? colors[o.id] : "transparent", border: o ? "none" : "1px solid var(--line)" }}
              ></span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function ProvinceInfo({ provId, planet }: { provId: string; planet: Planet }) {
  const { state, dispatch, viewer } = useCampaign();
  const v = getProvince(state, provId);
  if (!v) return null;
  const o = ownerOf(state, v.id);
  const T = VTYPES[v.type];
  const orbit = ORBITS[planet.orbit];
  const can = (playerId: string | null) => canPerform(state, { type: "setProvinceOwner", provId: v.id, playerId }, viewer);
  return (
    <>
      <div className="eyebrow">
        {T.n} · {planet.name}
      </div>
      <h4>
        {v.name}{" "}
        <span className="mono" style={{ fontSize: 16, color: "var(--brass)" }}>
          {sizeOf(v)} pts
        </span>
      </h4>
      <p className="dim mono" style={{ fontSize: 12 }}>
        {[toggleOn(state, "twists") && `${orbit.twists} TWIST${orbit.twists > 1 ? "S" : ""}`, state.fort[v.id] && "FORTIFIED"].filter(Boolean).join(" · ")}
      </p>
      <p>
        <b>Holding it:</b> {holderGains(state, v)}
      </p>
      <p className="dim" style={{ fontSize: 14 }}>
        Borders: {v.nb.map((n) => getProvince(state, n)?.name ?? n).join(", ")}
      </p>
      <div className="row">
        <label htmlFor="ownSel" className="mono dim" style={{ fontSize: 12 }}>
          HELD BY
        </label>
        <select
          id="ownSel"
          value={o?.id ?? ""}
          disabled={!can(o?.id ?? null)}
          onChange={(e) => dispatch({ type: "setProvinceOwner", provId: v.id, playerId: e.target.value || null })}
        >
          <option value="">Unclaimed</option>
          {state.players.map((q) => (
            <option key={q.id} value={q.id}>
              {q.name}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}

function SystemHead() {
  return (
    <>
      <div className="eyebrow">System view</div>
      <p className="dim" style={{ margin: "4px 0 0", fontSize: 14.5 }}>
        Tap a world to see its provinces. Rings show who holds how much of each world. Dashed lines are warp lanes.
      </p>
    </>
  );
}

function PlanetHead({ planet: p, onBack }: { planet: Planet; onBack(): void }) {
  const { state } = useCampaign();
  const links = laneLinked(state, p.id).map((x) => getPlanet(state, x)?.name ?? x);
  const orbit = ORBITS[p.orbit];
  return (
    <>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <div className="eyebrow">
            {PTYPES[p.type].n} · {orbit.name}
          </div>
          <h4 style={{ fontFamily: "var(--f-display)", fontSize: 28, margin: "2px 0 0" }}>{p.name}</h4>
        </div>
        <button className="btn sm" onClick={onBack}>
          ← System
        </button>
      </div>
      <p style={{ fontSize: 14.5, margin: "6px 0 0" }}>
        <b>World trait:</b> {PTYPES[p.type].trait}
      </p>
      <p className="dim" style={{ fontSize: 14, margin: "2px 0 0" }}>
        Warp lanes to: {links.join(", ") || "none"}
        {p.orbit === "inner" ? ", the Hollowgate" : ""}
      </p>
    </>
  );
}

function SystemInfo({ onOpen, colors }: { onOpen(id: string): void; colors: Record<string, string> }) {
  const { state } = useCampaign();
  const sy = state.sys;
  const ho = ownerOf(state, "holl");
  return (
    <>
      <div className="eyebrow">
        {sy.planets.length} worlds · {sy.provs.length} provinces
      </div>
      {sy.planets.map((p) => {
        const vs = sy.provs.filter((v) => v.pl === p.id);
        const held = state.players
          .map((q) => ({ q, n: vs.filter((v) => state.terr[v.id] === q.id).length }))
          .filter((x) => x.n);
        const orbit = ORBITS[p.orbit];
        return (
          <div className="pair" style={{ padding: "8px 0" }} key={p.id}>
            <button className="btn sm" style={{ float: "right" }} onClick={() => onOpen(p.id)}>
              Open
            </button>
            <b>{p.name}</b>{" "}
            <span className="mono dim" style={{ fontSize: 12 }}>
              {PTYPES[p.type].n.toUpperCase()} · {orbit.name.toUpperCase()} · {vs.length} PROVINCES
            </span>
            <br />
            <span style={{ fontSize: 14 }}>
              {held.length ? (
                held.map(({ q, n }, i) => (
                  <Fragment key={q.id}>
                    {i > 0 ? " · " : null}
                    <span className="dot" style={{ background: colors[q.id] }}></span> {q.name} {n}
                  </Fragment>
                ))
              ) : (
                <span className="dim">Unclaimed</span>
              )}
            </span>
          </div>
        );
      })}
      <div className="pair" style={{ padding: "8px 0" }}>
        <b>The Hollowgate</b>{" "}
        <span className="mono dim" style={{ fontSize: 12 }}>
          2000 PTS · {hollOpen(state) ? "OPEN" : "SEALED"}
        </span>
        <br />
        <span style={{ fontSize: 14 }}>
          Reached from any province on an inner world. Hold it at the end of a War Round to win. {ho ? `Held by ${ho.name}.` : ""}
        </span>
      </div>
    </>
  );
}
