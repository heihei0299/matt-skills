# Finalize

仅在当前 issue 完成 Red-Green、Verify、delivery commit 和 Evidence Record 后执行。Finalize 只负责当前 issue 的收尾检查与状态收敛，不新增产品 Behavior，不修改产品实现，不补测试。

## 步骤

1. 确认当前 issue 的必要验证已通过，`issue_head` 仍指向 delivery commit，evidence ledger 包含 Acceptance、TDD、Verify 和 Rulings 结果。
2. 确认当前 issue 的实现、测试、交付文档和配置均已包含在 delivery commit 中。
3. 若发现任何实现、测试、交付文档、配置或验证遗漏，立即停止当前 issue：保持未完成，不标记 `resolved`，不解除 blockers，并报告遗漏请求决策。不得在 Finalize 中补改，也不得自动重新进入 Red-Green 或 Verify。
4. 仅在未发现上述遗漏后，将当前 issue 标记为 `resolved`，解除已满足的 blockers。
5. Finalize 不创建 commit，也不改变 `issue_head`。

## 出口

- Acceptance Criteria 全部通过；
- 当前 issue 必要验证已通过；
- delivery commit 与 evidence ledger 已记录；
- Finalize 未发现实现、测试、交付文档、配置或验证遗漏；
- `issue_head` 仍指向 delivery commit；
- issue 已 `resolved`，已满足的 blockers 已解除。
