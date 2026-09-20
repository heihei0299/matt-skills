# Project Context

<!-- initialize-project:start -->
## 项目概览
### 项目用途
`@heihei0299/matt-skills` 是一个 Node.js CLI 与模板仓库，用于维护并分发 Agent skills、项目级执行规则和 pi / opencode 等 harness 配置。CLI 面向需要初始化或同步项目配置的 Target Repository，提供技能查询、安装、项目初始化、项目同步和上游差异检查；仓库自身的 `.agents/skills/` 是 Workspace 的 canonical source。

### 项目范围
仓库负责三类能力：维护共享及独有 skills；根据 `config/` 的分类和选择规则，把可分发 skills 与 `template/` 骨架组装到目标项目；维护 `mattpocock/skills` 上游镜像的检查与同步流程。`ci-guard`、`commit-check` 当前属于 repo-local skills，不通过项目初始化、安装或同步分发。业务项目本身的源代码、运行时服务和领域逻辑不属于本仓库范围。

### 主要入口
- 用户入口是 `package.json` 的 `bin.matt-skills`，实现位于 `bin/cli.js`；命令包括 `init`、`sync`、`list`、`install` 和 `check`。
- 技能选择与边界位于 `bin/skill-selection.js`、`bin/skill-boundaries.js`、`bin/skill-config.js`，分类事实位于 `config/engineering.json`、`config/required.json`、`config/proprietary.json`。
- 模板生成入口是 `scripts/build-template.js`；上游技能比较与应用入口是 `scripts/sync-upstream.js`；Codex 兼容性检查入口是 `scripts/codex-smoke.js`。
- 维护者先看 `README.md`、`CONTEXT.md`、本文件和 `AGENTS.md`；行为回归先看 `test/` 中对应的 `node:test` 文件。

### 架构边界
- `.agents/skills/` 是 Workspace 的 canonical skill source；`template/` 是由 Workspace 资料生成的 Target Repository skeleton，不是共享 skills 的持久镜像。
- `scripts/build-template.js` 将 `config/template-AGENTS.md`、`CONTEXT.md`、`.opencode/`、`.pi/` 和 `docs/agents/` 等源资料投影到 `template/`；共享 skills 由 CLI 从 `.agents/skills/` 按选择规则另行组装。
- CLI 只分发可分发 skills；`config/proprietary.json` 是独有 skill 的成员、distributable/repo-local 分类和默认集合的约束来源。默认范围由 engineering、required 和默认独有集合组成，`--all` 扩大到全部可分发集合。
- `scripts/sync-upstream.js` 只比较或更新本地非独有 skills 与上游 `mattpocock/skills`；默认覆盖 engineering 与 required 范围，`--all` 才包含 productivity 范围。上游同步不负责改写模板骨架。
- `AGENTS.md` 承载执行规则，`PROJECT.md` 承载项目事实，`CONTEXT.md` 承载术语边界；不要把三者职责合并。

### 仓库地图
- `bin/`：CLI 主流程、技能边界、技能配置加载和选择逻辑。
- `.agents/skills/`：Workspace canonical skills，包含可分发 skills 与仓库维护用的 repo-local skills。
- `config/`：技能分类、默认/必需集合，以及模板 `AGENTS.md` 的独立源。
- `template/`：生成后的目标项目骨架，包含 `AGENTS.md`、`PROJECT.md`、pi / opencode 配置和文档副本。
- `.opencode/`、`.pi/`：本仓库维护的 harness agents、commands、prompts 和设置源；`docs/` 保存 ADR、架构记录及 agent 资料。
- `scripts/`：模板构建、上游同步和 Codex smoke 流程；`test/`：CLI、边界、模板分发、技能行为和配置的回归测试。
- `.github/workflows/`：CI 验证、npm 发布和上游定时同步；`README.md` 是面向使用者的操作说明。

### 标准命令
- `npm test`：运行全部 `test/*.test.js`。
- `npm run build:template`：从 Workspace 源重建 `template/`；模板改动后应检查生成差异。
- `npm run codex:smoke`：运行 Codex 支持检查；设置 `CODEX_E2E=1` 时包含端到端检查。
- `node bin/cli.js list [--all]`、`init`、`sync`、`install`、`check`：直接运行本地 CLI；发布包用户可按 README 使用 `npx @heihei0299/matt-skills`。
- `node scripts/sync-upstream.js --check [--all]`：只读检查上游差异；需要实际更新时才使用 `--apply`。

### 测试规则
测试使用 Node.js 内置 `node:test`，文件位于 `test/`，命名为 `*.test.js`，标准入口是 `npm test`。CLI 和分发边界测试使用临时目标目录验证 init、sync、install、legacy 清理及 repo-local 保留行为；模板测试验证 Workspace 到 `template/` 的投影。修改模板源后必须运行 `npm run build:template`，并保留模板漂移检查的 `git diff` 证据；上游检查失败时保留比较输出或 `--json` 结果。

### 项目约束
运行时要求 Node.js `>=18`，仓库使用 ESM 和 npm `package-lock.json`；依赖变更应遵循现有 manifest/lockfile。不要把 repo-local skills 分发到 Target Repository，不要把共享 skills 再复制成 `.pi/skills/`、`.opencode/skills/` 或 `.claude/skills/` 的持久镜像。`template/` 与 `.agents/skills/` 必须保持构建/分发边界一致；发布由 `v*` tag 触发 CI，需先通过测试与模板漂移检查。许可证为 MIT。

### 完成标准
行为修改必须有对应的局部 `node:test` 覆盖，并通过相关测试；跨 CLI、配置或模板边界的改动还要运行 `npm test`。影响模板源时，必须运行 `npm run build:template` 并提交同步后的模板差异；影响 Codex 入口时运行 `npm run codex:smoke`（环境不可用时明确记录）。完成前检查 `git diff` 和 `git status`，只保留当前任务文件，不提交 secrets、临时文件或无关改动。
<!-- initialize-project:end -->
