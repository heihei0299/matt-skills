---
name: tdd-implement
description: "完成已确认的 spec/ticket 的 test-first/TDD 交付闭环。"
disable-model-invocation: true
---

# TDD Implement

完成已确认的 spec/task。TDD 的红绿语义、测试质量、seam 和 mock 规则以 [tdd](.agents/skills/tdd/SKILL.md) 为唯一事实源；本技能负责 issue 级实现、验证、证据记录与收尾编排。

> Ticket defines WHAT. TDD determines HOW to prove it. Repository determines HOW to implement it.

## Issue context scope

Implementation context is current-issue scoped.

At issue startup:
1. Read the current issue body.
2. Do not read future issue bodies.
3. Future issues may be inspected only by compact metadata: ID, title, status, and dependency.
4. Expand another issue only when the current issue explicitly depends on a contract that cannot otherwise be resolved.
5. Read only the specific dependent section needed.

If the complete active Skill content is already present in the current conversation, do not read the same Skill file again merely to confirm its rules.

Re-read only when:
- the conversation contains only a partial/summary copy;
- the file is known to have changed during the session; or
- the user explicitly requests a fresh read.

This scope does not prohibit current-issue referenced specs, code required to implement the current issue, relevant tests, or a genuinely required dependency contract.

## 入口

- **单 issue**：直接按下方 issue lifecycle 执行。
- **多 issue**：存在多个 `Type: task` 时，读取 [orchestration.md](references/orchestration.md) 后按依赖顺序逐个完成。
- `research`、`prototype`、`grilling` 类型任务分流到对应技能。

正常 Red-Green / Verify 由当前 session 原生完成，不为每个 Behavior 或 issue 常规派发 implementer/reviewer。子代理只用于证据不足、证据冲突、复杂诊断等异常升级。`code-review` 是独立能力，不属于 `tdd-implement` 的自动生命周期；需要 Review 时由用户显式调用。

## Issue lifecycle

`Red-Green → Verify → Record → Finalize`

Issue 状态使用 `ready`、`in_progress`、`verified`、`resolved`、`blocked`、`failed`。

### ① Red-Green

按 `tdd` 完成当前 issue 的所有 Acceptance Criteria。

将需要实现或修改的内容拆成可独立验证的 Behavior。一次只推进一个 Behavior：每个尚未实现的 Behavior 都必须分别完成 `tdd` 的 Red → Green cycle，完成后才能进入下一个 Behavior。已有行为若无需修改且已由现有测试充分覆盖，不强制制造 Red。

**出口：**所有需要实现或修改的 Behavior 均完成各自的 Red → Green cycle，Acceptance Criteria 对应行为通过相关验证。

### ② Verify

执行当前 issue 所需的最终验证。Verify 只覆盖必要范围，不重复等价验证。

- ticket 要求真实运行验证时，执行与验收目标匹配的实际验证；
- 验证通过后不机械重复等价验证；
- 若修改产生新的 Behavior，返回 Red-Green 对该 Behavior 执行 TDD，完成后再验证受影响范围。

**出口：**当前 issue 所需最终验证通过，并完成要求的真实运行验证；状态进入 `verified`。

### ③ Record

Verify 通过后形成当前 issue 唯一的 delivery commit，并记录最小充分证据：

1. 将当前 issue 已完成并验证的代码、测试、交付文档和配置形成 1 个 delivery commit；不得按 Behavior、阶段或验证动作拆 commit；
2. 设置 `issue_head = HEAD`；
3. 将 evidence 写入 git-ignored `.scratch/tdd-implement/` ledger，只记录命令/场景和结果，不保存完整测试输出；
4. ticket/repository 冲突使用 `Ruling: <finding> — <decision and why> — <cost if wrong>` 记录。

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

**出口：**delivery commit 已形成，`issue_head` 已记录，ledger 包含 Acceptance、TDD、Verify 和 Rulings 结果。

### ④ Finalize

读取 [finalize.md](references/finalize.md)。Finalize 只做当前 issue 的状态收敛和 tracker/progress/status 记录，不新增 Behavior、不修改产品实现、不补测试。

**出口：**当前 issue 已 `resolved`，已满足的 blockers 已解除。

## 运行纪律

- Red-Green 必须覆盖当前 issue 的全部待实现 Behavior；Red-Green / Verify 不按 Behavior、阶段或验证动作拆 commit。
- Verify 通过后形成当前 issue 唯一 delivery commit，再记录 evidence；Finalize 不创建实现 commit。
- `tdd-implement` 不自动调用 `code-review`，不执行 per-issue Review、batch Review 或 Incremental Review。
- 已有充分或等价证据时不重复搜索、读取或验证；后续 issue 优先消费 ledger 与 git history。
- 只有外部阻塞、需要用户决策、destructive / irreversible 操作、安全敏感行为或 ticket/spec 已无法可靠解释时才暂停。
- 当前 Step 达到出口后立即进入下一 Step；发现失败时保留实际状态，不把失败静默当作完成。

## References

- TDD：[tdd](.agents/skills/tdd/SKILL.md)
- Finalize：[finalize.md](references/finalize.md)
- 多 issue 编排：[orchestration.md](references/orchestration.md)
