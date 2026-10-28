# Docs and skill reliability (Feature A of 2)

## Goal
proofrig's docs and skill text are complete and self-consistent, and the skills handle the known edge cases, raising the repo-quality rubric from 6.1 to at least 8.2. Feature B (tests and enforcement, protected paths) takes it to at least 8.5.

## Context
The user asked for an overall quality score of at least 8.5. Rating is mechanical: `specs/docs-skill-reliability/checks/score.mjs` scores 10 dimensions from weighted binary checks and reports their mean. Baseline is 6.10. Items are tagged `base` (already true, must not regress), `A` (this feature), and `B` (Feature B).

Feature B needs edits in `e2e/`, `.claude/hooks/`, `harness/`, and a new `.github/`, all outside `implementer-plugin`'s paths, so it was split off (user decision, 2026-10-29) and runs in a session started with `PROOFRIG_UNLOCK=1`.

Relevant files: `plugins/proofrig/skills/{init,ship}/SKILL.md`, `plugins/proofrig/skills/init/references/templates.md`, `plugins/proofrig/.claude-plugin/plugin.json`, `README.md`. Lessons being carried into the skills come from this repo's own harness: PROJ-3 (Git Bash on Windows) and the `guard.mjs` false positive and fail-open behavior found while rating.

## Non-goals
- Anything in `e2e/`, `.claude/`, `harness/`, `.github/`, `.gitignore` (Feature B).
- New skills, new commands, or changes to the generated harness layout.
- Rewriting README sections that are already accurate.

## Requirements
Check command for every row: `node specs/docs-skill-reliability/checks/score.mjs --only <ID>` (exit 0 = pass).

| ID | Requirement | Component | Kind | Check |
|----|-------------|-----------|------|-------|
| R1 | `ship` references the Visual check spec as `../init/references/templates.md`, relative to the skill's base directory, with no bare `skills/init/references/...` path. | plugin | text check + manifest validate | A1 |
| R2 | `ship` writes specs to `specs/<feature>/SPEC.md`, and the vague "location the harness defines" is gone. | plugin | text check | A5 |
| R3 | `ship`: if `specs/<feature>/.locked` already exists, stop and tell the human (only a human can remove a lock). Stated on one line that contains `.locked`, "already exists", and "stop". | plugin | text check | A2 |
| R4 | `ship`: if `specs/<feature>/SPEC.md` already exists without a lock, resume from it and do not overwrite it. | plugin | text check | A3 |
| R5 | `ship`: a check that is too slow or costly to run during authoring (for example a live model e2e) needs the user to confirm before the fail-first run; otherwise the spec review marks it "fail-before not confirmed". | plugin | text check | A4 |
| R6 | `init` Phase 6: generated hook commands use `node "$CLAUDE_PROJECT_DIR/.claude/hooks/<name>.mjs"` (or the system's runtime) with forward slashes and no bash-only tools, because Claude Code runs hooks through Git Bash on Windows. | plugin | text check | A6 |
| R7 | `init` Phase 6: the PreToolUse hook fails closed (blocks with exit 2) on empty or unparsable input. | plugin | text check | A7 |
| R8 | `templates.md` golden-task list: one read-only command touching a protected path (for example `ls 2>&1; cat harness/CLAUDE.md`) must be allowed, which catches over-broad write patterns. | plugin | text check | A8 |
| R9 | `plugin.json` has `author`, `repository`, and `homepage` (`https://github.com/tancejang/proofrig`), and `claude plugin validate .` reports no warnings. | plugin | manifest validate | A14 |
| R10 | `plugins/proofrig/CHANGELOG.md` has entries 0.1.2, 0.1.1, 0.1.0, newest first, and `plugin.json` is `0.1.2`. Entries are written from git history (0.1.0 initial skills, 0.1.1 e2e and init ordering fixes plus repo harness, 0.1.2 this feature). | plugin | text check | A15, A15r |
| R11 | README has a "Developing proofrig" section: `claude plugin validate .`, `node harness/golden-tasks/hooks.test.mjs`, `PROOFRIG_UNLOCK=1` and when to use it, and the repo's own harness (`harness/CLAUDE.md`). | plugin | text check | A9 |
| R12 | README has a Troubleshooting section with at least 4 entries (for example: plugin not listed, own hooks block an edit, Stop hook STUCK, Windows bash path / `PROOFRIG_BASH`). | plugin | text check | A10 |
| R13 | README shows an example filled `/goal` line in a ```` ```text ```` block. | plugin | text check | A11 |
| R14 | README "Repo layout" lists `CLAUDE.md`, `.claude/`, `harness/`, and `plugins/proofrig/CHANGELOG.md`. | plugin | text check | A12 |
| R15 | README E2E section states prerequisites: `claude` logged in / authenticated, `PROOFRIG_E2E_MODEL`, Git Bash on Windows and `PROOFRIG_BASH`, and the duration in minutes. | plugin | text check | A13 |
| R16 | No regressions: every `base` item still passes, and the whole Feature A set passes. Score at least 8.2 after A. | plugin | rubric | `node specs/docs-skill-reliability/checks/score.mjs --require A --min 8.2` |
| R17 | Every new or changed sentence is accurate against the code: commands exist, env vars are real, troubleshooting fixes work, no dangling paths (PROJ-5). | plugin | MANUAL | Verifier reads each changed paragraph and spot-runs each command it names. |

Text checks are proxies. R17 (verifier review) is what stops keyword stuffing.

## Contracts changed
- `ship` gains two stop/resume behaviors (R3, R4) and one confirmation (R5). These are additive, and no command or generated-layout change.
- `init` gains hook-generation constraints (R6, R7). Generated hooks become stricter: they fail closed.
- Plugin version 0.1.1 → 0.1.2.

## Slices (stacked PRs)
| # | Slice | Component (implementer) | Covers | Depends on |
|---|-------|-------------------------|--------|------------|
| 1 | `ship` SKILL.md: template path, spec location, lock/resume, costly checks | plugin (implementer-plugin) | R1–R5 | main |
| 2 | `init` SKILL.md + `templates.md`: cross-platform hooks, fail-closed guard, read-allowed golden task | plugin (implementer-plugin) | R6–R8 | slice 1 |
| 3 | Manifest metadata, CHANGELOG, version 0.1.2 | plugin (implementer-plugin) | R9, R10 | slice 2 |
| 4 | README: developing, troubleshooting, example /goal, layout, E2E prerequisites | plugin (implementer-plugin) | R11–R15, R16 | slice 3 |

README comes last so its layout never names a CHANGELOG that doesn't exist yet. Each slice is green on its own: `claude plugin validate .` plus its own `--only` IDs.

## Human checkpoints for this feature
- Harness defaults only. If any slice seems to need `e2e/`, `harness/`, or `.claude/`, stop and report; that work belongs to Feature B.

## Open questions
- **Deferred to Feature B (user accepted 2026-10-29):** PROJ-1 requires e2e assertions for the skill behavior changes R3, R4, R6, and R7. They are added in Feature B (rubric items B6, B7). Until then, these behaviors are covered by text checks plus verifier review only.
