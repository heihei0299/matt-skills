# matt-skills

为项目仓库提供 Agent Skills、配置模板和初始化 CLI。模板包含项目上下文入口，以及 pi / opencode 的基础配置。

## 环境要求

Node.js 18+ 和 npm。Git 用于 `sync`、`check` 与发布。

## 使用

在目标项目根目录运行：

~~~sh
npx @heihei0299/matt-skills init
npx @heihei0299/matt-skills init --all
~~~

新项目用 `init`；已有项目用 `sync`：

~~~sh
npx @heihei0299/matt-skills sync
npx @heihei0299/matt-skills sync --dry-run --json
~~~

`init` 会跳过已有的 `AGENTS.md`。`sync` 默认保留项目规则和自定义 Skills；`--all` 扩大同步范围，`--refresh-agents` 才会刷新 `AGENTS.md`。同步不会删除项目自有文件或 Skills。

常用命令：`list`、`install`、`init`、`sync`、`check`。使用 `--dest <dir>` 指定目标目录，`--global` 安装到用户目录，`--tools` 选择 Codex、pi、opencode 或 Claude。

## 模板与 Skills

- 共享 Skills 从 Workspace 的 canonical source 组装到项目的 `.agents/skills/`。
- 模板提供 `AGENTS.md`、`PROJECT.md` 以及 pi / opencode 配置骨架。
- 默认 workflow 包含 `initialize-project`、`setup-matt-pocock-skills`、`grill-with-docs`、`to-spec`、`to-tickets`、`grilling`、`domain-modeling`、`tdd` 和 `diagnosing-bugs`。

本仓库共维护 8 个独有 Skills，分为以下两类。默认独有 skills 是 `initialize-project`。

### 可分发的 6 个

`tdd-implement`、`diagnose-fix`、`grill-to-spec`、`scaffold-functional-test`、`show-me`、`initialize-project`。

### 仓库内部的 2 个

`ci-guard` 和 `commit-check` 仅用于维护本仓库，不会通过 `init`、`install` 或 `sync` 分发到用户项目。

## Codex CLI 支持

Codex 的项目级 skills 位于 `.agents/skills/`；全局 skills 位于 `~/.codex/skills`。`init`、普通 `sync` 和项目级 `install` 共用 `.agents/skills/`，避免同一共享 skill 在多个项目目录产生镜像。

~~~sh
npm run codex:smoke
CODEX_E2E=1 npm run codex:smoke
~~~

本项目不包含 Codex Cloud、Codex 专用 commands、plugins 或 MCP 配置。

## 开发与发布

上游 Skills 来自 [mattpocock/skills](https://github.com/mattpocock/skills)。发布由推送 `v*` 标签触发，需配置 `NPM_TOKEN`。

~~~sh
npm test
npm run build:template
~~~

许可证：MIT。