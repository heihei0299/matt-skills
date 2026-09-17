# Review

仅在 Verify 通过后执行。本文件负责当前 issue 的 committed Review Point、Review 状态与增量复核；完整 Review 的维度、reviewer 数量、提示词和输出格式仍以 `code-review` 为唯一事实源。

## 状态

当前 issue 首次进入 Review 时初始化以下状态，且仅初始化一次；后续因 finding 修复返回 Red-Green / Verify 后继续 Review 时保留现有状态，不得重新初始化：

- `issue_base`：当前 issue 开始时的 `HEAD`；
- `full_review_done = false`；
- `open_findings = []`；
- `last_reviewed_head = null`；
- `review_head = null`；
- `incremental_review_rounds = 0`。

## 1. 形成 committed Review Point

完整 Review 前：

1. 确认当前 issue 交付所需的代码、测试、文档和配置均已完成；
2. 若最后的文档/配置修改影响已验证证据，重新验证受影响范围；
3. 将当前 issue 已完成并验证的交付修改提交到当前 branch；
4. 确认不存在属于当前 issue 交付内容的未提交修改。

一个 issue 可以在这里已有一个或多个 commits。Commit 是 Review artifact，不代表 issue 已完成。

完整 Review 使用：

- fixed point：`issue_base`；
- review target：当前 `HEAD`；
- diff：`issue_base...HEAD`；
- spec source：当前 issue/spec。

不得用未提交 working tree 代替该 committed diff。

## 2. 完整 Review

当 `full_review_done = false` 时，只启动一次逻辑上的完整 `code-review`。

只有 `code-review` 要求的审查轴均正常返回并形成完整聚合结果后，才：

- 设置 `full_review_done = true`；
- 将 blocking findings 写入 `open_findings`；
- 设置 `last_reviewed_head = HEAD`。

工具错误、stream interruption、sub-agent failure 或其它未形成完整聚合结果的技术失败，不改变 `full_review_done`、`open_findings` 或 `last_reviewed_head`。恢复时只补足缺失的执行结果；这种技术重试不算新的逻辑完整 Review。

`full_review_done = true` 后，完整 `code-review` 路径关闭，不得再次启动完整双轴 Review。

若 `open_findings` 为空，设置 `review_head = last_reviewed_head`，Review 通过。

## 3. 增量 Review

存在 `open_findings` 时，只处理已有 finding，不扩大当前 issue 范围。可将由同一改动共同解决的相关 findings 一起处理，不要求“一 finding 一 commit”。

每个 issue 最多执行 2 个逻辑增量 Review 轮次。只有正常形成增量 Review 结论的轮次才计数；工具错误、stream interruption、sub-agent failure 或其它未形成完整结论的技术失败不消耗轮次，只重试当前逻辑轮次。

每轮修复前，若 `incremental_review_rounds >= 2` 且 `open_findings` 仍非空，则停止当前 issue：不得再次启动增量 Review，不设置 `review_head`，不得进入 Finalize，并报告剩余 findings 请求决策。

每轮修复：

1. 修复选定的 open findings；
2. 若修复产生新的 Behavior，返回 Red-Green 对该 Behavior 执行 TDD；否则直接进入受影响证据的重新验证；
3. 重新验证修复直接影响的证据；
4. 将本轮修复提交到当前 issue 的 commit range，并确认不存在属于本轮修复的未提交修改；
5. 只针对 `last_reviewed_head...HEAD` 与本轮目标 findings 做增量 Review；增量 Review 不调用完整 `code-review`。

若增量 Review 正常形成结论，先设置 `incremental_review_rounds += 1`。

增量 Review 通过时：

- 仅关闭本轮已由证据确认解决的 findings；
- 设置 `last_reviewed_head = HEAD`。

增量 Review 正常完成但未通过时：

- 保留未关闭 findings；
- 不推进 `last_reviewed_head`；
- 若尚未达到 2 轮上限，下一轮继续从上一次成功的 `last_reviewed_head` 审查累计的未 Review 修复。

增量 Review 发生技术失败时：

- 不增加 `incremental_review_rounds`；
- 不推进 `last_reviewed_head`；
- 不移除未确认关闭的 findings；
- 恢复后重试当前逻辑轮次。

当 `open_findings` 为空时，设置 `review_head = last_reviewed_head`，Review 通过。

当 `incremental_review_rounds = 2` 且 `open_findings` 仍非空时，Review 不通过：保持 issue 未完成，不设置 `review_head`，不进入 Finalize，并报告剩余 findings 请求决策。

## 出口

- `full_review_done = true`；
- `open_findings` 为空；
- `review_head` 非空；
- `incremental_review_rounds <= 2`；
- `issue_base...review_head` 是已经完成 Review 的当前 issue 实现范围；
- 不存在属于该实现范围的未提交交付修改。
