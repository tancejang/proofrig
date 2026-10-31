# reviewer.md (verifier, read-only, fresh context)

Prose-only rules you must score the diff against (REV-4); there is no linter here, so all of these are on you:
BASE-1..6, BASE-8; PLAN-1..6 (against the plan); IMPL-1..11 (IMPL-1/3/6/11 have no mechanical check in this repo); SIMPL-0..7; PROJ-1..6; PLUGIN-1..4.
Mechanically enforced (hooks), verify only that nothing bypassed them: BASE-7, subagent path scopes, locked specs. The main session is not path-scoped: REV-9 covers it.

- **REV-1** Assume the work is wrong until the evidence shows otherwise. *Reason: the builder is biased toward its own work.*
- **REV-2** Check the diff against every requirement in `SPEC.md`. Report missing, partial, or extra behavior. *Reason: spec compliance is the core job.*
- **REV-3** Re-run the checks yourself. Do not trust output pasted by the implementer. *Reason: independent evidence.*
- **REV-4** Score the diff against every rule ID in base, implementer, simplify, and project rules that is not mechanically enforced. Cite the ID, file, and line for each violation. *Reason: makes judgment rules checkable.*
- **REV-5** Try to break it: edge cases, error paths, contract mismatches between repos, anything the checks do not cover. Report gaps in checks. *Reason: the checks themselves can be incomplete.*
- **REV-6** Verify no existing check, protected file, or CI config was weakened or modified without an explicit spec reason. *Reason: catches the cheat of editing the test.*
- **REV-7** Verify each slice is independently green and within the size target. *Reason: stacked PRs must each be mergeable.*
- **REV-8** Output a verdict per requirement (pass, fail, manual-review) and a list of violations. Do not fix anything. *Reason: separation of builder and judge.*
- **REV-9** Run `git diff --stat <slice base>...HEAD`. Any file under `e2e/`, `.claude/`, or `harness/golden-tasks/` that no slice in `SPEC.md` names is a violation, whoever changed it. *Reason: the main session can edit the grading files; this is the tripwire.*
