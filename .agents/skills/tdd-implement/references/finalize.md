# Finalize

仅在 Verify 与 Review 通过后执行；不新增产品 Behavior。Git 提交数量与粒度由当前仓库规则和用户指令决定，本文件不另行规定。

1. 完成实现要求的必要 docs/config 同步。
2. 更新 Acceptance Criteria 与 progress/tracker，记录 Review、验证与运行结果；若当前仓库策略已产生 commit，可记录对应 commit。
3. 将 issue 标记 `resolved`，并解除已满足的 blockers。
4. 若当前仓库规则或用户指令要求提交，按其 Git policy 执行。

若发现实现或验证遗漏，返回对应 Step 完成后再收尾。

## 出口

- Acceptance Criteria 全部通过；
- issue、blockers 与 tracker/progress 和实际完成状态一致；
- Git 行为符合当前仓库规则与用户指令。
