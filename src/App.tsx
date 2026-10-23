import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { playerColors } from "./game/index.ts";
import { AccountBar } from "./components/account/AccountBar.tsx";
import { CampaignGone } from "./components/account/CampaignGone.tsx";
import { CampaignHeader } from "./components/account/CampaignHeader.tsx";
import { CampaignsScreen } from "./components/account/CampaignsScreen.tsx";
import { JoinScreen } from "./components/account/JoinScreen.tsx";
import { NewCampaignScreen } from "./components/account/NewCampaignScreen.tsx";
import { PublicHeader } from "./components/account/PublicHeader.tsx";
import { SignInScreen } from "./components/account/SignInScreen.tsx";
import { DeckTab } from "./components/DeckTab.tsx";
import { FactionsTab } from "./components/FactionsTab.tsx";
import { MapTab } from "./components/MapTab.tsx";
import type { MapViewState } from "./components/MapTab.tsx";
import { PitchTab } from "./components/PitchTab.tsx";
import { PlayersTab } from "./components/PlayersTab.tsx";
import { RosterTab } from "./components/roster/RosterTab.tsx";
import { SetupTab } from "./components/SetupTab.tsx";
import { RulesTab } from "./components/RulesTab.tsx";
import { TurnGuideTab } from "./components/turnGuide/TurnGuideTab.tsx";
import { WarRoomTab } from "./components/WarRoomTab.tsx";
import { CampaignProvider } from "./store/CampaignProvider.tsx";
import { useAuth } from "./store/useAuth.ts";
import type { AuthUser } from "./store/useAuth.ts";
import { useCampaign } from "./store/useCampaign.ts";
import { isPublicTab, isTabId, readCampaignStartTab, readPublicStartTab, saveTab } from "./store/useDevicePrefs.ts";
import type { PublicTabId, TabId } from "./store/useDevicePrefs.ts";
import { useRemoteCampaign } from "./store/useRemoteCampaign.ts";

const TABS: ReadonlyArray<{ id: TabId; label: string }> = [
  { id: "setup", label: "Setup" },
  { id: "pitch", label: "Pitch" },
  { id: "war", label: "War Room" },
  { id: "map", label: "Map" },
  { id: "roster", label: "Roster" },
  { id: "rules", label: "Rules" },
  { id: "turn", label: "Turn Guide" },
  { id: "cards", label: "Fate Deck" },
  { id: "factions", label: "Factions" },
  { id: "tracker", label: "Players" },
];

const PUBLIC_TABS = TABS.filter((t) => isPublicTab(t.id));

const HERO = (
  <header className="hero">
    <div className="eyebrow">Narrative campaign · 500 → 2000 pts</div>
    <h1>
      The Varkesh <span>Reach</span>
    </h1>
    <p className="lede">A dying sub-sector, a rift that will not close, and every warband that came to pick at the bones. Small squads, hard-won scars, no heroes of legend. Your models earn their names here.</p>
  </header>
);

type Screen = { kind: "public" } | { kind: "signin" } | { kind: "list" } | { kind: "new" } | { kind: "campaign"; id: string };

function TabBar({ tabs, current, label, onSelect }: { tabs: ReadonlyArray<{ id: TabId; label: string }>; current: TabId; label: string; onSelect: (t: TabId) => void }) {
  const ref = useRef<HTMLElement>(null);
  // On a phone the bar scrolls sideways: keep the selected tab in view (e.g. Players, the last one).
  useEffect(() => {
    const nav = ref.current;
    const b = nav?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!nav || !b) return;
    if (b.offsetLeft < nav.scrollLeft || b.offsetLeft + b.offsetWidth > nav.scrollLeft + nav.clientWidth) {
      nav.scrollLeft = b.offsetLeft - (nav.clientWidth - b.offsetWidth) / 2;
    }
  }, [current]);
  return (
    <nav ref={ref} className="tabs" role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={t.id === current} onClick={() => onSelect(t.id)}>
          {t.label}
        </button>
      ))}
    </nav>
  );
}

/** The five public tabs: general content, no campaign data. Reached signed out, or from the campaign list. */
function PublicShell({ header }: { header: ReactNode }) {
  const [tab, setTab] = useState<PublicTabId>(readPublicStartTab);

  useEffect(() => {
    const onHash = () => {
      const h = location.hash.slice(1);
      if (isPublicTab(h)) setTab(h);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const show = (t: TabId) => {
    if (!isPublicTab(t)) return;
    setTab(t);
    saveTab(t);
  };

  return (
    <div className="wrap">
      {header}
      {HERO}
      <TabBar tabs={PUBLIC_TABS} current={tab} label="Sections" onSelect={show} />
      {tab === "pitch" && <PitchTab onNavigate={show} />}
      {tab === "rules" && <RulesTab />}
      {tab === "turn" && <TurnGuideTab />}
      {tab === "cards" && <DeckTab />}
      {tab === "factions" && <FactionsTab />}
    </div>
  );
}

/** Inside a joined campaign: every tab, in the existing order. */
function CampaignTabs({ onPlay, onDeleted }: { onPlay: () => void; onDeleted: () => void }) {
  const { state } = useCampaign();
  const [tab, setTab] = useState<TabId>(() => readCampaignStartTab(state.round));
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
  const visibleTabs = state.round === 0 ? TABS : TABS.filter((t) => t.id !== "setup");
  // Setup only exists before War Round 1; if it is gone, show the War Room.
  const current: TabId = tab === "setup" && state.round > 0 ? "war" : tab;
  const map: MapViewState = { view, selProv, setView, setSelProv };

  return (
    <>
      <TabBar tabs={visibleTabs} current={current} label="Campaign sections" onSelect={show} />
      {current === "setup" && <SetupTab colors={colors} onNavigate={show} />}
      {current === "pitch" && <PitchTab onNavigate={show} />}
      {current === "war" && <WarRoomTab colors={colors} onNavigate={show} />}
      {current === "map" && <MapTab colors={colors} map={map} />}
      {current === "roster" && <RosterTab colors={colors} />}
      {current === "rules" && <RulesTab />}
      {current === "turn" && <TurnGuideTab />}
      {current === "cards" && <DeckTab />}
      {current === "factions" && <FactionsTab />}
      {current === "tracker" && <PlayersTab colors={colors} onNavigate={show} onPlay={onPlay} onDeleted={onDeleted} />}
    </>
  );
}

/** Header, the join gate, and the tabs. Must sit inside a CampaignProvider. */
function CampaignBody({ onBack }: { onBack: () => void }) {
  const { state, viewer } = useCampaign();
  const [joining, setJoining] = useState(false);
  const hasOwn = viewer.userId !== null && state.players.some((p) => p.userId === viewer.userId);

  // Once the organiser's own warband exists, the join screen has done its job.
  if (joining && hasOwn) setJoining(false);

  // Members must pick a warband and faction first. The organiser may, but does not have to.
  if (!viewer.isOwner && !hasOwn) return <JoinScreen backLabel="← Campaigns" onBack={onBack} />;

  return (
    <>
      {joining ? <JoinScreen backLabel="← Players" onBack={() => setJoining(false)} /> : null}
      <div hidden={joining}>
        <CampaignHeader onBack={onBack} />
        <CampaignTabs onPlay={() => setJoining(true)} onDeleted={onBack} />
      </div>
    </>
  );
}

function CampaignView({ id, user, onBack, onSignOut }: { id: string; user: AuthUser; onBack: () => void; onSignOut: () => void }) {
  const remote = useRemoteCampaign(id, user);
  return (
    <div className="wrap">
      <AccountBar email={user.email} isOrganiser={user.isOrganiser} onSignOut={onSignOut} />
      {remote.status === "ready" ? (
        <CampaignProvider store={remote.store}>
          <CampaignBody onBack={onBack} />
        </CampaignProvider>
      ) : remote.status === "gone" ? (
        <CampaignGone onBack={onBack} />
      ) : (
        <div className="ac-screen">
          <button className="ac-back" onClick={onBack}>
            ← Campaigns
          </button>
          {remote.status === "error" ? (
            <div className="ac-panel ac-empty">
              <div className="t">Something went wrong. Please try again.</div>
              <button className="btn" onClick={remote.retry}>
                Try again
              </button>
            </div>
          ) : (
            <p className="dim" role="status">
              Loading…
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Plain({ children, onBack }: { children: ReactNode; onBack?: () => void }) {
  return (
    <div className="wrap">
      <div className="ac-screen">
        {onBack ? (
          <button className="ac-back" onClick={onBack}>
            ← Rules &amp; factions
          </button>
        ) : null}
        <p className="dim" role="status">
          {children}
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const auth = useAuth();
  // Null until the user picks a screen: a signed-in reload starts on the campaign list.
  const [picked, setScreen] = useState<Screen | null>(null);
  const user = auth.status === "signedIn" ? auth.user : null;
  const screen: Screen = picked ?? (user ? { kind: "list" } : { kind: "public" });

  const toPublic = () => setScreen({ kind: "public" });
  const toList = () => setScreen({ kind: "list" });
  const signOut = () => {
    setScreen({ kind: "public" });
    void auth.signOut();
  };

  // Derived, so an expired session returns to sign-in and, once signed in again, to the same screen.
  let eff: Screen = screen;
  if (user && screen.kind === "signin") eff = { kind: "list" };
  else if (!user && screen.kind !== "public" && screen.kind !== "signin") eff = { kind: "signin" };

  if (eff.kind === "public") {
    const header = user ? (
      <AccountBar email={user.email} isOrganiser={user.isOrganiser} onSignOut={signOut} onCampaigns={toList} />
    ) : (
      <PublicHeader onSignIn={auth.status === "loading" ? undefined : () => setScreen({ kind: "signin" })} />
    );
    return <PublicShell header={header} />;
  }

  if (!user) {
    if (auth.status === "unconfigured") return <Plain onBack={toPublic}>Backend not configured</Plain>;
    if (auth.status === "loading") return <Plain>Loading…</Plain>;
    return (
      <div className="wrap">
        <SignInScreen onBack={toPublic} />
      </div>
    );
  }

  if (eff.kind === "campaign") return <CampaignView key={eff.id} id={eff.id} user={user} onBack={toList} onSignOut={signOut} />;

  return (
    <div className="wrap">
      <AccountBar email={user.email} isOrganiser={user.isOrganiser} onSignOut={signOut} />
      {eff.kind === "new" ? (
        <NewCampaignScreen onBack={toList} onCreated={(id) => setScreen({ kind: "campaign", id })} />
      ) : (
        <CampaignsScreen user={user} onOpen={(id) => setScreen({ kind: "campaign", id })} onNew={() => setScreen({ kind: "new" })} onPublic={toPublic} />
      )}
    </div>
  );
}
