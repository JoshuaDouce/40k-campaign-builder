---
name: test-automation
description: Testing strategy and patterns for this project. Covers game-module unit
             tests, React component tests, Amplify function tests, and E2E tests.
             Use when writing or reviewing any test code.
---

## Test layers

| Layer | Tool | Location | What it covers |
|---|---|---|---|
| Game module | Vitest | `src/game/**/*.test.ts` | Rules, map generator, War Round engine |
| Frontend component | Vitest + Testing Library + jsdom | `src/**/*.test.tsx` | Tab rendering, buttons, permissions in UI |
| Backend function | Vitest, AWS SDK mocked | `amplify/functions/**/*.test.ts` | `joinCampaign` handler logic |
| E2E | Playwright | `e2e/*.spec.ts` | Full user journeys in the running app |

Commands: `npm test` (all Vitest), `npx vitest run <path>`, `npm run e2e`.

---

## Game module tests

- Always seed the RNG: `const rng = mulberry(42)`. Never rely on `Math.random`.
- Build state with the test helpers (`makeState({ players: 3, seed })`) — don't hand-write maps.
- Assert rule outcomes, not internals: "a Conquer winner takes the province",
  "RP never exceeds 10", "hand never exceeds 5".
- Check purity: deep-freeze the input state (`structuredClone` + `Object.freeze` recursively)
  so any mutation throws.
- Map generator: same seed → identical system; worlds = clamp(players+1, 3, 7);
  every player gets a distinct capital on an outer/middle world; neighbour lists are symmetric.
- Include one full simulated War Round with 3 players (begin → every turn → end of round).

## Frontend component tests

- Test behaviour, not implementation — assert what the user sees.
- Render with a fake campaign store (in-memory), never real localStorage or Amplify.
- Use `getByRole` / `findBy*`; `userEvent` for clicks.
- Permission cases: a non-owner can't see another player's hand or act on their turn.

## Backend function tests

- Import the handler directly; mock `@aws-sdk/client-dynamodb` / lib-dynamodb with `vi.mock`.
- Always cover: happy path, unknown invite code, already a member (idempotent), unauthenticated caller.
- No real AWS calls in tests — the sandbox is for manual checks.

## E2E — Playwright

```ts
import { test, expect } from '@playwright/test';

test('player can begin the first War Round', async ({ page }) => {
  await page.goto('http://localhost:5173/#war');
  await page.getByRole('button', { name: /Begin War Round 1/ }).click();
  await expect(page.getByText('War Round 1 begins.')).toBeVisible();
});
```

- One spec = one user journey; `getByRole` / `getByText`, no CSS selectors.
- Stage 3 specs run against `npm run dev` (localStorage). Clear storage in `beforeEach`.
- Specs that need Cognito run only against a sandbox, with test users from env vars.

---

## What to test for every feature

1. **Happy path** — the thing works as expected
2. **Empty / first-run state** — no players, no log, round 0
3. **Error state** — invalid action, not your turn, save conflict
4. **Idempotency** — clicking twice / retrying after a conflict doesn't double-apply

## Gotchas
- `genSystem` uses floating-point Voronoi clipping — compare cell coordinates with
  `toBeCloseTo`, not `toEqual`, if you recompute them.
- Turn order ties are broken by RNG — seed it or the order flips between runs.
