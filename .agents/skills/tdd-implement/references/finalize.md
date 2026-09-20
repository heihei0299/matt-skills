# Finalize

仅在当前 issue 完成 Red-Green、Verify、delivery commit 和 Evidence Record 后执行。Finalize 只负责当前 issue 的状态收敛与 tracker/progress/status 记录，不新增产品 Behavior，不修改产品实现，不补测试。

## 步骤

1. 确认当前 issue 的必要验证已通过，`issue_head` 已记录为 delivery commit，evidence ledger 包含 Acceptance、TDD、Verify 和 Rulings 结果。
2. 准备 Acceptance Criteria 与 progress/tracker 的最终状态；外部 tracker 可在此同步，仓库内 tracker/progress/status 只记录为 batch 待同步状态。
3. 若发现任何实现、测试、交付文档、配置或验证遗漏，立即停止当前 issue：保持未完成，不标记 `resolved`，不解除 blockers，并报告遗漏请求决策。不得在 Finalize 中补改，也不得自动重新进入 Red-Green 或 Verify。
4. 仅在未发现上述遗漏后，将当前 issue 标记为 `resolved`，解除已满足的 blockers。
5. Finalize 不创建 commit；设置最终 `issue_head = HEAD`。

## Batch State Sync

本次执行批次结束后，如仓库内 tracker/progress/status 存在待同步状态，统一写入全部待同步内容并最多创建 1 个 batch state-sync commit。该 commit：

- 不混入产品实现、测试、交付文档或配置；
- 不属于任何单个 issue 的 `issue_base...issue_head` 范围；
- 不因 issue 数量增加而拆成多个 status commits；
- 不触发 `code-review`。

## 出口

- Acceptance Criteria 全部通过；
- 当前 issue 必要验证已通过；
- delivery commit 与 evidence ledger 已记录；
- Finalize 未发现实现、测试、交付文档、配置或验证遗漏；
- tracker/progress/status 已同步，或已进入本批次唯一的待同步集合；
- `issue_head = HEAD`；
- issue 已 `resolved`，已满足的 blockers 已解除。
