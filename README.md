# matt-skills

面向项目仓库的 Agent skills 与配置模板。模板包含项目 skeleton、`AGENTS.md`、项目上下文占位文件，以及 pi / opencode 所需的项目配置；共享 Skills 由 CLI 从 Workspace 的 canonical source 直接组装到目标项目。

## 环境要求

- Node.js `>=18`。
- npm（随 Node.js 提供，用于安装和运行 CLI；也可通过 `npx` 直接调用）。
- Git（`sync`、`check` 和发布流程需要）。

## 模板内容

```text
template/
├── AGENTS.md                 Agent 行为路由与项目上下文入口
├── PROJECT.md                目标项目填写的目标、范围和主要入口
├── .opencode/                opencode agents、commands、docs
└── .pi/                      pi prompts、docs 与项目自定义 skills 占位
```

共享 Skills 不作为 Template Snapshot 的持久化副本；`init`、普通 `sync` 和项目级 `install` 都从 Workspace 的 canonical source 分发到唯一的 `.agents/skills/`。`.pi/skills/`、`.opencode/skills/` 和 `.claude/skills/` 仅用于项目自定义 skills。

- `PROJECT.md` 描述项目是什么；操作规则放在 `AGENTS.md`。
- 分发的 `AGENTS.md` 提供通用工作流；项目专用规则、命令、测试方式和完成标准由目标项目更具体的 `AGENTS.md` 补充。
- `.opencode/CONTEXT.md` / `.pi/CONTEXT.md` 保存领域术语与边界。
- `.agents/skills/` 承载共享 skills；同步只处理可分发 skill 名称，不删除额外的项目自定义 skills。
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

`init` 默认保护已有 `AGENTS.md`；需要刷新完整模板时使用 `init --all`。默认 `sync` 保留已有 `AGENTS.md` 和项目规则，`sync --all` 才将其整体刷新为当前分发模板。`sync` 不删除目标项目的额外文件或自定义 skills。

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
- `--tools <list>`：选择 `codex`、`pi`、`opencode` 或 `claude`；项目级 skills 统一写入 `.agents/skills/`，全局安装仍使用各工具目录。
- `--global`：写入用户级 skills 目录。
- `--dry-run`：只检查差异，不写入；`--json` 输出机器可读结果。

## Codex CLI 支持

Codex 的项目级 skills 位于 `.agents/skills/`；全局 skills 位于 `~/.codex/skills`。`init`、普通 `sync` 和项目级 `install` 共用 `.agents/skills/`，避免同一共享 skill 在多个项目目录产生镜像。

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

版本由推送的 `v*` 标签决定；GitHub Actions 会在发布时从 tag 设置 npm 包版本，并执行全量测试与模板检查。

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
