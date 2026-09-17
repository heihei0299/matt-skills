# Finalize

仅在 Verify 与 Review 通过后执行。Finalize 只负责 tracker/progress/status 收尾，不新增产品 Behavior，也不修改已经 Review 的代码、测试、交付文档或配置。

## 步骤

1. 确认 `review_head` 已记录，且 `issue_base...review_head` 对应的实现范围已经完成 Review。
2. 更新 Acceptance Criteria 与 progress/tracker，记录已 Review 的实现范围、Review、验证与运行结果，并同步 `resolved` / blockers 状态。
3. 若上述状态同步修改了仓库内的 tracker/progress/status 文件，将这些状态修改提交；不得在该提交中混入产品实现或其它未 Review 的交付修改。
4. 确认所有必要状态同步成功后，设置 `issue_head = HEAD`。

无需为了固定 commit 数量而 amend、squash 或重写当前 issue 的历史。

若 Finalize 中发现遗漏：

- 仅缺验证证据：返回 Verify 补足证据，再回 Finalize；
- 需要修改代码、测试、交付文档或配置：将该遗漏加入 `open_findings`，返回对应 Red-Green / Verify 完成修改与验证，提交修复后按 `review.md` 做增量 Review；`full_review_done` 保持为 `true`。

不得在 Finalize 中直接补实现后继续标记完成。

## 出口

- Acceptance Criteria 全部通过；
- `issue_base...review_head` 的实现范围已经完成 Review；
- tracker/progress/status 与实际 Review、验证和完成状态一致；
- `review_head` 之后若存在 commits，只包含当前 issue 的状态收尾修改；
- `issue_head = HEAD` 已记录；
- issue 已 `resolved`，已满足的 blockers 已解除。
