# Maintainability and low-coupling decisions

Policy confirmed on 2026-10-19 through the grill-with-docs session; fixes implemented on 2026-10-20. Runtime verification is distinct from the implemented loading contract; see the evidence and limitations below.

## Accepted direction

- Content ownership and proprietary/upstream conflicts follow [ADR 0004](../adr/0004-content-ownership.md); the glossary is in the root `CONTEXT.md`.
- Failed initialization must be safely retryable. `init` preserves existing `AGENTS.md` but still installs the selected Managed Skills, leaving Project-owned Content untouched; the marker alone is not evidence that Skill installation succeeded.
- The Default Workflow includes explicitly required child Skills, including conditional dependencies. Add `codebase-design` for the interface-design branch of `tdd`; keep the set explicit rather than introducing a generic dependency parser.
- Failed template generation must leave the previous Template Snapshot usable. A source-existence check alone does not establish successful generation.
- Default-workflow composition execution is guaranteed for Target Repositories configured through `init`/`sync`, as scoped in [ADR 0005](../adr/0005-project-scoped-skill-composition.md). Standalone/global `install` guarantees correct distribution and relies on host capabilities for composition; it does not modify user-global rules.
- Keep the existing module structure and add focused failure/contract checks; do not introduce a generic manager, transaction framework, or runtime adapter layer without a demonstrated need.

## Implemented changes and acceptance checks

| Concern | Change | Regression checks |
| --- | --- | --- |
| Project settings | Pi migration now belongs to `bin/commands/sync.js`, not Skill distribution. It removes exact legacy references, stages replacement before renaming, preserves permissions and unrelated fields, and reports malformed/ambiguous/symlink inputs without echoing their contents. | `test/cli-sync-default.test.js`: distribution has no settings side effect; normal migration, malformed inputs, symlinks, dry-run, permissions, and failed writes. |
| Proprietary ownership | `scripts/sync-upstream.js` rejects every upstream/proprietary name collision before applying changes, including conflicts outside the default bucket. | `test/sync-upstream-review-fixes.test.js`: comparison and forced apply both fail, temporary clones are removed, and unrelated local Skills remain unchanged. |
| Retryable initialization | `init` validates configuration before writing, fills missing skeleton files without replacing existing ones, and installs the selected Managed Skills even when `AGENTS.md` already exists. | `test/cli-config-loading.test.js` and `test/cli-init.test.js`: invalid configuration, interrupted template/Skill copies, existing policies, and project-owned documents/Skills. |
| Failure-safe snapshot build | The builder generates in a temporary sibling directory and restores the previous snapshot if replacement fails; if recovery itself fails, it retains and reports the recovery copy. | `test/build-template.test.js`: injected copy, replacement, and rollback failures. |
| Default dependency set | `config/default.json` explicitly includes `codebase-design`; no automatic dependency parser was introduced. | Default distribution, CLI-list, and initialization tests cover the expanded set. |
| Skill composition | The canonical `AGENTS.md` supplies native-loading/path-reading guidance. The existing Codex smoke initializes actual default parents and verifies markers held only in child instructions, under both new and preserved custom policies. | `test/codex-support.test.js`: discovery-only output cannot pass; fake CLI checks guard fixture construction and final-event handling. Real execution is recorded separately below. |

## Runtime verification and limitations

The loading-contract probe does not run a full design interview or write project files. This keeps its completion condition limited to instruction loading and avoids mistaking interview latency for compatibility evidence. Standalone/global installation still changes no user-global policy. Existing project policies remain byte-for-byte preserved, so the smoke includes this case rather than assuming the supplied policy always replaced it.

Verified on 2026-10-20 with Node.js 26.5.1:

- `npm test`: 253 tests, 252 passed, zero failed, one opt-in real-smoke test skipped by default.
- `npm run build:template`: passed; the committed snapshot matches a fresh build.
- `CODEX_E2E=1 npm run codex:smoke`: passed with `codex-cli 0.163.0` for both a new Target Repository and one with preserved custom `AGENTS.md`. All three child-instruction markers were required, not merely the discovery markers.

An earlier interview-style probe timed out after 180 seconds and was not counted as a pass; the bounded loading-contract probe above passed. Real Pi, OpenCode, and Claude execution and the minimum supported Node.js 18 runtime were not exercised. This evidence does not certify those environments as passing.

## Evidence at acceptance

Temporary fixtures reproduced unrelated Pi settings being erased, failed initialization becoming a skipped retry, a proprietary/upstream name collision entering the addition path, and template-copy failure leaving a partial snapshot. At acceptance, the existing targeted CLI, configuration, upstream-sync, and template checks passed, but did not establish that these gaps were fixed; real composition execution had not yet been verified.
