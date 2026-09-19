# Batch Review

仅在 batch 内全部可执行 issue 完成 Red-Green、Verify 和 Evidence Record 后执行。本文件负责 batch 的 committed Review Point、唯一一次 `code-review` 和 finding-fix；`code-review` 的维度、reviewer 数量、提示词和输出格式仍以 [code-review](.agents/skills/code-review/SKILL.md) 为唯一事实源。

## 状态

batch 首次进入 Review 时初始化以下状态，且仅初始化一次：

- `batch_base`：batch 开始时的 `HEAD`；
- `batch_review_head = null`；
- `full_review_done = false`；
- `open_findings = []`。

整个 execution batch 的调用约束是：

```text
code-review calls = 1
per-issue review = 0
incremental review = 0
```

## Review 前置条件

开始 Review 前确认：

- batch 内全部 issue 已完成 Red-Green 和 Verify；
- 每个 issue 的 evidence ledger 完整；
- 所有交付代码、测试、文档和配置均已完成并提交；
- working tree 不包含当前 batch 的交付遗漏；
- 当前 `HEAD` 可作为唯一 batch Review Point。

未满足前置条件时，不调用 `code-review`，保持 issue 为 `verified_pending_review` 并报告缺口。

## 1. 形成 batch Review Point

调用 `code-review` 前，将 batch 内全部已验证交付修改合并形成唯一的 committed Review Point。不得按 issue、Behavior、阶段或验证动作拆分 Review Point；不得用未提交 working tree 代替 committed diff。

唯一一次 Review 的输入是：

- fixed point = `batch_base`；
- review target = `batch_review_head`；
- diff = `batch_base...batch_review_head`；
- spec sources = batch 内全部 tickets；
- evidence = execution ledger。

## 2. 唯一一次 code-review

整个 execution batch 只调用 1 次 `code-review`，且发生在全部 issue Verify 之后。调用开始前确认 `full_review_done = false`；调用一旦启动即消耗本 batch 唯一机会。

若调用正常形成完整聚合结果：

- 设置 `full_review_done = true`；
- 设置 `batch_review_head = HEAD`，记录本次唯一 fresh Review 的 committed Review Point；
- 将 blocking findings 写入 `open_findings`。

若该次调用因技术原因未形成完整聚合结果，停止当前 batch 并报告实际失败；不得重跑 `code-review`，不得进入 Finalize。

若 `open_findings` 为空，batch Review 完成，进入 Finding Fix 的空步骤，再进入 Finalize。

## 3. Finding Fix

若 `open_findings` 非空，一次性处理当前全部 blocking findings，不扩大当前 batch 范围，最多一个 finding-fix commit。

### Behavioral finding

行为性 finding 必须走真实的最小 TDD 修复证据：

```text
Behavioral finding
    ↓
write reproducing test
    ↓
RED
    ↓
minimal fix
    ↓
GREEN
    ↓
affected verification
```

### Non-behavioral finding

文档、naming、配置说明或其它非行为性 finding 直接修复，再执行 targeted verification，不为它制造虚假的行为测试。

Finding Fix 的共同约束：

- 不按 finding 拆分 commit；
- behavioral finding 必须有真实 RED → GREEN 证据；
- 所有必要验证必须通过；
- 修复后不得再次调用 `code-review`；
- 不执行 Incremental Review；
- 修复无法完成或验证失败时，batch 不进入 Finalize，保留未解决 findings。

验证通过后，将全部修复合并为最多 1 个 finding-fix commit。该 commit 位于 `batch_review_head` 之后，不属于再次 Review 的输入。

## 出口

- `full_review_done = true`；
- `batch_review_head` 非空，且指向唯一一次 `code-review` 的 Review Point；
- `open_findings` 为空；
- Incremental Review 调用次数为 0；
- `code-review` 调用次数为 1；
- 当前 `HEAD` 为 `batch_review_head`，或为其后的唯一 finding-fix commit；
- 不存在属于当前 batch 的未提交交付修改。
