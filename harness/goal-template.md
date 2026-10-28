# Goal template

`/proofrig:ship` fills this in per feature and prints it as the `/goal` line.

```text
Implement <feature> per specs/<feature>/SPEC.md. Follow harness/CLAUDE.md.

Work as a stack of <N> slices (see SPEC.md "Slices"). For each slice, in order:
1. Plan (planner agent), build with implementer-plugin, then simplify (simplifier agent, max 2 rounds).
2. Run: `claude plugin validate .`, `node --check` on every changed .mjs, the feature checks in specs/<feature>/checks/. Re-run all after simplify.
3. Commit on the slice branch (based on the previous slice's branch).
4. Run the verifier agent on the slice; it re-runs the checks itself. Fix and re-verify until it reports no violations.

Done when ALL are true, with command output shown as evidence:
- Every check listed in SPEC.md passes, including after the simplify pass.
- `node e2e/run.mjs` exits 0 (PROOFRIG_E2E_MODEL=<router model id>).
- `claude plugin validate .` passes.
- The verifier agent reports no unaddressed spec or rule violations for every slice.
- Each slice is on its own branch with its own PR (`gh pr create --base <previous slice branch>`, first slice = main); each slice is green on its own and within 400 changed lines.
- Manual-review items are listed in the final report.

Do not: touch harness/, .claude/, e2e/ (protected), edit outside plugins/, .claude-plugin/, README.md, weaken or delete existing checks, merge PRs, push to main, force-push.
Stop and report (do not guess) when: same failure 3 times, spec ambiguity, a contract change not in the spec, or any need to modify a protected path or existing check.
Final report: use harness/report-template.md.
```
