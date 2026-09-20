---
description: 显式调用 commit-check，检查工作区候选变更但不自动 staging 或 commit
---

# Commit Check

仅在用户显式调用时加载并执行 `commit-check` 技能。检查 task basis、staged/unstaged/untracked 工作区候选、敏感信息、现有 validation/review evidence 和 commit message；不自动 staging、不 commit、不运行测试或 code review。

**范围或任务依据：** $ARGUMENTS
