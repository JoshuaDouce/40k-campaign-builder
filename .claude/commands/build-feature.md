---
name: build-feature
description: Full feature delivery from rough idea to reviewed code.
             Runs refiner → PO → design review → [user verify] → architect → specialists → tests → reviewer.
---

Build the following feature: $ARGUMENTS

0. Regenerate PROJECT_STRUCTURE.md so every agent in this pipeline has accurate file paths.
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
11. Report back with: what was built, files changed, tests written, simplify changes made, reviewer findings, any open questions
