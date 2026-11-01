# Changelog

## 0.1.3 - 2026-11-01

- `/proofrig:init`: the generated harness works in the session that ran init, with no `PROOFRIG_UNLOCK` and no restart. The PreToolUse hook scopes protected paths by agent: the main session may edit `harness/` and `.claude/`; a subagent may edit only its component's paths and never writes protected paths by shell. Locked specs, `.git/`, bad hook input, and forbidden commands stay blocked for everyone. Update mode applies its changes in the same session. When init adds or changes agents, it pauses for one reply ("go") before the Phase 7 dry run, because new agents load on the next message.
- Base rules add REV-9 (the verifier flags any protected or grading file a slice changes that `SPEC.md` does not name), and the generated goal template's stop condition matches it.
- **Upgrading an existing harness:** its old guard still requires the unlock. Start one last session with `PROOFRIG_UNLOCK=1` and run `/proofrig:init` in update mode; after that, no unlock or restart is needed.
- This repo's own harness: a precise, fail-closed shell-write guard, strict `claude plugin validate` in the Stop hook, and CI on Ubuntu and Windows.

## 0.1.2 - 2026-10-29

- `/proofrig:ship`: checks for an existing `specs/<feature>/.locked` (stop) or unlocked `SPEC.md` (resume, do not overwrite) before grilling, asks before the fail-first run of a slow or costly check, writes specs to `specs/<feature>/SPEC.md`, and points to the Visual check spec as `../init/references/templates.md`.
- `/proofrig:init`: generated hooks run as `node "$CLAUDE_PROJECT_DIR/.claude/hooks/<name>.mjs"` with forward slashes, so they work under Git Bash on Windows and on POSIX. The PreToolUse hook fails closed (exit 2) on empty or unparsable input, and the dry run and golden tasks check that a read-only command on a protected path is allowed.
- `plugin.json`: adds `author`, `homepage`, and `repository`.
- README: adds Developing proofrig, Troubleshooting, an example `/goal` line, a fuller repo layout, and E2E prerequisites.

## 0.1.1 - 2026-10-29

- Adds a behavioral e2e suite (`e2e/run.mjs`) that runs `/proofrig:init` against fixtures and tests the generated hooks, and fixes `/proofrig:init` ordering bugs: nothing under `harness/` before the e2e gate passes, `.claude/settings.json` written last, and a `PROOFRIG_UNLOCK=1` path for update mode.
- Adds this repo's own proofrig harness (`harness/`, `.claude/`, `CLAUDE.md`).

## 0.1.0 - 2026-10-28

- First release: `/proofrig:init` builds a verification harness for a system; `/proofrig:ship` turns a feature into a spec, runnable checks, and a `/goal` line.
