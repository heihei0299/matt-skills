# 03 — 多工具支持（codex / pi / opencode / claude）

**What to build:** 安装时先勾选要装到的工具（codex / pi / opencode / claude），再勾选技能；每个工具写入其官方目录，支持项目级与 `--global` 全局级；`--dest` 为单目录逃生口。

**Blocked by:** 02

**Status:** ready-for-agent

- [x] 工具映射：项目级 codex→`.agents/skills/`、pi→`.pi/skills/`、opencode→`.opencode/skills/`、claude→`.claude/skills/`；`--global` 对应 `~/.codex/skills/`、`~/.pi/agent/skills/`、`~/.config/opencode/skills/`、`~/.claude/skills/`
- [x] 交互式先多选工具再多选技能；`--tools codex,claude` 跳过工具选择
- [x] `--dest <path>` 覆盖工具映射并忽略 `--tools`；`--global`/`--project` 二选一，默认 project
- [x] 按工具分别汇总「已装/跳过/目标」；未选任何工具时提示并以 0 退出
- [x] 映射路径单测覆盖 4 工具 × 项目/全局 8 种情况
- [x] 实测：`install --tools claude,codex --all --force` 同时写入 `.claude/skills/` 与 `.agents/skills/`；`--global` 模式落到 `~` 下对应目录（测试用临时 HOME 隔离）

## Comments

- 2026-08 实施完成：`bin/cli.js` 新增 `TOOL_TARGETS` 工具映射（codex→`.agents/skills/`、pi→`.pi/skills/`、opencode→`.opencode/skills/`、claude→`.claude/skills/`；全局对应 `$HOME/.codex/skills/`、`$HOME/.pi/agent/skills/`、`$HOME/.config/opencode/skills/`、`$HOME/.claude/skills/`）；`install` 先选工具再选技能，支持 `--tools <a,b>` 免交互、`--global`/`--project`（默认 project）、`--dest` 覆盖工具映射并忽略 `--tools`；按工具分别汇总「已装/跳过/目标路径」。
- 守卫：非 TTY 无 `--tools` 提示并 exit 1（避免脚本静默成功）；未知工具/`--tools` 缺值/`--global --project` 冲突均报错 exit 1；交互空勾选输出「未选择任何工具，未安装」exit 0。
- 测试：`test/cli.test.js` 新增 18 个用例（共 26），覆盖 4 工具项目级 + 4 全局映射 + 多工具 + 幂等重跑 + dest 覆盖 + 非法/缺参/冲突 + 显式 --project + help 文档；完整套件 `node --test` 36/36 通过。
- 交互路径人工验证（pty）：`script` 下空格勾选 codex+claude → 再勾选 ask-matt+codebase-design → 只装所选 2 技能到两工具目录；工具空勾选回车输出「未选择任何工具，未安装」exit 0。
- code-review 两轴均通过；已修：`--tools ","` 空列表漏网（改为报错 exit 1）、`--tools codex,codex` 不去重（改为去重单行汇总）、`--dest` 与 `--global` 组合未定义（改为报错 exit 1）、显式 `--project` 补测试。
