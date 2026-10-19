---
name: design-handoff
description: How to read and use the project's design handoff (reference/index.html
             prototype and design/ additions). Use when implementing any screen or
             component that has a corresponding design spec.
---

## What the handoff contains

- `reference/index.html` — the single-file prototype. HTML structure = layout spec,
  `<style>` blocks = the stylesheet to port, `<script>` = behaviour and all game text.
  **Read-only. Never edit it.**
- `design/` — screens the prototype doesn't have (sign-in wrapper, display-name prompt,
  My campaigns, create/join campaign). Built by the designer agent with the same tokens
  and classes.

## Tokens (prototype `:root`)

| Token | Use |
|---|---|
| `--bg` `#16120f` | page background |
| `--panel` / `--panel2` | cards, info boxes / inputs, stat tiles, secondary buttons |
| `--line` | borders, dividers |
| `--ink` / `--dim` | body text / secondary text |
| `--brass` | primary accent: selected tab, primary button, headings h3, eyebrows |
| `--blood` | danger, twists, notes, rift |
| `--verd` | "no battle" actions, success messages, fortified outline |
| `--f-display` | Grenze Gothic: h1–h4, big numbers, card titles |
| `--f-body` | Alegreya Sans: body |
| `--f-mono` | Share Tech Mono: labels, eyebrows, buttons, tabs |

Fonts load from Google Fonts (link tag in the prototype `<head>`).

## Reusable classes
`.btn` (`.primary` `.danger` `.sm`), `.chip` (`aria-pressed`), `.dot`, `.row`, `.note`,
`.eyebrow`, `.dim`, `.mono`, `.card` (`.fac` `.new`), `.cards`, `.stat`/`.stats`, `.player`,
`.turn`, `.battle`, `.twist`, `.act`/`.acts-grid`, `.field`, `.log`, `.win`, `.tbl`,
`ol.steps`, `.mapbox`, `.info`, `.pair`, `.handbar`, `.msg`.
Port the CSS verbatim into `src/styles/` and keep these class names.

## Reading rules
1. Find the section (`<section class="tab" id="…">`) and its `draw*()` function in the script.
2. The `draw*()` function is the component spec: which state it reads, what it renders,
   which buttons it binds.
3. SVG maps (`drawSystem`, `drawPlanet`, `drawWeb`): port the geometry and attributes
   exactly; render as JSX `<svg>`.

## Interactions & states
- Empty states exist in the prototype (no players, empty log, fewer than 2 factions) — keep them.
- Loading, error and conflict states for the online app are NOT in the prototype: flag
  them and have the designer add them under `design/`.

## What to ignore (prototype scaffolding)
- localStorage persistence, the `-tab` key, `KEY="varkesh-v3"`
- "Saved in this browser on this device" copy and the example players (stage 4+)
- The hidden `<textarea>` copy fallback, `meta name="claude:viewport-fit-sides"`
- `isNew` flags stored inside hand cards (animation state — keep it in UI state instead)
