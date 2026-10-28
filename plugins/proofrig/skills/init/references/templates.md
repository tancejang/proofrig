# Templates

Fill the `<placeholders>` with this system's real values during Phase 5 (Generate). Remove any section that does not apply rather than leaving it blank.

---

## Root CLAUDE.md

```markdown
# <System name>

<One paragraph: what the system does and who uses it.>

## Repos
| Repo | Role | Stack | Path |
|------|------|-------|------|
| <name> | <API / web / worker / shared> | <stack> | <path> |

## How repos connect
<Contracts: APIs, events, schemas, shared packages. For each: owner repo, where it is defined, how consumers are updated.>

## Commands (system level)
- Bring up system / slice: `<command>`
- Seed data: `<command>`
- Run e2e: `<command>` (exit 0 = pass)
- Tear down: `<command>`

## Harness
Rules, goal template, and verifier live in `harness/`. Read `harness/CLAUDE.md` before starting a feature goal.

## Non-goals
<What agents must never do in this system.>

## Known weaknesses
<Flaky tests, missing seed data, unverified areas. Remove when fixed.>
```

## Per-repo CLAUDE.md

```markdown
# <Repo name>

## Commands
- Build: `<command>`
- Test: `<command>`
- Lint: `<command>`
- Typecheck: `<command>`
- Run locally: `<command>`

## Conventions
<Layering, naming, folder structure, test style. 5 to 10 lines.>

## Gotchas
<Things that waste time or break silently.>
```

---

## harness/CLAUDE.md

```markdown
# Harness guide

Flow: Spec -> Plan -> Build -> Simplify -> Verify -> Fix loop -> Stacked PRs -> Report

## Roles and rules
- Planner: rules/base.md + rules/planner.md + rules/project.md
- Implementer (one per component, see components.md): rules/base.md + rules/implementer.md + rules/components/<type>.md + rules/project.md
- Simplifier: rules/base.md + rules/simplify.md + rules/project.md
- Verifier (read-only): rules/base.md + rules/reviewer.md + rules/project.md

## Enforcement
<List each hook and permission rule and what it does.>

## Limits
- Max fix rounds per failure: <3>
- Overall cap: <turns/time>
- Stuck = same failure 3 times -> stop and report
- Human checkpoints (stop and report): <migrations, destructive ops, spec ambiguity, unexpected contract change, need to touch protected path or existing check>

## Known weaknesses
<Copy from root CLAUDE.md.>
```

---

## Presets

Starting points for the Phase 2 design table. The user edits rows from there.

| Row | Lean | Standard (default) | Strict |
|-----|------|--------------------|--------|
| Pipeline | plan, build, verify | spec, plan, build, simplify, verify, fix loop, stacked PRs, report | standard plus red-team pass and security review |
| Roles | orchestrator plans; single implementer; one verifier | planner; implementer per component; one verifier (+ visual verifier if UI) | standard, with the verifier on a different model family than the implementer |
| Verification | tests and e2e | check kinds per component; everything blocks except subjective visual review | standard, and rubric review also blocks |
| Autonomy | Hands-off | Balanced | Cautious (pause after each slice) |
| Delivery | single PR | stacked PRs, about 400 lines per slice | stacked PRs, about 250 lines per slice |
| Rules | core rules only | all base rules | all base rules plus mechanical enforcement for every rule that can be |
| Feedback | log bad runs | log bad runs, re-run golden tasks after any harness change | same, plus golden tasks on a schedule |

---

## harness/harness.config.md

```markdown
# Harness config

Preset: <Lean | Standard | Strict>. Chosen because: <reason from the scan>.

| Row | Decision | Why |
|-----|----------|-----|
| Pipeline | <stages and gates> | <reason> |
| Roles | <planner, implementers per component, verifiers> | <reason> |
| Verification | <check kinds per component, what blocks> | <reason> |
| Autonomy | <Cautious | Balanced | Hands-off> | <reason> |
| Models | see models.md | <reason> |
| Delivery | <stacked PRs, tool, size target, merge order> | <reason> |
| Rules | <kept and dropped base rules> | <reason> |
| Feedback | <failure-log and golden-task cadence> | <reason> |

Non-negotiables disabled by the user (each is also listed under known weaknesses): <none | list>.
Free-text notes for hand-editing: <anything outside the fixed rows>.
```

---

## harness/components.md

```markdown
# Components

| Component | Type | Repo / paths owned | Stack | Build / test / lint commands | Check kinds | Implementer agent | Model |
|-----------|------|--------------------|-------|------------------------------|-------------|-------------------|-------|
| <name> | backend / frontend / mobile / worker / data / infra / shared / docs | <paths> | <stack> | <commands> | <kinds from the check-kind table> | implementer-<name> | <id> |

Routing: a slice belongs to exactly one component. The orchestrator hands it to that component's implementer. A slice that needs edits in two components is split into two slices (contract or provider first).
```

---

## .claude/agents/ (pattern)

```markdown
---
name: <planner | implementer-<component> | simplifier | verifier | verifier-visual>
description: <When to use this agent.>
tools: <least privilege; verifier gets read and run-checks only, no Edit/Write>
model: <from harness/models.md; router model ID string if routed>
---

Follow these rule files, in order of precedence (project overrides component, component overrides base):
- harness/rules/project.md
- harness/rules/components/<type>.md   (implementers only)
- harness/rules/<role>.md
- harness/rules/base.md

<One short paragraph of role-specific instruction. Implementer: you may edit only <component paths>. Verifier: you did not write this code; assume it is wrong; output a verdict per requirement and cite rule IDs.>
```

---

## harness/models.md

```markdown
# Models

Router: <none | name>. Base URL env: <ANTHROPIC_BASE_URL>. Auth env: <variable name only, never the key>.

| Role | Model (exact ID) | Fallback (Anthropic) | Why | Smoke test |
|------|------------------|----------------------|-----|------------|
| Orchestrator (/goal session) | <id> | <id> | <reason> | pass / fail <date> |
| Planner | <id> | <id> | <reason> | pass / fail <date> |
| Implementer (one row per component) | <id> | <id> | <reason> | pass / fail <date> |
| Simplifier | <id> | <id> | <reason> | pass / fail <date> |
| Verifier | <id> | <id> | <reason> | pass / fail <date> |
| Visual verifier (if UI) | <id> | <id> | <reason> | pass / fail <date> |

Notes: <known quirks, for example tool-call issues, unsupported parameters>. Re-run the model smoke test (/proofrig:init dry run, model smoke test) after changing any row.
```

---

## harness/goal-template.md

`/proofrig:ship` fills this in per feature and prints it as the `/goal` line.

```text
Implement <feature> per specs/<feature>/SPEC.md. Follow harness/CLAUDE.md.

Work as a stack of <N> slices (see SPEC.md "Slices"). For each slice, in order:
1. Plan (planner agent), build with the implementer for the slice's component (see harness/components.md and the SPEC.md slice table), then simplify (simplifier agent, max 2 rounds).
2. Run: <test cmd>, <lint cmd>, <typecheck cmd>, <feature checks in specs/<feature>/checks/>, including screenshot checks for UI slices. Re-run all after simplify.
3. Commit on the slice branch (based on the previous slice's branch).
4. Run the verifier agent (and the visual verifier for UI slices) on the slice; it re-runs the checks and captures its own screenshots. Fix and re-verify until it reports no violations.

Done when ALL are true, with command output shown as evidence:
- Every check listed in SPEC.md passes, including after the simplify pass.
- <e2e command> exits 0.
- Lint, typecheck, and mechanical checks are clean.
- The verifier agent reports no unaddressed spec or rule violations for every slice.
- Each slice is on its own branch with its own PR (base = previous slice's branch, first slice = <default branch>); each slice is green on its own and within <400> changed lines.
- Manual-review items are listed in the final report.

Do not: touch protected paths, edit files outside the slice's component, weaken or delete existing checks, overwrite baselines or reference images, merge PRs, push to <protected branches>.
Stop and report (do not guess) when: same failure 3 times, spec ambiguity, a contract change not in the spec, a migration or destructive operation, or any need to modify a protected path or existing check.
Final report: use harness/report-template.md.
```

---

## harness/report-template.md

```markdown
# Report: <feature>

## Result
<One line: all criteria met / partially met / blocked, and why.>

## Criteria
| Requirement | Check | Result | Evidence |
|-------------|-------|--------|----------|
| R1 | <check> | pass / fail / manual-review | <command output summary or link> |

## Stack
| # | Branch | PR | Covers | Lines changed | Green on its own |
|---|--------|----|--------|---------------|------------------|
| 1/N | <branch> | <link> | R1, R2 | <n> | yes / no |

Merge order: <slice order; for multi-repo, contract PRs first>.

## Diff summary
<What changed, per repo, in a few lines.>

## Deviations from spec
<Anything done differently and why. "None" if none.>

## Manual-review items
<Requirements without automated checks, with what the reviewer should look at. Include every new or changed screenshot baseline, with the image paths, for the human to approve.>

## Open risks and questions
<Unresolved ambiguities, flaky checks seen, weak coverage, assumptions.>

## Harness feedback
<What rule or check would have prevented any problem seen in this run.>
```

---

## harness/failure-log.md

```markdown
# Failure log

Append one entry per bad or surprising run. Each entry must end in a harness change.

## <date> <feature>
- What went wrong:
- How it was found (check, verifier, human review):
- Root cause:
- Harness change made (new rule ID / new mechanical check / hook / spec-template change):
```

---

## harness/golden-tasks/ (pattern)

```markdown
# Golden task: <name>

Type: trivial | deliberately-broken
Change to apply: <exact small change, or patch file>
Expected harness behavior:
- trivial: all checks pass, verifier reports no violations
- deliberately-broken: <which check or verifier rule must catch it>

Re-run after any change to rules, hooks, agents, or checks.
```

Include at least: one trivial change, one change that breaks a feature check, one that violates a prose rule (for example duplicated logic), one attempt to edit a protected path, one edit outside the implementer's component paths, and one attempt to weaken an existing test. For systems with a UI, also include one visual regression and one attempt to overwrite a baseline.

---

## Visual check spec (pattern)

`/proofrig:ship` writes one of these per UI requirement under `specs/<feature>/checks/visual/`. The capture script reads it; the visual verifier runs it.

```markdown
# Visual check: <id> (covers <requirement ID>)

Mode: baseline-diff | rubric-review
Route / screen: <url or screen>
State: <seed data set, logged-in user, feature flags, interaction steps to reach the state>
Viewports: <for example 1280x800, 375x812>
Determinism: animations disabled, fonts pinned, clock mocked to <time>, seed <name>
Reference: <approved baseline path | mockup path | none>
Tolerance: <for example up to 0.1% differing pixels, or ignore regions: [selectors]>
Rubric (rubric-review mode; each line must be checkable):
- <for example "table shows exactly 5 columns: A, B, C, D, E">
- <for example "empty state shows the text ...">
Blocks run: yes | advisory
New baseline? yes | no   (a new baseline is never auto-approved; it goes to the report as a manual-review item)
```

The harness provides the capture command (headless, deterministic) in `harness/visual/`; the check supplies the data above.
