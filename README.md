# matt-skills

mattpocock/skills（`skills/engineering` + `skills/productivity`）的配置仓库：工作区内容镜像为 `template/` 模板快照，以 npm 包 `@heihei0299/matt-skills` 分发，目标仓库一条命令即完成初始化。

## 模板结构

```
template/
├── AGENTS.md         项目级全局配置（行为路由 + 分文件指针）
├── .pi/              pi-agent 项目配置（pi 标准结构：`.pi/skills/` 直放独有技能，自动发现）
└── .opencode/        分发内容（目标仓库的 opencode 项目配置）
    ├── skills/       5 个独有技能（tdd-implement、grill-to-spec、diagnose-fix、commit-check、instance-test）
    ├── agents/       issue-audit 子代理定义
    ├── commands/     issue-audit + 9 个显式触发技能命令（grill-to-spec/wayfinder/to-spec/to-tickets/triage/improve-codebase-architecture/teach/handoff/writing-great-skills）
    ├── docs/agents/  5 个分文件（运行时纪律 / 技能设计 / issue tracker / triage labels / domain）
    ├── CONTEXT.md    术语表
    ├── package.json  插件依赖清单
    └── .gitignore
```

## 初始化

在目标仓库根目录执行一条命令：

```sh
npx @heihei0299/matt-skills init
```

`init` 做两件事：

1. 复制 `template/` 快照（`AGENTS.md`、`.opencode/`、`.pi/`）到当前目录；
2. 把上游技能（engineering 17 个 + productivity 5 个）复制到 `.agents/skills/`。

选项：`--dest <path>` 指定目标目录（默认当前目录）；`--force` 覆盖已存在的文件（直接覆盖，`AGENTS.md` 会备份到 `.bak`）（默认跳过）。

**增量同步（已有项目）**：已有项目更新到最新模板与技能：

```sh
npx @heihei0299/matt-skills sync            # 增量同步，直接更新
npx @heihei0299/matt-skills sync --force    # 同上（直接覆盖）
```

`sync` 专为已有项目设计：自动检测 `AGENTS.md` 是否存在，存在则增量更新模板与上游技能（直接覆盖，`AGENTS.md` 会备份），不存在则等同全新 `init`。与 `init --force` 的区别：`sync` 语义更明确，建议已有项目优先用 `sync`。

上游没有 `tdd-implement`、`grill-to-spec`、`diagnose-fix`、`commit-check`，复制天然不冲突。目标仓库会话即自动加载全部技能（上游在 `.agents/skills/`、独有在 `.opencode/skills/`；pi 侧独有在 `.pi/skills/`）与项目级全局配置（行为路由表、分文件约定）；`issue-audit` 以子代理 + 命令形式分发（`.opencode/agents/`、`.opencode/commands/`）；9 个显式触发技能注册为 opencode 命令（`.opencode/commands/`，`/命令名` 触发）。

**pi-agent 用户**：初始化命令完全相同。pi 从 `.pi/skills/` 自动发现独有技能（tdd-implement、grill-to-spec、diagnose-fix、commit-check），无需任何指向配置；首次在目标仓库交互启动时 pi 会询问项目信任，用 `/trust` 保存即可。

**手动方式（备选）**：无 npx 环境时，将 `template/` 整个文件夹复制到目标仓库根目录，再拉取上游技能：

```sh
cp -r template/. /path/to/target/
git clone --depth 1 https://github.com/mattpocock/skills.git /tmp/mattpocock-skills
cp -r /tmp/mattpocock-skills/skills/engineering/. .agents/skills/
cp -r /tmp/mattpocock-skills/skills/productivity/. .agents/skills/
rm -rf /tmp/mattpocock-skills
```

上游没有 `tdd-implement`、`grill-to-spec`、`diagnose-fix`、`commit-check`，复制天然不冲突。目标仓库会话即自动加载全部技能（上游在 `.agents/skills/`、独有在 `.opencode/skills/`；pi 侧独有在 `.pi/skills/`）与项目级全局配置（行为路由表、分文件约定）；`issue-audit` 以子代理 + 命令形式分发（`.opencode/agents/`、`.opencode/commands/`）；9 个显式触发技能注册为 opencode 命令（`.opencode/commands/`，`/命令名` 触发）。

**pi-agent 用户**：初始化命令完全相同。pi 从 `.pi/skills/` 自动发现独有技能（tdd-implement、grill-to-spec、diagnose-fix、commit-check），无需任何指向配置；首次在目标仓库交互启动时 pi 会询问项目信任，用 `/trust` 保存即可。

## 维护约定

改动工作区后，必须同步到 `template/` 对应路径，路径映射如下（同步方向单向：工作区 → 模板快照）：

| 工作区 | 模板 |
|--------|------|
| `.agents/skills/{tdd-implement,grill-to-spec,diagnose-fix,commit-check}/` | `template/.opencode/skills/{tdd-implement,grill-to-spec,diagnose-fix,commit-check}/` |
| `.agents/skills/{tdd-implement,grill-to-spec,diagnose-fix,commit-check}/` | `template/.pi/skills/{tdd-implement,grill-to-spec,diagnose-fix,commit-check}/` |
| `.opencode/agents/issue-audit.md`、`commands/*.md`（issue-audit + 9 个显式技能命令）、`.gitignore`、`package.json`、`package-lock.json` | `template/.opencode/` 同名 |
| `.pi/prompts/issue-audit.md`（pi 命令：opencode 版适配，去 subagent frontmatter） | `template/.pi/prompts/issue-audit.md` |
| `AGENTS.md` | `template/AGENTS.md`（引用映射为 `.opencode/` 路径） |
| `CONTEXT.md` | `template/.opencode/CONTEXT.md` |
| `docs/agents/*` | `template/.opencode/docs/agents/*`（引用映射为 `.opencode/` 路径） |

独有技能需同步**双份**：`.opencode/skills/`（opencode 分发）与 `.pi/skills/`（pi 标准分发）。
`test/template-sync.test.js` 守护同步（含路径映射），漏同步测试即红。

新增技能前先查上游 `mattpocock/skills` 是否已存在；仅上游没有的技能才作为独有技能落在本仓库（当前独有：tdd-implement、grill-to-spec、diagnose-fix、commit-check），上游技能一律不进 `template/`。

## harness 支持

模板同时面向 opencode 与 pi-agent 两种 harness：技能（Agent Skills 标准）与 `AGENTS.md` 行为路由跨 harness 通用，同一份配置两处均可运行。

以下为 opencode 专属能力，**pi 下不可用**（不移植，仅文档注明）：

- `issue-audit`：opencode 以 subagent + command 形式分发（`.opencode/agents/`、`.opencode/commands/`）；pi 无 subagent 机制，以 prompt template 命令分发（`.pi/prompts/issue-audit.md`，去 subagent 委托、保留完整审计流程）
- codegraph MCP：`opencode.jsonc` 配置的代码图服务，pi 无原生 MCP
- `explore` 子代理、`firecrawl` 网页抓取：opencode 会话能力

pi 下对应能力以内置工具或已装扩展为准（`AGENTS.md`「能力边界」已按此表述）。

## harness 目录结构

两个 harness 的技能加载目录结构如下（本项目只分发项目级目录，全局目录由用户自备）：

### pi-agent

- **全局**：`~/.pi/agent/skills/`、`~/.agents/skills/`（用户级技能，自动发现）；配置在 `~/.pi/agent/settings.json`
- **项目**：
  - `.pi/skills/` — pi 标准结构，目录内技能**自动发现**（本项目独有技能直放此处）
  - `.pi/prompts/` — pi 命令（prompt template）自动发现，如 `issue-audit.md` → `/issue-audit`
  - `.agents/skills/` — 自动发现（上游技能与 workspace 技能在此）
  - `.pi/settings.json` — `skills` 数组可选，指向额外技能目录（本项目不再使用）

### opencode

- **项目**：`.opencode/skills/`（技能）、`.opencode/agents/`（子代理）、`.opencode/commands/`（命令：issue-audit + 9 个显式触发技能，`/命令名` 触发）、`.opencode/docs/`（文档）
- **全局**：`~/.config/opencode/`（`opencode.json` 配置、`skills/`、`agents/`、`commands/`），按 opencode 官方文档

同一份技能（Agent Skills 标准）与 `AGENTS.md` 行为路由在两种 harness 下均可加载：opencode 从 `.opencode/skills/`、pi 从 `.pi/skills/` 与 `.agents/skills/`。
## 仓库 CLI

仓库内提供安装管理 CLI（`bin/cli.js`，依赖 `prompts`，见 `package.json`），同时作为 npm 包 `@heihei0299/matt-skills` 分发（`npx @heihei0299/matt-skills <command>`）：

```sh
node bin/cli.js init [--dest <dir>] [--force]   # 初始化项目：template + 上游技能
node bin/cli.js sync [--dest <dir>] [--force]   # 同步已有项目到最新（直接覆盖）
node bin/cli.js list [--json]                   # 列出 .agents/skills/ 下全部技能及描述
node bin/cli.js install [选项]                  # 把技能复制到目标工具目录（交互式选择）
```

`init` 选项：`--dest <dir>` 指定目标目录（默认当前目录）；`--force` 覆盖已存在的文件（直接覆盖，`AGENTS.md` 会备份到 `.bak`）（默认跳过），见「初始化」。
`sync` 选项：`--dest <dir>` 指定目标目录；`--force` 直接覆盖（与默认一致），见「初始化」增量同步。

`install` 选项：

- `--dest <dir>`：复制到指定目录（覆盖工具映射）
- `--tools <t1,t2>`：指定工具，项目级映射 `codex→.agents/skills`、`pi→.pi/skills`、`opencode→.opencode/skills`、`claude→.claude/skills`
- `--global`：安装到全局目录（`~/.codex/skills`、`~/.pi/agent/skills`、`~/.config/opencode/skills`、`~/.claude/skills`）；`--project` 回到项目级
- `--all`：安装全部技能（默认交互勾选）；`--force`：覆盖已存在的技能


### 上游同步（自动更新）

本仓库的 `.agents/skills/` 中 **非独有技能** 来自 `mattpocock/skills` 上游。已实现双通道自动同步：

- **本地 CLI**：`matt-skills check`（只读比对）与 `matt-skills update`（一键覆盖本地 `.agents/skills/`，自动处理 `writing-great-skills → writing-for-agents` 重命名与增删）
- **GitHub Actions**：`.github/workflows/sync-upstream.yml` 每周一 02:00 UTC 自动 `check`，有差异则 `apply` 并提 PR（`upstream-sync/<short-sha>`），支持 `workflow_dispatch` 手动触发（`ref`/`dry_run` 参数）

```sh
npx @heihei0299/matt-skills check                    # 只读检查，对比本地 vs 上游 HEAD（有差异 exit 1）
npx @heihei0299/matt-skills check --json             # JSON 输出：{ head, counts, result: { added, updated, renamed, removed, same } }
npx @heihei0299/matt-skills update --dry-run         # 演练，不写文件
npx @heihei0299/matt-skills update                   # 覆盖 .agents/skills 非独有技能
node scripts/sync-upstream.js --check               # 等价底层脚本（CLI check/update 的实现）
node scripts/sync-upstream.js --apply --dry-run
```

实现细节：`scripts/sync-upstream.js` 为单一事实源（CLI 与 Actions 共用），以 `config/proprietary.json` 为独有白名单，上游通过 `git clone --depth 1 https://github.com/mattpocock/skills.git` 获取，比对 `SKILL.md` 的 sha256，自动处理新增/更新/重命名/删除；Actions 提 PR 后需人工合入，合入后按“发布”节打 `v*` 标签即发布（自动 patch 发版可在后续扩展为 PR 合入后自动 bump）。
上游重命名映射：`RENAMES = { "writing-great-skills": "writing-for-agents" }`，Actions/CLI 均会删除旧目录并复制新目录。
## 发布

推送 `v*` 标签自动发布到 npm（GitHub Actions，见 `.github/workflows/publish.yml`）：

```sh
# 1. 确保 main 分支为最新且测试全绿
git checkout main && git pull
npm test

# 2. 打标签并推送（标签即版本，v 前缀自动去除）
git tag v1.0.1
git push origin v1.0.1
```

Action 流程：`checkout` → 校验标签在 `main` 分支 → `Node 24` → `npm ci` → `npm test` 全绿 → 以标签为准 `npm version <tag> --no-git-tag-version` → `npm publish --access public`（需在 GitHub Secrets 配置 `NPM_TOKEN`）。

本地手动发布（备选）：

```sh
npm version <patch|minor|major>
npm publish
```

- `prepublishOnly` 自动跑全量测试（`node --test test/*.test.js`）
- 发布内容 = `bin/` + `template/` + `.agents/skills/` + `README.md`，由 `package.json` 的 `files` 白名单控制，`npm pack` 可预览
- `template/` 与 `.agents/skills/` 是包内容：改动后需重新发版才对目标仓库生效
## 开发

```sh
npm test                          # 全量测试 122 项
npm run build:template            # 从单源生成 template/.opencode/.pi（config/proprietary.json 为单一事实源）
```

交互模式依赖 `prompts`（见 `package.json`）；测试见 `test/cli.test.js`、`test/cli-init.test.js`、`test/template-sync.test.js`。

用户手动触发的功能测试：`/instance-test`（见 `.agents/skills/instance-test/SKILL.md`）——在隔离 `temp dir` 跑 prompt 实例验实际功能，`references/instances.md` 为通用模板。

