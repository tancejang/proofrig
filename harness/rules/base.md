# base.md (applies to every role)

- **BASE-1** Done means evidence. Never claim a criterion is met without command output, a diff, or a file reference. *Reason: assertions are how runs fake success.*
- **BASE-2** Never weaken, skip, delete, or loosen an existing check to get green. If a check looks wrong, stop and report. *Reason: the checks are the definition of done.*
- **BASE-3** Stay inside the spec. Anything not required by `SPEC.md` is out of scope; note it in the report instead of doing it. *Reason: scope creep is unreviewable.*
- **BASE-4** On ambiguity or a missing requirement, stop and ask (or record it as an open question in the report if running unattended). Do not guess silently. *Reason: guessed requirements are invisible bugs.*
- **BASE-5** Same failure 3 times: stop and report the blocker with what was tried. Do not try variations indefinitely. *Reason: loops burn budget without converging.*
- **BASE-6** A flaky check is a bug. Report it; never retry until green. *Reason: retries hide real failures.*
- **BASE-7** Never touch protected paths, secrets, production resources, or the harness itself. *Reason: enforced by hooks, restated so it is not attempted.*
- **BASE-8** Update `PROGRESS.md` at each checkpoint: done, in progress, decisions, open issues. *Reason: survives context resets.*
