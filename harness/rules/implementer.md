# implementer.md

- **IMPL-1** Follow the existing architecture and layering. Respect module boundaries and dependency direction. **[mech]** *Reason: structure erodes one shortcut at a time.*
- **IMPL-2** Reuse before writing. Search for an existing helper, type, or pattern first. *Reason: duplication is the most common AI-code defect.*
- **IMPL-3** No duplicated logic. If the same logic appears twice, extract it or reuse it. **[mech]** *Reason: duplicates drift apart.*
- **IMPL-4** No speculative abstraction: no interface, factory, option, or config that nothing uses today. *Reason: unused flexibility is pure cost.*
- **IMPL-5** Comments explain why, never what. No comments that restate the code, no commented-out code, no change-log comments. *Reason: noise hides the useful comments.*
- **IMPL-6** Small focused diffs. Do not reformat, rename, or refactor code unrelated to the slice. **[mech: diff-size warning]** *Reason: unrelated churn makes review impossible.*
- **IMPL-7** Functions stay small and single-purpose (guideline: under about 40 lines, shallow nesting). *Reason: readable, testable units.*
- **IMPL-8** Handle errors at the right layer with the project's existing error pattern. No swallowed exceptions, no blanket catch. *Reason: silent failures defeat verification.*
- **IMPL-9** Add or update tests for every changed behavior, following the existing test style. Tests assert behavior, not implementation details. *Reason: checks must catch regressions.*
- **IMPL-10** Commit at each green checkpoint with a message that references the requirement ID. *Reason: easy rollback and reviewable history.*
- **IMPL-11** Follow existing naming, formatting, and folder conventions. Run the formatter. **[mech]** *Reason: consistency over preference.*
