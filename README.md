# matt-skills

面向项目仓库的 Agent skills 与配置模板。模板包含项目 skeleton、`AGENTS.md`、项目上下文占位文件，以及 pi / opencode 所需的项目配置；共享 Skills 由 CLI 从 Workspace 的 canonical source 直接组装到目标项目。

## 模板内容

```text
template/
├── AGENTS.md                 Agent 行为路由与项目上下文入口
├── PROJECT.md                目标项目填写的目标、范围和主要入口
├── .opencode/                opencode agents、commands、docs
└── .pi/                      pi prompts、docs 与项目自定义 skills 占位
```

共享 Skills 不作为 Template Snapshot 的持久化副本；`init`、普通 `sync` 和 `install` 从 Workspace 的 canonical source 分发到各工具的默认项目目录：Codex 为 `.agents/skills/`、pi 为 `.pi/skills/`、opencode 为 `.opencode/skills/`、Claude 为 `.claude/skills/`。

- `PROJECT.md` 描述项目是什么；操作规则放在 `AGENTS.md`。
- `.opencode/CONTEXT.md` / `.pi/CONTEXT.md` 保存领域术语与边界。
- 各工具默认项目目录承载共享 skills；同步只处理可分发 skill 名称，不删除额外的项目自定义 skills。
- `ci-guard`、`commit-check` 是本仓库维护用的 repo-local skills，不会分发到目标项目。

## 独有 skill 分发边界

本仓库有 7 个独有（proprietary）skills：

### 可分发的 5 个

- `tdd-implement`
- `diagnose-fix`
- `grill-to-spec`
- `scaffold-functional-test`
- `show-me`

### 仓库内部的 2 个

- `ci-guard`
- `commit-check`

repo-local skills 不会通过 `init`、`install`、`sync` 分发到用户项目。

## 初始化

在目标仓库根目录执行：

```sh
npx @heihei0299/matt-skills init              # 安装默认 programming skills
npx @heihei0299/matt-skills init --all       # 安装全部可分发 skills
```

已有项目同步：

```sh
npx @heihei0299/matt-skills sync             # 安全增量同步默认范围
npx @heihei0299/matt-skills sync --all       # 同步全部可分发 skills
npx @heihei0299/matt-skills sync --dry-run --json
```

`init` 默认保护已有 `AGENTS.md`；需要刷新完整模板时使用 `init --all`。默认 `sync` 只刷新 `AGENTS.md` 的 `matt-skills:managed` 受管区块并保留标记外的项目规则；旧的无标记 `AGENTS.md` 原样保留，`sync --all` 才整体刷新。`sync` 不删除目标项目的额外文件或自定义 skills。

默认 programming 范围中的 4 个独有 skills 是 `tdd-implement`、`diagnose-fix`、`grill-to-spec`、`show-me`。

## CLI

```sh
npx @heihei0299/matt-skills list [--all] [--json]
npx @heihei0299/matt-skills install [--all] [--tools <list>] [--global] [--dest <dir>]
npx @heihei0299/matt-skills init [--all] [--dest <dir>]
npx @heihei0299/matt-skills sync [--all] [--dry-run] [--json] [--dest <dir>]
npx @heihei0299/matt-skills check [--all] [--json] [--upstream <url>] [--ref <ref>]
```

常用选项：

- `--all`：包含全部可分发 skills，默认范围只包含 programming skills。
- `--dest <dir>`：指定目标目录。
- `--tools <list>`：选择 `codex`、`pi`、`opencode` 或 `claude`；项目级 skills 写入所选工具的默认目录。
- `--global`：写入用户级 skills 目录。
- `--dry-run`：只检查差异，不写入；`--json` 输出机器可读结果。

## Codex CLI 支持

Codex 的项目级 skills 位于 `.agents/skills/`；全局 skills 位于 `~/.codex/skills`。`init` 和普通 `sync` 默认同时分发到四个工具的项目目录。

```sh
npm run codex:smoke
CODEX_E2E=1 npm run codex:smoke
```

本项目不包含 Codex Cloud、Codex 专用 commands、plugins 或 MCP 配置。

## 上游同步

非独有 skills 来自 [mattpocock/skills](https://github.com/mattpocock/skills)。

```sh
npx @heihei0299/matt-skills sync --dry-run --json  # 检查上游差异
npx @heihei0299/matt-skills sync                   # 同步默认范围
npx @heihei0299/matt-skills sync --all             # 同步全部可分发范围
```

## 发布

推送 `v*` 标签会触发 GitHub Actions：全量测试、模板检查和 npm 发布。

```sh
npm test
npm run build:template
git tag vX.Y.Z
git push origin main vX.Y.Z
```

发布需要 GitHub Secrets 中配置 `NPM_TOKEN`。模板或共享 skills 的改动需要新版本才会分发给目标项目。

## 开发

```sh
npm test
npm run build:template
```

测试位于 `test/`；模板由 `scripts/build-template.js` 生成，`template/AGENTS.md` 的独立源是 `config/template-AGENTS.md`。提交前应确保模板同步测试通过。

## 许可证

MIT
