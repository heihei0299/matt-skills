# Finalize

仅在 batch Review 完成、所有 blocking findings 已关闭且必要验证通过后执行。Finalize 只负责 batch 内 issue 的状态收敛与证据归档，不新增产品 Behavior，不修改产品实现，不偷偷补测试。

## 步骤

1. 确认 `batch_review_head` 已记录为本 batch 唯一一次 `code-review` 的 Review Point，且 `full_review_done = true`。
2. 若存在 finding-fix，确认它位于 `batch_review_head` 之后、是本轮唯一 finding-fix commit，且已完成必要验证；不得对它再次 Review。
3. 汇总全部 issue 的 Acceptance、TDD、Verify、Review 和 finding-fix evidence，准备 tracker/progress/status 的最终状态。
4. 若发现任何实现、测试、交付文档、配置或验证遗漏，立即停止 batch：保持 issue 为 `verified_pending_review` 或 `failed`，不标记 `resolved`，不解除 blockers，并报告遗漏请求决策。不得在 Finalize 中补改或自动重新进入 Red-Green、Verify 或 Review。
5. 仅在未发现遗漏后，将 `verified_pending_review → resolved`，解除已满足的 blockers，并设置每个完成 issue 的 `issue_head = HEAD`。

Finalize 不为单个 issue 创建 status commit；普通 Finalize 不创建 commit。Issue 的最终状态只能在 batch Review/fix 完成后统一收敛，避免 reviewer 发现 blocking bug 后出现状态反转。

## Batch State Sync

batch Finalize 完成后，如仓库内 tracker/progress/status 存在待同步状态，统一写入全部待同步内容，最多 1 个 batch state-sync commit。该 commit：

- 不混入产品实现、测试、交付文档或配置；
- 不属于任何单个 issue 的 `issue_base...issue_head` 范围；
- 不因 issue 数量增加而拆成多个 status commits；
- 不触发新的 `code-review`。

## 出口

- Acceptance Criteria 全部通过；
- batch Review 已完成，`batch_review_head` 已记录；
- 如有 finding-fix commit，其必要验证已通过且未执行第二次 Review；
- Finalize 未发现实现、测试、交付文档、配置或验证遗漏；
- tracker/progress/status 已同步，或已进入本批次唯一的待同步集合；
- 所有完成 issue 的 `issue_head = HEAD`；
- 完成 issue 已 `resolved`，已满足的 blockers 已解除。
