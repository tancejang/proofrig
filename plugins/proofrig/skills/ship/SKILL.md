---
name: ship
description: Prepare a feature for unattended delivery with /goal in a system that already has a harness (created by /proofrig:init). Grills the user on the feature, writes SPEC.md with a runnable check per requirement, slices the work into stacked PRs, and prints the ready-to-paste /goal line. Use at the start of every feature.
---

# /proofrig:ship

Turn a feature idea into a spec, runnable checks, a PR stack plan, and one `/goal` line. This skill does **not** build the feature. The harness does that after the user runs `/goal`.

The per-feature spec and checks are where accuracy comes from. Do not shortcut them.

## Preconditions

1. Confirm `harness/` exists at the system root with `goal-template.md`, `rules/`, and `e2e/README.md`. If not, stop and tell the user to run `/proofrig:init` first.
2. Read `harness/CLAUDE.md`, `harness/harness.config.md`, `harness/components.md`, the root `CLAUDE.md`, and `harness/rules/project.md` so questions and checks use the system's real commands, components, check kinds, and conventions.
3. Read `harness/failure-log.md` and avoid repeating past failures when writing the spec and checks.

## Step 1: Grill

Use the `grill-me` skill if it is installed. Otherwise run the same behavior: interview the user relentlessly, one decision at a time, until the decision tree is resolved, proposing a recommended answer for each question.

Rules for the grilling:
- Explore the codebase to answer your own questions first. Only ask the user about real decisions: intent, scope, edge cases, trade-offs.
- Cover: user-visible behavior, data and contract changes (which repos, who changes first), error and edge cases, performance or security constraints, migrations, what is explicitly out of scope, and what "done" looks like to the user.
- Record unresolved items as open questions. Do not proceed to Step 2 with open questions that change the checks; resolve them or have the user explicitly defer them.

## Step 2: Size check

Before writing the spec, estimate size. If the feature is too big for one goal (guideline: more than about 6 slices, or it spans many unrelated areas, or it mixes a risky migration with feature work), propose a split into separate features, agree on the first one with the user, and continue with that one only. Big goals fail far more often than small ones.

## Step 3: Write SPEC.md

Create `specs/<feature>/SPEC.md` at the system root. Before writing it:
- If `specs/<feature>/.locked` already exists, stop: the spec is approved and frozen for a run. Tell the human; only a human removes a lock, so never delete it yourself.
- If `specs/<feature>/SPEC.md` already exists without a `.locked`, resume from it and its `checks/`: continue from the first unfinished step and do not overwrite it.

Structure:

```markdown
# <Feature>

## Goal
<One or two sentences, user-visible outcome.>

## Context
<Why, who it is for, constraints, links to relevant code and docs.>

## Non-goals
<Explicitly out of scope.>

## Requirements
| ID | Requirement | Component | Kind | Check |
|----|-------------|-----------|------|-------|
| R1 | <testable statement> | <component from components.md> | <unit / integration / contract / e2e / screenshot / ...> | <check id and command, or MANUAL: what a reviewer looks at> |

## Contracts changed
<APIs, events, schemas: before, after, who changes first, how consumers migrate. "None" if none.>

## Slices (stacked PRs)
| # | Slice | Component (implementer) | Covers | Depends on |
|---|-------|-------------------------|--------|------------|
| 1 | <contract / schema change> | <component> | R1 | default branch |
| 2 | <core logic> | <component> | R2, R3 | slice 1 |
| 3 | <consumer / UI> | <component> | R4 | slice 2 |

Each slice belongs to exactly one component; its implementer is the one registered for that component in `harness/components.md`. A change that spans two components is two slices.

## Human checkpoints for this feature
<Migrations, destructive operations, anything needing approval, beyond the harness defaults.>

## Open questions
<Deferred items the user accepted. "None" if none.>
```

Writing rules:
- Every requirement is a testable statement, not "works well". If you cannot state how to check it, rewrite it or tag it `MANUAL`.
- Slices follow the order: contracts and schema, core logic, consumers and UI, wiring and docs. Each slice must be independently green and reviewable (target about 400 changed lines or fewer, excluding generated files). Any prefix of the stack must be mergeable.
- Multi-repo: contract repo slices come first; consumer slices depend on them and are marked as blocked-by their contract PR.

## Step 4: Write the checks

For every requirement, create a runnable check under `specs/<feature>/checks/` using the system's existing test tooling and style: unit or integration tests, API contract tests, e2e flows, or a script with a clear exit code. Rules:

- Checks must fail before the feature is built and pass after. Run each check now against the current code to confirm it fails for the right reason (not a typo or setup error). A check that passes before the work exists is worthless.
- If a check is too slow or costly to run while authoring (for example a live model e2e), ask the user to confirm before its fail-first run; if they decline, skip the run and list the check as "fail-before not confirmed" in the spec review.
- Prefer the highest-level realistic check (e2e or contract) for user-visible behavior, plus focused tests for edge cases.
- Choose the check kind per requirement from the component's kinds in `harness/components.md`, within what `harness/harness.config.md` allows.
- For UI requirements, write a visual check spec (the "Visual check spec" section of `../init/references/templates.md`, relative to this skill's base directory) under `specs/<feature>/checks/visual/`: route, state and seed, viewports, reference, tolerance. Use baseline-diff when an approved baseline or mockup exists. Otherwise use rubric-review with concrete, checkable rubric lines, and mark it advisory unless the config says rubric review blocks. New baselines are never auto-approved: they appear in the report for the user to approve.
- For a visual check, "fails before" means the screen is missing or differs from the reference.
- No flaky ingredients (sleeps, real clocks, network to third parties). Use the harness's seed data and fixtures.
- Requirements that truly cannot be checked automatically stay `MANUAL`, with exactly what the reviewer should look at. List them clearly; they appear in the final report.
- Update the Check column in SPEC.md with the real check IDs and the command to run each.

Checks are protected once written: the implementer must not edit them to get green. If a check is wrong, the run stops and reports.

## Step 5: Spec review (the one human gate)

Present to the user, concisely:
1. The requirements table with component, kind, and checks (and which are MANUAL or advisory), including each visual check's route, state, viewport, and reference.
2. The slice plan and merge order.
3. Contracts changed and human checkpoints.
4. The result of running the checks now (all failing, and why), plus any check marked "fail-before not confirmed".
5. Any weak spots: requirements with thin coverage, risky areas.

Ask the user to review the **checks**, not only the spec. Apply their changes and re-run the failing-check confirmation. Do not print the `/goal` line until the user approves. On approval, create `specs/<feature>/.locked` (empty file); the harness hook then freezes `SPEC.md` and `checks/` for the run.

## Step 6: Print the /goal line

Fill `harness/goal-template.md` with this feature's values: spec path, number of slices, the slice-to-component routing, the real test/lint/typecheck/e2e commands, default branch, protected branches, size target, and any feature-specific checkpoints. Print it in one code block, ready to paste after `/goal `.

Then tell the user, in two or three lines: paste it to start; the run will stop and report on the conditions listed; the final report will follow `harness/report-template.md`; PRs are opened as a stack and never merged by the agent.

## After the run

When the user comes back with a bad or surprising result, ask what rule, check, or spec-template change would have prevented it, and append it to `harness/failure-log.md` and the right rule file or mechanical check. Keep the harness improving.
