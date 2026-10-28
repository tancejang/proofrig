# E2E

Command: `node e2e/run.mjs` (exit 0 = pass). Optional case filter: `with-e2e` or `no-e2e`.

What it proves: `/proofrig:init` runs for real (`claude -p`) against throwaway copies of `e2e/fixtures/`; the generated hooks are then fed sample tool calls and must block protected-path edits, frozen `.locked` specs, force-push, and a red Stop; `no-e2e` must stop at the gap report and leave no `harness/`.

Cost: two live model sessions, up to 10 minutes each, no retries. Requires `PROOFRIG_E2E_MODEL` set to the router's exact model ID (for example `cc/claude-opus-5-5`).

Not covered: real subagents, live component path scoping, `/proofrig:ship`.
