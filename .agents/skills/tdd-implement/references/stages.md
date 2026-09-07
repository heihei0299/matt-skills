# 阶段详细定义

单 `spec` / 单 `task` 与多 `task`（按 `Blocked by` 依赖分层串行、主代理直接执行）共用下表 ①→⑦；多 issue 编排（A0-A1 排序 + 主代理串行）见 [SKILL.md](../SKILL.md) 与 [orchestration.md](orchestration.md)。TDD 语义以 [tdd 技能](.agents/skills/tdd/SKILL.md) 为唯一事实源，不在此重写。
## 目录

- [阶段 ①：理解需求](#阶段-①理解需求)
- [阶段 ②：确认 Seams（测试接缝）](#阶段-②确认-seams测试接缝)
- [阶段 ③：TDD 开发循环](#阶段-③tdd-开发循环)
- [阶段 ④：完整测试套件](#阶段-④完整测试套件)
- [阶段 ⑤：Code Review](#阶段-⑤code-review)
- [阶段 ⑥：Commit](#阶段-⑥commit)
- [阶段 ⑦：收尾（文档对齐 + issue 状态 + 实施总结）](#阶段-⑦收尾文档对齐--issue-状态--实施总结)
- [Todo 规定](#todo-规定)
- [回退路由](#回退路由)

---

## 阶段 ①：理解需求

### 入口条件

- 用户提供了单 `spec` 文件（`.scratch/<feature>/spec.md` 或等价）或一个 `Type: task` 的 ticket（`wayfinder`/`to-tickets` 产出，含 `Blocked by`/`Status`）；`Type: research/prototype/grilling` 分流至对应技能，不进本技能

### 操作

1. 完整读取入口（`spec` 或 `issue`）内容
2. 使用读取预算：按需读取 `CONTEXT.md` 的相关术语；ADR 只读与 spec、触及符号或失败证据相关的条目，不批量读取无关文档
3. 使用仓库规定的代码探索入口；探索结果包含完整源码时视为已读，不再次 `read` 同一文件，除非文件发生漂移或只返回调用路径
4. 如有歧义，先向用户澄清再继续；无歧义时直接进入阶段②
5. 建立一次验证矩阵：列出 targeted tests、typecheck、全量测试以及 spec 要求的 smoke、package 或 security checks，后续复用证据，避免等价命令重复执行

### 出口条件

- 能用自己的话复述需求
- 无未澄清的歧义
- 验证矩阵已建立，且每项命令/检查已有明确触发条件

### 边界

- `CONTEXT` 术语冲突时以 `CONTEXT` 为准，必要时先 `domain-modeling` 纠偏
- 单 `spec` 与单 `task` 同构，均走 ①→⑦；多 `task` 由 [orchestration.md](orchestration.md) A0-A1 排序后主代理串行，不经子代理

## 阶段 ②：确认 Seams（测试接缝）

### 入口条件

- 需求已澄清，无歧义

### 操作

1. 列出所有将要测试的公共接口（seams）
2. 每个 seam 包含：名称、输入、预期输出，以及对应的最小验证命令
3. spec/ticket 已给出明确验收标准时，直接生成 Todo 并展示精简 seam 卡片；不等待用户确认
4. 仅在歧义、验收缺口、范围变化、破坏性操作或互斥方案时暂停确认
5. seams 确认门槛满足后生成 todo 清单（每 seam 一个 todo，格式与状态机见 [Todo 规定](#todo-规定)）

### 出口条件

- seams/Todo 已生成，且没有待决的歧义、验收缺口或需要用户选择的方案

### 边界

- 一个 seam 对应一个公共接口上的一个待测行为（输入 + 预期输出）：一个 seam = 一个测试 + 一个最小实现 cycle；同一接口的多个行为拆分为多个 seam，而非内部函数

---

## 阶段 ③：TDD 开发循环

### 入口条件

- Seams 已确认

### 操作

#### Git 安全前置（历史保护）

- 进入本阶段前记录 `BASE_HEAD=$(git rev-parse HEAD)`，后续所有 `git` 操作必须满足 `git merge-base --is-ancestor $BASE_HEAD HEAD`（仅追加、不可后退）。若校验失败立即经 `git reflog` 恢复后才继续。
- 为达 `git status` 干净仅删本次产生的 `[DEBUG-...]`/一次性脚本等未跟踪临时文件，禁止执行 `git reset --hard`、`git checkout .`、`git clean -fd`、`git stash push --include-untracked`、`git push --force`、`git rebase -i` 等（需显式用户确认才可执行；`stash` 如需使用改用 `--keep-index` 并在 `pop` 后校验）。术语与禁令见 `CONTEXT.md` Git History Preservation 与 `docs/agents/skill-design.md` Rule 4。

#### TDD 编排

**读取预算（TDD Reference Cache）**：在阶段③入口加载 tdd 技能的相关规则一次；每个 cycle 仅按当前 seam 定位需要的 [`tdd/tests.md`](.agents/skills/tdd/tests.md) 与 [`tdd/mocking.md`](.agents/skills/tdd/mocking.md) reference，不重复阅读全文。TDD 语义与测试规则以 [tdd 技能](.agents/skills/tdd/SKILL.md) 为唯一事实源，不再在此重写。

本阶段只执行编排：按阶段②生成的 todo 清单逐条推进（大小任务层次与 Subtodo 格式见 [Todo 规定](#todo-规定)），每完成一个 todo（红-绿 cycle + typecheck）立即更新其状态为 `done`，再进入下一个 todo。

#### 3a/3b. 红-绿（Red-Green）

红-绿循环的执行规则（Red before green、One slice at a time、Anti-patterns、垂直切片）以 tdd 技能为准，见 [tdd/SKILL.md](.agents/skills/tdd/SKILL.md) 与 [tdd/tests.md](.agents/skills/tdd/tests.md)。

#### 3c. 切换 seam

每完成一个 seam 立即进入下一个 seam，同一回合内串行推进，不等用户"继续"。

#### 3d. Typecheck

- 每个 cycle 结束后运行 typecheck
- 发现问题立即修复，修复后再继续

#### 3e. 回合连续性

- 每个红-绿 cycle 及其 typecheck 必须在一个回合内串行完成：测试 → 分析失败 → 修正 → 重跑 → 全绿，中途不输出、不停止、不等用户"继续"
- **单个 seam 全绿不是回合终点**：它只是阶段③的内部步骤；阶段③的出口是"所有 seams 红-绿完成 + typecheck 通过"，在出口达成前不停顿、不等待确认，直接进入下一个 seam
- 预告下一步后立即执行该步骤，回合终点仅为合规交互点、外部阻塞或阶段出口条件满足
- 进度输出并入工具调用序列，不单独结束回合——输出后继续执行，直到三类终点之一达成
- 输出只发生在：合规交互点（用户确认）、外部阻塞（明确说明所需授权或替代路径）、阶段出口条件满足时
- 外部阻塞（如权限拒绝）时明确请求授权或改用不冲突的路径，不静默等待

#### 3f. 任务分解（Chunking）

- 单次 `write` 超过 ~150 行：先写骨架再分批补全
- 批量 `replace` 超过 ~5 处：分批执行，每批后立即 typecheck 验证

#### 3g. Todo 更新纪律

- 每完成一个红-绿 cycle（含 typecheck），按实际推进更新对应 todo 状态：`in-progress` → `done`
- 更新基于当前实际状态，不基于旧快照重写整个清单；已完成项（done）永不回退

#### 3h. Git 历史保护（Git History Preservation）

- 阶段出口前必做祖先校验：`git merge-base --is-ancestor $BASE_HEAD HEAD` 若为 false，说明历史被改写（`reset --hard`/`checkout .`/`clean -fd`/`stash --include-untracked` 等导致），立即经 `git reflog` 找回并恢复 `BASE_HEAD` 后的提交，校验通过才算出口条件满足。
- 为达 `git status` 干净仅删本次产生的 `[DEBUG-...]`/一次性脚本等未跟踪临时文件，禁止用 git 层命令达到干净。详见 `CONTEXT.md` Git History Preservation 与 `docs/agents/skill-design.md` Rule 4。

### 出口条件

- 所有 seams 的红-绿循环完成
- Typecheck 通过

### 边界

- 每个 cycle 后运行 typecheck
- 全部 todo 为 done 才进入阶段④
- 测试质量规则（公共接口验证、独立断言、mock 边界、重构归属 review）见 tdd 技能，不在本阶段重写


---

## 阶段 ④：完整测试套件

### 入口条件

- 阶段 ③ 完成，typecheck 通过

### 操作

1. 按阶段①建立的验证矩阵，运行仓库规范的唯一全量测试命令（单 issue 在此执行；多 issue 由 A4 统一执行）
2. 若失败，先运行失败测试或最小相关子集定位原因；修复后再运行同一全量命令
3. 记录通过证据供阶段⑤/⑥复用，不重复执行等价命令（例如 `npm test` 与其展开命令），除非本次改动了 package script 本身
4. 检查所有测试是否通过

### 出口条件

- 全部测试通过

### 边界
- 全量测试失败时回到阶段③；修复后只重跑失败子集用于诊断，再重跑验证矩阵中的唯一全量命令——进入 review 前必须全绿

---

## 阶段 ⑤：Code Review

### 入口条件

- 完整测试套件通过

### 操作

1. 首次调用 [code-review 技能](.agents/skills/code-review/SKILL.md) 按**双轴**审查当前 issue 的改动：
   - **Standards 轴**：改动是否符合仓库文档化的编码标准（含 smell baseline 判断）
   - **Spec 轴**：改动是否忠实实现来源 spec/issue（逐条对照验收要求）
   - 两轴独立报告、**互不掩盖**——一轴通过另一轴失败时仍须修复
2. 审查发现的问题按 [回退路由](#回退路由) 处理，并只重跑受影响的 targeted checks
3. 修复后执行**增量复审**：只检查修复涉及的 symbols、验收项和测试；只有架构或范围发生变化时，才重新执行完整双轴审查
4. **逐 issue 触发**：每 issue 绿后即审查，review 通过后进入 commit，不在阶段间重复启动同一审查

### 出口条件

- Code review 通过

### 边界

- 重构在此阶段进行，而非 TDD 循环阶段
- review 通过后才进入 commit
- 审查结果只在对话输出，不生成书面审查报告（不落盘 `review-*.md` 类文件）

## 阶段 ⑥：Commit

### 入口条件

- Code review 通过

### 操作

1. 在一次最终门禁中调用 [commit-check 技能](.agents/skills/commit-check/SKILL.md)：完成三项检查——文档一致性、目录卫生、commit message；目录卫生包含敏感扫描，spec 要求时再执行 package dry-run 等必要检查
2. **历史校验**：commit 前执行 `git merge-base --is-ancestor $BASE_HEAD HEAD`，若为 false 说明历史被改写，立即经 `git reflog` 恢复 `BASE_HEAD` 后的提交，校验通过才继续
3. 三项门禁、历史校验和必要检查全部通过才 commit；门禁证据保持为最终基线，未改文件不在 commit 后重复扫描或打包
4. 将工作提交到当前分支，附清晰的 commit message（单 issue 单提交，如 `feat(<feature>): <issue title> (#NN)`）；多 issue 时每 issue 独立提交后才取下一 issue

### 出口条件

- Commit 完成

### 边界

- Commit message 格式与内容由 commit-check ③ 把关（描述变更内容而非过程）
- 每 issue 独立提交，主代理串行时一 issue 一 commit 后再进入下一 issue 的 ①

## 阶段 ⑦：收尾（文档对齐 + issue 状态 + 实施总结）

### 入口条件

- Commit 完成（阶段⑥出口）

### 操作

1. **复核文档对齐**：以阶段⑥ commit-check 已记录的 README/docs/config/package 对齐证据为准；本阶段只复核并记录“无需更新”或已更新文件，不重复读取、编辑或追加 commit。若证据缺失或不一致，标记阶段⑥门禁失败并停止收尾，不将 issue 标为 resolved。
2. 若本次实现有关联 issue/ticket（`.scratch/<feature-slug>/issues/`）：先审查该 issue——从 issue 提取验收标准（无显式验收标准节时以其正文行为要求为准），逐条转写为 checkbox 清单并逐条验证：通过标 `- [x]`，未通过保留 `- [ ]` 并注明缺口（证据：文件:行号 / 测试名）。全部打勾后才允许下一步：
3. 将 `Status:` 行改为 `resolved`（无该行则追加），不改动 spec 与既有 Comments
4. 在 issue 文件底部追加实施总结（`## 实施总结` 标题）：

   ```
   ## 实施总结
   - 提交：`<commit hash>` — `<commit message>`
   - 实现的 seams：<清单>
   - 验收标准：逐条 `- [x]`（未全绿列出缺口）
   - 测试结果：<全绿 / 数量>
   - typecheck：通过
   - 文档对齐：<更新了哪些文件 / 无需更新>
   - 遗留 / 后续建议：<如有>
   ```
5. **强制更新 `progress.md`**：在 `.scratch/<feature>/progress.md` 更新该 `NN` 行的 `Status`/`Commit`/`Review`/`Tests`（派生视图，真相源仍为 `issues/*.md`）
6. 无关联 issue（直接实现用户给的 spec）→ 跳过状态更新，将总结作为会话最终输出
7. **保持目录卫生**：仅清理本次实现产生的临时产物——`[DEBUG-...]` 标记的调试代码/日志、一次性脚本、临时文件与备份文件；用 `git status` 确认工作区只含预期改动，无残留未跟踪文件后才结束。Git 历史保护与禁令见本文件阶段③ [Git 安全前置](#git-安全前置历史保护)与 `docs/agents/skill-design.md` Rule 4，仅删本次临时产物，禁止为达干净而执行 git 层破坏性命令。

### 出口条件

- 文档与实现对齐（无相关文档或已更新）
- issue 状态已更新（或确认无 issue）
- 实施总结已落盘 / 输出
- 工作区干净（临时产物已清理，`git status` 无残留未跟踪文件）

### 边界

- 只追加不改写：不修改 spec.md 与既有 Comments 内容
- 文档对齐仅限与本次实现直接相关的描述，不顺手重构无关文档
- 总结写事实（提交 / 测试 / 遗留），不写过程叙述

---

## Todo 规定

本节复用 `tdd`/`implement` 的 Todo 规定，`tdd-implement` 仅做多 issue 串行（主代理按依赖顺序）与单 issue 闭环，不再重写层次细节。

### 拆分层级（大小任务层次）

1. **大任务**：Goal/Ticket——整个实现单元，对应一次完整的 tdd-implement 流程
2. **中任务**：Seam（阶段②生成）——一个红-绿循环单元，每 seam 一个 Todo
3. **小任务**：Todo——seam 内可独立验证、可勾选的执行单元（T1/T2/T3…）
4. **执行步**：Subtodo——Todo 内的串行步骤（红 → 绿 → typecheck），回合内逐步勾选推进

> 多 issue（串行）新增一层见 [SKILL.md](../SKILL.md#多-issue-编排按依赖串行主代理直接执行) 与 [orchestration.md](orchestration.md)：**编排层** Feature——`.scratch/<feature>/` 下全部 issues，按 `Blocked by` 分层；主代理按层串行、层内亦串行，每 issue 完整 ①→⑦ 并单独提交。

### Todo 清单格式

阶段② seams 生成且确认门槛满足后立即生成 todo 清单，每个 seam 一个 todo：

- 编号：`T1`、`T2`、`T3`…
- 描述：seam 名称 + 输入 + 预期输出
- 状态：`pending` / `in-progress` / `done` / `blocked`
- 完成标准（DoD）：该 seam 测试全绿 + typecheck 通过 + 既有测试不受影响
- 执行步（Subtodo）：`T1-R` 红（写失败测试）→ `T1-G` 绿（最小实现）→ `T1-T` typecheck

编排模式下 Todo 清单为**分层清单**：`L1: [01, 02] → L2: [03, 04] → L3: [05]`，每层按依赖串行（不再并行）；每 issue 的 DoD 为 `Status: resolved` + 独立 commit + 实施总结已落盘。

### Todo 状态机

```
pending → in-progress → done
                ↘ blocked（外部阻塞）→（授权/替代路径）→ in-progress
```

- Subtodo 不单独设 `blocked`——阻塞状态归父 Todo，Subtodo 跟随父状态
- 编排模式下 issue 粒度状态机：`pending → in-progress(主代理执行中) → done(Status: resolved)`；`blocked` 表示 `Blocked by` 依赖未满足，待前层全 `resolved` 后自动解阻。

### 粒度与回合归属

- 一个 todo = 一个 seam 的红-绿 cycle + typecheck，不可再拆
- 一个 todo 必须在一个回合内完成（红→绿→typecheck→全绿）
- Subtodo 是 todo 内的执行步：每完成一步立即进入下一步（`T1-R` → `T1-G` → `T1-T`），禁止停在步间预告
- 每完成一个 todo 立即更新其状态，再进入下一个
- todo 状态只按实际推进更新（pending → in-progress → done），不基于旧快照重写整个清单；已完成项（done）永不回退
- 全部 todo 为 done 才进入阶段④
- 编排模式下：前层全部 issue `done` 才进入下一层；全部层 `done` 后执行全量收敛（A4）。

### 阻塞处理

- 外部阻塞（权限拒绝、缺失授权、依赖不可用）→ 标记 `blocked`，记录所需授权或替代路径
- 不静默停止；恢复后回到 `in-progress` 继续
- 编排模式下：`Blocked by` 依赖阻塞由主代理按层自动管理——前层未全 `resolved` 时后层 `blocked`，前层提交后自动解阻；不需人工确认依赖满足。

---

## 回退路由

| 当前阶段 | 回退条件 | 回退目标 |
|----------|----------|----------|
| ③ TDD 开发 | typecheck 失败 | → ③ 修复类型错误 |
| ④ 完整测试套件 | 测试失败 | → ③ 修复失败测试 |
| ⑤ Code Review | 实现错误 | → ③ 修复实现 |
| ⑤ Code Review | seams 遗漏 | → ② 补充 seams |
| ⑤ Code Review | 需求偏差 | → ① 澄清需求 |

编排模式回退见 [orchestration.md](orchestration.md)：单 issue 内回退按上表在当 issue 内闭环；层收敛/全量失败定位到失败 issue 所在层重做该 issue 的失败 seam。
