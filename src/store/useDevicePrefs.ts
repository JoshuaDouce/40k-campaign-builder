// Per-device UI preferences (not campaign data): selected tab and the Factions tab selection.
import { useCallback, useState } from "react";
import { FACTIONS } from "../game/index.ts";
import type { FactionName } from "../game/index.ts";

export const TAB_IDS = ["pitch", "war", "map", "roster", "rules", "turn", "cards", "factions", "tracker"] as const;
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

/** Tab from the URL hash, then the saved one, then Pitch. */
export function readStartTab(): TabId {
  const hash = location.hash.slice(1);
  if (isTabId(hash)) return hash;
  const saved = read(TAB_KEY);
  return isTabId(saved) ? saved : "pitch";
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
