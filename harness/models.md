# Models

Router: local gateway. Base URL env: `ANTHROPIC_BASE_URL` (set in the user's shell, `http://localhost:20128`). Auth env: `ANTHROPIC_AUTH_TOKEN` (name only; never written to any file).

| Role | Model (exact ID) | Fallback (Anthropic) | Why | Smoke test |
|------|------------------|----------------------|-----|------------|
| Orchestrator (/goal session) | cc/claude-opus-5-5 | claude-opus-5-5 | Strongest route available | see Phase 7 notes in harness/CLAUDE.md |
| Planner | cc/claude-opus-5-5 | claude-opus-5-5 | Strongest route available | |
| Implementer (plugin) | cc/claude-opus-5-5 | claude-opus-5-5 | Cheaper routes unavailable (Haiku route quota-exhausted 2026-10-28) | |
| Simplifier | cc/claude-opus-5-5 | claude-opus-5-5 | Same | |
| Verifier | cc/claude-opus-5-5 | claude-opus-5-5 | Same model as implementer: known weakness | |

Notes: subagent `model:` strings may not route as expected; confirm in the router log. Re-run the model smoke test after changing any row.
