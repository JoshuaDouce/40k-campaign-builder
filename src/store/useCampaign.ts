import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { apply, examplePlayers, fresh, mulberry } from "../game/index.ts";
import type { Action, CampaignState, Player } from "../game/index.ts";

/** Who is looking at the campaign. Stage 3 has no accounts, so the viewer is the owner. */
export interface CampaignViewer {
  userId: string | null;
  isOwner: boolean;
}

/** What every component needs. Stage 4 swaps in an Amplify-backed implementation of this. */
export interface CampaignStore {
  state: CampaignState;
  dispatch(action: Action): void;
  viewer: CampaignViewer;
}

export const CampaignContext = createContext<CampaignStore | null>(null);

export function useCampaign(): CampaignStore {
  const store = useContext(CampaignContext);
  if (!store) throw new Error("useCampaign must be used inside a CampaignProvider");
  return store;
}

/** Hands are private to their player. A null viewer id (stage 3, local play) sees everything. */
export function canSeeHand(player: Player, viewer: CampaignViewer): boolean {
  return viewer.userId === null || player.userId === viewer.userId;
}

const STORAGE_KEY = "varkesh-react-v1";
const BACKUP_KEY = "varkesh-react-v1-backup";

function newRng() {
  return mulberry(Math.floor(Math.random() * 2 ** 31));
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Shape check for a stored campaign. A missing `hollOpened` is tolerated (defaulted by `load`). */
function isCampaignState(v: unknown): v is CampaignState {
  if (!isObject(v)) return false;
  const { sys } = v;
  return (
    Array.isArray(v.players) &&
    Array.isArray(v.order) &&
    Array.isArray(v.log) &&
    typeof v.round === "number" &&
    (v.turnIdx === null || typeof v.turnIdx === "number") &&
    (v.pend === null || isObject(v.pend)) &&
    isObject(v.terr) &&
    isObject(v.fort) &&
    isObject(v.cap) &&
    isObject(sys) &&
    Array.isArray(sys.planets) &&
    Array.isArray(sys.provs) &&
    Array.isArray(sys.lanes) &&
    typeof sys.size === "number"
  );
}

function save(state: CampaignState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked: the campaign still works for this session.
  }
}

function load(): CampaignState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed: unknown = JSON.parse(raw);
        if (isCampaignState(parsed)) return { ...parsed, hollOpened: parsed.hollOpened === true };
      } catch {
        // Corrupt JSON: handled as unrecognised below.
      }
      // Present but unrecognised: keep a copy before it is replaced.
      localStorage.setItem(BACKUP_KEY, raw);
    }
  } catch {
    // Storage blocked: start a new campaign.
  }
  const state = fresh(examplePlayers(), newRng());
  save(state);
  return state;
}

const LOCAL_VIEWER: CampaignViewer = { userId: null, isOwner: true };

/** Stage-3 store: the whole campaign lives in localStorage on this device. */
export function useLocalCampaign(): CampaignStore {
  const [state, setState] = useState<CampaignState>(load);
  const current = useRef(state);

  const dispatch = useCallback((action: Action) => {
    const next = apply(current.current, action, { rng: newRng() });
    if (next === current.current) return;
    current.current = next;
    save(next);
    setState(next);
  }, []);

  return useMemo(() => ({ state, dispatch, viewer: LOCAL_VIEWER }), [state, dispatch]);
}
