# Maintainability and low-coupling decisions

Confirmed on 2026-10-19 through the grill-with-docs session. The policy decisions are settled; implementation and real cross-harness verification are pending. This is not a completed-fix report.

## Accepted direction

- Content ownership and proprietary/upstream conflicts follow [ADR 0004](../adr/0004-content-ownership.md); the glossary is in the root `CONTEXT.md`.
- Failed initialization must be safely retryable. `init` preserves existing `AGENTS.md` but still installs the selected Managed Skills, leaving Project-owned Content untouched; the marker alone is not evidence that Skill installation succeeded.
- The Default Workflow includes explicitly required child Skills, including conditional dependencies. Add `codebase-design` for the interface-design branch of `tdd`; keep the set explicit rather than introducing a generic dependency parser.
- Failed template generation must leave the previous Template Snapshot usable. A source-existence check alone does not establish successful generation.
- Default-workflow composition execution is guaranteed for Target Repositories configured through `init`/`sync`, as scoped in [ADR 0005](../adr/0005-project-scoped-skill-composition.md). Standalone/global `install` guarantees correct distribution and relies on host capabilities for composition; it does not modify user-global rules.
- Keep the existing module structure and add focused failure/contract checks; do not introduce a generic manager, transaction framework, or runtime adapter layer without a demonstrated need.

## Minimal implementation order and acceptance checks

All items below are pending, not completed changes. Keep this order unless implementation evidence reveals a dependency.

1. **Preserve project settings.** Move legacy Pi-settings migration out of `bin/project/skills.js` into the existing sync orchestration path. Remove only precisely identified legacy references; check that unrelated JSON fields survive and malformed/ambiguous settings are reported without being reset.
2. **Protect proprietary ownership.** In `scripts/sync-upstream.js`, detect upstream/proprietary name collisions before writing. A collision must block the entire apply operation; a temporary upstream fixture must verify that the live local tree remains unchanged.
3. **Make initialization retryable.** In `bin/commands/init.js`, validate inputs before writing and stop treating existing `AGENTS.md` as completed Skill installation. Verify both a failed-then-retried initialization and installation into a repository with its own policy; preserve that policy and project-local Skills.
4. **Preserve the previous snapshot on build failure.** In `scripts/build-template.js`, generate in a temporary sibling directory before replacing `template/`, with recovery if replacement fails. Inject a copy failure and verify that the old snapshot remains usable and temporary artifacts are cleaned up.
5. **Complete the explicit default dependency set.** Add `codebase-design` to `config/default.json` and update directly affected distribution/documentation expectations. Verify that default initialization includes both `grill-with-docs` children and the conditional `tdd` child; do not introduce automatic dependency discovery.
6. **Verify composition, not just discovery.** Define the project-level loading convention in the canonical execution-policy source and extend composition smoke coverage for default parent/child loading. Include new and pre-existing-policy Target Repositories, preserve existing rules, and report unsupported or unverified execution honestly. Do not silently narrow coverage to a synthetic one-Skill discovery fixture.

No further product-policy question is open in this analysis. The last item still needs execution evidence during implementation; these documents do not certify any harness as passing it.

## Evidence at acceptance

Temporary fixtures reproduced unrelated Pi settings being erased, failed initialization becoming a skipped retry, a proprietary/upstream name collision entering the addition path, and template-copy failure leaving a partial snapshot. The existing targeted CLI, configuration, upstream-sync, and template checks passed; they do not establish that these gaps have been fixed. Real cross-harness composition execution remains unverified.
