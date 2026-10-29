# components/harness.md (repo hooks, golden tests, harness docs, CI)

- **HARN-1** Every guard change has golden tests in `harness/golden-tasks/hooks.test.mjs` for both an allowed and a still-blocked case. *Reason: a guard fails in both directions: blocking work or opening a hole.*
- **HARN-2** Never widen what the guard allows without a still-blocked test for the nearest write form (for example, allowing `2>&1` needs a test that `2>&1 > harness/x` still blocks). *Reason: the implementer edits the guard that constrains it.*
- **HARN-3** Re-run `node harness/golden-tasks/hooks.test.mjs` after any hook change, and drive hook probes from node `spawnSync`, never `'...' | node hook.mjs` (PowerShell 5.1 garbles piped stdin). *Reason: hooks take effect on the next tool call.*
