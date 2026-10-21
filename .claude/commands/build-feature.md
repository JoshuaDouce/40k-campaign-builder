---
name: build-feature
description: Full feature delivery from rough idea to reviewed code.
             Runs refiner → PO → design review → [user verify] → architect → specialists → tests → reviewer.
---

Build the following feature: $ARGUMENTS

Every feature is built on its own branch and delivered as a pull request. Never commit
feature work directly to `main`.

0a. Create the feature branch before any agent writes files (the designer writes to `design/` too):
   - Run `git status --porcelain`. If there are uncommitted changes, stop and ask the user
     whether to commit, stash, or carry them onto the new branch. Do not discard them.
   - `git checkout main && git pull --ff-only`
   - Pick a short kebab-case slug from the feature idea and run `git checkout -b feature/<slug>`.
     If that branch already exists, ask the user whether to reuse it or pick a new name.
   - Tell the user the branch name.

0b. Regenerate PROJECT_STRUCTURE.md so every agent in this pipeline has accurate file paths.
   Read CLAUDE.md for the repo layout, then run:
   ```
   find src/ amplify/ design/ e2e/ -type f -not -path '*/node_modules/*' -not -path '*/.amplify/*' 2>/dev/null | sort
   ```
   Prepend the header `# Project Structure (auto-generated)\n` and write to PROJECT_STRUCTURE.md.
   This file is read by solution-architect and specialist agents — do this before spawning any agents.

1. Delegate to prompt-refiner agent to sharpen the idea into a clear prompt
2. Show the refined prompt and assumptions — pause for user confirmation
3. Once confirmed, delegate to product-owner agent with the refined prompt
4. Check the design handoff (see CLAUDE.md for location) for existing screens covering this feature:
   - Screens exist → delegate to design-reviewer to produce an implementation brief
   - Screens missing → delegate to designer agent to add them to the prototype,
     then tell the user how to open the prototype locally to preview,
     pause for user to approve the design, then delegate to design-reviewer for the brief
5. Show the design brief — pause for user to confirm before any code is written
6. Once confirmed, pass PO output + design brief to solution-architect agent
7. The architect will delegate to backend-dev and frontend-dev as needed
8. Once specialists are done, delegate to test-engineer agent to write tests.
   The test-engineer will not run them — it will output the command for the user to run.
   Pause and tell the user which command to run, then wait for confirmation before continuing.
9. Once the user confirms tests pass, run /simplify against all changed files to clean up structure, readability, and file size for both human and AI readability — runs autonomously, do not pause for user input
10. Once simplify is done, delegate to code-reviewer agent to review all output — the reviewer runs autonomously, do not pause for user input
11. Fix any blocking reviewer findings, then verify with `npm run build` and `npm run lint`.
    If either fails, fix it (delegating to the right specialist) before continuing.
12. Commit and raise the pull request — runs autonomously, do not pause for user input:
    - Stage only the files this feature changed (never `amplify_outputs.json` from a sandbox,
      `PROJECT_STRUCTURE.md` or `CLAUDE.local.md`). Commit with a conventional-commit message
      (`feat:`, `fix:`, `chore:`); split into several commits if the changes are clearly separate.
    - `git push -u origin feature/<slug>`
    - `gh pr create --base main --head feature/<slug>` with a conventional-commit title and a body
      covering: summary, what changed (by area: game module / frontend / backend / design),
      how to test it manually in the browser, reviewer findings left open, and open questions.
    - Do not merge the PR — merging to `main` deploys to live, so that is the user's call.
13. Report back with: the PR link, branch name, what was built, files changed, tests written,
    simplify changes made, reviewer findings, any open questions
