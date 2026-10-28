---
name: init
description: Scaffold an agent harness (rules, hooks, per-component implementers, verifiers, e2e and visual checks, /goal template) for an end-to-end system that may span multiple repos. Use once per system, or in update mode when repos, commands, or rules change. Scans the repos, proposes a complete default harness design, and asks only about what the user wants to change or the scan cannot infer.
---

# /proofrig:init

Build a harness so that features can later be shipped with `/proofrig:ship` + `/goal` reliably and unattended.

The default flow it sets up (the user may reshape it in Phase 2):

**Spec → Plan → Build → Simplify → Verify → Fix loop → Stacked PRs → Report**

## Principles

- Correctness is enforced by the harness (hooks, permissions, runnable checks), not by asking the model to be careful.
- If a reliable e2e check cannot be established, say so and stop at the gap report. Never scaffold files that look complete but verify nothing.
- **Defaults first.** Every decision has a recommended default derived from the scan. The user can accept everything with one reply ("go") or change only what they care about. Never make the user fill in a blank form.
- Scan before asking. Ask only about what the scan cannot infer, and phrase it as "I found X, correct?" where possible.
- Ask in small rounds (3-4 questions), each with a proposed default.
- Keep generated rule files short and testable. Rules are specific, have an ID, and have a one-line reason.
- Keep the set of design choices fixed (the knobs in Phase 2). Anything outside them becomes a free-text note for the user to hand-edit, not a new template branch.

## Mode

- No `harness/` directory at the system root: **init mode**, run all phases.
- `harness/` exists: **update mode**. Read `harness/harness.config.md` (do not re-ask recorded decisions), re-scan, diff against the harness, and propose only the changes (new repo or component, changed command, stale rule, new rule from `harness/failure-log.md`). Do not regenerate files the user has edited.

## Phase 1: Scan (no questions yet)

Locate the system root and all repos. For each repo, read: README, package/build files, Makefile/justfile, CI config, docker-compose, existing CLAUDE.md, test layout, lint/format config, folder structure, and recent commit style.

Produce a short internal inventory:
- Stack, and how to build, test, lint, typecheck, run.
- **Components:** classify each part of the system by type: backend API, web frontend, mobile, worker/job, data/migrations, infra/IaC, shared library, docs. Record the paths each component owns.
- Cross-repo contracts (APIs, events, schemas, shared packages).
- Existing verification: unit, integration, e2e, browser tests, screenshot or visual tests, accessibility checks. Note what looks flaky or missing.
- Whether a router or gateway is configured (for example `ANTHROPIC_BASE_URL` in settings or env).
- Brownfield (infer conventions from code, user confirms) or greenfield (set conventions via the interview).

## Phase 2: Harness design (defaults first)

Build one recommended harness profile from the scan and present it as a single compact table. The user replies "go" or edits specific rows. Only ask follow-ups for rows that need facts the scan could not infer.

Choose a preset as the starting point and say why (see `references/templates.md`, "Presets"): **Lean** (plan, build, verify), **Standard** (the default flow above), or **Strict** (standard plus red-team pass, more human gates, cross-model verification). Recommend Standard unless the scan suggests otherwise (for example Strict for payments, auth, or migrations-heavy systems).

Rows in the table (these are the only knobs):

| Row | What is decided | Default |
|-----|-----------------|---------|
| Pipeline | Which stages exist; extra stages (security review, docs or changelog update); where humans gate | Standard flow |
| Roles | Planner separate or orchestrator plans; one implementer per component or a single one; number of verifiers (spec compliance, rules and code quality, visual) | One implementer per detected component; one verifier, plus a visual verifier if a frontend exists |
| Verification | Check kinds per component (see "Check kinds"); how strong e2e must be; what blocks versus only warns | Per the check-kind table, everything blocks except subjective visual review |
| Autonomy | Cautious (pause per slice), Balanced, or Hands-off | Balanced |
| Models | Model per role and fallback | Strongest for orchestrator, planner, verifier; faster or cheaper for implementer and simplifier; verifier on a different model than the implementer when available |
| Delivery | Stacked PRs, PR tool, size target, merge order | Stacked PRs, about 400 changed lines per slice, contracts first |
| Rules | Which base rules to keep and how strict | All base rules |
| Feedback | Failure-log habit, golden-task cadence | Log every bad run, re-run golden tasks after any harness change |

Non-negotiables: the e2e gate (Phase 4), an independent verifier that re-runs checks, and locked checks and baselines during runs. If the user turns one off, warn once and record it as a weakness at the top of `harness/CLAUDE.md`. Do not silently drop them.

Write the accepted design to `harness/harness.config.md` (template in `references/templates.md`) with a one-line rationale per decision. Later phases generate from this file, and update mode and `/proofrig:ship` read it.

## Phase 3: System interview

Only what the scan could not answer. Rounds, each with proposed defaults:

1. **System and repos.** Confirm the repo and component list, how the repos connect, and the contract owners (who changes first when an API, event, or schema changes).
2. **Run and verify.** Commands to build, test, lint, typecheck per repo. How to start the whole system locally (or a realistic slice), how data is seeded, how a cross-repo flow is exercised. Known flaky or missing tests.
3. **UI verification setup (only if a frontend or mobile component exists).** Where baseline screenshots live (or will live), routes and states to capture, viewports, reference designs (mockups, exported designs), tolerance for pixel diffs, and how animation, fonts, clocks, and data are made deterministic.
4. **Autonomy limits (unattended runs).** Which environments are safe; never-allowed actions (prod access, secrets, destructive migrations, force-push, push to main); permission mode; allowed command patterns; protected paths.
5. **Git and PR workflow.** Branch naming, commit style, PR tool (`gh`, Graphite, other), default base branch. For multi-repo: merge order (contracts first, then consumers). See "Stacked PRs".
6. **Budget and stop conditions.** Max fix rounds per failure (default 3), overall time or turn cap, what "stuck" means (same failure 3 times), what to do when stuck (stop and report, never improvise around a check).
7. **Human checkpoints.** Where the run must pause: migrations, destructive operations, spec ambiguity, any unexpected change to a cross-repo contract, any need to modify a protected path, an existing check, or a baseline.
8. **Your rules.** Ask: "What do you always correct in AI-written code?" and "Which architecture or layering rules must never be broken?" Turn answers into project rules, and into component rules where they are component-specific. Offer rules inferred from the scan (naming, structure, test style) for confirmation.
9. **Model IDs and router.** The exact model ID string for each role in the Phase 2 model row, the router base URL and the name of the auth variable (never the key), and a fallback Anthropic model per role in case a routed model fails its smoke test.

## Phase 4: E2E gate

Before generating anything, confirm there is one command (or a short documented sequence) that brings up the system or a realistic slice, seeds data, and runs cross-repo checks with a clear pass/fail exit code.

- If it exists: record it in `harness/e2e/README.md` and the goal template.
- If it is missing or unreliable: stop. Report exactly what is missing (seed data, flaky test, no local environment, no contract tests) and offer to build that first as its own `/goal`. Do not continue to Phase 5 until the user explicitly chooses to proceed with a weakened harness, and if they do, record the weakness at the top of `harness/CLAUDE.md`.

## Phase 5: Generate

Generate from `harness/harness.config.md`. Copy base rules from `references/base-rules.md` into `harness/rules/` (split per role), add component rule files, append project rules to `harness/rules/project.md`, and fill templates from `references/templates.md`. Layout:

```
<system-root>/
  CLAUDE.md                     # system map: repos, contracts, commands, non-goals (short)
  .claude/
    settings.json               # permissions, hooks, router env
    agents/
      planner.md
      implementer-<component>.md  # one per component (or a single implementer.md)
      simplifier.md
      verifier.md               # read-only, fresh context
      verifier-visual.md        # only if UI components exist and the design includes it
  harness/
    harness.config.md           # accepted design decisions and rationale
    components.md               # component registry: paths, stack, commands, check kinds, implementer, model
    rules/
      base.md  planner.md  implementer.md  simplify.md  reviewer.md  project.md
      components/<type>.md      # backend.md, frontend.md, ...
    models.md                   # model per role, router settings, fallbacks, and why
    goal-template.md            # /goal skeleton with this system's real commands
    report-template.md
    failure-log.md
    e2e/README.md
    visual/                     # only if UI: capture config, baselines, references
    golden-tasks/
  <each repo>/CLAUDE.md         # build/test/lint commands, conventions, gotchas (short)
```

Rules for generation:
- Root and repo `CLAUDE.md` files stay short and stable: commands, conventions, gotchas, pointers. No task details.
- **Implementers per component.** Each `implementer-<component>.md` loads `base.md` + `implementer.md` + `components/<type>.md` + `project.md`, lists only the tools it needs, and carries a `model:` line from `harness/models.md`. Its edits are scoped to the component's paths (enforced in Phase 6). The orchestrator routes each slice to the implementer of the component the slice belongs to, using `harness/components.md`.
- For a routed model, use the router's exact model ID string, not an alias. If a router is used, put the base URL and auth variable names in `.claude/settings.json` under `env` and never write the key itself into any file.
- The verifier loads `base.md` + `reviewer.md` + `project.md`, is read-only, and has the check kinds for each component available. The visual verifier is described in "Check kinds".
- Project rules override component rules, which override base rules, on conflict.
- Convert subjective rules into mechanical checks wherever possible (lint rule, import-boundary check, duplication detector, formatter, diff-size warning) and register them in the hooks. Rules that remain prose-only are listed in `reviewer.md` so the verifier scores the diff against that exact list.

## Phase 6: Enforce

Write `.claude/settings.json` with permissions and hooks derived from the interview:

- Permissions: allow only the commands the harness needs; deny prod access, secrets files, force-push, push to protected branches, destructive DB commands.
- **Stop hook:** run tests, lint, typecheck, and mechanical checks; fail loudly with output so the run cannot end on red.
- **PreToolUse hook:** block edits to protected paths (including `harness/`, CI config, lockfiles unless intended) and dangerous commands. Also block edits to `specs/<feature>/checks/` and `SPEC.md` whenever `specs/<feature>/.locked` exists, and block edits to `harness/visual/baselines/` and reference images while a run is locked. `/proofrig:ship` creates the lock file when the user approves the spec, so checks are writable while being authored and frozen during the `/goal` run.
- **Component path scoping:** an implementer may edit only the paths its component owns (plus the files of its own slice's tests). Edits outside are blocked and reported.
- Document in `harness/CLAUDE.md` what each hook does and how to adjust it.

Hooks and permissions are the enforcement layer; do not rely on prose for anything that must never happen.

## Phase 7: Dry run

Prove the harness works before declaring success:

1. Make a trivial change through the full flow (plan, build, simplify, verify) and confirm the e2e check runs and passes.
2. Make a deliberately broken change (golden task) and confirm the verifier or the checks catch it.
3. Confirm a protected-path edit, an out-of-component edit, and a forbidden command are blocked.
4. Confirm the stuck rule triggers a stop-and-report.
5. **Routing test.** For each component, confirm a slice is routed to that component's implementer and that implementer can build, test, and lint its component.
6. **Visual test (if UI).** Capture a screenshot with the visual check, confirm it passes against the baseline, introduce a deliberate visual regression and confirm it is caught, and confirm an attempt to overwrite a baseline during a locked run is blocked. Run the capture twice and confirm identical results; if it flakes, fix determinism before continuing.
7. **Model smoke test, per role.** Spawn each role's agent on a trivial task and confirm: the intended model served it (check the router log or response metadata, since a subagent's `model:` string may not route as expected), it can call tools correctly (read a file, edit a file, run a command, fix a failing test), and it respects the read-only restriction for the verifier. If a routed model fails, switch that role to its recorded Anthropic fallback in `harness/models.md` and the agent file, and note it under known weaknesses.

If any step fails, fix the harness and repeat. Record the golden tasks in `harness/golden-tasks/` so they can be re-run after any harness change.

## Phase 8: Report

Give the user a short summary: the accepted design, what was generated, the e2e command, hooks and limits in effect, known weaknesses, anything the dry run exposed, and the next step: "Run `/proofrig:ship` for your first feature."

## Check kinds

The verifier (and `/proofrig:ship`, when writing checks) chooses from this menu per component and requirement. Defaults:

| Component | Default check kinds |
|-----------|---------------------|
| Backend API | Unit, integration, contract tests, schema diff |
| Web frontend | Component tests, browser e2e (headless Playwright or equivalent), screenshot check, accessibility check |
| Mobile | Emulator flows, screenshot check |
| Data / migrations | Dry run on seeded DB, rollback test, no destructive operations without a checkpoint |
| Infra | Plan or diff review only, never apply |
| Worker / job | Integration with seeded queue, idempotency test |
| Shared library | Unit tests plus compile or contract check against all consumers |
| Docs | Link check, example run |

**Screenshot checks** have two modes, chosen per requirement:
- **Baseline diff:** capture a fixed route, viewport, and state with seeded data and compare to an approved baseline with a stated tolerance. Objective; use it for regressions.
- **Rubric review:** the visual verifier compares a screenshot to a mockup or a concrete written rubric (for example "table shows 5 columns, empty state shows this message"). Subjective, so it is advisory unless the rubric is concrete and checkable.

Visual rules:
- The verifier captures screenshots itself; it never trusts screenshots supplied by the implementer.
- Baselines and references are protected and locked during runs. New baselines produced by a run go to the report as manual-review items for the human to approve.
- Rendering must be deterministic: seeded data, fixed viewport, animations disabled, fonts pinned, clocks mocked. A flaky visual check is a bug, never retried until green.
- Use headless capture for unattended runs. Browser tools meant for interactive use are for debugging, not for the locked verification path.

## Stacked PRs (configure in Phases 2 and 3, enforce in templates)

- Work is delivered as a **stack of small PRs**, each independently reviewable and green, not one large PR.
- Each slice is one branch based on the previous slice's branch; the first slice is based on the default branch. Each slice gets its own PR whose base is the previous slice's branch.
- A slice is a coherent, reviewable unit within one component (target: reviewable in one sitting, roughly 400 changed lines or fewer, excluding generated files). Slicing order: contracts/schema first, then core logic, then consumers/UI, then wiring and docs.
- Every slice must pass its own checks and the existing suite on its own branch, so any prefix of the stack is mergeable.
- Commit at each green checkpoint inside a slice.
- PR descriptions include: stack position (n of N) and links to neighbors, which requirement IDs the slice covers, the evidence (check output summary, screenshots for UI slices), and what reviewers should look at.
- Multi-repo: open the contract repo's stack first; consumer stacks reference the contract PR and are marked as blocked-by until it merges.
- Use the tool configured in the interview (`gh` with explicit `--base`, Graphite, or similar). If the tool cannot create stacks, open PRs with explicit bases and note the merge order in each description.
- The agent opens PRs but never merges them.
