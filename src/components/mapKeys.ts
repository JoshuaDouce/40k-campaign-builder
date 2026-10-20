import type { KeyboardEvent } from "react";

/** Enter or Space activates a focusable SVG group, as the prototype binds. */
export function activateOnKey(fn: () => void) {
  return (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fn();
    }
  };
}
