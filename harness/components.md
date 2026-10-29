# Components

| Component | Type | Repo / paths owned | Stack | Build / test / lint commands | Check kinds | Implementer agent | Model |
|-----------|------|--------------------|-------|------------------------------|-------------|-------------------|-------|
| plugin | plugin (skills as prose) | `plugins/`, `.claude-plugin/`, `README.md` | Markdown skills, JSON manifests | Validate: `claude plugin validate .` · E2E: `node e2e/run.mjs` · no build, lint, or typecheck | Manifest validation, live e2e (init run against fixtures + generated-hook assertions), verifier review of prose rules | implementer-plugin | cc/claude-opus-5-5 |
| harness | repo harness (Node stdlib scripts, Markdown rules, CI) | `.claude/hooks/`, `harness/`, `.github/`, `.gitignore`, `CLAUDE.md`. Not `.claude/settings.json`, `.claude/agents/`, `e2e/` | Node stdlib `.mjs`, Markdown, GitHub Actions YAML | Test: `node harness/golden-tasks/hooks.test.mjs` · Syntax: `node --check` on changed `.mjs` · no build or lint | Hook golden tests, hook probes via `spawnSync`, verifier review (REV-6) of guard changes | implementer-harness | cc/claude-opus-5-5 |

Harness paths are protected: an implementer-harness slice runs only in a session started with `PROOFRIG_UNLOCK=1`.

`e2e/` is the existing check suite: protected, editable only with `PROOFRIG_UNLOCK=1` or by a spec that explicitly adds e2e cases (human checkpoint).

Routing: a slice belongs to exactly one component. The orchestrator hands it to that component's implementer. A slice that needs edits in two components is split into two slices (contract or provider first).
