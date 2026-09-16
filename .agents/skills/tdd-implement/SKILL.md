---
name: tdd-implement
description: "完成已确认的 spec/ticket 的 test-first/TDD 交付闭环。"
disable-model-invocation: true
---

# TDD Implement

完成已确认的 spec/task。TDD 的红绿语义、测试质量、seam 和 mock 规则以 [tdd](.agents/skills/tdd/SKILL.md) 为唯一事实源；本技能只负责 issue 级实现、验证、Review 与收尾编排。

## 入口

- **单 issue**：直接按下方 Steps 执行。
- **多 issue**：存在多个 `Type: task` 时，读取 [orchestration.md](references/orchestration.md) 后按依赖顺序逐个完成。
- `research`、`prototype`、`grilling` 类型任务分流到对应技能。

## Steps

### ① Red-Green

按 `tdd` 完成当前 issue 的所有 Acceptance Criteria。

将需要实现或修改的内容拆成可独立验证的 Behavior。一次只推进一个 Behavior：每个尚未实现的 Behavior 都必须分别完成 `tdd` 的 Red → Green cycle，完成后才能进入下一个 Behavior。

前一个 Behavior 已完成 TDD，不代表后续 Behavior 可以直接修改实现代码。

已有行为若无需修改且已由现有测试充分覆盖，不强制制造 Red。

**出口：**

- 所有需要实现或修改的 Behavior 均完成各自的 Red → Green cycle；
- Acceptance Criteria 对应行为通过相关验证。

### ② Verify

读取 [verify.md](references/verify.md)，执行当前 issue 所需的最终验证。

最终验证通过且 diff 稳定后进入 Review。

#### Review

每个 issue 维护以下 Review 状态：

- `full_review_done = false`
- `open_findings = []`

当 `full_review_done = false` 时，只调用一次完整 `code-review`。完成后立即设置 `full_review_done = true`，并将 blocking findings 写入 `open_findings`。

当 `full_review_done = true` 时，完整 `code-review` 路径关闭，不得再次启动完整双轴 Review。后续仅处理 `open_findings`：

1. 仅修复对应 finding，不扩大当前 issue 范围；
2. 重新验证该修复直接影响的证据；
3. 直接针对该 finding 与修复 diff 做增量 Review；增量 Review 不调用完整 `code-review`；
4. 复核通过后从 `open_findings` 移除该 finding；
5. 若修复产生新的 Behavior，返回 Red-Green 对该 Behavior 执行 TDD，再回 Verify 验证受影响范围；`full_review_done` 保持为 `true`。

`full_review_done = true` 且 `open_findings` 为空时 Review 才算通过。审查维度、reviewer 数量、提示词和输出格式仍以 `code-review` 为唯一事实源。

**出口：**

- 当前 issue 所需最终验证通过；
- 要求的真实运行验证完成；
- `full_review_done = true`；
- `open_findings` 为空。

## Finalize

Verify 与 Review 通过后读取 [finalize.md](references/finalize.md)，完成当前 issue 的必要同步、tracker/progress 与仓库 Git policy 收尾。

Finalize 不新增产品 Behavior；若发现实现或验证遗漏，回到对应 Step 完成后再收尾。

## 运行纪律

- Red-Green 必须覆盖当前 issue 的全部待实现 Behavior，不能只对第一个改动执行 TDD。
- 一个 Behavior 完成后继续下一个 Behavior，直到 Step ① 出口满足。
- Verify 只做当前 issue 必要的最终验证；已通过的等价验证不机械重复。
- 每个 issue 的完整双轴 Review 只允许从 `full_review_done = false` 进入一次；之后只处理 `open_findings` 的增量 Review。
- Git 提交数量与粒度服从当前仓库规则和用户指令，本技能不另行规定。
- 当前 Step 达到出口后继续进入下一 Step；仅在需要用户决策或存在外部阻塞时暂停。

## References

- TDD：[tdd](.agents/skills/tdd/SKILL.md)
- Verify：[verify.md](references/verify.md)
- Finalize：[finalize.md](references/finalize.md)
- Review：[code-review](.agents/skills/code-review/SKILL.md)
- 多 issue 编排：[orchestration.md](references/orchestration.md)
