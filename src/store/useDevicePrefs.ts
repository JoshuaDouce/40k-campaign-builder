// Per-device UI preferences (not campaign data): selected tab and the Factions tab selection.
import { useCallback, useState } from "react";
import { FACTIONS } from "../game/index.ts";
import type { FactionName } from "../game/index.ts";

export const TAB_IDS = ["pitch", "war", "map", "roster", "rules", "turn", "cards", "factions", "tracker", "setup"] as const;
export type TabId = (typeof TAB_IDS)[number];

const TAB_KEY = "varkesh-tab";
const WEBFAC_KEY = "varkesh-webfac";
const DEFAULT_WEBFAC: FactionName[] = ["Space Marines", "Orks", "Necrons", "Death Guard"];

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore: preference just won't persist.
  }
}

export function isTabId(v: string | null | undefined): v is TabId {
  return !!v && (TAB_IDS as readonly string[]).includes(v);
}

/**
 * Tab from the URL hash, then the saved one, then Pitch. Setup exists only before War Round 1:
 * at round 0 it opens by default (ignoring the saved tab); after that #setup lands on the War Room.
 */
export function readStartTab(round: number): TabId {
  const hash = location.hash.slice(1);
  // Switching tabs writes the hash, so on a reload at round 0 it is stale: open Setup instead.
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  if (isTabId(hash) && !(round === 0 && nav?.type === "reload")) return hash === "setup" && round > 0 ? "war" : hash;
  if (round === 0) {
    if (hash) history.replaceState(null, "", "#setup");
    return "setup";
  }
  const saved = read(TAB_KEY);
  return isTabId(saved) && saved !== "setup" ? saved : "pitch";
}

export function saveTab(tab: TabId): void {
  write(TAB_KEY, tab);
  history.replaceState(null, "", `#${tab}`);
}

const isFaction = (f: unknown): f is FactionName => typeof f === "string" && Object.hasOwn(FACTIONS, f);

function readWebFac(): FactionName[] {
  const raw = read(WEBFAC_KEY);
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter(isFaction);
    } catch {
      // Fall through to the default.
    }
  }
  return DEFAULT_WEBFAC;
}

export function useWebFac(): [FactionName[], (next: FactionName[]) => void] {
  const [webFac, setState] = useState<FactionName[]>(readWebFac);
  const setWebFac = useCallback((next: FactionName[]) => {
    setState(next);
    write(WEBFAC_KEY, JSON.stringify(next));
  }, []);
  return [webFac, setWebFac];
}
