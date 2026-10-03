---
name: implement-review-loop
description: "Implement changes with one executor model and one independent reviewer model, iterating on only the changed surface until no actionable issues remain."
disable-model-invocation: true
---

Use two distinct roles:

- **Executor**: implements the requested change, fixes findings, and runs the smallest relevant verification.
- **Reviewer**: independently reviews the latest diff and relevant verification results. It does not perform the implementation.

Workflow:

```text
Executor implements
→ targeted verification
→ Reviewer reviews latest diff
→ if findings exist: Executor fixes only those findings
→ targeted re-verification
→ Reviewer re-reviews changed parts and unresolved findings
→ repeat until Reviewer reports no actionable issues
```

Rules:

- Keep implementation, testing, and review scoped to the current change and directly affected paths.
- Prefer targeted tests: changed test files, affected modules, regression cases, or the original reproduction path.
- Do not rerun equivalent checks after every small edit.
- Reviewer should inspect the latest diff first, then only enough surrounding code to validate behavior and integration.
- On subsequent rounds, review the new changes plus unresolved findings; do not restart a whole-project review.
- Expand test or review scope only when the change crosses modules, modifies shared/public contracts or core infrastructure, targeted evidence is insufficient, final release/merge validation requires it, or the user explicitly requests it.
- Findings must be concrete and actionable. Separate blockers from optional improvements.
- Stop the loop when the Reviewer has no actionable findings and targeted verification is green.
- Do not let the Reviewer silently become the Executor; preserve role independence throughout the loop.
