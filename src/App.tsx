import { useEffect, useMemo, useState } from "react";
import { playerColors } from "./game/index.ts";
import { DeckTab } from "./components/DeckTab.tsx";
import { FactionsTab } from "./components/FactionsTab.tsx";
import { MapTab } from "./components/MapTab.tsx";
import type { MapViewState } from "./components/MapTab.tsx";
import { PitchTab } from "./components/PitchTab.tsx";
import { PlayersTab } from "./components/PlayersTab.tsx";
import { RulesTab } from "./components/RulesTab.tsx";
import { WarRoomTab } from "./components/WarRoomTab.tsx";
import { CampaignProvider } from "./store/CampaignProvider.tsx";
import { useCampaign, useLocalCampaign } from "./store/useCampaign.ts";
import { isTabId, readStartTab, saveTab } from "./store/useDevicePrefs.ts";
import type { TabId } from "./store/useDevicePrefs.ts";

const TABS: ReadonlyArray<{ id: TabId; label: string }> = [
  { id: "pitch", label: "Pitch" },
  { id: "war", label: "War Room" },
  { id: "map", label: "Map" },
  { id: "rules", label: "Rules" },
  { id: "cards", label: "Fate Deck" },
  { id: "factions", label: "Factions" },
  { id: "tracker", label: "Players" },
];

function Shell() {
  const { state } = useCampaign();
  const [tab, setTab] = useState<TabId>(readStartTab);
  const [view, setView] = useState("system");
  const [selProv, setSelProv] = useState<string | null>(null);
  const colors = useMemo(() => playerColors(state), [state]);

  // A new Reach (chart, reset) invalidates the open planet: go back to the system view.
  const [seed, setSeed] = useState(state.sys.seed);
  if (seed !== state.sys.seed) {
    setSeed(state.sys.seed);
    setView("system");
    setSelProv(null);
  }

  useEffect(() => {
    const onHash = () => {
      const h = location.hash.slice(1);
      if (isTabId(h)) setTab(h);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const show = (t: TabId) => {
    setTab(t);
    saveTab(t);
  };
  const map: MapViewState = { view, selProv, setView, setSelProv };

  return (
    <div className="wrap">
      <header className="hero">
        <div className="eyebrow">Narrative campaign · 500 → 2000 pts</div>
        <h1>
          The Varkesh <span>Reach</span>
        </h1>
        <p className="lede">A dying sub-sector, a rift that will not close, and every warband that came to pick at the bones. Small squads, hard-won scars, no heroes of legend. Your models earn their names here.</p>
      </header>

      <nav className="tabs" role="tablist" aria-label="Campaign sections">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={t.id === tab} onClick={() => show(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "pitch" && <PitchTab />}
      {tab === "war" && <WarRoomTab colors={colors} />}
      {tab === "map" && <MapTab colors={colors} map={map} />}
      {tab === "rules" && <RulesTab />}
      {tab === "cards" && <DeckTab />}
      {tab === "factions" && <FactionsTab />}
      {tab === "tracker" && <PlayersTab colors={colors} />}
    </div>
  );
}

export default function App() {
  const store = useLocalCampaign();
  return (
    <CampaignProvider store={store}>
      <Shell />
    </CampaignProvider>
  );
}
