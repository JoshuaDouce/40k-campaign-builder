/** Only this host is ever called. */
const HOST = "https://yellowscribe.link";
const TIMEOUT_MS = 10_000;
const MAX_PAYLOAD_BYTES = 1_000_000;
const CODE_RE = /^[0-9a-f]{8}$/;
const MODULES = ["MatchedPlay", "MatchedPlay,Crusade"];

const EXPIRED = "That code has expired or was not found. Codes last about 10 minutes: upload the list again.";

type Json = unknown;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** GET/POST to Yellowscribe with a timeout. Returns status and body text. */
async function call(url: string, init?: RequestInit): Promise<{ status: number; text: string }> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, redirect: "error", signal: ctl.signal });
    return { status: res.status, text: await res.text() };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("Yellowscribe took too long to answer. Try again in a moment.");
    }
    throw new Error("Could not reach Yellowscribe. Try again in a moment.");
  } finally {
    clearTimeout(timer);
  }
}

function parseJson(text: string): Json {
  try {
    return JSON.parse(text) as Json;
  } catch {
    throw new Error("Yellowscribe sent back something unexpected. Try again in a moment.");
  }
}

/** What the browser needs from get_army_by_id (the TTS xml and the Lua base script stay here). */
interface FetchedArmy {
  edition: unknown;
  order: unknown;
  armyData: unknown;
  uiHeight: unknown;
  uiWidth: unknown;
  decorativeNames: unknown;
  crusade: boolean;
}

async function getArmy(codeRaw: string): Promise<FetchedArmy> {
  const code = codeRaw.trim().toLowerCase();
  if (!CODE_RE.test(code)) throw new Error("A Yellowscribe code is 8 letters and numbers, like 1a2b3c4d.");
  const { status, text } = await call(`${HOST}/get_army_by_id?id=${encodeURIComponent(code)}`);
  if (status === 404) throw new Error(EXPIRED);
  if (status >= 500) throw new Error("Yellowscribe is having trouble right now. Try again in a moment.");
  if (status !== 200) throw new Error(`Yellowscribe answered with an unexpected status (${status}).`);
  const body = parseJson(text);
  if (!isRecord(body)) throw new Error("That code did not return an army.");
  if ("err" in body) throw new Error(EXPIRED);
  const { edition, order, armyData, uiHeight, uiWidth, decorativeNames, baseScript } = body;
  // MatchedPlay.lua mentions Crusade too; only the Crusade module defines this function.
  const crusade = typeof baseScript === "string" && baseScript.includes("function getCrusadeCardSaveData(");
  return { edition, order, armyData, uiHeight, uiWidth, decorativeNames, crusade };
}

/** A whole number in range, or the default. */
function intIn(v: unknown, def: number, min: number, max: number): number {
  return typeof v === "number" && Number.isInteger(v) && v >= min && v <= max ? v : def;
}

/** The payload is a JSON string (a String argument in the schema, so AppSync passes it through as is). */
async function postArmy(payloadRaw: unknown): Promise<{ code: string }> {
  if (typeof payloadRaw !== "string") throw new Error("The army to export was not understood.");
  const payload: Json = parseJson(payloadRaw);
  if (!isRecord(payload)) throw new Error("The army to export was not understood.");
  const { edition, order, units } = payload;
  if (edition !== "10e" && edition !== "11e") {
    throw new Error("Only 10th and 11th edition armies can be exported.");
  }
  if (!Array.isArray(order) || !order.every((o) => typeof o === "string")) {
    throw new Error("The army's unit order was not understood.");
  }
  if (!isRecord(units)) throw new Error("The army's units were not understood.");
  const modules = payload.modules ?? "MatchedPlay";
  if (typeof modules !== "string" || !MODULES.includes(modules)) throw new Error("Unknown Tabletop Simulator module.");
  const uiHeight = intIn(payload.uiHeight, 700, 100, 5000);
  const uiWidth = intIn(payload.uiWidth, 1200, 100, 5000);
  const decorative = payload.decorativeNames ?? false;
  if (typeof decorative !== "boolean") throw new Error("Decorative names must be on or off.");

  const body = JSON.stringify({ edition, order, units });
  if (Buffer.byteLength(body, "utf8") > MAX_PAYLOAD_BYTES) throw new Error("That army is too large to export.");
  const qs = `modules=${encodeURIComponent(modules)}&uiHeight=${uiHeight}&uiWidth=${uiWidth}&decorativeNames=${decorative}`;
  const { status, text } = await call(`${HOST}/getArmyCode?${qs}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  if (status >= 500) throw new Error("Yellowscribe is having trouble right now. Try again in a moment.");
  if (status !== 200) throw new Error(`Yellowscribe answered with an unexpected status (${status}).`);
  const reply = parseJson(text);
  const code = isRecord(reply) && typeof reply.code === "string" ? reply.code.trim().toLowerCase() : "";
  if (!CODE_RE.test(code)) throw new Error("Yellowscribe did not give back a valid code. Try again.");
  return { code };
}

/** AppSync direct Lambda resolver event: the field name says which operation was called. */
interface ResolverEvent {
  info: { fieldName: string };
  arguments: Record<string, unknown>;
}

/** Both operations return AWSJSON, sent as a JSON string (the client also accepts a plain object). */
export const handler = async (event: ResolverEvent): Promise<string> => {
  switch (event.info.fieldName) {
    case "yellowscribeArmy": {
      const code = event.arguments.code;
      if (typeof code !== "string") throw new Error("A Yellowscribe code is 8 letters and numbers, like 1a2b3c4d.");
      return JSON.stringify(await getArmy(code));
    }
    case "yellowscribePost":
      return JSON.stringify(await postArmy(event.arguments.payload));
    default:
      throw new Error("Unknown operation.");
  }
};
