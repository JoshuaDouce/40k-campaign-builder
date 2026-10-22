// Shape check for a campaign loaded from the backend. Tolerates fields added since a save was made.
import type { CampaignState } from "../game/index.ts";

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

export function normaliseState(v: unknown): CampaignState | null {
  if (!isObject(v)) return null;
  const { sys } = v;
  const ok =
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
    typeof sys.size === "number";
  if (!ok) return null;
  const s = v as unknown as CampaignState;
  return {
    ...s,
    hollOpened: s.hollOpened === true,
    rosters: isObject(s.rosters) ? s.rosters : {},
    fallen: Array.isArray(s.fallen) ? s.fallen : [],
    ready: isObject(s.ready) ? s.ready : {},
    history: Array.isArray(s.history) ? s.history : [],
    undo: isObject(s.undo) && isObject(s.undo.before) ? s.undo : undefined,
  };
}
