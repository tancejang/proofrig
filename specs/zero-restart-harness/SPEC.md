# Zero-restart harness

## Goal
`/proofrig:init` produces a harness that works in the session that ran it: no `PROOFRIG_UNLOCK` env var, no session restart, in init mode and update mode. The user goes straight from init to `/proofrig:ship` and `/goal`.

## Context
User request (2026-10-31): "once user do `/proofrig:init` it will just do the process then the harness setup will be done, dont need to manually restart claude session". PR #11 made this change in this repo's own harness. This feature makes the generated harnesses match. It runs before Feature B1, whose spec is reopened afterwards.

Today, `plugins/proofrig/skills/init/SKILL.md` causes three restarts or blocks:
- Phase 6 "Human unlock" makes every generated PreToolUse hook require `PROOFRIG_UNLOCK=1` to edit `harness/` and `.claude/`. That blocks the human's own session as well as agents.
- The Mode section tells update mode to stop and have the user restart with `PROOFRIG_UNLOCK=1`, then restart again without it.
- Phase 6 says writing `settings.json` "will block any further writes to `harness/` and `.claude/`" in the current session.

Tested 2026-10-31 (`claude -p`, approver hook as in `e2e/run.mjs`): an agent file written during a run is **not** spawnable in that run ("Agent type 'echoer' not found"); the agent list is loaded at session start. In an interactive session the new agent appeared after the user's next message, with no restart. So Phase 7's routing and model smoke tests, which spawn the agents init just wrote, fail if they run in the same turn. The e2e never caught this because its prompt skips the smoke test.

New model (same as this repo after PR #11): the PreToolUse hook tells the main session from subagents by the hook input's `agent_type`. It is absent in the main session and set inside a subagent. The main session may edit protected paths. A subagent may edit only its component's paths and may never write protected paths by shell. Locked specs, `.git/`, fail-closed input, and forbidden commands stay hard blocks. An orchestrator editing grading files is detected, not prevented: REV-9 plus a goal-template stop condition, then PR review.

Decisions (user, 2026-10-31): Phase 7 pauses for one reply ("reply go to run the dry run") instead of restarting or faking the smoke test; run the live e2e for fail-first; no version bump here. One release PR bumps to 0.1.3 after B1, because Feature A's locked rubric pins the CHANGELOG to 0.1.2.

## Non-goals
- Version bump and CHANGELOG (release PR after B1).
- This repo's harness (done in PR #11) and Feature B1 items (guard regex false positives, fail-closed input, CI).
- An e2e case that runs update mode (a second live init run); R4 is a text check plus verifier review.
- Changing the generated guard's other rules.

## Requirements
Check command: `node specs/zero-restart-harness/checks/zero-restart.test.mjs` (exit 0 = pass). One requirement: `node --test-name-pattern="^R<n> " specs/zero-restart-harness/checks/zero-restart.test.mjs`.

| ID | Requirement | Component | Kind | Check |
|----|-------------|-----------|------|-------|
| R1 | `init/SKILL.md`, `references/templates.md`, and `references/base-rules.md` contain no `PROOFRIG_UNLOCK` and no "Human unlock" step. | plugin | text | `R1` |
| R2 | Phase 6: the PreToolUse hook scopes protected paths by agent. With no `agent_type` in the hook input (main session) it allows edits to protected paths; a subagent may edit only its component's paths and never writes protected paths by shell. Locked specs, `.git/`, fail-closed input, and forbidden commands stay blocked for everyone. | plugin | text + e2e | `R2`; behavior in R7 |
| R3 | Phase 6 keeps "Write `.claude/settings.json` last" (hooks must not enforce a half-written harness) but drops the claim that it blocks further writes to `harness/`. | plugin | text | `R3` |
| R4 | Mode: update mode applies its changes in the same session; no restart and no env var. | plugin | text + MANUAL | `R4`; verifier reads the Mode section end to end |
| R5 | When init (or update mode) adds or changes a `.claude/agents/*.md` file, it ends its turn after Phase 6 and says "reply go to run the dry run", because new agents load on the next message, not mid-turn. Phase 7 then runs for real. No restart. | plugin | text | `R5` |
| R6 | `base-rules.md` gains REV-9: the verifier runs `git diff --stat <slice base>...HEAD`, and any protected or grading file (hooks, e2e, golden tasks, settings) that `SPEC.md` does not name is a violation. The generated goal template's "Stop and report" line gains the same condition. | plugin | text | `R6` |
| R7 | `e2e/run.mjs` (with-e2e) asserts on the generated harness: the main session may edit `harness/` with no unlock; a `general-purpose` subagent is blocked from `harness/`; no generated file mentions `PROOFRIG_UNLOCK`. The old unlock assertion is gone. **Written during authoring (PROJ-1 human checkpoint).** | plugin (e2e) | e2e | `R7` (text); done-criterion: `PROOFRIG_E2E_MODEL=<id> node e2e/run.mjs` exits 0 |
| R8 | README: the `/proofrig:init` description says init pauses for one reply before the dry run, with no restart. | plugin | text | `R8` |
| R9 | No regressions: `claude plugin validate --strict .`, `claude plugin validate --strict plugins/proofrig`, `node harness/golden-tasks/hooks.test.mjs`, and `node specs/docs-skill-reliability/checks/score.mjs` with no base or A item failing. | plugin | rubric | commands as listed (done-criteria) |

Text checks are proxies. The live e2e (R7) is the behavioral proof for R1, R2, and R3; the verifier (REV-4) reads the changed skill text for R4 and R5.

## Contracts changed
- **Generated harness contract (user-visible):** no `PROOFRIG_UNLOCK`; the main session can edit `harness/` and `.claude/`. Existing harnesses keep their old guard until the user re-runs `/proofrig:init` in update mode. That run still meets the old guard once (it needs the unlock), which the release notes must say.
- **Init flow:** one extra reply before the dry run when agents change.

## Slices (stacked PRs)
| # | Slice | Component (implementer) | Covers | Depends on |
|---|-------|-------------------------|--------|------------|
| 1 | init SKILL.md (Mode, Phase 6, Phase 7), `base-rules.md` REV-9, `templates.md` goal stop line, README init row; commit with the spec and the `e2e/run.mjs` change already authored | plugin (implementer-plugin) | R1–R9 | main |

One slice, about 40 changed lines plus the e2e change. The e2e edit was made by the main session during authoring; the slice commits it unchanged (REV-9 allows it because R7 names `e2e/run.mjs`).

## Human checkpoints for this feature
- The e2e change (R7) is reviewed now, at spec review (PROJ-1).
- Release notes for 0.1.3 (after B1) must tell users with an existing harness that one last update-mode run needs `PROOFRIG_UNLOCK=1`.

## Open questions
None.
