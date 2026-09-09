# Config repository with an explicit distributable boundary

## Status

Accepted. This decision supersedes the earlier template-positioning description in this ADR and defines the current repository model.

## Decision

This repository is the configuration and distribution repository for `mattpocock/skills`.

The workspace is the complete maintenance source: it contains the upstream skill copies plus all proprietary skills maintained by this repository. The proprietary set is explicitly divided into:

- 5 distributable skills: `tdd-implement`, `diagnose-fix`, `grill-to-spec`, `scaffold-functional-test`, and `show-me`;
- 2 repo-local skills: `ci-guard` and `commit-check`.

The Template Snapshot is a distribution projection of the workspace. It contains project configuration, all distributable shared skills, distributable commands and prompts, and no repo-local skill or command. A Target Repository initializes by copying this snapshot and does not need a separate manual upstream fetch.

`list`, `install`, `init`, and `sync` operate on the distributable projection for user-facing paths. Repo-local skills remain available in the workspace for maintaining matt-skills itself. Existing repo-local copies in a Target Repository are preserved and may receive a migration notice; this boundary does not authorize destructive cleanup.

## Trade-offs

The workspace and Template Snapshot no longer have identical skill listings. This is intentional: the workspace remains complete for maintenance, while the template is safe to distribute. The explicit classification adds a small configuration and testing surface, but prevents repo-specific skills and commands from leaking into user projects.

## Verification

The classification invariant tests, CLI distribution-boundary fixtures, template mirror tests, and documentation contract tests guard this decision. The template generator is the single projection path and must keep distributable and repo-local contents separate.
