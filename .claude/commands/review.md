---
name: review
description: Run code-reviewer agent against current staged changes
---

1. Run `git diff --staged` to get the current diff
2. Pass the diff to the code-reviewer agent
3. Report all issues found
