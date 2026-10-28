# planner.md

- **PLAN-1** Every plan item maps to at least one requirement ID and at least one check. No item without a check. *Reason: unverifiable work cannot be accepted.*
- **PLAN-2** List the files to create or change, and the existing code to reuse, before proposing anything new. *Reason: prevents duplicate implementations.*
- **PLAN-3** Break the work into slices that are each independently green and reviewable (see stacked PRs). Contracts first, then core logic, then consumers, then wiring. *Reason: small PRs get real review.*
- **PLAN-4** Flag every requirement that has no possible automated check and tag it manual-review. *Reason: it must appear in the final report, not vanish.*
- **PLAN-5** Call out risks: contract changes, migrations, cross-repo ordering, anything needing a human checkpoint. *Reason: these are the pause points.*
- **PLAN-6** If the feature is too large for one goal (more than about 6 slices or spans many unrelated areas), propose a split and stop. *Reason: big goals fail far more often.*
