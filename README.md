# proofrig

Harness engineering for Claude Code. Build a verification harness once per system, then ship features through it reliably and unattended with `/goal`.

**Proof** means done is evidence, not assertion. **Rig** is the harness around the model: rules, hooks, per-component implementers, independent verifiers, runnable checks, and stacked PRs.

## Install

```bash
claude plugin marketplace add tancejang/proofrig
claude plugin install proofrig@proofrig
```

For a local checkout, use `claude plugin marketplace add ./proofrig` instead.

## Use

1. **`/proofrig:init`** (once per system, and again in update mode when the system changes).
   Scans your repos, proposes a complete default harness design (preset, roles, check kinds, autonomy, models, delivery), and asks only about what you want to change or what it could not infer. Then it generates the rules, hooks, subagents, e2e and visual checks, and a `/goal` template, and proves them with a dry run. If no reliable e2e check exists, it stops and reports the gap instead of scaffolding a harness that verifies nothing.

2. **`/proofrig:ship`** (every feature).
   Grills you on the feature (uses the `grill-me` skill if installed), sizes it, writes `SPEC.md` with a runnable check per requirement and a stacked-PR slice plan, confirms every check fails before the work exists, and prints the ready-to-paste `/goal` line. You review the spec and the checks, which is the one human gate.

3. **`/goal <pasted line>`** runs Plan, Build, Simplify, Verify, Fix loop, Stacked PRs, Report. It stops and reports instead of guessing on repeated failure, spec ambiguity, or a human checkpoint. PRs are opened, never merged.

## Flow

```
/proofrig:init   (once)      scan -> design (defaults first) -> system interview -> e2e gate
                             -> generate -> enforce -> dry run -> report
/proofrig:ship   (feature)   grill -> size check -> SPEC.md + checks -> review -> /goal line
/goal            (run)       plan -> build -> simplify -> verify -> fix loop -> stacked PRs -> report
```

## Repo layout

```
.claude-plugin/marketplace.json
plugins/proofrig/
  .claude-plugin/plugin.json
  skills/
    init/   SKILL.md, references/{base-rules.md, templates.md}
    ship/   SKILL.md
```

## Notes

- Skills are namespaced by the plugin name, so the commands are `/proofrig:init` and `/proofrig:ship`.
- Add a LICENSE before sharing widely (none is included yet).
- The generated hooks (stop checks, protected paths, component path scoping, `.locked` freezing) are described in the skills, not shipped as code. The dry run in `/proofrig:init` tests them; adjust hook syntax for your Claude Code version.
- Models per role are set per agent file (`model:`). A routed model (for example through a gateway) needs the router's exact model ID, and the dry run includes a per-role smoke test.
- Validate after edits: `claude plugin validate ./proofrig`.
