# Config repository with an explicit distributable boundary

## Status

Accepted. This decision supersedes the earlier template-positioning description in this ADR and defines the current repository model.

## Decision

This repository is the configuration and distribution repository for `mattpocock/skills`.

The workspace is the complete maintenance source: it contains the upstream skill copies plus all proprietary skills maintained by this repository. The proprietary set is explicitly divided into:

- 5 distributable skills: `tdd-implement`, `diagnose-fix`, `grill-to-spec`, `scaffold-functional-test`, and `show-me`;
- 2 repo-local skills: `ci-guard` and `commit-check`.

The Template Snapshot is a distribution projection of the workspace's project configuration and skeleton. It does not contain shared Skills. A Target Repository initializes by copying the skeleton and then having the CLI assemble the selected distributable Skills directly from the canonical Workspace source; it does not need a separate manual upstream fetch.

`list`, `install`, `init`, and `sync` operate on the canonical Skill source and the distribution boundary for user-facing paths. Repo-local Skills remain available in the Workspace for maintaining matt-skills itself. Existing repo-local copies in a Target Repository are preserved and may receive a migration notice; this boundary does not authorize destructive cleanup.

## Trade-offs

The Workspace and Template Snapshot intentionally have different responsibilities: the Workspace remains the complete maintenance source, while the Template Snapshot remains a skeleton and the CLI performs Skill assembly. The explicit classification adds a small configuration and testing surface, but prevents repo-specific Skills and commands from leaking into user projects.

## Verification

The classification invariant tests, CLI distribution-boundary fixtures, canonical Skill contract tests and Template Snapshot structure tests guard this decision. The CLI is the Skill assembly path; the Template Snapshot generator must not create a persistent shared Skill mirror.
