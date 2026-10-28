# Base rules

Copy into `harness/rules/` during Phase 5 (Generate). Edit freely: these are defaults, not law. Each rule has an ID (so the reviewer can cite it) and a reason. Keep each role list to roughly 15 rules or fewer. Project rules (`project.md`) override these on conflict.

Mark rules that can be enforced mechanically with **[mech]** and wire them into hooks or CI during Phase 6 (Enforce). Everything else is scored by the verifier.

## base.md (applies to every role)

- **BASE-1** Done means evidence. Never claim a criterion is met without command output, a diff, or a file reference. *Reason: assertions are how runs fake success.*
- **BASE-2** Never weaken, skip, delete, or loosen an existing check to get green. If a check looks wrong, stop and report. *Reason: the checks are the definition of done.*
- **BASE-3** Stay inside the spec. Anything not required by `SPEC.md` is out of scope; note it in the report instead of doing it. *Reason: scope creep is unreviewable.*
- **BASE-4** On ambiguity or a missing requirement, stop and ask (or record it as an open question in the report if running unattended). Do not guess silently. *Reason: guessed requirements are invisible bugs.*
- **BASE-5** Same failure 3 times: stop and report the blocker with what was tried. Do not try variations indefinitely. *Reason: loops burn budget without converging.*
- **BASE-6** A flaky check is a bug. Report it; never retry until green. *Reason: retries hide real failures.*
- **BASE-7** Never touch protected paths, secrets, production resources, or the harness itself. *Reason: enforced by hooks, restated so it is not attempted.*
- **BASE-8** Update `PROGRESS.md` at each checkpoint: done, in progress, decisions, open issues. *Reason: survives context resets.*

## planner.md

- **PLAN-1** Every plan item maps to at least one requirement ID and at least one check. No item without a check. *Reason: unverifiable work cannot be accepted.*
- **PLAN-2** List the files to create or change, and the existing code to reuse, before proposing anything new. *Reason: prevents duplicate implementations.*
- **PLAN-3** Break the work into slices that are each independently green and reviewable (see stacked PRs). Contracts first, then core logic, then consumers, then wiring. *Reason: small PRs get real review.*
- **PLAN-4** Flag every requirement that has no possible automated check and tag it manual-review. *Reason: it must appear in the final report, not vanish.*
- **PLAN-5** Call out risks: contract changes, migrations, cross-repo ordering, anything needing a human checkpoint. *Reason: these are the pause points.*
- **PLAN-6** If the feature is too large for one goal (more than about 6 slices or spans many unrelated areas), propose a split and stop. *Reason: big goals fail far more often.*

## implementer.md

- **IMPL-1** Follow the existing architecture and layering. Respect module boundaries and dependency direction. **[mech]** *Reason: structure erodes one shortcut at a time.*
- **IMPL-2** Reuse before writing. Search for an existing helper, type, or pattern first. *Reason: duplication is the most common AI-code defect.*
- **IMPL-3** No duplicated logic. If the same logic appears twice, extract it or reuse it. **[mech]** *Reason: duplicates drift apart.*
- **IMPL-4** No speculative abstraction: no interface, factory, option, or config that nothing uses today. *Reason: unused flexibility is pure cost.*
- **IMPL-5** Comments explain why, never what. No comments that restate the code, no commented-out code, no change-log comments. *Reason: noise hides the useful comments.*
- **IMPL-6** Small focused diffs. Do not reformat, rename, or refactor code unrelated to the slice. **[mech: diff-size warning]** *Reason: unrelated churn makes review impossible.*
- **IMPL-7** Functions stay small and single-purpose (guideline: under about 40 lines, shallow nesting). *Reason: readable, testable units.*
- **IMPL-8** Handle errors at the right layer with the project's existing error pattern. No swallowed exceptions, no blanket catch. *Reason: silent failures defeat verification.*
- **IMPL-9** Add or update tests for every changed behavior, following the existing test style. Tests assert behavior, not implementation details. *Reason: checks must catch regressions.*
- **IMPL-10** Commit at each green checkpoint with a message that references the requirement ID. *Reason: easy rollback and reviewable history.*
- **IMPL-11** Follow existing naming, formatting, and folder conventions. Run the formatter. **[mech]** *Reason: consistency over preference.*

## simplify.md

Runs after build, before verify. Goal: smaller and clearer without changing behavior.

- **SIMPL-0** Green before, green after. Run the full checks before simplifying and again after. If a check breaks, revert that change. *Reason: simplify must not change behavior.*
- **SIMPL-1** Scope is this feature's diff only. Do not refactor untouched code. *Reason: keeps the PR reviewable.*
- **SIMPL-2** No abstraction with a single caller unless the architecture requires it. *Reason: indirection without payoff.*
- **SIMPL-3** Prefer the existing helper or pattern over a new one. *Reason: one way to do each thing.*
- **SIMPL-4** Remove dead code, unused parameters, flags, and config. **[mech: unused-code check]** *Reason: leftovers accumulate.*
- **SIMPL-5** Flatten nesting and use early returns where it improves readability. *Reason: shallow code is easier to verify.*
- **SIMPL-6** Maximum 2 rounds. Stop when a round produces no net deletion or clarity gain. *Reason: prevents churn.*
- **SIMPL-7** The net diff should not grow from simplification. If it did, explain why in the report. *Reason: growth means it was not simplifying.*

## reviewer.md (verifier, read-only, fresh context)

- **REV-1** Assume the work is wrong until the evidence shows otherwise. *Reason: the builder is biased toward its own work.*
- **REV-2** Check the diff against every requirement in `SPEC.md`. Report missing, partial, or extra behavior. *Reason: spec compliance is the core job.*
- **REV-3** Re-run the checks yourself. Do not trust output pasted by the implementer. *Reason: independent evidence.*
- **REV-4** Score the diff against every rule ID in base, implementer, simplify, and project rules that is not mechanically enforced. Cite the ID, file, and line for each violation. *Reason: makes judgment rules checkable.*
- **REV-5** Try to break it: edge cases, error paths, contract mismatches between repos, anything the checks do not cover. Report gaps in checks. *Reason: the checks themselves can be incomplete.*
- **REV-6** Verify no existing check, protected file, or CI config was weakened or modified without an explicit spec reason. *Reason: catches the cheat of editing the test.*
- **REV-7** Verify each slice is independently green and within the size target. *Reason: stacked PRs must each be mergeable.*
- **REV-8** Output a verdict per requirement (pass, fail, manual-review) and a list of violations. Do not fix anything. *Reason: separation of builder and judge.*

## project.md

Filled during the interview and scan. Examples of what belongs here:

- Layering and dependency direction specific to this system
- Naming, folder structure, and test style inferred from the code
- Contract rules (who changes an API, event, or schema first, and how consumers are migrated)
- Protected paths and forbidden operations
- Rules from the user's answer to "What do you always correct in AI-written code?"

Give each project rule an ID (`PROJ-1`, `PROJ-2`, ...) and a reason.
