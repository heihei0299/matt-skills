# Finalize（非阶段）

仅在 `tdd-implement` Step ③ Verify 通过后读取。Finalize 不计入交付阶段；开始后不新增产品 Behavior，发现实现/测试/文档遗漏时回到对应阶段。

## Commit 前门禁

1. 逐条复核 Acceptance Criteria、Scope Ledger 与 Out of Scope。
2. 确认 README/docs/config/package 与实现一致，且证据对应最后一次修改。
3. 清理本次临时文件和进程；工作区只保留预期改动。
4. 对 staged diff 执行敏感信息扫描。
5. 执行 `git merge-base --is-ancestor $BASE_HEAD HEAD`。
6. 确认 commit message 与暂存区都只覆盖当前 issue，并检查 `git diff --cached`。
7. 创建当前 issue 的独立 commit。

## Tracker 收尾

- 勾选 Acceptance Criteria；
- issue 标记 `resolved`；
- 写实施总结并同步 `.scratch/<feature>/progress.md` 的 Status/Commit/Review/Tests；
- 记录 commit hash/message、最终测试和真实运行结果；
- 清理一次性资源，确认后续 blockers 是否解除。

## Git 安全

历史只能在 `BASE_HEAD` 之后追加；未经用户明确确认不使用 `git reset --hard`、`git checkout .`、`git clean -fd`、`git stash push --include-untracked`、force push 或交互式 rebase 来“清理”目录。

## 出口

- 独立 commit 已创建；
- Acceptance Criteria 全部通过；
- Tracker/progress 与真实完成度一致；
- 工作区无本次临时残留；
- 文档与实现一致，Git history 校验通过。
