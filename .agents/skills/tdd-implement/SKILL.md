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

每个 issue 开始时记录 `issue_base = HEAD`。一个 issue 可以包含一个或多个 commits；不要求固定 commit 数量，也不为满足数量约束强制 amend、squash 或重写历史。

生命周期：

`Red-Green → Verify → Review → Finalize`

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

**出口：**

- 当前 issue 所需最终验证通过；
- 要求的真实运行验证完成。

### ③ Review

Verify 通过后读取 [review.md](references/review.md)。

先将当前 issue 交付所需的代码、测试、文档和配置形成 committed Review Point，再按 `review.md` 完成一次完整 Review 与必要的增量 Review。

完整 Review 的审查维度、reviewer 数量、提示词和输出格式仍以 [code-review](.agents/skills/code-review/SKILL.md) 为唯一事实源。

**出口：**

- `full_review_done = true`；
- `open_findings` 为空；
- `review_head` 已记录；
- 当前 issue 的实现范围已完整进入 Review 证据。

## Finalize

Review 通过后读取 [finalize.md](references/finalize.md)，只做 tracker/progress/status 收尾并记录 `issue_head`。

Finalize 不新增产品 Behavior，也不修改已经 Review 的实现内容。若收尾时发现实现、测试、文档/配置或验证遗漏，停止当前 issue，不标记 `resolved`，并按 `finalize.md` 报告遗漏请求决策；不得在 Finalize 中补改或重新进入 Red-Green、Verify 或 Review。

## 运行纪律

- Red-Green 必须覆盖当前 issue 的全部待实现 Behavior，不能只对第一个改动执行 TDD。
- 一个 Behavior 完成后继续下一个 Behavior，直到 Step ① 出口满足。
- Verify 只做当前 issue 必要的最终验证；已通过的等价验证不机械重复。
- 完整 Review 前必须形成 committed Review Point；不得用未提交 working tree 代替 `code-review` 所需的 committed diff。
- 每个 issue 只有一次逻辑上的完整双轴 Review；完整 Review 之后只处理增量 Review。技术失败或中断的恢复规则以 `review.md` 为准。
- 当前 issue Review 与 Finalize 完成后，才能进入下一个 issue；下一个 issue 以当时的 `HEAD` 作为新的 `issue_base`。
- 当前 Step 达到出口后继续进入下一 Step；仅在需要用户决策或存在外部阻塞时暂停。

## References

- TDD：[tdd](.agents/skills/tdd/SKILL.md)
- Verify：[verify.md](references/verify.md)
- Review：[review.md](references/review.md)
- Finalize：[finalize.md](references/finalize.md)
- 完整 Review：[code-review](.agents/skills/code-review/SKILL.md)
- 多 issue 编排：[orchestration.md](references/orchestration.md)
