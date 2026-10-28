# Failure log

Append one entry per bad or surprising run. Each entry must end in a harness change.

## 2026-10-29 harness bootstrap (e2e found init bugs)
- What went wrong: init wrote `harness/` before the e2e gate; init wrote `.claude/settings.json` mid-generation and its hooks locked init out; no human unlock for update mode.
- How it was found (check, verifier, human review): `node e2e/run.mjs` (with-e2e, no-e2e).
- Root cause: skill text ordered writes wrongly and had no unlock path.
- Harness change made: SKILL.md fixes (PR #1); e2e asserts no `harness/` on a stopped init and the `PROOFRIG_UNLOCK=1` path.
