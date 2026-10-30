// Shape check for a campaign loaded from the backend. Tolerates fields added since a save was made.
import { applyStartRp, backfillPlayerLog, migrateLegacy, repriceMusters, type CampaignState, type LegacyState } from "../game/index.ts";

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

export function normaliseState(v: unknown): CampaignState | null {
  if (!isObject(v)) return null;
  const { sys } = v;
  const ok =
    Array.isArray(v.players) &&
    Array.isArray(v.order) &&
    Array.isArray(v.log) &&
    typeof v.round === "number" &&
    (v.turnIdx === undefined || v.turnIdx === null || typeof v.turnIdx === "number") &&
    (v.phase === undefined || v.phase === null || v.phase === "planning" || v.phase === "resolution") &&
    (v.picks === undefined || isObject(v.picks)) &&
    isObject(v.terr) &&
    isObject(v.fort) &&
    isObject(v.cap) &&
    isObject(sys) &&
    Array.isArray(sys.planets) &&
    Array.isArray(sys.provs) &&
    Array.isArray(sys.lanes) &&
    typeof sys.size === "number";
  if (!ok) return null;
  // Converts a save made before simultaneous turns, if it is one (see migrateLegacy).
  const s = migrateLegacy(v as unknown as LegacyState);
  // The backfill runs first, so its older lines sit below anything the Muster repricing adds.
  return repriceMusters(backfillPlayerLog(applyStartRp({
    ...s,
    hollOpened: s.hollOpened === true,
    rosters: isObject(s.rosters) ? s.rosters : {},
    fallen: Array.isArray(s.fallen) ? s.fallen : [],
    ready: isObject(s.ready) ? s.ready : {},
    history: Array.isArray(s.history) ? s.history : [],
    undo: isObject(s.undo) && isObject(s.undo.before) ? s.undo : undefined,
  })));
}
