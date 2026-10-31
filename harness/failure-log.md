# Failure log

Append one entry per bad or surprising run. Each entry must end in a harness change.

## 2026-10-29 harness bootstrap (e2e found init bugs)
- What went wrong: init wrote `harness/` before the e2e gate; init wrote `.claude/settings.json` mid-generation and its hooks locked init out; no human unlock for update mode.
- How it was found (check, verifier, human review): `node e2e/run.mjs` (with-e2e, no-e2e).
- Root cause: skill text ordered writes wrongly and had no unlock path.
- Harness change made: SKILL.md fixes (PR #1); e2e asserts no `harness/` on a stopped init and the `PROOFRIG_UNLOCK=1` path.

## 2026-10-31 unlock env var blocked the human, not just agents
- What went wrong: every harness change needed a session restart with `PROOFRIG_UNLOCK=1`; a resumed session lost it mid-feature, and B1 (all protected paths) could not proceed.
- How it was found (check, verifier, human review): human review (user friction).
- Root cause: the guard could not tell the human-driven main session from an agent, so it gated both on the environment.
- Harness change made: removed `PROOFRIG_UNLOCK` from this repo's guard; protected paths are scoped by agent (main session and owning implementer only), and REV-9 plus a goal-template stop condition detect grading-file edits. Generated harnesses follow in the zero-restart-harness feature.
