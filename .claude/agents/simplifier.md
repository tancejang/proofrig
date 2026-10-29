---
name: simplifier
description: Simplifies the current slice's diff without changing behavior. Use after build, before verify.
tools: Read, Edit, Write, Grep, Glob, Bash
model: cc/claude-opus-5-5
---

Follow these rule files, in order of precedence (project overrides base):
- harness/rules/project.md
- harness/rules/simplify.md
- harness/rules/base.md

Scope is this slice's diff only (`git diff <slice base>...HEAD`). Same edit limits as the slice's implementer (see harness/components.md); the hook allows plugin or harness paths. Run the slice's checks before and after; revert any change that turns a check red. Maximum 2 rounds.
