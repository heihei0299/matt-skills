---
name: tdd-implement
description: "TDD seam red-green loop: use when the user provides a spec/ticket to implement test-first, or mentions TDD/red-green/test-first and wants the full loop through typecheck, review, commit and closeout. For implementation without TDD use implement; for TDD technique alone use tdd."
---

# TDD Implement

`seam` + `red-green` 为领衔词的完整实现编排：每个 seam 一个红-绿循环，直到 commit。TDD 语义（红-绿循环、seam 定义、好测试标准）以 [tdd 技能](.agents/skills/tdd/SKILL.md) 为唯一事实源——测试标准见 [tdd/tests.md](.agents/skills/tdd/tests.md)，Mock 边界见 [tdd/mocking.md](.agents/skills/tdd/mocking.md)；本技能只编排阶段与运行时规则。

本技能是**长程任务**（Long-Horizon Skill）：多阶段串行执行，自带**回合连续性**（Turn Continuity）与**任务分解**（Chunking）规则。术语定义见 `CONTEXT.md`，技能设计规则见 `docs/agents/skill-design.md`。

## 分支

- **单线**：单 spec / 单 issue，走下节 Steps ①→⑦（详规见 [stages.md](references/stages.md)）。
- **多 issue 编排**：`.scratch/<feature>/issues/` 下多文件且含 `Blocked by` 时走编排模式——编排器按依赖分层并行调度，子代理各自治完成 ①→⑦。主过程见下节 [多 issue 编排](#多-issue-编排按依赖分层并行)，详规见 [orchestration.md](references/orchestration.md)。

## 多 issue 编排（按依赖分层并行）
精简主过程（可执行约束全保留，详规见 [orchestration.md](references/orchestration.md)；`references/orchestration.md` 全量保留为详规真相源）。
- **触发**：`.scratch/<feature>/issues/` 下多文件且至少部分含 `Blocked by` 依赖声明；单 issue / 单 spec 不走本节，走 [stages.md](references/stages.md) 单线 ①→⑦。
- **A0 依赖图**：扫描 `NN-<slug>.md` 解析 `Blocked by`（`None`/`（无`/无此行→无依赖；`01, 02`/`01（…）`→依赖对应编号；无法解析→视无依赖并告警），以编号为节点构建 DAG，环则报错列环上节点不调度。
- **A1 Kahn 分层**：对 DAG 做 Kahn BFS 拓扑分层 `L1=入度0 → L2=移除L1后入度0 → … → Ln`；层内无依赖可并行，层间串行；分层结果展示给用户确认后派发。
- **A2 分层调度**：`for Li in L1..Ln: 并行派发（逐个 subagent single 模式，禁 parallel tasks 数组）→ 等待全层回执卡片 → 按 A3 逐 issue 验收（只认回执+抽检，不消费全量日志）→ 层收敛 4 项全过才进下一层`；层收敛 4 项：①该层全部 issue 验收通过 ②相关测试通过 ③`git status` 卫生（仅删 `[DEBUG-...]` 临时产物，禁 `reset --hard/checkout ./clean -fd/stash --include-untracked`）④`git merge-base --is-ancestor $BASE_HEAD HEAD` 通过；任一失败按 A5 回退重派。层间回合连续性：一层收敛后立即派下一层。
- **A3 子代理契约**：每子代理为完整单 issue ①→⑦执行单元（输入：`spec.md`+ 单 `NN-<slug>.md`+`CONTEXT/adr`；执行：①读 issue →②该 issue seams →③红-绿+typecheck →④相关测试（非全量）→⑤双轴 review →⑥commit-check+commit →⑦文档对齐+`Status: resolved`+`## 实施总结`+卫生；产出：独立 commit `feat(<feature>): <title> (#NN)`+ 落盘+测试全绿；禁止跨 issue/跳过⑤⑥）。
  - **输出约束**：仅回执卡片（≤30 行，不透传全量日志）：`[回执] #NN <标题>` + 提交/ seams/ 测试（相关）/ typecheck/ review(Standards/Spec)/ 验收 checkbox/ 文档/ 遗留；缺字段视不通过。
  - **主代理验收（5 项，任一不过打回重派）**：①落盘（`git log` 含 `#NN` + issue 文件 `resolved`+总结）②抽检（相关测试/`tsc --noEmit`）③改动边界（`git diff <base>..HEAD --name-only` 无跨改）④卫生（无 `[DEBUG-...]` 残留）⑤提交关联（message 含 `#NN` 且一致）；子代理同样 `BASE_HEAD`+回合计 Chunk/历史保护与单线一致。
- **A4 全量收敛**：全部层验收后编排器执行唯一全量测试 + `merge-base --is-ancestor $BASE_HEAD HEAD` 历史校验（失败经 `reflog` 恢复）+ `git status` 卫生（含禁令）+ 会话汇总回执关键信息（不另写汇总文件）。
- **A5 回退与冲突**：子代理内按 `stages.md` 回退表闭环；层收敛失败→该 issue 保持原 Status、不进下一层、修复后重派；全量失败→定位归属 issue 重派；文件冲突→后完成者 rebase 解决后重跑 typecheck+相关测试，禁丢弃提交、必校验 `merge-base` 与 `git log` 全含；环依赖→A0 即终止。
- **出口/边界**：全部 issue `Status: resolved`+`## 实施总结` 落盘 + 全量测试通过 + 工作区干净；单 issue 不走本节、子代理不跨改、编排器不替写代码、汇总只对话输出；**必须先编排子代理计划（输出依赖图/DAG/Kahn 分层 `L1..Ln` 并确认）后才派子代理，禁止跳过计划直接派发导致重复调度**；TDD 语义以 `tdd` 技能为唯一事实源。
## Steps

按序执行，每步达到完成条件才进入下一步；进入任一步前先读取其在 [stages.md](references/stages.md) 的定义。

| Step | 做什么 | 完成条件（可验证） | 详规 |
|------|--------|-------------------|------|
| ① 理解需求 | 读取 spec/ticket + `CONTEXT.md`/`docs/adr/`，澄清歧义 | 能复述需求且无未澄清歧义 | [stages.md#阶段-①](references/stages.md#阶段-①理解需求) |
| ② 确认 Seams | 列出待测公共接口 seams（名称+输入+预期输出），向用户确认并生成 Todo | 用户明确同意 seams 清单；Todo 已生成 | [stages.md#阶段-②](references/stages.md#阶段-②确认-seams测试接缝) |
| ③ TDD 开发循环 | 逐 seam 红-绿循环，串行推进至全绿 | 所有 seams 红-绿完成 + typecheck 通过 | [stages.md#阶段-③](references/stages.md#阶段-③tdd-开发循环) |
| ④ 完整测试套件 | 跑全量测试 | 全部测试通过（失败回 ③） | [stages.md#阶段-④](references/stages.md#阶段-④完整测试套件) |
| ⑤ Code Review | 按 [code-review](.agents/skills/code-review/SKILL.md) 双轴审查（Standards + Spec） | 双轴均通过 | [stages.md#阶段-⑤](references/stages.md#阶段-⑤code-review) |
| ⑥ Commit | 跑 [commit-check](.agents/skills/commit-check/SKILL.md) 门禁四项后提交 | commit 完成且历史校验通过 | [stages.md#阶段-⑥](references/stages.md#阶段-⑥commit) |
| ⑦ 收尾 | 文档对齐 → issue 状态与实施总结 → 目录卫生 | 文档已对齐、issue 已 `resolved`+总结落盘、工作区干净 | [stages.md#阶段-⑦](references/stages.md#阶段-⑦收尾文档对齐--issue-状态--实施总结) |

编排主过程见上节 [多 issue 编排](#多-issue-编排按依赖分层并行)，详规见 [orchestration.md](references/orchestration.md)；子代理内部仍走上表 ①→⑦（其中 ④ 为相关测试口径，全量由编排器收敛）。

### 阶段间流转

- 正常流转：出口条件满足即进入下一阶段，不在阶段间停顿。
- 回退路由：见 [stages.md#回退路由](references/stages.md#回退路由)；编排模式回退见上节 [多 issue 编排 A5](#多-issue-编排按依赖分层并行) 与 [orchestration.md#A5](references/orchestration.md#a5-回退与冲突)。
- 回合连续性：阶段内连续动作（红→绿→typecheck→下一 seam）在**一个回合内串行完成**，直至阶段出口；预告下一步后立即执行。详规见 [stages.md ③-3e](references/stages.md#3e-回合连续性) 与上节 [多 issue 编排 A2](#多-issue-编排按依赖分层并行) / [orchestration.md#A2](references/orchestration.md#a2-分层调度)。
- 任务分解：巨型写入拆小步——`write` 超 ~150 行先写骨架再分批补全，`replace` 超 ~5 处分批执行并验证。详见 [stages.md ③-3f](references/stages.md#3f-任务分解chunking)。

## 引用

- TDD 核心规则：[tdd 技能](.agents/skills/tdd/SKILL.md)
- 测试标准：[tdd/tests.md](.agents/skills/tdd/tests.md)
- Mock 指南：[tdd/mocking.md](.agents/skills/tdd/mocking.md)
- Commit 门禁：[commit-check](.agents/skills/commit-check/SKILL.md)
- 单线详规：[stages.md](references/stages.md)
- 多 issue 编排主过程：本文件 [多 issue 编排](#多-issue-编排按依赖分层并行)
- 多 issue 编排详规：[orchestration.md](references/orchestration.md)（全量保留）
