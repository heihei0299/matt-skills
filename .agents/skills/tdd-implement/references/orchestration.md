# 多 issue 编排

仅在存在多个 `Type: task` issue 时生效。每个 issue 仍按 `Red-Green → Verify → Review → Finalize` 独立完成；本文件只负责依赖顺序与 issue 边界推进。

## 1. 构建依赖图

读取每个 issue 的 `Blocked by`：

- 无依赖时视为可直接调度；
- 引用了其它 issue 时建立依赖边；
- 字段无法解析、依赖节点不存在或出现环时，对受影响 issue 停止调度并报告实际原因，不降级为无依赖。

使用 Kahn 算法按依赖关系分层；层间串行，每层内按 issue 编号串行。

## 2. 串行执行

```text
for each layer:
  for each issue:
    issue_base = HEAD
    Red-Green
    Verify
    Review
    Finalize
    issue_head = HEAD
```

`Review` 包含当前 issue committed Review Point 的形成以及完整/增量 Review；具体以 `SKILL.md` 与 `review.md` 为准。

一个 issue Finalize 完成后立即进入下一个可调度 issue。下一个 issue 以当前 `issue_head` 作为新的 `issue_base`。前置 issue 未完成时，其依赖项保持 `blocked`。

验证与 Finalize 分别以 `verify.md`、`finalize.md` 为准，本文件不重复定义其内部规则。

## 3. 状态收敛

每个 issue Finalize 后只携带后续调度所需的最小状态：

- `Status`；
- `issue_base`；
- `review_head`；
- `issue_head`；
- Review 与验证结果；
- 已解除的 blockers。

其中：

- `issue_base...review_head` 是已完成 Review 的实现范围；
- `issue_base...issue_head` 是当前 issue 的完整提交范围；
- `issue_head` 是下一个 issue 的 `issue_base`。

当前层所有 issue 完成后进入下一层。全部层完成后，确认 issue 与 progress 状态一致即可结束；不额外扩大验证范围，也不再次执行完整 Review。

## 冲突与失败

- `Blocked by` 无法解析、依赖缺失或存在环：停止受影响调度并报告。
- issue 执行失败：保持未完成，按失败所在 Step 处理；其依赖项继续保持 `blocked`。
- 多个 issue 修改同一位置且无法安全串行归属：暂停相关 issue，请求用户决定。
- 外部权限、工具或环境阻塞：记录实际状态，不把失败静默当作完成。

## 出口

- 所有可执行 issue 均按依赖顺序完成；
- issue、依赖状态与 progress 一致；
- 每个完成 issue 的 `issue_base`、`review_head` 与 `issue_head` 边界明确；
- 不存在被误当作已完成的 blocked issue。
