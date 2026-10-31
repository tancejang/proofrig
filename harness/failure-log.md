# Failure log

Append one entry per bad or surprising run. Each entry must end in a harness change.

## 2026-10-29 harness bootstrap (e2e found init bugs)
- What went wrong: init wrote `harness/` before the e2e gate; init wrote `.claude/settings.json` mid-generation and its hooks locked init out; no human unlock for update mode.
- How it was found (check, verifier, human review): `node e2e/run.mjs` (with-e2e, no-e2e).
- Root cause: skill text ordered writes wrongly and had no unlock path.
- Harness change made: SKILL.md fixes (PR #1); e2e asserts no `harness/` on a stopped init and the `PROOFRIG_UNLOCK=1` path.

## 2026-10-31 unlock env var blocked the human, not just agents
- What went wrong: every harness change needed a session restart with `PROOFRIG_UNLOCK=1`; a resumed session lost it mid-feature, and B1 (all protected paths) could not proceed.
- How it was found (check, verifier, human review): human review (user friction).
- Root cause: the guard could not tell the human-driven main session from an agent, so it gated both on the environment.
- Harness change made: removed `PROOFRIG_UNLOCK` from this repo's guard; protected paths are scoped by agent (main session and owning implementer only), and REV-9 plus a goal-template stop condition detect grading-file edits. Generated harnesses follow in the zero-restart-harness feature.

## 2026-10-31 guard blocked reads with `2>&1` and `*-harness/` paths, and missed `.claude/` writes
- What went wrong: for subagents the shell-write regex matched any `>` before a protected path, so reads like `ls 2>&1; cat harness/CLAUDE.md` and a `gh pr create` body containing `->` were blocked; it treated `specs/zero-restart-harness/` as protected and blocked a plugin `sed -i`; and `echo x > .claude/x`, `cp`, and `sed -i` into `.claude/` were allowed.
- How it was found (check, verifier, human review): the user and verifiers hit the blocks during Feature A and zero-restart-harness; the test-enforcement-reliability R1/R2 probes confirmed both directions. Fixing it took four verifier rounds: each narrow exemption (segment splitting, quote masking, dash glue) opened a bash form the old rule blocked.
- Root cause: an unanchored `>` followed by `\b(harness|\.claude|e2e)/`; `\b` matches between `-` and `h` and never between a space and `.`.
- Harness change made: the guard keeps the old broad rule and masks only the R1 exemptions first; golden tests cover each still-blocked nearest write form; R14 is a fixed 37-form probe list plus a documented residual list (test-enforcement-reliability slice 1, PR #13).

## 2026-10-29 guard fails open on bad stdin
- What went wrong: on empty, invalid-JSON, or `null` stdin, `guard.mjs` threw, node exited 1, and Claude Code treats exit 1 as non-blocking, so the tool call ran unchecked.
- How it was found (check, verifier, human review): reading `guard.mjs` while writing the test-enforcement-reliability checks.
- Root cause: `JSON.parse` of stdin with no validation or catch.
- Harness change made: the guard exits 2 with a `proofrig guard:` message on unparsable input; a golden test feeds raw empty stdin; `harness/CLAUDE.md` Enforcement documents it (R3/R5).

## 2026-10-28 stacked PR #6 merged into its base branch instead of main
- What went wrong: PR #6 was merged while still targeting the previous slice's branch (`docs-reliability-ship-skill`), so its change never reached `main`; it was re-landed as #9.
- How it was found (check, verifier, human review): human review (`main` lacked the change after the merge).
- Root cause: GitHub retargets a stacked PR to `main` only when its base branch is deleted; the base was kept, and nothing said to retarget.
- Harness change made: `harness/goal-template.md` tells the run and the human to retarget each slice PR to `main` before merging (or enable "Automatically delete head branches").
