# Harness guide

**Known weaknesses (read first):**
- Verifier runs on the same model as the implementer (only the Opus route is available); no cross-model check.
- The Stop hook runs only cheap checks (manifest validation, script syntax). The live e2e (`node e2e/run.mjs`, ~20 min) is a `/goal` done-criterion, not run on every Stop.
- Shell-command blocking is pattern-based (`.claude/hooks/guard.mjs`); the verifier's diff review (REV-6) is the backstop.
- No linter, formatter, or duplication detector exists for Markdown skills; IMPL-1/3/6/11 are scored by the verifier only.
- e2e does not cover `/proofrig:ship`, real subagents, or live component scoping inside generated harnesses.
- Router env lives in the user's shell, not in `.claude/settings.json` (public repo).

Flow: Spec -> Plan -> Build -> Simplify -> Verify -> Fix loop -> Stacked PRs -> Report

## Roles and rules
- Planner: rules/base.md + rules/planner.md + rules/project.md
- Implementer, routed by the slice's component (components.md):
  - `implementer-plugin`: rules/base.md + rules/implementer.md + rules/components/plugin.md + rules/project.md
  - `implementer-harness`: rules/base.md + rules/implementer.md + rules/components/harness.md + rules/project.md (needs `PROOFRIG_UNLOCK=1`)
- Simplifier: rules/base.md + rules/simplify.md + rules/project.md
- Verifier (read-only): rules/base.md + rules/reviewer.md + rules/project.md

## Enforcement
- **PreToolUse `.claude/hooks/guard.mjs`** (Edit, Write, MultiEdit, NotebookEdit, Bash, PowerShell). Exit 2 blocks.
  - `harness/`, `.claude/`, `e2e/` are protected unless the session was started with `PROOFRIG_UNLOCK=1` (an agent cannot set its parent's environment). Shell writes there are blocked the same way.
  - `.git/` and paths outside the project: always blocked.
  - `specs/<f>/SPEC.md`, `specs/<f>/checks/`, and `.locked` itself are frozen while `specs/<f>/.locked` exists, unlock or not; removing a lock by shell is blocked.
  - `implementer-plugin` may edit only `plugins/`, `.claude-plugin/`, `README.md`, `PROGRESS.md`; `implementer-harness` only `.claude/hooks/`, `harness/`, `.github/`, `.gitignore`, `CLAUDE.md`, `PROGRESS.md`; `simplifier` either set. No agent may edit `.claude/settings.json`, `.claude/agents/`, or `e2e/`. `verifier` and `planner` may not write at all (shell included, by pattern).
  - Always blocked: force-push, push to `main`, `gh pr merge`, `git reset --hard`, `--no-verify`, recursive deletes, `.env` access.
  - To adjust: edit the regexes at the top of `guard.mjs` (needs `PROOFRIG_UNLOCK=1`), then re-run `node harness/golden-tasks/hooks.test.mjs`.
- **Stop `.claude/hooks/stop.mjs`**: runs `claude plugin validate .` and `node --check` on every `.mjs` in `e2e/`, `.claude/hooks/`, `harness/golden-tasks/`. Red blocks the turn from ending; the same failure 3 times lets it end with a STUCK message so it is reported.
- **Permissions** (`.claude/settings.json`): allow only the commands the flow needs; deny force-push, `gh pr merge`, `git reset --hard`, `.env` reads.

## Limits
- Max fix rounds per failure: 3
- Overall cap: one feature per `/goal`, at most 6 slices
- Stuck = same failure 3 times -> stop and report
- Human checkpoints (stop and report): spec ambiguity, any change to `e2e/` or other existing checks, any need to touch a protected path outside the slice's component (`.claude/settings.json`, `.claude/agents/` always count), any change to a skill's documented contract with users (commands, generated layout)

## Dry run
Results of the Phase 7 dry run are recorded in the PR that added this harness. Re-run the golden tasks (`harness/golden-tasks/README.md`) after any harness change.
