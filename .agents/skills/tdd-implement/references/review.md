# Review

仅在 Verify 通过后执行。本文件负责当前 issue 的 committed Review Point、唯一一次 `code-review` 以及 finding 自动修复；`code-review` 的维度、reviewer 数量、提示词和输出格式仍以 `code-review` 为唯一事实源。

## 状态

当前 issue 首次进入 Review 时初始化以下状态，且仅初始化一次：

- `issue_base`：当前 issue 开始时的 `HEAD`；
- `full_review_done = false`；
- `open_findings = []`；
- `review_head = null`。

## 1. 形成 committed Review Point

调用 `code-review` 前：

1. 确认当前 issue 交付所需的代码、测试、文档和配置均已完成；
2. 若最后的文档/配置修改影响已验证证据，重新验证受影响范围；
3. 将当前 issue 已完成并验证的交付修改合并形成当前 issue 唯一的 Review Point commit；不得按 Behavior、阶段或验证动作拆分 commit；
4. 确认不存在属于当前 issue 交付内容的未提交修改。

每个 issue 只形成 1 个 Review Point commit。Commit 是交付 artifact，不是流程日志。

唯一一次 `code-review` 使用：

- fixed point：`issue_base`；
- review target：当前 `HEAD`；
- diff：`issue_base...HEAD`；
- spec source：当前 issue/spec。

不得用未提交 working tree 代替该 committed diff。

## 2. 唯一一次 code-review

每个 issue 最多调用 1 次 `code-review`。

调用开始前确认 `full_review_done = false`。调用一旦启动，即消耗当前 issue 唯一的 `code-review` 机会；不得因 findings、修复、工具错误、stream interruption、sub-agent failure 或其它原因再次调用 `code-review`。

若 `code-review` 正常形成完整聚合结果：

- 设置 `full_review_done = true`；
- 设置 `review_head = HEAD`，记录本次唯一 Review 的 committed Review Point；
- 将 blocking findings 写入 `open_findings`。

若该次调用因技术原因未形成完整聚合结果，停止当前 issue并报告实际失败；不得重跑 `code-review`，不得进入 Finalize。

若 `open_findings` 为空，Review 完成，进入 Finalize。

## 3. blocking findings 自动修复

若 `open_findings` 非空：

1. 一次性直接修复当前全部 blocking findings，不扩大当前 issue 范围；
2. 修复阶段不得返回 Red-Green，不执行 TDD；
3. 对修复直接影响的证据执行必要验证；
4. 验证通过后，将全部修复合并形成最多 1 个 finding-fix commit；不得按 finding 拆分 commit；
5. 修复后禁止 Incremental Review，禁止再次调用 `code-review`；
6. 确认 findings 已按本轮修复处理后清空 `open_findings`。

若修复无法完成或必要验证不通过，停止当前 issue，保留未解决 findings，不进入 Finalize。

finding-fix commit 位于 `review_head` 之后；它是唯一 Review 后的自动修复，不属于再次 Review 的输入。

## 出口

- `full_review_done = true`；
- `review_head` 非空，且指向唯一一次 `code-review` 的 Review Point；
- `open_findings` 为空；
- Incremental Review 调用次数为 0；
- `code-review` 调用次数为 1；
- 当前 `HEAD` 为 `review_head`，或为其后的唯一 finding-fix commit；
- 不存在属于当前 issue 的未提交交付修改。
