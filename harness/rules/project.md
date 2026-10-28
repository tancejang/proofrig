# project.md

Overrides component and base rules on conflict.

- **PROJ-1** Every behavior change to a skill gets an e2e assertion (new or extended case in `e2e/run.mjs`, added via the spec as a human checkpoint). *Reason: skills are prose; only a live run proves behavior.*
- **PROJ-2** Node stdlib only. No `package.json`, no dependencies. *Reason: the plugin and its tests must run with nothing installed.*
- **PROJ-3** Hook commands and scripts must run on Windows (Git Bash) and POSIX. Use `node "<path>"` with forward slashes; no bash-only tools. *Reason: Claude Code runs hooks through Git Bash on Windows; the e2e found this.*
- **PROJ-4** Never write keys, tokens, or router URLs into committed files. Name env variables only. *Reason: public repo.*
- **PROJ-5** Keep `README.md`, `SKILL.md` files, and `references/` consistent: a skill must not reference a template, file, or flag that does not exist. *Reason: dangling references make the model improvise.*
- **PROJ-6** Commit subjects are imperative sentences; branches are kebab-case. *Reason: matches the existing history.*
