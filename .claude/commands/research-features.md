---
name: research-features
description: Research similar products on the web and extract feature ideas for the roadmap.
             Pass an optional focus area as an argument (e.g. "onboarding", "notifications",
             "collaboration") to narrow the scope. Output is written to docs/feature-ideas.md.
             Works for any project — reads product context from CLAUDE.md automatically.
---

Research feature ideas from competitor and adjacent products.
Focus area (if provided): $ARGUMENTS

## Steps

1. Read `CLAUDE.md` to understand the product context.

2. Find the existing roadmap — look for `docs/roadmap.md` first; if it doesn't exist,
   note that there is no roadmap yet (the researcher will skip de-duplication).

3. Delegate to the **market-researcher** agent with:
   - The focus area provided by the user (or "general" if none given)
   - The full content of the roadmap if one exists (for de-duplication)
   - Instruction to read CLAUDE.md itself for product context

4. Once the researcher returns, write the full report to `docs/feature-ideas.md`,
   prepending this header:
   ```
   # Feature Research
   > Generated: <today's date>
   > Focus: <focus area or "general">
   > Product: <product name from CLAUDE.md>
   ```

5. Present a short summary to the user:
   - How many feature ideas were found
   - The top 3–5 (name + one-line why it matters)
   - Confirm full report is in `docs/feature-ideas.md`
   - Ask: "Would you like to promote any of these into the roadmap?"

6. If the user wants to promote an idea into `docs/roadmap.md`:
   - If `docs/roadmap.md` doesn't exist yet, create it with a header and the item
   - If it exists, add the idea in the correct position based on complexity and dependencies
   - Follow the existing entry format (or use: name, complexity/status, description,
     why it matters, acceptance criteria)
   - Confirm what was added and where
