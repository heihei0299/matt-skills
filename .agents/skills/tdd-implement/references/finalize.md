# Finalize

仅在 Verify 与 Review 完成后执行。Finalize 只负责 tracker/progress/status 收尾，不新增产品 Behavior，不修改 Review 阶段已经完成的实现或 finding 修复，也不为单个 issue 创建收尾 commit。

## 步骤

1. 确认 `review_head` 已记录为当前 issue 唯一一次 `code-review` 的 Review Point。
2. 若 `HEAD != review_head`，确认 `review_head...HEAD` 只包含唯一的 finding-fix commit，且该修复已经完成必要验证；不得对该 commit 再执行 Review。
3. 准备 Acceptance Criteria 与 progress/tracker 的最终状态，记录唯一 Review、finding 修复（如有）、验证与运行结果。外部 tracker 可在此同步；仓库内 tracker/progress/status 只记录为批次待同步状态，不在当前 issue Finalize 中写入或提交。
4. 若 Finalize 过程中发现任何实现、测试、交付文档、配置或验证遗漏，立即停止当前 issue：保持未完成，不标记 `resolved`，不解除 blockers，不设置成功的 `issue_head`，并报告遗漏请求决策。不得在 Finalize 中补改，也不得自动重新进入 Red-Green、Verify 或 Review。
5. 仅在未发现上述遗漏后，将当前 issue 的完成状态视为 `resolved` 并解除已满足的 blockers；仓库内对应状态仍留待批次 state-sync。
6. Finalize 不创建 commit；设置 `issue_head = HEAD`。

## 批次状态同步

本次执行批次结束后，如仓库内 tracker/progress/status 存在待同步状态，统一写入全部待同步内容并最多创建 1 个 batch state-sync commit。该 commit：

- 不混入产品实现、测试、交付文档或配置修改；
- 不属于任何单个 issue 的 `issue_base...issue_head` 范围；
- 不因 issue 数量增加而拆成多个 status commits。

## 出口

- Acceptance Criteria 全部通过；
- `review_head` 已记录为唯一一次 `code-review` 的 Review Point；
- 如有 finding-fix commit，其必要验证已通过且未执行第二次 Review；
- Finalize 未发现实现、测试、交付文档、配置或验证遗漏；
- tracker/progress/status 已同步，或已进入本批次唯一的待同步集合；
- `issue_head = HEAD`；
- issue 已 `resolved`，已满足的 blockers 已解除。
