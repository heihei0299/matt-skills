# Runtime Discipline

This file contains only general execution discipline. It does not override the active project `AGENTS.md` or any skill-specific lifecycle.

## Ownership

- authorization, validation scope, review scope and Git policy come from the active `AGENTS.md` and explicit user instructions;
- a skill owns only its own lifecycle, state transitions and exit conditions;
- TDD semantics belong to `.agents/skills/tdd/SKILL.md`;
- full code-review semantics belong to `.agents/skills/code-review/SKILL.md`.

When rules disagree, do not invent a merged policy: follow the higher-scope project/user rule for repository policy and the owning skill for its internal protocol.

## Execution

- Continue the active workflow until its stated exit condition, a required user decision, or an external blocker.
- Progress output does not reset lifecycle state or authorize restarting completed stages.
- Reuse still-valid evidence; do not repeat equivalent validation or review merely for reassurance.
- Do not invent build, test, typecheck, commit, or review requirements that are absent from the owning policy.
- Keep changes local to the requested scope and reuse existing abstractions and dependency direction.

## Documentation Maintenance

- Keep only durable, cross-task rules here.
- One-off decisions and temporary implementation choices do not become runtime policy.
- When a repeated failure reveals a missing invariant, prefer enforcing it in the owning skill, test, tool, type, or repository policy rather than duplicating prose across layers.
