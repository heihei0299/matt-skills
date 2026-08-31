# matt-skills

mattpocock/skills（`skills/engineering` + `skills/productivity`）的配置仓库：工作区内容镜像为 `template/` 模板快照，以 npm 包 `@heihei0299/matt-skills` 分发，目标仓库一条命令即完成初始化。

## 模板结构

```
template/
├── AGENTS.md         项目级全局配置（行为路由 + 分文件指针）
├── .agents/
│   └── skills/       32 个技能（上游 26 + 独有 6：ci-guard、tdd-implement、grill-to-spec、diagnose-fix、commit-check、scaffold-functional-test）单一源；模板全量 32，默认安装仅编程相关 22（engineering 18 + 核心独有 4，见 config/engineering.json），--all 展开全量
├── .pi/              pi-agent 项目配置
│   ├── skills/       空占位（项目自定义技能，含 .gitkeep + README.md）
│   ├── prompts/      issue-audit 命令（prompt template）
│   ├── docs/agents/  5 个分文件镜像
│   └── CONTEXT.md    术语表镜像
└── .opencode/        opencode 项目配置
    ├── skills/       空占位（项目自定义技能，含 .gitkeep + README.md）
    ├── agents/       issue-audit 子代理定义
    ├── commands/     issue-audit + 9 个显式触发技能命令（grill-to-spec/wayfinder/to-spec/to-tickets/triage/improve-codebase-architecture/teach/handoff/writing-for-agents）
    ├── docs/agents/  5 个分文件（运行时纪律 / 技能设计 / issue tracker / triage labels / domain）
    ├── CONTEXT.md    术语表
    ├── package.json  插件依赖清单
    └── .gitignore
```

## 初始化

在目标仓库根目录执行一条命令：

```sh
npx @heihei0299/matt-skills init              # 默认仅编程相关 21（engineering + 独有），--all 展开全量 32
npx @heihei0299/matt-skills init --all       # 安装全量 32（含 productivity）
```

`init` 做一件事：复制 `template/` 快照（`AGENTS.md`、`.agents/skills/`、`.opencode/`、`.pi/`）到当前目录；模板全量 32，默认仅安装编程相关 24（上游 engineering 桶，见 config/engineering.json + 独有 6），`--all` 展开全量，无需二次拉取上游。

选项：`--dest <path>` 指定目标目录（默认当前目录）；`--force` 覆盖已存在的文件（直接覆盖，`AGENTS.md` 会备份到 `.bak`）（默认跳过）；`--all` 包含非编程技能（productivity，默认仅编程）。
**增量同步（已有项目）**：已有项目更新到最新模板与技能：

```sh
npx @heihei0299/matt-skills sync                                 # 默认仅对比不写盘（check），有差异 exit 1，--json 可解析（仅编程）
npx @heihei0299/matt-skills sync --all --json                  # 全量对比
npx @heihei0299/matt-skills sync --apply                         # 安全增量：AGENTS.md 定制跳过，编程技能 rm+cp，不删多余 productivity（默认保留）
npx @heihei0299/matt-skills sync --apply --all                  # 安全增量全量
npx @heihei0299/matt-skills sync --force                         # 硬盖编程：AGENTS.md 备份后硬盖，编程技能全量 add/update/remove（含 productivity 删除与旧镜像清理）
npx @heihei0299/matt-skills sync --force --all                  # 硬盖全量
npx @heihei0299/matt-skills sync --apply --dest <path> --upstream <url> --ref <ref> --json  # 选项可组合
```

`sync` 专为已有项目设计，三档语义：默认 `check` 仅对比不写盘（仅编程，`--all` 展开全量，打印“上游 HEAD / 本地非独有 vs 上游 / 新增/更新/删除/一致”表，`--json` 可解析，有差异 `exit 1`）；`--apply` 安全增量写盘（编程模式：`AGENTS.md` 若含独有路由如 `tdd-implement` 则跳过，`.agents/skills` 按编程子集 `rm+cp force` 覆盖但不 `remove` 多余 productivity，`template/.agents/.opencode/.pi` 按过滤增量 `add/update`，旧镜像 `.pi/skills` + `.opencode/skills` 中残留的共享技能自动清理但保留项目自定义；`--all` 则全量）；`--force` 硬盖（编程模式：`AGENTS.md` 备份 `.bak` 后强制覆盖，编程技能 `add/update/remove` 全做（含 productivity 删除与旧镜像清理）；`--all` 则全量硬盖）。`--dest`、`--upstream`、`--ref`、`--json`、`--all` 在三档均可透传。
目标仓库会话即自动加载共享技能（`.agents/skills/` 单一源，默认编程 22，`--all` 全量 32）与项目级全局配置（行为路由表、分文件约定）；项目自定义技能可按需放入 `.pi/skills/` 或 `.opencode/skills/`（按 harness 自动发现）；`issue-audit` 以子代理 + 命令形式分发（`.opencode/agents/`、`.opencode/commands/`）；9 个显式触发技能注册为 opencode 命令（`.opencode/commands/`，`/命令名` 触发）。
**pi-agent 用户**：初始化命令完全相同。pi 从 `.agents/skills/` 自动发现全部共享技能，无需额外指向；`.pi/skills/` 仅用于项目自定义。首次在目标仓库交互启动时 pi 会询问项目信任，用 `/trust` 保存即可。

**手动方式（备选）**：无 npx 环境时，将 `template/` 整个文件夹复制到目标仓库根目录即可（已含全量技能）：

```sh
cp -r template/. /path/to/target/
```

旧的手动拉取上游步骤已不再需要；若需单独验证上游，仍可：

```sh
git clone --depth 1 https://github.com/mattpocock/skills.git /tmp/mattpocock-skills
```

## 维护约定

改动工作区后，必须同步到 `template/` 对应路径，路径映射如下（同步方向单向：工作区 → 模板快照）：

| 工作区 | 模板 |
|--------|------|
| `.agents/skills/`（全部 32 个：上游 26 + 独有 6） | `template/.agents/skills/`（全量快照，单一源） |
| `.agents/skills/` 的 harness 占位说明 | `template/.pi/skills/.gitkeep` + `README.md`、`template/.opencode/skills/.gitkeep` + `README.md`（空目录占位，供项目自定义） |
| `.opencode/agents/issue-audit.md`、`commands/*.md`（issue-audit + 9 个显式技能命令）、`.gitignore`、`package.json`、`package-lock.json` | `template/.opencode/` 同名 |
| `.pi/prompts/issue-audit.md`（pi 命令：opencode 版适配，去 subagent frontmatter） | `template/.pi/prompts/issue-audit.md` |
| `AGENTS.md` | `template/AGENTS.md`（引用映射为 `.opencode/` 路径） |
| `CONTEXT.md` | `template/.opencode/CONTEXT.md` + `template/.pi/CONTEXT.md` |
| `docs/agents/*` | `template/.opencode/docs/agents/*` + `template/.pi/docs/agents/*`（引用映射为 `.opencode/` 路径） |

共享技能统一在 `.agents/skills` 单一源，不再双份镜像到 `.opencode/skills` / `.pi/skills`。
`test/template-sync.test.js` 守护同步（含路径映射），漏同步测试即红。

新增技能前先查上游 `mattpocock/skills` 是否已存在；仅上游没有的技能才作为独有技能落在本仓库（当前独有：ci-guard、tdd-implement、grill-to-spec、diagnose-fix、commit-check、scaffold-functional-test），上游技能通过 `scripts/sync-upstream.js` 同步到 `.agents/skills` 后随模板分发。

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
  - `.agents/skills/` — 共享技能单一源（默认编程 22，`--all` 全量 32，自动发现）
  - `.pi/skills/` — 项目自定义技能（pi 标准结构，自动发现，仅放项目本地技能）
  - `.pi/prompts/` — pi 命令（prompt template）自动发现，如 `issue-audit.md` → `/issue-audit`
  - `.pi/settings.json` — 已简化为空对象（历史指向 `.opencode/skills` 已移除，共享技能走 `.agents/skills`）
### opencode

- **项目**：`.agents/skills/`（共享技能单一源，默认编程 22，`--all` 全量 32）、`.opencode/skills/`（项目自定义技能）、`.opencode/agents/`（子代理）、`.opencode/commands/`（命令：issue-audit + 9 个显式触发技能，`/命令名` 触发）、`.opencode/docs/`（文档）

同一份技能（Agent Skills 标准）与 `AGENTS.md` 行为路由在两种 harness 下均可加载：pi 与 codex/claude 从 `.agents/skills/` 自动发现；opencode 按本模板约定同样优先读取 `.agents/skills/`（`.opencode/skills/` 仅用于项目自定义）。

## 仓库 CLI

仓库内提供安装管理 CLI（`bin/cli.js`，依赖 `prompts`，见 `package.json`），同时作为 npm 包 `@heihei0299/matt-skills` 分发（`npx @heihei0299/matt-skills <command>`）：

```sh
node bin/cli.js init [--dest <dir>] [--force] [--all]                               # 初始化项目：template 全量 32，默认编程 22
node bin/cli.js sync [--apply|--force] [--all] [--dest <path>] [--upstream <url>] [--ref <ref>] [--json]  # 同步已有项目到最新（默认编程）
node bin/cli.js list [--json] [--all]                                            # 列出技能（默认编程）
node bin/cli.js install [选项]                                                 # 把技能复制到目标工具目录（交互式选择，默认编程）
node bin/cli.js check [--json] [--all] [--upstream <url>] [--ref <ref>]          # 只读检查上游技能是否最新（等价 sync 默认，仅编程）
```

`init` 选项：`--dest <path>` 指定目标目录（默认当前目录）；`--force` 覆盖已存在的文件（直接覆盖，`AGENTS.md` 会备份到 `.bak`）（默认跳过）；`--all` 包含非编程（productivity，默认仅编程 22），见「初始化」。
`sync` 选项：`--apply` 安全增量（编程默认：`AGENTS.md` 定制跳过、编程技能不删 productivity，旧镜像清理保留项目自定义；`--all` 全量），`--force` 硬盖（编程默认：`AGENTS.md` 备份后硬盖、编程技能与模板全量 `remove` 含 productivity 删除与旧镜像清理；`--all` 全量）；`--all` 展开全量；`--dest <path>` 目标目录；`--upstream <url>` 上游地址；`--ref <ref>` 上游分支；`--json` JSON 输出；默认无参等价 `check` 仅对比不写盘（仅编程，`--all` 全量），`--json` 可解析，有差异 `exit 1`。
`check` 选项：`--json`、`--all`（默认仅编程）、`--upstream <url>`、`--ref <ref>`（等价 `sync` 默认 `check`）。

`install` 选项：

- `--dest <dir>`：复制到指定目录（覆盖工具映射）
- `--tools <t1,t2>`：指定工具，项目级已统一 `codex/pi/opencode/claude → .agents/skills`（共享技能单一源，`.pi/skills`/`.opencode/skills` 仅用于项目自定义）
- `--global`：安装到全局目录（`~/.codex/skills`、`~/.pi/agent/skills`、`~/.config/opencode/skills`、`~/.claude/skills`）；`--project` 回到项目级
- `--all`：安装全部技能（默认仅编程 22，`--all` 32，交互勾选时仅列编程）；`--force`：覆盖已存在的技能


### 上游同步（自动更新）

本仓库的 `.agents/skills/` 中 **非独有技能** 来自 `mattpocock/skills` 上游。已实现双通道自动同步：

- **本地 CLI**：`matt-skills sync` 三档——默认 `check` 只读比对（等价 `matt-skills check`，有差异 `exit 1`，`--json` 可解析）、`matt-skills sync --apply` 安全增量、`matt-skills sync --force` 硬盖；`matt-skills check [--json] [--upstream <url>] [--ref <ref>]` 仍保留为只读别名；`matt-skills update` 已合并到 `sync --apply`（执行提示 `update 已合并到 sync --apply` 且 `exit 1`）
- **GitHub Actions**：`.github/workflows/sync-upstream.yml` 每周一 02:00 UTC 自动 `check`，有差异则 `apply` 并提 PR（`upstream-sync/<short-sha>`），支持 `workflow_dispatch` 手动触发（`ref`/`dry_run` 参数）

```sh
npx @heihei0299/matt-skills sync --json              # 默认 check 只读检查，JSON 输出：{ head, counts, result: { added, updated, renamed, removed, same } }
npx @heihei0299/matt-skills sync --apply             # 安全增量写盘
npx @heihei0299/matt-skills sync --force             # 硬盖写盘
npx @heihei0299/matt-skills check --json             # 等价 sync 默认 check
node scripts/sync-upstream.js --check               # 等价底层脚本（CLI sync/check 的实现）
node scripts/sync-upstream.js --apply --dry-run
```

实现细节：`scripts/sync-upstream.js` 为单一事实源（CLI 与 Actions 共用），以 `config/proprietary.json` 为独有白名单 + `config/engineering.json` 为编程白名单（engineering 桶即编程，productivity 默认不装，`--all` 展开），上游通过 `git clone --depth 1 https://github.com/mattpocock/skills.git` 获取，比对 `SKILL.md` 的 sha256，自动处理新增/更新/重命名/删除；Actions 提 PR 后需人工合入，合入后按“发布”节打 `v*` 标签即发布（自动 patch 发版可在后续扩展为 PR 合入后自动 bump）。
上游重命名映射：`RENAMES = { "writing-great-skills": "writing-for-agents" }`，Actions/CLI 均会删除旧目录并复制新目录。
## 发布

推送 `v*` 标签自动发布到 npm（GitHub Actions，见 `.github/workflows/ci.yml`）：

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
npm test                          # 全量测试
npm run build:template            # 从单源生成 template/.agents/skills（全量 32 技能）+ 空占位
```

交互模式依赖 `prompts`（见 `package.json`）；测试见 `test/cli.test.js`、`test/cli-init.test.js`、`test/template-sync.test.js`。

用户手动触发的功能测试：`/instance-test`（matt-skills 专属示范，见 `.agents/skills/instance-test/SKILL.md`）——验证 sync 合并 update 后的行为，`references/instances.md` 由 `scaffold-functional-test` 从 spec 生成；通用模板已废弃。新增生成器 `/scaffold-functional-test`（见 `.agents/skills/scaffold-functional-test/SKILL.md`）——读 spec 生成定制化功能测试 skill。
