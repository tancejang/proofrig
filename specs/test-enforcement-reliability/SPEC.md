# Test and enforcement reliability (Feature B1 of the repo-quality split)

## Goal
The repo's own hooks block real writes without blocking reads, fail closed on bad input, and run in CI on Windows (Git Bash) and Linux. This raises the repo-quality rubric to at least 8.5 (`node specs/docs-skill-reliability/checks/score.mjs --min 8.5`).

## Context
Feature A (v0.1.2) took the rubric to 8.20. The rest of the gap is rubric B-items in protected paths: `.claude/hooks/`, `harness/`, `.github/`, `.gitignore`. Expected after B1: D7, D8, and D9 go to 10, giving a score of about 9.5. D6 (B6, B7) stays at 5.0 until Feature B2.

Findings while writing the checks (2026-10-29):
- **Shell-write probes must run as a subagent.** Since PR #11 the guard applies the shell-write check only when the hook input has an `agent_type`; the main session may write protected paths. Every R1/R2 probe sends `agent_type: 'general-purpose'`. The rubric's B1 probe (locked `docs-skill-reliability` spec) sends none, so it passes vacuously today (8.35); R12 still requires it, but R1 is the real proof.
- **Shell writes into `.claude/` are not blocked at all** (for subagents). The write regex ends in `\b(harness|\.claude|e2e)/`. A `\b` never matches between a space and `.`, so `echo x > .claude/x`, `cp a .claude/x`, and `sed -i ... .claude/hooks/guard.mjs` exit 0. R2 covers this.
- **Over-matching:** the same regex matches any `>` anywhere before a protected path (the `>` in `2>&1`, or in `->` inside a quoted PR body), so reads like `ls 2>&1; cat harness/CLAUDE.md` are blocked. During Feature A this hit the user, two verifiers, and a `gh pr create`.
- **Over-matching on path names (2026-10-31):** `\b(harness|...)/` also matches `specs/zero-restart-harness/` (`\b` between `-` and `h`), so a subagent's `sed -i` on plugin files that named that spec path was blocked during zero-restart-harness. R1 covers this.
- **Fail open:** `guard.mjs:6` `JSON.parse` throws on empty or invalid stdin (`null` throws at `req.cwd`), node exits 1, and Claude Code treats exit 1 as non-blocking.
- `claude plugin validate` needs no auth or config (tested with tokens unset and an empty HOME). `--strict` exits 0 on both `.` and `plugins/proofrig` today; ICON_MISSING is a plugin-directory check that does not affect the result.
- `validate .` checks only the marketplace manifest (and a broken plugin.json). `validate plugins/proofrig` checks plugin.json and skill frontmatter, but without `--strict` a SKILL.md with no frontmatter only warns (exit 0). With `--strict` it exits 1.
- The local `claude` is the native `claude.exe`. `stop.mjs` spawns `claude` without a shell, which cannot run an npm `claude.cmd` shim on Windows, so CI uses the native installer.

Decisions (user, 2026-10-29): CI matrix ubuntu-latest + windows-latest with `shell: bash`; native installer pinned to 2.1.312; `--strict` on both validate calls in CI and in the Stop hook; delivery as an unattended `/goal`. The prerequisite `harness` component landed in PR #10.

Reopened 2026-10-31 after PRs #10–#12 (agent-scoped guard, no `PROOFRIG_UNLOCK`): probes carry `agent_type`, unlock wording dropped, the init-update checkpoint removed as done, and the `*-harness/` path case added to R1.

Hook probes must use node `spawnSync` (as `hooks.test.mjs` does), never `'...' | node guard.mjs` (PowerShell 5.1 garbles piped stdin).

## Non-goals
- e2e case for `/proofrig:ship` (B6), e2e assertions for Feature A R1, R3–R7 (B7), and hook-protecting `.locked` in init-generated harnesses. These belong to Feature B2.
- Any skill change (so no `node e2e/run.mjs` run is needed). An icon for ICON_MISSING. Editing `specs/docs-skill-reliability/` (locked).
- Making the guard a full shell parser. It stays pattern-based (REV-6 is the backstop). It must just be right on every case in R1/R2.

## Requirements
Check command: `node specs/test-enforcement-reliability/checks/reliability.test.mjs` (exit 0 = pass). One requirement: `node --test-name-pattern="^R<n> " specs/test-enforcement-reliability/checks/reliability.test.mjs`.

| ID | Requirement | Component | Kind | Check |
|----|-------------|-----------|------|-------|
| R1 | For a subagent (`agent_type` set), `guard.mjs` allows read-only shell commands where `2>&1`, `2>/dev/null`, or a quoted `>` (`->`, `→`) comes before a protected path: `ls 2>&1; cat harness/CLAUDE.md`, a `gh pr create --body "Spec -> Plan; see harness/CLAUDE.md"`, and others (see check); and does not treat a path that merely ends in `-harness/` (`specs/demo-harness/notes.md`) as protected. | harness | hook probe | `R1` (+ rubric B1 via R12) |
| R2 | For a subagent, the guard still blocks (exit 2) shell writes to `harness/`, `.claude/`, `e2e/`: `>`, `>>`, `1>`, `&>`, no-space `>`, quoted target, `2>&1 >`, `tee`, `cp`, `sed -i`, `Set-Content`, a write after a read in the same command, and `echo "->" > harness/a.md`. **Closes the `.claude/` hole.** In the main session (no `agent_type`) they are allowed. | harness | hook probe | `R2` |
| R3 | The guard exits 2 with a `proofrig guard:` stderr message on empty, whitespace-only, invalid-JSON, or non-object (`null`) stdin. `harness/CLAUDE.md` Enforcement says so. | harness | hook probe + text | `R3` (+ rubric B2) |
| R4 | `hooks.test.mjs` copies the repo excluding only the `.git` directory (so `.github/` and `.gitignore` are copied). The literal `includes(\`${path.sep}.git\`)` is gone. | harness | text | `R4` (+ rubric B3) |
| R5 | `hooks.test.mjs` has golden tests for the allowed read `ls 2>&1; cat harness/CLAUDE.md`, the still-blocked `echo x > harness/a.md` and `cat a 2>&1 > e2e/x`, and fail-closed input (raw empty stdin); `node harness/golden-tasks/hooks.test.mjs` exits 0. | harness | golden tests | `R5` |
| R6 | `.github/workflows/*.yml`: on `pull_request` and push to `main`; matrix `ubuntu-latest`, `windows-latest`; `shell: bash`; installs claude with the native installer (`claude.ai/install.sh` / `.ps1`) pinned to `2.1.312`; runs `node harness/golden-tasks/hooks.test.mjs`, `node --check` on every `.mjs` in `e2e/`, `.claude/hooks/`, `harness/golden-tasks/`, `claude plugin validate --strict .`, `claude plugin validate --strict plugins/proofrig`. No secrets, no `ANTHROPIC_*`, no npm. | harness | text | `R6` (+ rubric B4) |
| R7 | `.gitignore` exists and ignores `PROGRESS.md`. Minimal. | harness | text | `R7` (+ rubric B5) |
| R8 | `stop.mjs` runs `claude plugin validate --strict .` and `claude plugin validate --strict plugins/proofrig` (plus the existing `node --check`s). On a temp copy it passes when green and blocks when a SKILL.md has no frontmatter. | harness | hook probe | `R8` |
| R9 | The plugin validate command (`claude plugin validate [--strict] plugins/proofrig`) is named in: root `CLAUDE.md` Commands; `harness/rules/components/plugin.md` PLUGIN-4 (with `validate .`); `harness/components.md`; `harness/goal-template.md` Run step and Done criteria; `harness/CLAUDE.md` Enforcement Stop bullet (with `--strict`); README "Developing proofrig" Stop hook sentence. | harness + plugin (README) | text | `R9` |
| R10 | `harness/failure-log.md` gains three entries in the existing format, each ending in `- Harness change made:`: (a) guard false positive on `2>&1`/`->` and `*-harness/` paths, plus the `.claude/` hole; (b) guard fails open on bad stdin; (c) PR #6 merged into its stacked base instead of `main` (GitHub retargets only when the base branch is deleted), re-landed as #9. | harness | text | `R10` |
| R11 | `harness/goal-template.md`: a line telling the run (and the human) to retarget each slice PR to `main` before merging it (or enable "Automatically delete head branches"); `PROGRESS.md` added to the "Do not" line's allowed paths. | harness | text | `R11` |
| R12 | Rubric: `score.mjs --only B1,B2,B3,B4,B5` passes, and `score.mjs --min 8.5` passes (no base regressions). | harness | rubric | `R12` |
| R13 | CI is green on both OSes on the final slice's PR. | harness | CI | Done-criterion: `gh pr checks <slice 4 PR> --watch` exits 0 |
| R14 | The guard change opens no new write path beyond the R1 cases. | harness | MANUAL | Verifier reads the new regex/logic in `guard.mjs` and tries 3+ write forms of its own against it (REV-6) |

R2 cases that already block today pass before the work by design: they are regression guards. R2 as a whole fails today because of the `.claude/` hole. R1 fails today on the `*-harness/` cases and on `2>&1` before a protected path.

## Contracts changed
- Repo harness only: the guard blocks on bad input (stricter), allows reads with `2>&1` (looser, exactly the R1 cases), and blocks `.claude/` shell writes (stricter). The Stop hook adds `--strict` validation, so a SKILL.md frontmatter warning now blocks Stop.
- No plugin, skill, or generated-harness change. Plugin version stays 0.1.2.

## Slices (stacked PRs)
| # | Slice | Component (implementer) | Covers | Depends on |
|---|-------|-------------------------|--------|------------|
| 1 | `guard.mjs`: precise shell-write check, `.claude/` hole, fail closed; `hooks.test.mjs`: copy filter + golden tests; `harness/CLAUDE.md` fail-closed line | harness (implementer-harness) | R1–R5, R14 | main |
| 2 | `stop.mjs` strict validates; docs in `CLAUDE.md`, `plugin.md`, `components.md`, `goal-template.md`, `harness/CLAUDE.md`; failure-log (a)(b)(c); goal-template retarget line + PROGRESS.md | harness (implementer-harness) | R8, R9 (all but README), R10, R11 | slice 1 |
| 3 | README "Developing proofrig": Stop hook sentence names `validate --strict plugins/proofrig` | plugin (implementer-plugin) | R9 (complete) | slice 2 |
| 4 | `.github/workflows/ci.yml` + `.gitignore` | harness (implementer-harness) | R6, R7, R12, R13 | slice 3 |

Each slice is green on its own: `node harness/golden-tasks/hooks.test.mjs` plus its own R-IDs. CI comes last so it validates the final state and its first run is the R13 evidence. Expected sizes: about 120, 60, 2, and 50 changed lines.

## Human checkpoints for this feature
- Risk: the harness implementer edits the guard that constrains it. Mitigations: the locked checks under `specs/`, golden tests (HARN-1/2), the verifier's REV-6 and REV-9 diff review, and human PR review. `.claude/settings.json` and `.claude/agents/` stay out of reach.
- Merge the stack bottom-up, retargeting each PR to `main` before merging (the #6 lesson). The agent never merges.

## Open questions
None.
