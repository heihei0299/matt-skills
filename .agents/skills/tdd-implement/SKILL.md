---
name: tdd-implement
description: "完成已确认的 spec/ticket 的 test-first/TDD 交付闭环。"
disable-model-invocation: true
---

# TDD Implement

`seam` + `red-green` 为领衔词的完整实现编排：每个 seam 一个红-绿循环，直到 commit。TDD 语义（红-绿循环、seam 定义、好测试标准）以 [tdd 技能](.agents/skills/tdd/SKILL.md) 为唯一事实源——测试标准见 [tdd/tests.md](.agents/skills/tdd/tests.md)，Mock 边界见 [tdd/mocking.md](.agents/skills/tdd/mocking.md)；本技能只编排阶段与运行时规则。

本技能是**长程任务**（Long-Horizon Skill）：多阶段串行执行，自带**回合连续性**（Turn Continuity）与**任务分解**（Chunking）规则。术语定义见 `CONTEXT.md`，技能设计规则见 `docs/agents/skill-design.md`。

## 分支

- **入口**：单 `spec` 文件（`.scratch/<feature>/spec.md` 或等价）/ `Type: task` 的 `issue`（`wayfinder`/`to-tickets` 产出）均视同单 `task`，走下节 Steps ①→⑦；`Type: research/prototype/grilling` 分流至对应技能。
- **多 issue 编排**：`.scratch/<feature>/issues/` 下多 `task` 时走编排模式——见上节与 [orchestration.md](references/orchestration.md)。
## 多 issue 编排（按依赖串行，主代理直接执行）

触发见 [orchestration.md](references/orchestration.md)；`.scratch/<feature>/issues/` 下多文件时触发，主过程 A0 依赖图 → A1 Kahn 分层 L1入度0→L2→Ln → A2 主代理串行调度（按层串行、层内亦串行，主代理直接执行完整 ①→⑦，禁止子代理派发；每 issue 单独 `commit`，绿后即 `code-review` + `commit-check` 双门禁） → A3 层收敛 → A4 全量收敛。`Blocked by` 仍为排序输入，三入口（单 `spec` / `Type: task` issue / `wayfinder task`）同构。强制维护 `.scratch/<feature>/progress.md`（`DAG` + `Layers` + `Progress` 表，派生视图，真相源为 `spec` + `issues/*.md`）。
## Steps

按序执行，每步达到完成条件才进入下一步；进入任一步前先读取其在 [stages.md](references/stages.md) 的定义。

| Step | 做什么 | 完成条件（可验证） | 详规 |
|------|--------|-------------------|------|
| ① 理解需求 | 读取入口并建立验证矩阵 | 需求无待决歧义，验证命令已确定 | [stages.md#阶段-①](references/stages.md#阶段-①理解需求) |
| ② 确认 Seams | 从明确 spec/ticket 生成 seams 与 Todo；详规列出的确认门槛例外（含破坏性操作） | seams/Todo 已生成且无待决歧义 | [stages.md#阶段-②](references/stages.md#阶段-②确认-seams测试接缝) |
| ③ TDD 开发循环 | 逐 seam 红-绿循环（红→绿→typecheck）串行推进 | 所有 seams 红-绿完成 + typecheck 通过 | [stages.md#阶段-③](references/stages.md#阶段-③tdd-开发循环) |
| ④ 最终全量测试 | 所有 issue 完成后按验证矩阵只运行一次全量命令；多 issue 由 A4 执行，单 spec 在 issue 收尾后执行 | 全量测试通过 | [stages.md#阶段-④](references/stages.md#阶段-④完整测试套件) |
| ⑤ Code Review | 每个 issue 恰好执行一次 Standards + Spec 双轴 review；findings 只做 targeted 修复，不再次 review | 每个 issue 的一次 review 已完成 | [stages.md#阶段-⑤](references/stages.md#阶段-⑤code-review) |
| ⑥ Commit | 运行一次最终 commit-check 门禁并提交 | commit 完成且历史校验通过 | [stages.md#阶段-⑥](references/stages.md#阶段-⑥commit) |
| ⑦ 收尾 | 复核门禁证据，处理 issue 总结与目录卫生 | 总结完成、工作区干净 | [stages.md#阶段-⑦](references/stages.md#阶段-⑦收尾文档对齐--issue-状态--实施总结) |
主代理串行时每个 `task` 先走 `①→②→③→⑤→⑥→⑦` 并单独 commit；所有 issue 完成后再执行阶段④全量收敛（单 spec 只有一个 issue，也在其收尾后执行一次）。

### 阶段间流转

- 正常流转：出口条件满足即进入下一阶段，不在阶段间停顿。
- 回退路由：见 [stages.md#回退路由](references/stages.md#回退路由)；编排模式回退见 [orchestration.md](references/orchestration.md)。
- 回合连续性与任务分解：见 [stages.md ③-3e/3f](references/stages.md#阶段-③tdd-开发循环)（红→绿→typecheck→下一 seam 一个回合内串行完成，直至阶段出口；预告下一步后立即执行；write>150 行/replace>5 处拆小步）。

## 引用

- TDD 核心规则：[tdd 技能](.agents/skills/tdd/SKILL.md)
- 测试标准：[tdd/tests.md](.agents/skills/tdd/tests.md)
- Mock 指南：[tdd/mocking.md](.agents/skills/tdd/mocking.md)
- Commit 门禁：[commit-check](.agents/skills/commit-check/SKILL.md)
- 单线详规：[stages.md](references/stages.md)
- 多 issue 编排详规：[orchestration.md](references/orchestration.md)（A0-A1 排序 + 主代理串行，不含子代理）
