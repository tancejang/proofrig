# components/plugin.md (skills, references, manifests)

- **PLUGIN-1** Skill instructions are specific and testable: an ordered step, a file path, a command, or a condition, never "be careful". *Reason: vague prose is not enforceable.*
- **PLUGIN-2** Anything that must never happen in a generated harness goes into a hook or permission the skill tells init to write, not only into prose. *Reason: proofrig's own principle.*
- **PLUGIN-3** Keep skills short; move long templates to `references/`. *Reason: skill bodies load into every run.*
- **PLUGIN-4** `claude plugin validate --strict .` and `claude plugin validate --strict plugins/proofrig` must pass after every change. *Reason: a broken manifest silently drops the plugin; without --strict a skill with no frontmatter only warns.*
