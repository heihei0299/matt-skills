---
name: tdd-implement
description: "完成已确认的 spec/ticket 的 test-first/TDD 交付闭环。"
disable-model-invocation: true
---

# TDD Implement

完成已确认的 spec/task。TDD 的红绿语义、测试质量、seam 和 mock 规则以 [tdd](.agents/skills/tdd/SKILL.md) 为唯一事实源；本技能负责 issue 级实现、证据记录，以及 batch 级 Review 与收尾编排。

> Ticket defines WHAT. TDD determines HOW to prove it. Repository determines HOW to implement it.

## 入口

- **单 issue**：使用下方同一套 issue 与 batch lifecycle，等价于 batch size = 1。
- **多 issue**：存在多个 `Type: task` 时，读取 [orchestration.md](references/orchestration.md) 后按依赖顺序执行。
- `research`、`prototype`、`grilling` 类型任务分流到对应技能。

正常 Red-Green / Verify 执行由当前 session 原生完成，不为每个 Behavior 或 issue 常规派发 implementer/reviewer。子代理只用于证据不足、证据冲突、复杂诊断等异常升级；常规独立 Review 只发生在 batch 末尾。

## Issue lifecycle:

`Red-Green → Verify → Record`

Issue 状态可使用 `ready`、`in_progress`、`verified_pending_review`、`resolved`、`blocked`、`failed`。`verified_pending_review` 不是最终完成；只有 batch Review 与 finding fix 完成后才收敛为 `resolved`。

### ① Red-Green

按 `tdd` 完成当前 issue 的所有 Acceptance Criteria。

将需要实现或修改的内容拆成可独立验证的 Behavior。一次只推进一个 Behavior：每个尚未实现的 Behavior 都必须分别完成 `tdd` 的 Red → Green cycle，完成后才能进入下一个 Behavior。已有行为若无需修改且已由现有测试充分覆盖，不强制制造 Red。

**出口：**所有需要实现或修改的 Behavior 均完成各自的 Red → Green cycle，Acceptance Criteria 对应行为通过相关验证。

### ② Verify

读取 [verify.md](references/verify.md)，执行当前 issue 所需的最终验证。Verify 只覆盖必要范围，不重复等价验证。

**出口：**当前 issue 所需最终验证通过，并完成要求的真实运行验证；状态进入 `verified_pending_review`。

### ③ Record Evidence

Verify 后将每个 issue 的最小充分证据写入 git-ignored `.scratch/tdd-implement/` ledger。只记录命令/场景和结果，不保存完整测试输出；记录 ticket/repository 冲突时使用 `Ruling: <finding> — <decision and why> — <cost if wrong>`。

```text
Issue: <id>
issue_base: <sha>
issue_head: <sha>

Acceptance:
- AC1 → PASS
- AC2 → PASS

TDD:
- behavior A → RED → GREEN
- behavior B → RED → GREEN

Verify:
- <command/scenario> → PASS

Rulings:
- none
```

**出口：**ledger 完整，包含 Acceptance、TDD、Verify 和 Rulings 结果；未将 `verified_pending_review` 对外宣称为最终 `resolved`。

## Batch lifecycle:

`Batch Review → Finding Fix → Finalize → State Sync`

全部当前 batch 可执行 issue 都完成 Red-Green、Verify 和 Evidence Record 后，才进入 batch lifecycle。batch review 是整个 execution batch 唯一的 fresh `code-review`；issue loop 内不调用 `code-review`。

### Batch Review

读取 [review.md](references/review.md)，将 batch 内全部交付代码、测试、文档和配置形成唯一的 committed Review Point，再以 `batch_base...batch_review_head` 调用一次 `code-review`。继续复用 [code-review](.agents/skills/code-review/SKILL.md) 的 Standards / Spec 双轴结构，不修改其机制。

### Finding Fix

读取 [review.md](references/review.md) 的 finding-fix contract。Behavioral finding 通过真实 RED → GREEN 证据修复；non-behavioral finding 直接修复并做必要验证。全部 blocking findings 一次处理，最多一个 finding-fix commit；修复后不再次调用 `code-review`，不执行 Incremental Review。

### Finalize

读取 [finalize.md](references/finalize.md)。Finalize 只归档 Acceptance、Review、finding 和验证证据，将 `verified_pending_review → resolved`，解除已满足的 blockers，并记录最终 issue/batch head；不新增 Behavior、不修改产品实现、不偷偷补测试。

### State Sync

batch 结束时统一同步仓库内 tracker/progress/status；如确有待同步状态，最多创建 1 个 batch state-sync commit，且不混入产品实现或任何单个 issue 的提交范围。

## 运行纪律

- Red-Green 必须覆盖当前 issue 的全部待实现 Behavior；Red-Green / Verify 不按 Behavior、阶段或验证动作拆 commit。
- Verify 通过后先记录 evidence；不要因单个 issue 已验证就提前 Review 或宣称 resolved。
- batch Review 前必须满足全部 issue Verify、ledger 完整、交付修改已提交且 working tree 没有遗漏。
- 整个 execution batch 的 `code-review calls = 1`、`per-issue review = 0`、`incremental review = 0`。
- 只有外部阻塞、需要用户决策、destructive / irreversible 操作、安全敏感行为或 ticket/plan 已无法可靠解释时才暂停。
- 仅在当前 Step 达到出口后继续下一 Step；发现失败时保留实际状态，不把失败静默当作完成。

## References

- TDD：[tdd](.agents/skills/tdd/SKILL.md)
- Verify：[verify.md](references/verify.md)
- Batch Review / Finding Fix：[review.md](references/review.md)
- Finalize / State Sync：[finalize.md](references/finalize.md)
- 唯一 Review：[code-review](.agents/skills/code-review/SKILL.md)
- 多 issue 编排：[orchestration.md](references/orchestration.md)
