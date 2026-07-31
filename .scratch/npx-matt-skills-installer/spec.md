# npx 安装本技能组（codex / pi / opencode / claude）

**Status:** ready-for-agent

## Problem Statement

维护者拥有一组 24 个技能，但目前只能通过 GitHub 手动下载到 `~/.codex/skills`，或依赖仓库内的 `.agents/skills` 项目级目录。要在多个 AI 编码工具（Codex、Pi、OpenCode、Claude Code）中使用同一组技能，需要逐工具手动放置、无版本管理、无统一安装命令。用户需要一条命令完成安装：`npx @heihei0299/matt-skills install`。

## Solution

将本仓库发布为 npm 包 `@heihei0299/matt-skills`（技能文件静态内置在包内）。CLI 提供：

- `list`：列出包内全部可用技能（含描述）。
- `install`：先交互式勾选要装到的工具（codex / pi / opencode / claude），再勾选技能；按各工具官方目录拷贝；默认项目级，`--global` 装全局，`--dest` 指定单个自定义目录；重复安装默认跳过已存在技能，`--force` 覆盖；`--tools`/`--all` 支持免交互（CI）。

技能更新 = 发布新包版本，用户重跑 install 升级。仓库级配置（issue tracker / triage labels / domain docs）不属于本特性，仍由 `setup-matt-pocock-skills` 技能手动完成。

## User Stories

1. As a 技能维护者, I want 发布一次 npm 包后用户用一条 npx 命令安装全部技能, so that 不再需要手动克隆、复制或逐目录放置
2. As a 用户, I want 运行 `npx @heihei0299/matt-skills install` 后先勾选要装到哪些工具, so that 只为需要的工具安装
3. As a 用户, I want 勾选要安装的技能, so that 不装不需要的技能、保持环境精简
4. As a 用户, I want 运行 `list` 查看可用技能与描述, so that 安装前了解包里有什么
5. As a Codex 用户, I want 技能装到项目 `.agents/skills/`, so that 当前项目的 Codex 会话能使用
6. As a Claude Code 用户, I want 技能装到项目 `.claude/skills/`, so that 当前项目的 Claude 会话能使用
7. As an OpenCode 用户, I want 技能装到项目 `.opencode/skills/`, so that 当前项目的 OpenCode 会话能使用
8. As a Pi 用户, I want 技能装到项目 `.pi/skills/`, so that 当前项目的 Pi 会话能使用
9. As a 用户, I want 加 `--global` 把技能装到 `~` 下各工具的全局技能目录, so that 所有项目都能用
10. As a 用户, I want 加 `--dest <path>` 装到任意自定义目录, so that 非标准环境或特殊路径也能安装
11. As a 用户, I want 重复安装不覆盖已存在的同名技能, so that 本地对技能的修改不会被静默破坏
12. As a 用户, I want 加 `--force` 覆盖已有技能, so that 升级到新包版本时能更新
13. As a CI/脚本用户, I want 用 `--tools codex,claude --all` 免交互安装, so that 可以脚本化、自动化安装
14. As a 维护者, I want `npm pack` 产物包含 `skills/` 与 CLI 本体, so that 发布一次即完整、安装无需额外网络
15. As a 维护者, I want 技能内容随包版本发布, so that 用户安装的是可追溯、可升级的版本
16. As a 维护者, I want README 说明用法、工具目录对照与发布流程, so that 上手和发布成本低
17. As a 用户, I want 安装结束看到每个工具的「已装/跳过/目标路径」汇总, so that 结果可验证
18. As a 用户, I want 未选择任何工具或技能时得到明确提示且以 0 退出, so that 交互中断不会造成困惑

## Implementation Decisions

- **包形态**：本仓库自身即 npm 包 `@heihei0299/matt-skills`（v0.1.0），技能静态内置；`bin` 暴露 `matt-skills` 指向 CLI 入口；`publishConfig.access: public`（scoped 包默认私有）；运行时依赖仅 `prompts`（交互多选）；Node ≥ 18，ESM。
- **CLI 契约**（本特性的唯一测试 seam）：
  - `list`：枚举包内 `skills/` 下含 `SKILL.md` 的子目录，输出技能名与描述（支持 `--json`）。
  - `install`：先选工具再选技能；标志 `--tools <a,b>`、`--all`、`--force`、`--global`/`--project`（默认 project）、`--dest <path>`、`--help`。
  - `--dest` 覆盖工具映射并忽略 `--tools`；未选择时提示并以 0 退出。
- **工具映射**（公共接口）：
  - 项目级：codex→`.agents/skills/`、pi→`.pi/skills/`、opencode→`.opencode/skills/`、claude→`.claude/skills/`
  - 全局：codex→`~/.codex/skills/`、pi→`~/.pi/agent/skills/`、opencode→`~/.config/opencode/skills/`、claude→`~/.claude/skills/`
- **安装语义**：递归拷贝整个技能目录（含 `agents/`、模板、脚本等附属文件）；目标已存在同名技能默认跳过并报告，`--force` 覆盖；按工具分别汇总结果。
- **内容不变**：本特性只新增包脚手架与文档，不改动 `skills/` 内任何技能内容。

## Testing Decisions

- **测试原则**：只测外部行为——CLI 的 stdout、退出码与文件系统落点，不测内部实现函数（与「最高 seam = CLI 接口」一致）。
- **测试对象**：CLI 二进制（`node bin/cli.js`）与 npm 包产物。
- **用例**：
  - `npm pack --dry-run`：tarball 含 `skills/` 与 `bin/`
  - `list` 输出 24 个技能
  - `install --all --force --dest /tmp/...`：全部技能落盘，抽查附属文件（triage/AGENT-BRIEF.md、tdd/tests.md 等）
  - 幂等：同目标重跑不带 `--force` → 报告跳过且不覆盖
  - 映射路径：4 工具 × 项目/全局共 8 种路径断言（`--global` 用临时 HOME 隔离）
  - 交互流程人工验证：勾选 2 工具 + 2-3 技能后只装所选
- **Prior art**：本仓库无既有测试设施；安装语义参考 `skill-installer`（目标已存在则中止），此处改为「默认跳过 + `--force` 覆盖」以支持升级。

## Out of Scope

- 仓库级配置自动化（`AGENTS.md`/`docs/agents/*` 由 `setup-matt-pocock-skills` 手动完成）
- 技能内容的增删改
- 卸载能力与版本差异检测（v1 仅覆盖式安装）
- 私有 registry / GitHub Packages 发布
- codex/pi 共享 `.agents/skills/` 的去重优化（v1 按所选工具各自拷贝，保证可预测）
- 自动检测目标工具是否已安装

## Further Notes

- 安装后生效方式：Claude Code / Pi 用 `/reload`；OpenCode / Codex 下一轮会话生效。
- 包名假设：scope 用仓库 owner `heihei0299`；若 npm 上被占用，改为 `@<owner>/matt-skills-installer` 并同步文档命令。
- 发布流程：`npm login` → `npm version patch` → `npm publish --access public`。
