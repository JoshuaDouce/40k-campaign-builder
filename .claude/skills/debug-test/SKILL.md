---
name: debug-test
description: Diagnose a failing test, identify whether it is a frontend or backend
             issue, then delegate the fix to the appropriate specialist agent.
             Invoke with: /debug-test <test-specifier>
---

## How to invoke

```
/debug-test <test-specifier>
```

`<test-specifier>` can be any of:
- A file path: `src/game/engine.test.ts` or `src/components/WarRoom.test.tsx`
- A test name pattern: `"conquer winner takes the province"`
- A backend function test: `amplify/functions/join-campaign/handler.test.ts`
- An E2E spec file: `e2e/war-round.spec.ts`

If no specifier is given, ask the user which test is failing before proceeding.

---

## Step 1 — Identify the test type

Check the path and file extension to classify the test:

| Pattern | Test type | Runner |
|---|---|---|
| `src/game/**/*.test.ts` | Game module | Vitest |
| `src/**/*.test.tsx` (outside `src/game/`) | Frontend component | Vitest |
| `amplify/**/*.test.ts` | Backend function | Vitest |
| `e2e/**/*.spec.ts` | E2E | Playwright |

If it is ambiguous, check whether the file exists under each path before deciding.

---

## Step 2 — Run the failing test and capture output

Use the project's test commands from CLAUDE.md. Generic fallbacks:

**Frontend (Jest/Vitest):**
```bash
npx jest "<test-specifier>" --no-coverage 2>&1
# or
npx vitest run "<test-specifier>" 2>&1
```

**Backend (xUnit):**
```bash
dotnet test --filter "<test-specifier>" --logger "console;verbosity=detailed" 2>&1
```

**Backend (pytest):**
```bash
pytest -v -k "<test-specifier>" 2>&1
```

**E2E (Playwright):**
```bash
npx playwright test "<test-specifier>" --reporter=list 2>&1
```

Capture the full output. Do not truncate error messages or stack traces.

---

## Step 3 — Diagnose the failure

Classify the root cause from the output:

### Frontend (Jest / Vitest / RNTL)
| Symptom | Likely cause |
|---|---|
| `Cannot find module` / import error | Missing file, bad path alias, uninstalled package |
| `ReferenceError` / `TypeError` in component | Logic bug in component or state store |
| `Expected ... received ...` on rendered output | Component renders wrong UI — check props/state |
| Mock not called or called wrong | API client mock mismatch |
| Async timeout / never resolved | State update or mock not resolving |
| Passes alone, fails in suite | Shared state not reset between tests |

### Backend (xUnit / pytest)
| Symptom | Likely cause |
|---|---|
| `404` when `200/201` expected | Endpoint not registered or wrong route |
| `400 BadRequest` / validation error | Request body binding failure, missing field |
| `500 InternalServerError` | Unhandled exception — check handler logic |
| `401 Unauthorized` | Auth not bypassed in test host |
| Repository / service throws | Test double not seeded or wrong setup |
| Compile / import error | Syntax error or type mismatch in changed code |

### E2E (Playwright / Cypress)
| Symptom | Likely cause |
|---|---|
| Element not found / timeout | Selector no longer valid or page not loaded |
| Wrong text rendered | API mock / fixture returns stale data |
| Navigation fails | Route or URL changed |
| `ERR_CONNECTION_REFUSED` | Dev server not running — report to user, don't fix |

---

## Step 4 — Determine ownership

| Root cause is in… | Delegate to |
|---|---|
| `src/` outside `src/game/` — component, store hook, Amplify client calls | **frontend-dev agent** |
| `src/game/` — rules, map, engine | **backend-dev agent** |
| `amplify/` — models, auth rules, functions, resolvers | **backend-dev agent** |
| Both (contract mismatch) | Fix **backend-dev** first, then **frontend-dev** |
| E2E — UI issue | **frontend-dev agent** |
| E2E — API contract issue | **backend-dev agent** |

---

## Step 5 — Delegate the fix

Spawn the appropriate agent with a brief that includes:

1. The failing test name and file path
2. The exact error message and relevant stack trace lines
3. Your diagnosis (what you believe the root cause is)
4. Which file(s) to look at first
5. Instruction to re-run the failing test after the fix and confirm green

**Template brief for frontend-dev:**
> The test `<test name>` in `<file>` is failing with: `<error>`.
> I believe the root cause is `<diagnosis>`. Look at `<file(s)>` first.
> After fixing, re-run `<test command>` and confirm it passes.
> Then run the project lint command.

**Template brief for backend-dev:**
> The test `<test name>` in `<file>` is failing with: `<error>`.
> I believe the root cause is `<diagnosis>`. Look at `<file(s)>` first.
> After fixing, re-run `<test command>` and confirm it passes.
> Then run the project build command.

---

## Step 6 — Verify

After the specialist reports completion:

1. Re-run the original failing test to confirm green.
2. Run the full suite for the affected layer to check for regressions:
   - Game / frontend / backend functions: `npx vitest run`
   - E2E: `npx playwright test`
3. Report the result to the user — pass count before and after.

---

## Ground rules

- Never modify test assertions to make a test pass unless the test is demonstrably wrong.
  Fix the implementation, not the assertion.
- If both layers need changes, fix the backend contract first so the frontend has a stable target.
- If the failure is environmental (missing env vars, package not installed, server not running),
  tell the user what is needed rather than delegating to a specialist.
