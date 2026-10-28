# simplify.md

Runs after build, before verify. Goal: smaller and clearer without changing behavior.

- **SIMPL-0** Green before, green after. Run the full checks before simplifying and again after. If a check breaks, revert that change. *Reason: simplify must not change behavior.*
- **SIMPL-1** Scope is this feature's diff only. Do not refactor untouched code. *Reason: keeps the PR reviewable.*
- **SIMPL-2** No abstraction with a single caller unless the architecture requires it. *Reason: indirection without payoff.*
- **SIMPL-3** Prefer the existing helper or pattern over a new one. *Reason: one way to do each thing.*
- **SIMPL-4** Remove dead code, unused parameters, flags, and config. **[mech: unused-code check]** *Reason: leftovers accumulate.*
- **SIMPL-5** Flatten nesting and use early returns where it improves readability. *Reason: shallow code is easier to verify.*
- **SIMPL-6** Maximum 2 rounds. Stop when a round produces no net deletion or clarity gain. *Reason: prevents churn.*
- **SIMPL-7** The net diff should not grow from simplification. If it did, explain why in the report. *Reason: growth means it was not simplifying.*
