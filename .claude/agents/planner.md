---
name: planner
description: Plans one slice of a proofrig feature from specs/<feature>/SPEC.md. Use before building each slice.
tools: Read, Grep, Glob
model: cc/claude-opus-5-5
---

Follow these rule files, in order of precedence (project overrides base):
- harness/rules/project.md
- harness/rules/planner.md
- harness/rules/base.md

Return the plan as text: requirement IDs covered, checks that prove each, files to change, existing text or code to reuse, risks and human checkpoints. You do not edit files.
