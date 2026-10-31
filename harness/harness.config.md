# Harness config

Preset: Standard. Chosen because: small single-repo plugin (Markdown skills + JSON manifests), no payments/auth/migrations; the risk is behavioral (skills that generate enforcement), which the live e2e covers.

| Row | Decision | Why |
|-----|----------|-----|
| Pipeline | Spec, plan, build, simplify, verify, fix loop, stacked PRs, report. Human gates: spec + checks approval, any protected-path change | Default flow; the spec gate is where accuracy comes from |
| Roles | Planner, two implementers (`implementer-plugin`, `implementer-harness`), simplifier, read-only verifier. No visual verifier | Two components (plugin; harness added 2026-10-29 so harness work can run under /goal), no UI. No unlock step: the main session may edit protected paths; REV-9 detects grading-file edits (2026-10-31) |
| Verification | Stop hook: manifest validate + syntax checks (blocking). Done-criteria: `node e2e/run.mjs` (blocking). Verifier scores prose rules | Live e2e is ~20 min and costs model calls, too heavy for every Stop |
| Autonomy | Balanced | Default |
| Models | See models.md | Router only serves the Opus route reliably today |
| Delivery | Stacked PRs via `gh` with explicit `--base`, about 400 changed lines per slice, base `main`; agent never merges | Default |
| Rules | All base rules, plus project rules PROJ-1..6 | Default |
| Feedback | Log every bad run in failure-log.md; re-run `node harness/golden-tasks/hooks.test.mjs` after any harness change, and `node e2e/run.mjs` after any skill change | Default |

Non-negotiables disabled by the user: none.
Free-text notes for hand-editing: router env (`ANTHROPIC_BASE_URL`, `ANTHROPIC_AUTH_TOKEN`) stays in the user's shell, not in committed settings, because this is a public repo.
