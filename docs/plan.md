# The Varkesh Reach — build plan

> Stage 1 output. Status: **approved 2026-10-19**. Decisions are recorded in CLAUDE.md → Decisions;
> features and backlog in docs/roadmap.md. The ❓ items below are resolved there.

## 1. How the prototype splits up

```
reference/index.html
 ├─ data tables + rules ─────────► src/game/          (backend-dev)   pure TS, no DOM
 ├─ draw*() render functions ────► src/components/    (frontend-dev)  React
 ├─ <style> ─────────────────────► src/styles/prototype.css  (verbatim)
 └─ localStorage S ──────────────► src/store/         LocalStore (stage 3) → AmplifyStore (stage 4)
                                   amplify/           (backend-dev)   auth, data, joinCampaign
```

### Game module — `src/game/`
| File | From the prototype |
|---|---|
| `data.ts` | `FACTIONS`, `SIDE_HOOK`, `BATTLES`, `ORBITS`, `PTYPES`, `VTYPES`, `GENERIC`, `FACCARDS`, `TWISTS`, `ACTIONS`, names, `ALT` (text verbatim) |
| `types.ts` | `CampaignState` (`S`), `Player`, `Planet`, `Province`, `Pending`, `LogEntry`, `Card` |
| `rng.ts` | `mulberry()`, `shuffle()`, `type Rng = () => number` |
| `map.ts` | `clipHalf`, `cellsFor`, `genSystem` (uncapped world count), `addWorld` (late joiner), `systemScale` (ring radii / viewBox), `polyCentroid`, `regen` |
| `selectors.ts` | `ownerOf`, `provsOf`, `count`, `sizeOf`, `orbitOf`, `supplyOf`, `claimedFrac`, `hollOpen`, `laneLinked`, `holdsType`, `colorOf`, `stageText` |
| `cards.ts` | `poolFor`, `drawCard`, `drawFor` |
| `engine.ts` | `targets`, `beginRound`, `rollBattle`, `battleInfo`, `resolve`, `doQuiet`, `endTurn` |
| `actions.ts` | **`apply(state, action, { rng, userId }) → state`** — one entry point for every change (begin round, pick action, roll, resolve, quiet action, draw/play/discard, spend RP, set owner of a province, add/remove player, regen, reset) |
| `permissions.ts` | `canPerform(state, action, userId, ownerId)` — "own player only, owner can act for anyone" |
| `fresh.ts` | `fresh(players, rng)` |

The `apply()` + action objects design is what makes stage 4 easy: on a save conflict
we re-fetch and re-run the same action on the newer state.

### React — `src/`
`App` → `Hero`, `Tabs` → `PitchTab`, `WarRoomTab` (`TurnStrip`, `ActionGrid`, `BattleSetup`,
`BattleCard`, `CampaignLog`), `MapTab` (`SystemMap`, `PlanetMap`, `ProvinceInfo`, `Legend`),
`RulesTab` (tables generated from `data.ts`), `DeckTab` (`FateCard`), `FactionsTab`
(`FactionWeb`, `Rivalries`), `PlayersTab` (`PlayerCard`).
`useCampaign()` returns `{ state, dispatch(action) }` and hides where state lives.
Stage 4 adds `AuthGate` (Authenticator + display-name prompt), `CampaignList`,
`CreateCampaign`, `JoinCampaign`.

### Amplify — `amplify/`
- `auth/resource.ts` — email login, email verification.
- `data/resource.ts` — `Campaign`, `Profile`, `joinCampaign` mutation, `saveCampaign` mutation.
- `functions/join-campaign/` — Lambda: look up by `inviteCode` index, add caller to `members`.
- `data/saveCampaign.js` — AppSync JS resolver (no Lambda): DynamoDB `UpdateItem` with
  `condition version = :expected` and a members check. Reason: the generated `update`
  mutation doesn't give us a clean "only if version = N" check from the client.

## 2. How the stages use the AI template

| Stage | Agents |
|---|---|
| 0 Template applied | done: `.claude/`, merged `CLAUDE.md`, adapted skills, `.gitignore`, `git init` |
| 2 Game module | backend-dev ports (no tests) → code-reviewer |
| 3 Frontend (local) | design-reviewer brief from prototype → frontend-dev → code-reviewer |
| 4 Backend | product-owner on the online-only bits (auth, campaign list, join) → designer adds those screens to `design/` (you approve) → solution-architect → backend-dev + frontend-dev → code-reviewer |
| 5 Deploy | done directly with you (console steps) |

The brief already acts as the product-owner output for the ported tabs, so the
prompt-refiner/product-owner steps are skipped for stages 2–3. After MVP, new features go
through `/build-feature`.

## 3. Things in the brief I think are wrong or missing

**Security (fine for friends, but you should know)**
1. **Hidden hands are only hidden in the UI.** All hands live in the one shared JSON
   document that every member can read. Someone using browser dev tools could see them.
   Real secrecy means splitting hands into per-player records, and raids that steal a
   random card would then need a Lambda. *Recommend: UI-only for MVP.*
2. **"Only your own turn" is enforced by the app, not the server.** Members can update the
   whole document, so a modified client could write anything. Enforcing it server-side
   means running the game engine in a Lambda for every action. *Recommend: client-side
   for MVP. The `apply()` design lets us move it server-side later.*
3. **The campaign log stores HTML** (`<b>…</b>`) and the prototype injects it as HTML. In a
   shared document, one member could plant a script that runs for everyone. *Fix: store log
   entries as plain text plus player ids; React renders them safely.*

**Data model and AWS**
4. **Conditional saves need a custom resolver** (see above). The brief doesn't say how.
5. **`inviteCode` uniqueness isn't enforced by DynamoDB indexes.** Generate it, check the
   index, retry on a clash. Use characters that are easy to read aloud (no 0/O/1/I).
6. **Member ids format:** Amplify owner fields store `sub::username`, not the bare user id.
   The join Lambda must write the same format or members won't get access.
7. **Members can edit `members`.** With multi-owner auth, any member could remove another.
   Acceptable for MVP; noted.
8. **Budgets are normally set in US dollars**, not pounds. £5 ≈ **$6.50**. I'll set $6.

**Game flow gaps**
9. **Joining doesn't create a player.** After `joinCampaign` the joiner needs a "pick
   your faction" step that adds their player (linked to their user id). ❓
10. **Joining after War Round 1:** the map is already charted, so a late joiner has no
    Capital and starts under the prototype's "No foothold" rule. Allow it, or lock joins
    once round 1 starts? ❓
11. **Who can do what isn't fully listed.** My proposal ❓:
    - Begin War Round: any member
    - Take a turn / play / discard / spend RP: that player, or the owner
    - Record a battle result: attacker, defender, or the owner
    - Map "Held by" override, stat +/- buttons, remove player, reset campaign, chart a new
      Reach: owner only
12. **Rules text and code disagree on Underdog's grit.** Rules: "*Any player* now holding
    the fewest provinces draws 1 Fate Card." Code only checks the two combatants. Which
    is right? ❓ (Default: port the code exactly and flag it in a test.)
13. **UI choices saved in shared state:** the Factions tab selection (`webFac`), card
    "new" animation flags, and the War Room province/defender dropdowns all save to `S`.
    Online, every dropdown change would reach everyone. *Fix: keep these local until
    "Generate battle". Rolled twists stay shared so both players see the same battle.*
14. **Player name vs display name:** default the player name to your display name, still
    editable (a warband name)? ❓
15. **Retrying after a conflict re-rolls dice.** That's fine because nobody saw the failed
    result, but the UI must wait for the save before showing rolls.
16. Cognito's built-in email sender allows ~50 emails a day. Fine for a group.

**Template vs these instructions**
17. **test-engineer "never runs tests"**, but you asked me to run things. *Proposal: the
    test-engineer writes tests, I run them and show you the output.* ❓
18. **"Never commit directly to main"** plus "every push to main deploys" means work on
    feature branches and merge to main to release. For a solo project, do you want PRs on
    GitHub, or local merges into main? ❓

## 4. Your setup checklist

| Item | Status | Action |
|---|---|---|
| Node | ✅ v24.20.0 LTS (nvm) | — |
| Git | ✅ 2.55 | — |
| AWS CLI v2 | ✅ 2.38.1 | — |
| GitHub CLI | ✅ 2.102.0 | — |
| AWS account | ❓ | Root user MFA on; don't use root day to day |
| AWS login for Amplify | ✅ `default` profile = IAM user with AdministratorAccess, eu-west-2 | No Identity Center needed. Optional: MFA on that user's console login |
| CDK bootstrap | later | The first `npx ampx sandbox` asks to bootstrap `eu-west-2` (creates an S3 bucket + IAM roles, ~free). I'll ask before running it. |
| GitHub repo | ❓ | Empty **private** repo, e.g. `varkesh-reach` |
| Test emails | — | Two addresses for stage 4 (Gmail `+` aliases work: `you+p1@gmail.com`) |

## Notes from stage 2 (game module)
- **Campaign creation:** start with `fresh([owner])`. Every `addPlayer` adds an outer world, so
  before round 1 the map grows with each join; the owner's **Chart a new Reach** (`regen`, round 0
  only) then right-sizes it to `max(3, players + 1)` for the final group.
- **UI must tolerate:** `order` containing removed player ids (filter with `getPlayer`), late joiners
  missing from the current `order`, `won` being null after a winner is removed, and `BattleInfo.v`
  being the rift (`v.type === "rift"`, no `pl`). Compute `playerColors(state)` once per render.
- Scout's "swap one twist" is a note only (as in the prototype); no twist-picking UI.
