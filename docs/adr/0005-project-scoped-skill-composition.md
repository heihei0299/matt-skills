# Verify Skill composition in configured Target Repositories

## Status

Accepted on 2026-10-19. Implementation and real cross-harness execution verification remain pending.

## Decision

The Default Workflow's composition-execution guarantee covers Target Repositories configured through `init`/`sync`: required child Skills must be available, loaded, and followed, including conditionally required children. The child-Skill loading convention belongs in the supplied project-level execution policy; it should use the harness's native mechanism where available and explicitly load the child instructions when a named invocation tool is unavailable.

Standalone and global `install` guarantee correct Skill distribution, not composition execution independently of the host. They do not inject or change user-global execution rules. This scope does not relax ADR 0004: delivering a loading convention must not silently overwrite an existing project policy. Composition checks must include a Target Repository with pre-existing `AGENTS.md`, not just a newly generated policy fixture.

## Trade-off

Project-scoped policy provides one maintained loading convention without patching every upstream Skill or creating a generic adapter framework. Standalone installations remain dependent on the host's loading capabilities; discovery-only checks cannot be presented as evidence of successful composition.
