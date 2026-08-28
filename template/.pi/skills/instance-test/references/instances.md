# Instances template

Generic template for **instance** functional tests. Each **instance** is a prompt + command + expected outcome. Copy and adapt for your project; the example below is for `matt-skills`.

## Format

Each instance declares:

- Prompt: human intent (what to verify)
- Command: shell command to run in isolated dir
- Expected: files/content, stdout phrases, exit code

Verification commands are in `SKILL.md` steps.

## Example: matt-skills functional behavior

### 1. Fresh init
Prompt: verify fresh project initialization
Command: `node bin/cli.js init --dest <tmp>`
Expected: `AGENTS.md`, `.opencode/skills/tdd-implement/SKILL.md`, `.pi/skills/tdd-implement/SKILL.md`, `.agents/skills/tdd` (22 upstream) exist; stdout `模板：已复制` + `上游技能：已装 22`; no `.bak`; exit 0.

### 2. Init skip on existing
Prompt: verify idempotent init without --force
Command: `init` twice without `--force`, second with local edit to `AGENTS.md`
Expected: second stdout `模板已存在.*跳过`, `上游技能：已装 0、跳过 22`; local edit preserved; exit 0.

### 3. Init --force with backup
Prompt: verify forced init backs up
Command: `init --force --dest <tmp>` after local edit
Expected: stdout `已备份` + `备份 22`; `AGENTS.md.bak` exists with local edit; `AGENTS.md` restored from template; `.agents/skills/tdd.bak` exists; exit 0.

### 4. Sync on existing
Prompt: verify sync backs up existing project
Command: `sync --dest <tmp>` after local edit
Expected: stdout `同步` + `已备份`; `AGENTS.md.bak` exists; exit 0.

### 5. Sync --force without backup
Prompt: verify sync --force does not backup
Command: `sync --force --dest <tmp>`
Expected: stdout `已覆盖` without new `.bak`; exit 0.

### 6. List
Prompt: verify skill listing
Command: `list` and `list --json`
Expected: 27 skills, includes `tdd` with correct description; `--json` is valid JSON array; exit 0.
