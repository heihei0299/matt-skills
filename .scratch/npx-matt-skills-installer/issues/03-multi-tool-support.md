# 03 — 多工具支持（codex / pi / opencode / claude）

**What to build:** 安装时先勾选要装到的工具（codex / pi / opencode / claude），再勾选技能；每个工具写入其官方目录，支持项目级与 `--global` 全局级；`--dest` 为单目录逃生口。

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] 工具映射：项目级 codex→`.agents/skills/`、pi→`.pi/skills/`、opencode→`.opencode/skills/`、claude→`.claude/skills/`；`--global` 对应 `~/.codex/skills/`、`~/.pi/agent/skills/`、`~/.config/opencode/skills/`、`~/.claude/skills/`
- [ ] 交互式先多选工具再多选技能；`--tools codex,claude` 跳过工具选择
- [ ] `--dest <path>` 覆盖工具映射并忽略 `--tools`；`--global`/`--project` 二选一，默认 project
- [ ] 按工具分别汇总「已装/跳过/目标」；未选任何工具时提示并以 0 退出
- [ ] 映射路径单测覆盖 4 工具 × 项目/全局 8 种情况
- [ ] 实测：`install --tools claude,codex --all --force` 同时写入 `.claude/skills/` 与 `.agents/skills/`；`--global` 模式落到 `~` 下对应目录（测试用临时 HOME 隔离）
