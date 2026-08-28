---
name: tdd-implement
description: "Implement from a spec or ticket via strict TDD red-green loop, then typecheck, review, commit, update the issue status, and write an implementation summary. Use this skill whenever the user asks to implement from a spec/ticket/issue, mentions TDD/red-green/test-first, or wants test-first work carried through review, commit and issue close-out in one pass — even if they don't name the process. For implementation without the test-first pipeline use implement; for test technique alone use tdd — this skill is the complete orchestration."
---

# TDD Implement

整合 **implement** + **tdd** 的完整实现流程：每个 seam 一个红-绿循环，直到 commit。TDD 语义（红-绿循环、seam 定义、好测试标准）以 [tdd 技能](.agents/skills/tdd/SKILL.md) 为唯一事实源——测试标准详见 [tdd/tests.md](.agents/skills/tdd/tests.md)，Mock 边界见 [tdd/mocking.md](.agents/skills/tdd/mocking.md)；本技能只编排阶段与运行时规则。

本技能是**长程任务**（Long-Horizon Skill）：多阶段串行执行，自带**回合连续性**（Turn Continuity）与**任务分解**（Chunking）规则（见 [stages.md](references/stages.md) 阶段③ 3e/3f）。术语定义见 `CONTEXT.md`，技能设计规则见 `docs/agents/skill-design.md`。

## 流程速览

```
① 理解需求 → ② 确认 Seams → ③ TDD 开发循环 → ④ 完整测试套件 → ⑤ Code Review → ⑥ Commit → ⑦ 收尾（文档对齐 + issue 状态 + 实施总结）
```

每阶段的入口条件、操作与边界规则见 [`stages.md`](references/stages.md)——进入任一阶段前先读取该阶段的定义。③ TDD 开发循环的红-绿规则见 [tdd 技能](.agents/skills/tdd/SKILL.md)，不在本文件重写。多 issue 编排见下节与 [`stages.md` 附录：多 issue 编排](references/stages.md#附录-多-issue-编排按依赖分层并行)。

阶段要点：
- ⑤ Code Review：按 [code-review](.agents/skills/code-review/SKILL.md) **双轴审查**——Standards 轴（编码标准符合度）与 Spec 轴（spec/issue 实现忠实度），两轴独立报告互不掩盖；审查结果只在对话输出，不生成书面审查报告（不落盘 `review-*.md` 类文件）。**派发纪律：两轴必须用 subagent single 模式或 `subagent_consult` 逐个派发，禁止 parallel `tasks` 数组**（parallel 结果仅保留 160 字节摘要，中文报告必截断；详见 stages.md 阶段⑤）
- ⑥ Commit：commit 前运行 [commit-check](.agents/skills/commit-check/SKILL.md) 门禁（①审查文档 ②对齐 README ③目录卫生 ④commit message），四项全过才提交
- ⑦ 收尾：先对齐文档——检查 README 与 docs/ 中涉及本次实现的描述与实现是否一致，不一致则更新并 commit；再更新 issue 状态（有关联 issue 时，其验收标准逐条转写为 checkbox 清单并打勾——全部 `- [x]` 才允许标 `resolved`）；最后保持目录卫生（清理 `[DEBUG-...]` 调试残留与临时产物，`git status` 确认工作区干净）

## 多 issue 编排（按依赖分层并行）

当 `.scratch/<feature>/issues/` 下存在多个 issue 且彼此有 `Blocked by` 依赖时走本模式；单 issue / 单 spec 仍走上节单线流程。触发后主代理为**编排器**，子代理按**单 issue 单代理**各自治完成完整 tdd-implement 流程（①→⑦）。详规见 [`stages.md` 附录](references/stages.md#附录-多-issue-编排按依赖分层并行)，本节只定契约：

- **触发**：扫描 `.scratch/<feature>/issues/` 多文件且含 `Blocked by` 时进入编排模式；否则单线执行——不为单 issue 引入编排开销。
- **编排器职责**：解析 `Blocked by` 依赖图 → 拓扑分层 → 按层调度子代理 → 逐 issue 验收（见下）→ 层间收敛验证（全量测试 + `git status` 干净）→ 汇总实施总结。
- **子代理契约（单 issue 单代理）**：输入 `spec.md + 单个 issue.md + CONTEXT.md/ADRs`，严格走 tdd-implement ①→⑦（含 seams 确认、红-绿循环、typecheck、双轴 review、commit-check 门禁、issue `resolved` + 实施总结）；产出独立 commit；禁止跨 issue 改动。
- **子代理输出约束**：只返回**回执卡片**（结构化关键信息），不透传全量过程日志。回执字段：issue 编号与标题 / commit hash / seams 清单 / 测试结果（数量与是否全绿）/ typecheck 结论 / 双轴 review 结论 / 验收 checkbox 结果 / 文档对齐清单 / 遗留与风险。红-绿细节、typecheck 原始输出、review 全文等过程日志留在子代理内部，不向主代理透传。
- **主代理验收**：编排器不盲信回执，逐 issue 验收后才算该 issue 完成。验收项：① commit 存在且 message 含 issue 编号 ② issue 文件 `Status: resolved` + `## 实施总结` 已落盘 ③ 抽检验证（抽跑相关测试或 `tsc --noEmit` 抽检，不重跑全量）④ 无跨 issue 改动（`git diff --name-only` 核对）⑤ 工作区干净。任一项不通过则打回重派该子代理，层内其他已通过不受影响；验收通过才计入层收敛。
- **分层并行**：同层无依赖的 issue 并行派发子代理，层内全部验收通过后才进入下一层；层间串行，层内并行。
- **冲突处理**：同层子代理若触及同一文件，后完成者 rebase 解决冲突后重跑 typecheck + 相关测试；跨层天然串行无冲突。
- **收敛**：全部层验收通过后编排器跑全量测试套件 + 目录卫生检查，任一失败按回退路由回到对应层重派。

## 回合连续性规则

flash 类模型在长程任务上容易在"预告下一步"处提前收尾——本规则源自一次真实事故（一次会话停四次，见 docs/agents/skill-design.md），是长程技能能否跑完的决定性规则。每个逻辑单元（一次红-绿循环、一次 typecheck、一次测试失败修复）必须**在一个回合内连续执行完毕后才输出**：测试 → 分析失败 → 修正 → 重跑 → 全绿 整条链一气呵成，中间不停顿、不等用户说"继续"。

回合终点仅为三类之一：
- **合规交互点**：技能要求的用户确认（如阶段② seams 清单确认）——此时提问并等待
- **外部阻塞**：权限拒绝、缺失授权、依赖不可用——此时明确说明需要什么授权或替代路径，不静默停止
- **阶段完成**：整个阶段的出口条件满足（如阶段③的所有 seams 红-绿完成 + typecheck 通过、commit 完成）——单个 seam 全绿只是阶段③的内部步骤，不是回合终点

输出进度/预告本身不结束回合——输出后继续执行，直到三类终点之一达成；预告下一步后立即执行该步骤。逐 seam 的执行细则见 [stages.md 3e](references/stages.md#阶段-③tdd-开发循环)。

编排模式下回合连续性延伸至**层**：一层内全部子代理派发后，编排器等待该层全 `resolved` 再进入下一层，不在层间停顿等待用户"继续"；子代理内部仍遵守单 issue 的回合连续性。

## 不做什么

- 不重写 TDD 语义：红-绿循环、seam 定义、好测试标准、mocking 边界一律查 [tdd 技能](.agents/skills/tdd/SKILL.md)，本技能只编排阶段与运行时规则
- 不把重构塞进红-绿循环：重构归阶段⑤ Code Review
- 不在阶段间停顿：单 seam 全绿、单次 typecheck 通过都不是回合终点（见回合连续性规则）
- 不生成书面审查报告：阶段⑤审查结果只在对话输出，不落盘 `review-*.md` 类文件
- 不手写超大改动：巨型 write/批量 replace 会撞输出上限、中途截断，因此单次 `write` 超 ~150 行先写骨架再分批补全；批量 `replace` 超 ~5 处先拆分再分批执行（见 [stages.md](references/stages.md) 3f）
- 不跳步：阶段出口未达成不进入下一阶段（见路由规则）
- 不为单 issue 引入编排：单 issue / 单 spec 不走多 issue 编排分支

## 任务拆分与 Todo 规定

### 拆分层级（大小任务层次）

1. **大任务**：Goal/Ticket——整个实现单元，对应一次完整的 tdd-implement 流程
2. **中任务**：Seam（阶段②确认）——一个红-绿循环单元，每 seam 一个 Todo
3. **小任务**：Todo——seam 内可独立验证、可勾选的执行单元（T1/T2/T3…）
4. **执行步**：Subtodo——Todo 内的串行步骤（红 → 绿 → typecheck），回合内逐步勾选推进

编排模式下新增一层：

5. **编排层**：Feature——`.scratch/<feature>/` 下全部 issues，按 `Blocked by` 分层；每层一组并行子代理，每子代理一个 issue 的完整 ①→⑦。

### Todo 清单格式
阶段② seams 确认后立即生成 todo 清单，每个 seam 一个 todo：
- 编号：`T1`、`T2`、`T3`…
- 描述：seam 名称 + 输入 + 预期输出
- 状态：`pending` / `in-progress` / `done` / `blocked`
- 完成标准（DoD）：该 seam 测试全绿 + typecheck 通过 + 既有测试不受影响
- 执行步（Subtodo）：`T1-R` 红（写失败测试）→ `T1-G` 绿（最小实现）→ `T1-T` typecheck

编排模式下 Todo 清单为**分层清单**：`L1: [01, 02] → L2: [03, 04] → L3: [05]`，每层内 issue 并行，层间串行；每 issue 的 DoD 为 `Status: resolved` + 独立 commit + 实施总结已落盘。

### Todo 状态机
```
pending → in-progress → done
                ↘ blocked（外部阻塞）→（授权/替代路径）→ in-progress
```
- Subtodo 不单独设 `blocked`——阻塞状态归父 Todo，Subtodo 跟随父状态

编排模式下 issue 粒度状态机：`pending → in-progress(子代理已派发) → done(Status: resolved)`；`blocked` 表示 `Blocked by` 依赖未满足，待前层全 `resolved` 后自动解阻。

### 粒度与回合归属
- 一个 todo = 一个 seam 的红-绿 cycle + typecheck，不可再拆
- 一个 todo 必须在一个回合内完成（红→绿→typecheck→全绿）
- Subtodo 是 todo 内的执行步：每完成一步立即进入下一步（`T1-R` → `T1-G` → `T1-T`），禁止停在步间预告
- 每完成一个 todo 立即更新其状态，再进入下一个
- todo 状态只按实际推进更新（pending → in-progress → done），不基于旧快照重写整个清单；已完成项（done）永不回退
- 全部 todo 为 done 才进入阶段④

编排模式下：每层全部 issue `done` 才进入下一层；全部层 `done` 后编排器做全量收敛验证。

### 阻塞处理
- 外部阻塞（权限拒绝、缺失授权、依赖不可用）→ 标记 `blocked`，记录所需授权或替代路径
- 不静默停止；恢复后回到 `in-progress` 继续

编排模式下：`Blocked by` 依赖阻塞由编排器自动管理——前层未全 `resolved` 时后层 `blocked`，前层收敛后自动解阻派发；不需人工确认依赖满足。

## 路由规则

### 正常流转

| 当前阶段 | 出口条件 | 下一阶段 |
|----------|----------|----------|
| ① 理解需求 | 需求已澄清，无歧义 | → ② 确认 Seams |
| ② 确认 Seams | 用户确认 seams 清单 | → ③ TDD 开发 |
| ③ TDD 开发 | 所有 seams 红-绿完成，typecheck 通过 | → ④ 完整测试套件 |
| ④ 完整测试套件 | 全部测试通过 | → ⑤ Code Review |
| ⑤ Code Review | 审查通过 | → ⑥ Commit |
| ⑥ Commit | commit 完成 | → ⑦ 收尾 |
| ⑦ 收尾 | issue 状态已更新 + 实施总结已写 | ✅ 结束 |

编排模式流转：`编排器：依赖图 → 分层 → [层内并行子代理(①→⑦) → 层收敛]×N → 全量收敛 → 汇总总结 ✅`；子代理内部仍走上表单 issue 流转。

### 回退路由

| 当前阶段 | 回退条件 | 回退目标 |
|----------|----------|----------|
| ③ TDD 开发 | typecheck 失败 | → ③ 修复类型错误 |
| ④ 完整测试套件 | 测试失败 | → ③ 修复失败测试 |
| ⑤ Code Review | 实现错误 | → ③ 修复实现 |
| ⑤ Code Review | seams 遗漏 | → ② 补充 seams |
| ⑤ Code Review | 需求偏差 | → ① 澄清需求 |

编排模式回退：子代理内回退按上表在子代理内闭环；编排器层收敛失败（全量测试失败 / 目录不干净）→ 定位到失败 issue 所在层重派对应子代理。

## 引用

- TDD 核心规则：[tdd 技能](.agents/skills/tdd/SKILL.md)
- 测试标准：[tdd/tests.md](.agents/skills/tdd/tests.md)
- Mock 指南：[tdd/mocking.md](.agents/skills/tdd/mocking.md)
- Commit 门禁：[commit-check 技能](.agents/skills/commit-check/SKILL.md)
- Issue tracker 约定：[issue-tracker.md](../../docs/agents/issue-tracker.md)
