# This repo is a config repo for mattpocock/skills, not a full skill template

Previously the repo positioned itself as a template repository that distributed a full set of engineering skills (24 skills mirrored into `template/`). We discovered that 22 of those 24 skills already exist upstream in mattpocock/skills (`skills/engineering` and `skills/productivity`), making local copies a duplicate-maintenance burden: upstream fixes never reached our copies, and our template diverged silently.

We decided the repo is a config repo for the upstream: `template/` ships only the project-level config (AGENTS.md behavior routing, docs/agents discipline files, CONTEXT.md glossary) plus the two proprietary skills that do not exist upstream (tdd-implement and grill-to-spec). Target repos initialize by copying `template/` and then fetching the 22 upstream skills manually per the README; the workspace `.agents/skills/` keeps all 24 copies for this repo's own sessions.

Trade-offs: losing offline skill copies and adding a manual fetch step to initialization (documented as a copy-paste block); gaining a single source of truth for skill bodies upstream and focused ownership of only what this repo actually adds. Guarded by `test/template-sync.test.js` (proprietary skills mirror + upstream skills must not be copied in) and CONTEXT.md glossary terms (Upstream Repository, Proprietary Skill).
