# 多 issue 编排

仅在存在多个 `Type: task` issue 时生效。单 issue 也使用同一套 batch lifecycle，等价于 batch size = 1。

## 1. 构建依赖图

读取每个 issue 的 `Blocked by`：

- 无依赖时视为可直接调度；
- 引用了其它 issue 时建立依赖边；
- 字段无法解析、依赖节点不存在或出现环时，对受影响 issue 停止调度并报告实际原因，不降级为无依赖。

使用 Kahn 算法按依赖关系分层；层间串行，每层内按 issue 编号串行。状态使用 `ready`、`in_progress`、`verified_pending_review`、`resolved`、`blocked`、`failed`。

## 2. Issue loop

记录 batch 开始时的 `batch_base = HEAD`。每个 issue 只执行 issue-level correctness gate，不在 loop 内进行 Review：

```text
batch_base = HEAD

for each dependency layer:
  for each executable issue:
    issue_base = HEAD
    Red-Green
    Verify
    Record Evidence
    issue_head = HEAD
    status = verified_pending_review
```

每个 issue Verify 后必须有完整 evidence ledger，才能进入 `verified_pending_review`。该状态不是最终 `resolved`，也不能提前对外宣称完成。前置 issue 未完成时，其依赖项保持 `blocked`；当前 issue 失败时保持 `failed`，依赖项不被错误放行。

下一个 issue 以当前 `issue_head` 作为新的 `issue_base`。Issue loop 不调用 `code-review`，不执行 Incremental Review，也不因 issue 数量拆分 Review Point。

## 3. Batch lifecycle

全部当前 batch 可执行 issue 完成后，确认 batch 内全部 issue 已 Verify，且 Red-Green、Evidence Record 和 evidence ledger 完整，才执行：

```text
after all executable issues:
  Batch Review
  Finding Fix
  Finalize completed issues
  Batch State Sync
```

- `Batch Review` 以 `batch_base` 为 fixed point，以当前全部交付修改形成的 `batch_review_head` 为唯一 Review Point，整个 batch 只调用 1 次 `code-review`；
- `Finding Fix` 一次处理全部 blocking findings。Behavioral finding 必须有 RED → GREEN 证据；修复后不再 Review；
- `Finalize completed issues` 将 `verified_pending_review` 统一收敛为 `resolved`，记录 Acceptance、Review、finding 和 Verify 证据；
- `Batch State Sync` 统一同步 tracker/progress/status，最多创建 1 个不属于任何单个 issue 范围的 state-sync commit。

`batch_review_head` 只记录 batch 的 fresh Review Point；finding-fix 若存在位于其后，但不重新调用 `code-review`。整个 execution batch 的 `code-review calls = 1`、`per-issue review = 0`、`incremental review = 0`。

## 4. 状态与证据

每个完成 issue 只携带后续调度所需的最小状态：

- `Status`；
- `issue_base`；
- `issue_head`；
- Acceptance、TDD、Verify 和 Rulings evidence；
- batch Review、finding-fix 与最终状态；
- 已解除的 blockers。

Issue evidence 使用 `.scratch/tdd-implement/` ledger。后续 issue 不重复研究前序 issue 已确认且已记录的事实；context compact 后优先使用 ledger 与 git history。Ledger 不保存完整测试输出，只保存命令/场景及结果。

## 冲突与失败

- `Blocked by` 无法解析、依赖缺失或存在环：停止受影响调度并报告；
- issue 执行失败：保持未完成，按失败所在 Step 处理；其依赖项继续保持 `blocked`；
- 多个 issue 修改同一位置且无法安全串行归属：暂停相关 issue，请求用户决定；
- 外部权限、工具或环境阻塞：记录实际状态，不把失败静默当作完成；
- Batch Review 或 finding-fix 未完成、无法修复或必要验证失败：batch 不进入 Finalize。

## 出口

- 所有可执行 issue 均按依赖顺序完成并有 evidence ledger；
- 依赖状态、Acceptance、Review、Verify 与 progress 一致；
- batch 只调用 1 次 `code-review`，Incremental Review 调用次数为 0；
- 不存在被误当作已完成的 blocked issue；
- 仓库内状态同步如有需要，只形成最多 1 个 batch state-sync commit。
