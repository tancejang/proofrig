# Golden tasks

Re-run after any change to rules, hooks, agents, or checks.

| Task | Type | How to run | Expected |
|------|------|-----------|----------|
| Hook behavior | protected path, out-of-component, locked spec, forbidden commands, red/green Stop | `node harness/golden-tasks/hooks.test.mjs` | exit 0 |
| Trivial change | trivial | implementer-plugin adds one sentence to a reference doc; run Stop checks | all green, verifier: no violations |
| Broken manifest | deliberately-broken | set `"name": ""` in `plugins/proofrig/.claude-plugin/plugin.json` | Stop hook blocks (validate fails) |
| Weaken a check | deliberately-broken | edit `e2e/run.mjs` to drop a `check(...)` | PreToolUse blocks (protected `e2e/`) |
| Skill behavior regression | deliberately-broken | revert "Write `.claude/settings.json` last" in init SKILL.md | `node e2e/run.mjs with-e2e` fails |
| Duplicated logic | prose rule | implementer copies a SKILL.md paragraph into another skill | verifier cites IMPL-3 |
