# matt-skills

Repository vocabulary for this project. This file defines domain terms only; execution policy belongs to the active `AGENTS.md`, and skill-specific behavior belongs to each live `SKILL.md` and its references.

## Repository

**Template Repository** (模板仓库):
This repository's identity. It is the config repo for mattpocock/skills: it distributes project-level config (AGENTS.md behavior routing, `.opencode/docs/agents/` discipline files, `.opencode/CONTEXT.md` glossary) and the explicitly allowed distributable Skills. The Workspace also retains repo-local maintenance Skills that are never distributed. The Template Snapshot projects the project skeleton; the CLI assembles selected distributable Skills from the Workspace when initializing or synchronizing a Target Repository. The Workspace copy also serves this repo's own sessions.
_Avoid_: skill distribution repo

**Upstream Repository** (上游仓库):
mattpocock/skills — the source of the upstream Skill bodies mirrored into this repo's Workspace canonical Skill source and then distributed by the CLI. This repo syncs them via `scripts/sync-upstream.js` and `matt-skills sync`.
_Avoid_: source repo, skill origin

**Proprietary Skill** (独有技能):
A Skill maintained as this repository's own rather than mirrored from the Upstream Repository; an upstream name collision does not transfer that ownership. The current proprietary set is classified in `config/proprietary.json` as distributable or repo-local; that config is the source of truth for membership. Repo-local skills serve matt-skills maintenance and are never distributed. Before adding a new proprietary skill, check the Upstream Repository first.
_Avoid_: private skill, local skill

**Workspace** (工作区):
The root-level canonical working area: `.agents/skills/` for shared Skills, `.opencode/` and `.pi/` for harness configuration, plus repository docs and configuration. Shared Skills are authored here. Harness-specific `.pi/skills/` and `.opencode/skills/` are reserved for project-local custom Skills rather than shared mirrors.
_Avoid_: working copy, source repo

**Template Snapshot** (模板快照):
Everything under `template/` that is generated or copied from Workspace sources for Target Repository initialization. `template/AGENTS.md` is a byte-for-byte copy of the Workspace root `AGENTS.md`, so execution policy has a single edit point: the Workspace file. Static skeleton wording lives in `config/template-src/`; the builder only maps sources to destinations. The snapshot owns project skeleton/configuration, while shared Skills are assembled separately by the CLI from the Workspace canonical source. Skeleton sync is one-way: Workspace → Template Snapshot.
_Avoid_: release snapshot, published snapshot

**Target Repository** (目标仓库):
A repository initialized from the Template Snapshot and selected distributable shared Skills. Its root `AGENTS.md` is the project-level execution policy. Shared Skills live in `.agents/skills/`; project-local custom Skills may live in harness-specific skill directories.
_Avoid_: inheriting repo, child repo

**Default Workflow** (默认工作流):
The curated distributable Skill set for a Target Repository, including its explicitly required child Skills even when their use is conditional. It is distinct from the Upstream Repository's engineering bucket.
_Avoid_: engineering skills, fixed nine-skill bundle

**Managed Skill** (受管技能):
A selected distributable shared Skill in a Target Repository whose canonical content belongs to the Template Repository. A project edit to that shared copy does not make it a project-local Skill.
_Avoid_: all installed skills, managed project

**Project-owned Content** (项目自有内容):
Project-local Skills and configuration outside explicitly managed content, owned by the Target Repository. Sharing a harness directory with Managed Skills does not transfer that ownership.
_Avoid_: extra files, disposable configuration

**Ownership Conflict** (归属冲突):
A name claimed both by a Proprietary Skill and by a Skill in the Upstream Repository. Matching names alone do not make them the same managed content.
_Avoid_: ordinary addition, automatic adoption

**Initialize** (初始化):
The setup of a Target Repository using the Template Snapshot skeleton and selected distributable Skills, including completion of an interrupted setup; repo-local Skills are excluded. Existing project execution policy remains project-owned and does not imply that Skill setup is complete.
_Avoid_: inherit, bootstrap

**Sync** (同步):
`matt-skills sync` updates Target Repository skeleton/configuration and selected distributable Skills according to CLI policy. Default sync preserves project customization where the CLI can identify it; `--all` applies the broader distributable scope. Repo-local Skills are never newly distributed by sync.
_Avoid_: update, force sync
