# matt-skills

mattpocock/skills（`skills/engineering` + `skills/productivity`）的配置仓库：工作区内容镜像为 `template/` 模板快照，将快照整个复制到目标仓库根目录，再按下方命令拉取上游技能，即完成初始化。

## 模板结构

```
template/
├── AGENTS.md         项目级全局配置（行为路由 + 分文件指针）
├── .pi/              pi-agent 项目配置（pi 标准结构：`.pi/skills/` 直放独有技能，自动发现）
└── .opencode/        分发内容（目标仓库的 opencode 项目配置）
    ├── skills/       4 个独有技能（tdd-implement、grill-to-spec、diagnose-fix、commit-check）
    ├── agents/       issue-audit 子代理定义
    ├── commands/     issue-audit + 9 个显式触发技能命令（grill-to-spec/wayfinder/to-spec/to-tickets/triage/improve-codebase-architecture/teach/handoff/writing-great-skills）
    ├── docs/agents/  5 个分文件（运行时纪律 / 技能设计 / issue tracker / triage labels / domain）
    ├── CONTEXT.md    术语表
    ├── package.json  插件依赖清单
    └── .gitignore
```

## 初始化

将 `template/` 整个文件夹复制到目标仓库根目录：

```sh
cp -r template/. /path/to/target/
```

然后拉取上游技能（engineering 17 个 + productivity 5 个）到目标仓库的 `.agents/skills/`：

```sh
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

仓库内提供安装管理 CLI（`bin/cli.js`，依赖 `prompts`，见 `package.json`）：

```sh
node bin/cli.js list [--json]        # 列出 .agents/skills/ 下全部技能及描述
node bin/cli.js install [选项]       # 把技能复制到目标工具目录（交互式选择）
```

`install` 选项：

- `--dest <dir>`：复制到指定目录（覆盖工具映射）
- `--tools <t1,t2>`：指定工具，项目级映射 `codex→.agents/skills`、`pi→.pi/skills`、`opencode→.opencode/skills`、`claude→.claude/skills`
- `--global`：安装到全局目录（`~/.codex/skills`、`~/.pi/agent/skills`、`~/.config/opencode/skills`、`~/.claude/skills`）；`--project` 回到项目级
- `--all`：安装全部技能（默认交互勾选）；`--force`：覆盖已存在的技能

## 开发

```sh
npm test
```

交互模式依赖 `prompts`（见 `package.json`）；测试见 `test/cli.test.js`。

