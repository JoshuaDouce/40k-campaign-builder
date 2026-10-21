import { useSyncExternalStore } from "react";

/** Keep in step with the `@media (max-width:600px)` phone breakpoint in prototype.css. */
const QUERY = "(min-width:601px)";

function subscribe(onChange: () => void): () => void {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/** True above the phone breakpoint (matches the CSS 600px media query). */
export function useIsDesktop(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => true,
  );
}
