# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# The Varkesh Reach

A web app for running a Warhammer 40k narrative campaign with a group of friends.
Players sign up, create or join a campaign with an invite code, and share one live
campaign: the star map, War Rounds, battles, Fate Card hands and the campaign log.

## Repo layout
Single Vite app at the repo root (the Amplify Gen 2 convention), not separate
frontend/backend folders.
- `src/game/` — pure TypeScript game engine (rules, map generator, War Round). No DOM, no React, no AWS.
- `src/` (everything else) — Vite + React + TypeScript frontend
- `amplify/` — Amplify Gen 2 backend: `auth/`, `data/`, `functions/`, `backend.ts`
- `reference/index.html` — the working prototype (source of truth for rules and look). Read-only.
- `design/` — designs for screens the prototype doesn't have (sign-in, campaign list, join)
- `e2e/` — Playwright specs
- `docs/` — roadmap, plan, feature research, product notes (`docs/kickoff-prompt.md` is the original stage plan)

## Design handoff
- Location: `reference/index.html` — open in a browser to preview. New screens: `design/`.
- Format: single-file HTML/CSS/JS prototype. Design tokens are the CSS custom properties
  in its `:root` block. See the `design-handoff` skill.

## Agent hierarchy

| Agent | When to use |
|---|---|
| **product-owner** | Clarify scope and acceptance criteria before building anything |
| **solution-architect** | Orchestrate full feature delivery — delegates to specialists |
| **frontend-dev** | `src/` outside `src/game/`: React components, tabs, styling, Amplify client calls |
| **backend-dev** | `src/game/` (game logic) and `amplify/` (auth, data models, functions, resolvers) |
| **designer** | New screens not in the prototype, added under `design/` using the prototype's tokens |
| **test-engineer** | Not used for now (no automated tests — see Decisions) |
| **code-reviewer** | Review every diff before committing |
| **debug-test** (`/debug-test`) | Diagnose a failing test and delegate the fix to the right specialist |

### Typical feature flow
```
product-owner → solution-architect → [frontend-dev / backend-dev] → test-engineer → code-reviewer
```
Use `/build-feature <idea>` for the full pipeline.

### Debugging a failing test
```
/debug-test <test-file-or-name>
```
The skill runs the test, reads the failure, diagnoses root cause, and delegates
the fix to frontend-dev or backend-dev automatically.

## Source of truth for the game

`reference/index.html` is a working single-file prototype. It already contains every
rule, table and piece of game logic. **Port it; don't redesign it.** Keep the look
(fonts, colours, layout, tabs) and the wording of rules, cards and twists.

Key pieces inside its `<script>`:

| Prototype code | What it is |
|---|---|
| `FACTIONS`, `SIDE_HOOK`, `BATTLES` | Factions and the rivalry web |
| `ORBITS`, `PTYPES`, `VTYPES`, `genSystem()` | Seeded star-system generator: worlds, provinces (Voronoi cells), warp lanes, capitals |
| `GENERIC`, `FACCARDS`, `poolFor()`, `drawCard()` | Fate Card deck, hand limit 5 |
| `TWISTS`, `ACTIONS` | Mission Twists (D12) and campaign actions |
| `targets()`, `beginRound()`, `rollBattle()`, `battleInfo()`, `resolve()`, `doQuiet()`, `endTurn()` | The War Round engine |
| `S` (state object) and `fresh()` | The whole campaign state, currently saved to localStorage |

Move all of this into a pure TypeScript module (`src/game/`) with no DOM access:
functions take state and return new state. Unit-test it.

## Stack (keep it simple)

- **Frontend:** Vite + React + TypeScript. Plain CSS, reusing the prototype's styles.
- **Backend:** AWS Amplify Gen 2.
  - **Auth:** Amazon Cognito via Amplify Auth, email + password sign-up with email
    verification. Use the Amplify UI `<Authenticator>` component for sign-up, sign-in
    and forgotten password. Players set a display name on first sign-in.
  - **Data:** Amplify Data (AppSync + DynamoDB).
  - **Functions:** one small Lambda for joining a campaign by invite code.
- **Hosting:** Amplify Hosting connected to the GitHub repo. Every push to `main`
  deploys.
- Region: `eu-west-2` (London) unless told otherwise.

## Data model

Keep the campaign as one JSON document. The prototype already works this way and it
avoids a complicated schema.

- `Campaign`
  - `name`, `inviteCode` (6 characters, unique, indexed)
  - `ownerId`: the creator, who can edit settings, regenerate the map and remove players
  - `members`: list of Cognito user ids
  - `state`: JSON, the prototype's `S` object
  - `version`: integer, for optimistic concurrency
  - Auth: only `members` can read or update. Only the owner can delete.
- `Profile`: `userId`, `displayName`. Owner-only write, readable by signed-in users.
- Custom mutation `joinCampaign(inviteCode)` (Lambda): adds the caller to `members`
  and returns the campaign id.

Each player in `state.players` links to a Cognito `userId`. A signed-in user can only
take the War Room turn, play or discard cards, and spend RP for **their own** player.
The campaign owner can act for anyone, for when someone forgets their phone.

**Saving:** every change is `state → newState` with `version + 1`, written with a
condition `version = expected`. On a conflict, re-fetch, re-apply the action and retry.

**Live updates:** subscribe with `observeQuery` so everyone sees map changes and log
entries without refreshing.

## MVP features

1. Sign up, sign in, sign out, set a display name.
2. A "My campaigns" list. Create a campaign (name, then add yourself as a player and
   pick a faction). Join with an invite code. Copy the invite code.
3. In a campaign, all the prototype's tabs: Pitch, War Room, Map, Rules, Fate Deck,
   Factions, Players. Data comes from the shared state instead of localStorage.
4. Players can only see **their own** Fate Card hand. Others see the count only.
5. The owner can chart a new Reach before War Round 1 once everyone has joined.
6. Works well on a phone. People will use it at the gaming table.

## Decisions (agreed 2026-10-19)

- **The map scales to any number of players (2+, no cap).** Every player starts on an outer
  world of their own (changed 2026-10-24; the prototype's "one more world than players" rule is
  dropped). Inner and middle counts come from a base of max(3, players + 1): inner is 1 below 6,
  otherwise max(2, round(base / 4)); middle is round((base - inner) / 2). Outer = one world per
  player (at least the base's remainder). Capitals go only on outer worlds. The orbit tiers and twist counts (outer and middle 1,
  inner 2) don't change. When a ring gets crowded, the system view scales up (larger orbit
  radii and SVG viewBox) instead of overlapping worlds. Player colours beyond the
  prototype's `ALT` list are generated, so every player gets a distinct colour.
- **Joining mid-campaign is allowed and grows the Reach.** A late joiner gets a **new outer
  world**, charted with the same seeded generator and placed in the widest gap on the
  outer ring. The warp lane between its two ring neighbours is split through it, and it gets
  a lane to the nearest middle world. Their Capital is on it. Existing worlds, provinces and
  holdings are untouched, and the worlds-to-players ratio holds. They join the turn order at
  the next War Round. A proper catch-up mechanic is on the roadmap.
- **The Hollowgate stays open once opened.** The prototype recalculates `hollOpen()` every
  time; a new world would lower the claimed % and could close it again. Add a
  `state.hollOpened` flag, set the first time `hollOpen()` is true, and check it from then on.
- **Underdog's grit is scrapped (2026-10-28):** nobody draws a Fate Card for holding the fewest
  provinces after a battle. (The Underdog +10% points for an attacker is a separate rule and stays.)
  The organiser can add a named card from a player's pool to their hand, or remove any card, from the Players tab.
- **No orbit size multiplier (2026-10-28):** a province plays at its type's points on every world; the orbit
  only sets the number of twists. (The prototype's ×1.5 middle / ×2 inner is dropped; the attacker's ±20% garrison
  choice on unclaimed provinces already varies the size.)
- **No supply cap on battle size (2026-10-29):** a battle is played at the province's size (after twists and Raid),
  whatever either player's supply limit. Supply only caps your roster; a player who can't field the full size plays short.
  (The prototype's "play at the lower supply limit" and the garrison "only your supply limit caps the size" are dropped.)
- **Battle sizes (2026-10-29):** a battle's points set its size: up to 750 Combat Patrol (44" x 30", 2 detachment points),
  800–1450 Incursion (44" x 60", 2 DP), 1500+ Strike Force (44" x 60", 3 DP). Onslaught isn't used. It goes by the
  battle's own size, before Garrison or Underdog bonuses. Shown on the battle card, the Rules tab and the turn guide.
- **Live battle tally (2026-10-29):** "Battle started" on a rolled battle locks its army lists, twists and garrison
  handicap, and opens a per-side tally (Destroyed, kills, Marked for Glory: campaign numbers only, no VP or CP). It is
  shared campaign state. "Back to army lists" unlocks and keeps the tally. Recording the result copies it to
  `lastTally`, which pre-fills that player's post-battle helper.
- **Flat buff points (2026-10-30):** every Battle Honour, relic and Battle Training adds a flat 10 pts (honours were
  10% of base points rounded to 5). The army list and My Warband show the base points and the buff points separately,
  for checking against an outside list builder.
- **Export to TTS via Yellowscribe (2026-10-29):** players paste a Yellowscribe code; the app adds campaign effects
  (abilities, plain stat changes, titles) and returns a new code. One Lambda proxies yellowscribe.link (no CORS there).
  The export never changes the campaign. See `docs/features/yellowscribe-export.md`.
- **Player name** defaults to the user's display name and stays editable (warband name).
- **Permissions:** only the owner can begin War Round 1 (start the campaign); any member can begin later War Rounds. Turns, cards and RP: that player or
  the owner. Battle results: attacker, defender or owner. Map "Held by" override, stat
  +/- buttons, adding or removing a player's Fate Cards, remove player, reset campaign, chart a new Reach: owner only.
- **Security is honour-system for MVP:** hidden hands and per-player permissions are
  enforced in the UI only. The log is stored as plain data, never HTML.
- **No automated tests for now** (decided 2026-10-20). This is a throwaway app for a few
  friends; the user tests manually in the browser. Verification = `npm run build` (type-check)
  and `npm run lint`. Add testing back (Vitest for `src/game/` first) only if the project
  grows beyond the friends group.
- **Roster caps are hard (2026-10-27):** a roster change that would raise the total over supply, or add a Character past
  the Character slots, is refused. A roster already over may stay
  level or shrink. Battle Honours from the post-battle helper always apply. The owner can delete any unit, even one
  locked since War Round 1, with no Hall of Heroes entry.
- **Force Organisation slots removed (2026-10-30):** no slot chart and no slots for Non-Monster / Vehicle, Vehicle /
  Monster or Other. Units keep a role. Two role rules stay in every campaign: Character slots (1, +1 per Shrine held, up
  to +3; held at 1 in Setup) and a 2 Battleline minimum. The Datasheet limit switch is now on by default. Can be added
  back from git history (`src/game/forceOrg.ts`, `ForceOrgChart.tsx`) if wanted.
- **Mission Twists switch (2026-10-30):** an owner-only campaign rule, on by default. Off: battles roll no twists (and the
  Scout swap note is dropped). Battles of 750 pts or fewer always use Light Forces and Close Quarters, on top of any
  rolled twists and whether the switch is on or off.
- **Battle Training and Relics switches (2026-10-30):** owner-only campaign rules, both on by default. Training off: no
  training can be bought (a Promotion can still make a Veteran a Character; Battle Honours are earned as normal). Relics
  off: no new relics. Held training and relics are hidden and don't count toward points while off (kept in the data, back
  when switched on). The organiser can remove a Battle Training at any time and refund its 1 RP (logged, not capped at 10).
- **A switched-off rule is invisible (2026-10-30):** while a campaign rule switch is off, nothing about it shows anywhere
  in the app (Rules, Rewards, Pitch, Map, War Room, Turn Guide, unit cards, Hall of Heroes, action text). Only the owner's
  Campaign rules panel lists it, plus owner-only tools such as the training refund.
- **Varkesh Reach 1.2 (2026-10-30):** a rules version (`state.rules`; missing = 1.1). 1.2: province types by orbit
  (outer 500–750, middle 750–1000, inner 1000s plus a 1500 pt Titan Graveyard), Capitals border only 500 and 750,
  Reinforcements 2 RP for +200, Muster +150 supply (+50 more with a Forge, was +250 / +150), Outposts +50, Ruins +100 and
  Titan Graveyards +150 supply held, Scout removed, RP bank cap 6, Hollowgate by War Round 12. New campaigns start on 1.2. The
  organiser upgrades a 1.1 campaign from the Campaign rules panel: holdings and held province types stay, unclaimed provinces
  are re-charted, past Reinforcements lose half their supply, past Musters lose 100 (200 with a Forge) counted from the log,
  RP over 6 is lost. A campaign already on 1.2 gets the Muster cut once on load (`musterRepriced`). See `docs/features/varkesh-1-2.md`.
- **Player log (2026-10-30):** an organiser-only panel at the foot of the Players tab shows, one player at a time, why their RP,
  supply limit or Fate Card count changed (War Round, Player / Organiser / Game tag, the log line, before and after).
  Recorded in `apply()` into `state.plog` (latest 200 per player, fewer above 4 players: 800 in all, to stay well inside
  the 400 KB campaign item). Read-only; players never see it (UI-only, like hidden hands). See `docs/features/player-log.md`.
- **`main` deploys straight to live** and committing to `main` is fine (friends-only app).

## Not in the MVP

Unit rosters and XP tracking (players keep these on paper or in an app for now),
images and uploads, chat, notifications, admin tools, payments.

## Game module conventions (`src/game/`)
- Strict TypeScript. No `any` in the game module.
- Game logic stays deterministic where it can: dice rolls go through one injectable
  RNG function, so tests can seed it.
- Pure functions: `(state, …) → newState`. Never mutate the input state.
- Rule, card and twist text is copied verbatim from the prototype.

## Frontend conventions
- Vite + React + TypeScript, function components and hooks. No router library unless needed;
  tabs are local state (with `#hash` deep links as in the prototype).
- State: one campaign store hook wrapping the game module (localStorage in stage 3,
  Amplify Data from stage 4). Components never call game functions that mutate storage directly.
- Styling: plain CSS copied from the prototype; reuse its class names and `:root` tokens.
  Never hardcode colours or fonts that exist as tokens.
- Mobile-first: test at ~400px width.
- Lint command: `npm run lint`

## Backend conventions
- Amplify Gen 2, TypeScript-defined resources in `amplify/` (one folder per category).
- Auth rules live on the model in `amplify/data/resource.ts`; never rely on the UI alone
  for anything that must be enforced.
- Never commit secrets or `amplify_outputs.json` from a personal sandbox.
- Keep AWS costs near zero: on-demand DynamoDB, no always-on servers.
- **Before anything that creates or changes AWS resources, say what it will create and
  ask first.**
- Build command: `npm run build` (type-checks frontend, game module and `amplify/`)

## Testing
**None for now** (see Decisions). Skip the test-engineer step in the feature flow and don't
write test files. Verify with `npm run build` and `npm run lint`; the user tests manually.
If testing comes back: Vitest for `src/game/` first (seeded RNG), see the `test-automation` skill.

## Git
- Commit straight to `main` is fine; every push to `main` deploys to the live site
- `/build-feature` always works on a `feature/<name>` branch and ends by raising a PR to `main`
  (not merged automatically). For ad-hoc work, use a branch only for risky or multi-session changes
- Commit messages: conventional commits (`feat:`, `fix:`, `chore:`)

## Project structure index
`PROJECT_STRUCTURE.md` (auto-generated, gitignored) lists all source files.
The `build-feature` command regenerates it before each feature build.
The solution-architect and specialist agents read it to get exact file paths.
