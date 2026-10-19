# Explicit content ownership takes precedence over matching names

## Status

Accepted on 2026-10-19; ownership protection and focused regression checks implemented on 2026-10-20. This supplements ADR 0002 without authorizing broader cleanup.

## Decision

Selected shared Skills are Managed Skills: their canonical content may replace the selected shared copies in a Target Repository. Project-owned Content, including project-local Skills and unrelated harness settings, retains its project ownership. Legacy configuration migration may remove precisely identified obsolete references, but must preserve unrelated fields; ambiguous or unreadable configuration must be reported rather than reset.

An upstream Skill with the same name as a Proprietary Skill is an Ownership Conflict, not an ordinary addition. An Ownership Conflict blocks the whole upstream synchronization before any write; automatic synchronization must not overwrite the local Skill or transfer its ownership. Resolving the conflict requires an explicit maintenance decision.

## Trade-off

We prefer preserving project data and surfacing ownership conflicts over silently adopting upstream names or replacing whole configuration files. This can require manual conflict resolution, but avoids making local ownership depend on future upstream naming choices. These rules belong at the existing distribution and synchronization seams, not in a new generic management layer.
