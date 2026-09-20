# 多 issue 编排

仅在存在多个 `Type: task` issue 时生效。每个 issue 都按 `Red-Green → Verify → Record → Finalize` 独立完成；本文件只负责依赖顺序与 batch state sync。

## 1. 构建依赖图

读取每个 issue 的 `Blocked by`：

- 无依赖时视为可直接调度；
- 引用了其它 issue 时建立依赖边；
- 字段无法解析、依赖节点不存在或出现环时，对受影响 issue 停止调度并报告实际原因，不降级为无依赖。

使用 Kahn 算法按依赖关系分层；层间串行，每层内按 issue 编号串行。状态使用 `ready`、`in_progress`、`verified`、`resolved`、`blocked`、`failed`。

## 2. 串行执行

```text
for each dependency layer:
  for each executable issue:
    issue_base = HEAD
    Red-Green
    Verify
    Record
    Finalize
    issue_head = HEAD
```

- `Red-Green` 与 `Verify` 是当前 issue 的 correctness gate；
- `Record` 形成当前 issue 唯一 delivery commit，设置 `issue_head` 并记录 evidence ledger；
- `Finalize` 只收敛状态、解除已满足 blockers，并把仓库内 tracker/progress/status 变更加入 batch state-sync 集合；
- Issue loop 不调用 `code-review`，不执行 per-issue Review、batch Review 或 Incremental Review。

当前 issue Finalize 完成后，依赖它的 issue 才可进入可执行状态。下一个 issue 以当前 `issue_head` 作为新的 `issue_base`。

## 3. 状态与证据

每个完成 issue 只携带后续调度所需的最小状态：

- `Status`；
- `issue_base`；
- `issue_head`；
- Acceptance、TDD、Verify 和 Rulings evidence；
- 已解除的 blockers。

Issue evidence 使用 `.scratch/tdd-implement/` ledger。后续 issue 不重复研究前序 issue 已确认且已记录的事实；context compact 后优先使用 ledger 与 git history。Ledger 不保存完整测试输出，只保存命令/场景及结果。

## 4. Batch State Sync

全部可执行 issue 完成后，如仓库内 tracker/progress/status 存在待同步状态，统一写入并最多创建 1 个 batch state-sync commit。该 commit：

- 不混入产品实现、测试、交付文档或配置；
- 不属于任何单个 issue 的 `issue_base...issue_head` 范围；
- 不因 issue 数量增加而拆成多个 status commits；
- 不触发 `code-review`。

## 冲突与失败

- `Blocked by` 无法解析、依赖缺失或存在环：停止受影响调度并报告；
- issue 执行失败：保持未完成，按失败所在 Step 处理；其依赖项继续保持 `blocked`；
- 多个 issue 修改同一位置且无法安全串行归属：暂停相关 issue，请求用户决定；
- 外部权限、工具或环境阻塞：记录实际状态，不把失败静默当作完成；
- Finalize 发现实现、测试、交付文档、配置或验证遗漏：当前 issue 不标记 `resolved`，其依赖项继续保持 `blocked`。

## 出口

- 所有可执行 issue 均按依赖顺序完成并有 evidence ledger；
- issue、依赖状态、Acceptance、Verify 与 progress 一致；
- `tdd-implement` 的 `code-review` 调用次数为 0；
- 不存在被误当作已完成的 blocked issue；
- 仓库内状态同步如有需要，只形成最多 1 个 batch state-sync commit。
