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
- 可分发的独有 Skills：`tdd-implement`、`diagnose-fix`、`grill-to-spec`、`scaffold-functional-test`、`show-me`、`initialize-project`。`ci-guard` 和 `commit-check` 仅用于维护本仓库。

Codex 项目 Skills 同样安装在 `.agents/skills/`；全局 Skills 位于 `~/.codex/skills`。

## 开发与发布

上游 Skills 来自 [mattpocock/skills](https://github.com/mattpocock/skills)。发布由推送 `v*` 标签触发，需配置 `NPM_TOKEN`。

~~~sh
npm test
npm run build:template
~~~

许可证：MIT。