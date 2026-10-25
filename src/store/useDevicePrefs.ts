// Per-device UI preferences (not campaign data): selected tab and the Factions tab selection.
import { useCallback, useState } from "react";
import { FACTIONS } from "../game/index.ts";
import type { FactionName } from "../game/index.ts";

export const TAB_IDS = ["pitch", "war", "map", "roster", "rules", "turn", "cards", "factions", "tracker", "setup", "reference"] as const;
export type TabId = (typeof TAB_IDS)[number];

const TAB_KEY = "varkesh-tab";
const REF_KEY = "varkesh-ref-tab";
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

export const PUBLIC_TAB_IDS = ["pitch", "rules", "turn", "cards", "factions"] as const satisfies readonly TabId[];
export type PublicTabId = (typeof PUBLIC_TAB_IDS)[number];

export function isPublicTab(v: string | null | undefined): v is PublicTabId {
  return !!v && (PUBLIC_TAB_IDS as readonly string[]).includes(v);
}

/** The pages grouped under the campaign's Reference tab, in sub-row order. */
export const REFERENCE_PAGE_IDS = ["rules", "turn", "cards", "factions", "pitch"] as const satisfies readonly TabId[];
export type ReferencePageId = (typeof REFERENCE_PAGE_IDS)[number];

export function isReferencePage(v: string | null | undefined): v is ReferencePageId {
  return !!v && (REFERENCE_PAGE_IDS as readonly string[]).includes(v);
}

/** The Reference page last viewed on this device (separate from the public screens' saved tab). Default Rules. */
export function readReferencePage(): ReferencePageId {
  const saved = read(REF_KEY);
  return isReferencePage(saved) ? saved : "rules";
}

export function saveReferencePage(page: ReferencePageId): void {
  write(REF_KEY, page);
}

/** Signed out (or on the public tabs): hash, then the saved tab, then Pitch. Private tabs don't exist here, so they fall back to Pitch. */
export function readPublicStartTab(): PublicTabId {
  const hash = location.hash.slice(1);
  if (isPublicTab(hash)) return hash;
  if (hash) history.replaceState(null, "", "#pitch");
  const saved = read(TAB_KEY);
  return isPublicTab(saved) ? saved : "pitch";
}

/**
 * Inside a campaign: Setup exists only before War Round 1, and opens by default then. After that it
 * always opens on the War Room. Neither the saved tab nor the URL hash is used: a campaign always opens from the list.
 */
export function readCampaignStartTab(round: number): TabId {
  return round === 0 ? "setup" : "war";
}

export function saveTab(tab: TabId): void {
  // "reference" is only a grouping: the URL and saved tab always name the actual page.
  if (tab === "reference") return;
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
