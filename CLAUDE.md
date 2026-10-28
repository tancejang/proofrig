# proofrig

Claude Code plugin: `/proofrig:init` builds a verification harness for a system; `/proofrig:ship` turns a feature into a spec, runnable checks, and a `/goal` line. The skills are prose (Markdown) plus JSON manifests.

## Repos
| Repo | Role | Stack | Path |
|------|------|-------|------|
| proofrig | plugin + its e2e suite | Markdown skills, JSON manifests, Node stdlib scripts | `.` |

## Commands
- Validate plugin: `claude plugin validate .`
- E2E (live model, ~20 min, exit 0 = pass): `PROOFRIG_E2E_MODEL=<router model id> node e2e/run.mjs [with-e2e|no-e2e]`
- Hook tests: `node harness/golden-tasks/hooks.test.mjs`
- No build, lint, or typecheck.

## Harness
Rules, goal template, and verifier live in `harness/`. Read `harness/CLAUDE.md` before starting a feature goal. `harness/`, `.claude/`, and `e2e/` are protected; a human unlocks them by starting the session with `PROOFRIG_UNLOCK=1`.

## Non-goals
Never merge PRs, push to `main`, force-push, or write keys/tokens/router URLs into files.

## Known weaknesses
See `harness/CLAUDE.md`.
