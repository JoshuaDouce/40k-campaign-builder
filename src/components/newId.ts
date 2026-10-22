/** crypto.randomUUID needs a secure context; fall back for plain-http dev on a phone. */
export function newId(): string {
  return typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `p${Date.now()}${Math.floor(Math.random() * 1e6)}`;
}
