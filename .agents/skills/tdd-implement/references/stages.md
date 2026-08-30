# 阶段详细定义

## 目录

- [阶段 ①：理解需求](#阶段-①理解需求)
- [阶段 ②：确认 Seams（测试接缝）](#阶段-②确认-seams测试接缝)
- [阶段 ③：TDD 开发循环](#阶段-③tdd-开发循环)
- [阶段 ④：完整测试套件](#阶段-④完整测试套件)
- [阶段 ⑤：Code Review](#阶段-⑤code-review)
- [阶段 ⑥：Commit](#阶段-⑥commit)
- [阶段 ⑦：收尾（文档对齐 + issue 状态 + 实施总结）](#阶段-⑦收尾文档对齐--issue-状态--实施总结)
- [附录：多 issue 编排（按依赖分层并行）](#附录-多-issue-编排按依赖分层并行)

## 阶段 ①：理解需求

### 入口条件
- 用户提供了 spec 或一组 ticket

### 操作
1. 完整读取 spec/ticket 内容
2. 若存在 `CONTEXT.md` 和 `docs/adr/`，先阅读，确保术语和 ADR 决策不被违背
3. 如有歧义，先向用户澄清再继续

### 出口条件
- 能用自己的话复述需求
- 无未澄清的歧义

### 边界
- 本阶段只澄清需求——实现与测试设计在后续阶段进行

---

## 阶段 ②：确认 Seams（测试接缝）

### 入口条件
- 需求已澄清，无歧义

### 操作
1. 列出所有将要测试的公共接口（seams）
2. 每个 seam 需包含：名称、输入、预期输出
3. 向用户展示 seams 清单并确认
4. 用户确认后才写任何测试代码
5. seams 确认后生成 todo 清单（每 seam 一个 todo，含编号/状态/DoD）——格式与状态机见 [SKILL.md「任务拆分与 Todo 规定」](../SKILL.md#任务拆分与-todo-规定)

### 出口条件
- 用户明确同意了 seams 清单

### 边界
- 一个 seam 对应一个公共接口上的一个待测行为（输入 + 预期输出）：一个 seam = 一个测试 + 一个最小实现 cycle；同一接口的多个行为拆分为多个 seam，而非内部函数

> Seams 定义参考：[tdd 技能](.agents/skills/tdd/SKILL.md#seams--where-tests-go)

---

## 阶段 ③：TDD 开发循环

### 入口条件
- Seams 已确认

### 操作

#### Git 安全前置（历史保护）
- 进入本阶段前记录 `BASE_HEAD=$(git rev-parse HEAD)`，后续所有 `git` 操作必须满足 `git merge-base --is-ancestor $BASE_HEAD HEAD`（仅追加、不可后退）。若校验失败立即经 `git reflog` 恢复后才继续。
- 为达 `git status` 干净仅删本次产生的 `[DEBUG-...]`/一次性脚本等未跟踪临时文件，禁止执行 `git reset --hard`、`git checkout .`、`git clean -fd`、`git stash push --include-untracked`、`git push --force`、`git rebase -i` 等（需显式用户确认才可执行；`stash` 如需使用改用 `--keep-index` 并在 `pop` 后校验）。术语与禁令见 `CONTEXT.md` Git History Preservation 与 `docs/agents/skill-design.md` Rule 4。

#### TDD 编排
**红-绿循环前与循环中都查阅 tdd 技能各节**（Every section applies on every cycle）：TDD 语义与测试规则以 [tdd 技能](.agents/skills/tdd/SKILL.md) 为唯一事实源，不再在此重写——好测试标准见 [tdd/tests.md](.agents/skills/tdd/tests.md)，Mock 指南见 [tdd/mocking.md](.agents/skills/tdd/mocking.md)。
本阶段只执行编排：按阶段②生成的 todo 清单逐条推进（大小任务层次与 Subtodo 格式见 [SKILL.md「任务拆分与 Todo 规定」](../SKILL.md#任务拆分与-todo-规定)），每完成一个 todo（红-绿 cycle + typecheck）立即更新其状态为 `done`，再进入下一个 todo。

#### 3a/3b. 红-绿（Red-Green）
红-绿循环的执行规则（Red before green、One slice at a time、Anti-patterns、垂直切片）以 tdd 技能为准，见 [tdd/SKILL.md](.agents/skills/tdd/SKILL.md) 与 [tdd/tests.md](.agents/skills/tdd/tests.md)。

#### 3c. 切换 seam
每完成一个 seam 立即进入下一个 seam，同一回合内串行推进，不等用户“继续”。

#### 3d. Typecheck
- 每个 cycle 结束后运行 typecheck
- 发现问题立即修复，修复后再继续

#### 3e. 回合连续性
- 每个红-绿 cycle 及其 typecheck 必须在一个回合内串行完成：测试 → 分析失败 → 修正 → 重跑 → 全绿，中途不输出、不停止、不等用户“继续”
- **单个 seam 全绿不是回合终点**：它只是阶段③的内部步骤；阶段③的出口是“所有 seams 红-绿完成 + typecheck 通过”，在出口达成前不停顿、不等待确认，直接进入下一个 seam
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

> Mock 指南：[tdd/mocking.md](.agents/skills/tdd/mocking.md)
> 好测试标准：[tdd/tests.md](.agents/skills/tdd/tests.md)

---

## 阶段 ④：完整测试套件

### 入口条件
- 阶段 ③ 完成，typecheck 通过

### 操作
1. 运行仓库的完整测试套件
2. 检查所有测试是否通过

### 出口条件
- 全部测试通过

### 边界
- 测试失败时回到阶段 ③ 修复，修复后重新运行完整套件——进入 review 前必须全绿

---

## 阶段 ⑤：Code Review

### 入口条件
- 完整测试套件通过

### 操作
1. 调用 [code-review 技能](.agents/skills/code-review/SKILL.md) 按**双轴**审查当前所有改动：
   - **Standards 轴**：改动是否符合仓库文档化的编码标准（含 smell baseline 判断）
   - **Spec 轴**：改动是否忠实实现来源 spec/issue（逐条对照验收要求）
   - 两轴独立报告、**互不掩盖**——一轴通过另一轴失败时仍须修复后重审
2. **派发方式（强制）**：两轴必须用 subagent **single 模式**（`agent`+`task`）或 `subagent_consult` 逐个派发；**禁止 parallel `tasks` 数组**——pi-subagents 对 parallel 结果只保留前 160 字节摘要（`truncateUtf8(summary, 160)`），中文/多行报告必被截断（标记 `… [truncated by pi-subagents]`）。需要更完整输出时，要求子代理把报告写入临时文件，主代理再读取
3. 审查发现的问题按 [SKILL.md 回退路由](../SKILL.md#回退路由) 处理
### 出口条件
- Code review 通过

### 边界
- 重构在此阶段进行，而非 TDD 循环阶段
- review 通过后才进入 commit
- 审查结果只在对话输出，不生成书面审查报告（不落盘 `review-*.md` 类文件）

---

## 阶段 ⑥：Commit

### 入口条件
- Code review 通过

### 操作
1. 调用 [commit-check 技能](.agents/skills/commit-check/SKILL.md) 执行提交门禁——四项检查：①审查文档 ②对齐 README ③保持目录卫生 ④规范 commit message
2. **历史校验**：commit 前执行 `git merge-base --is-ancestor $BASE_HEAD HEAD`，若为 false 说明历史被改写，立即经 `git reflog` 恢复 `BASE_HEAD` 后的提交，校验通过才继续
3. 四项**全部通过才 commit**（含历史校验 `git merge-base --is-ancestor $BASE_HEAD HEAD` 通过）：将工作提交到当前分支，附清晰的 commit message

### 出口条件
- Commit 完成

### 边界
- Commit message 格式与内容由 commit-check ④ 把关（描述变更内容而非过程）

---

## 阶段 ⑦：收尾（文档对齐 + issue 状态 + 实施总结）

### 入口条件
- Commit 完成（阶段⑥出口）

### 操作
1. **对齐文档**：检查 README 与 `docs/` 中涉及本次实现的描述（用法、CLI、配置、示例、架构、行为）是否与实现一致；不一致则更新文档，并单独 commit（message 遵循 commit-check ④ 规范，如 `docs: align README with <feature>`）
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

5. 无关联 issue（直接实现用户给的 spec）→ 跳过状态更新，将总结作为会话最终输出
6. **保持目录卫生**：仅清理本次实现产生的临时产物——`[DEBUG-...]` 标记的调试代码/日志、一次性脚本、临时文件与备份文件；用 `git status` 确认工作区只含预期改动，无残留未跟踪文件后才结束。禁止为达干净而执行 `git reset --hard`、`git checkout .`、`git clean -fd`、`git stash push --include-untracked` 等（需显式用户确认；`stash` 如需使用改用 `--keep-index` 并在 `pop` 后校验 `git merge-base --is-ancestor $BASE_HEAD HEAD`）。

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

## 附录：多 issue 编排（按依赖分层并行）

本附录仅在多 issue 编排模式下生效（见 [SKILL.md 多 issue 编排](../SKILL.md#多-issue-编排按依赖分层并行)）；单 issue / 单 spec 走上节单线流程，不经过本附录。

### 入口条件
- `.scratch/<feature>/issues/` 下存在多个 issue 文件
- 至少部分 issue 含 `Blocked by` 依赖声明

### A0. 依赖图构建

1. 扫描 `.scratch/<feature>/issues/` 下全部 `NN-<slug>.md`，逐文件解析 `Blocked by` 行：
   - `Blocked by: None` / `Blocked by: （无` / 无此行 → 无依赖（frontier）
   - `Blocked by: 01, 02` / `Blocked by: 01（…）` → 依赖 `01`、`02` 对应的 issue 文件（按编号前缀匹配）
   - 无法解析的行 → 视为无依赖，并在编排总结中注明告警
2. 以 issue 编号为节点、`Blocked by` 为有向边构建 DAG；若检测到环，立即报错并列出环上节点，不进入调度。
3. 读取 `spec.md`（若存在）作为各子代理的共享上下文；同时读取 `CONTEXT.md` 与 `docs/adr/` 供一致性校验。

### A1. 拓扑分层

对 DAG 做 Kahn 分层（BFS 拓扑）：

```
L1 = 全部入度为 0 的节点（可立即开始）
L2 = 移除 L1 后入度为 0 的节点
…
Ln = 最后一层
```

每层内节点互无依赖，可并行；层间有依赖，必须串行。分层结果在编排开始前一次性展示给用户确认（合规交互点），确认后才派发。

### A2. 分层调度

```
for each 层 Li in L1..Ln:
  并行派发：为 Li 中每个 issue 启动一个子代理（single 模式，禁止 parallel tasks 数组）
  等待：阻塞直到 Li 全部子代理返回回执卡片
  验收：编排器按 A3 验收清单逐 issue 验收（只认回执卡片的关键信息 + 抽检验证，不消费全量日志）
  收敛：验收全通过进入 Li+1；有不通过按 A5 回退重派该 issue
全部层验收通过后进入 A4 全量收敛
```

- **派发纪律**：与阶段⑤双轴审查一致——逐个 `subagent` 派发，禁止 `parallel tasks` 数组（同因：中文报告截断）。
- **等待语义**：层内任一子代理失败不取消同层其他子代理；待层内全部返回后统一按 A5 处理。
- **回合连续性**：编排器在层间不结束回合——一层收敛后立即派发下一层，直到全部层完成或外部阻塞；预告下一层后立即执行。
- **Git 历史保护**：编排器在分层调度前记录 `BASE_HEAD=$(git rev-parse HEAD)`，每层收敛后校验 `git merge-base --is-ancestor $BASE_HEAD HEAD`，失败即经 `git reflog` 恢复；层内禁止为达干净而执行 `git reset --hard`、`git checkout .`、`git clean -fd`、`git stash push --include-untracked`、`git push --force` 等（需显式确认）。

### A3. 子代理契约（单 issue 单代理）

每个子代理是一个**完整的 tdd-implement 单 issue 执行单元**，输入与产出严格界定：

- **输入**：
  - `spec.md`（feature 级共享 spec，若无则以该 issue 正文为准）
  - 分配的单个 `NN-<slug>.md`（唯一 issue 输入）
  - `CONTEXT.md` + `docs/adr/`（术语与决策一致性）
- **执行**：严格走 tdd-implement ①→⑦全流程——①理解需求（读 spec + issue）→ ②确认 seams（该 issue 范围内）→ ③红-绿循环 → ④完整测试套件 → ⑤双轴 review → ⑥commit-check 门禁 + commit → ⑦文档对齐（仅该 issue 相关描述）+ `Status: resolved` + `## 实施总结` 落盘 + 目录卫生。TDD 语义以 [tdd 技能](.agents/skills/tdd/SKILL.md) 为唯一事实源，不在子代理内重写。
- **产出**：
  - 独立 commit（message 含 issue 编号，如 `feat(<feature>): <issue title> (#NN)`）
  - 该 issue 文件 `Status: resolved` + 底部 `## 实施总结`
  - 该 issue 范围内的测试全绿 + typecheck 通过
- **禁止**：跨 issue 改动；修改其他 issue 文件；跳过 ⑤/⑥ 直接 commit。

#### 输出约束（子代理只返回回执卡片）

子代理不向编排器透传全量过程日志（各 seam 的红-绿细节、typecheck 原始输出、双轴 review 全文、完整测试日志）。只返回一张**回执卡片**（结构化关键信息，中文，≤ 30 行）：

```
[回执] #NN <issue 标题>
- 提交：<commit hash> — <message>
- seams：<清单>
- 测试：<数量> 项，全绿 / 失败清单
- typecheck：通过 / 失败原因
- review：Standards <通过/问题> / Spec <通过/问题>
- 验收：checkbox <m/n 全绿，缺口说明>
- 文档：<更新文件 / 无需更新>
- 遗留：<如有>
```

卡片字段缺一不可；缺失字段视为验收不通过。详细过程与证据留在子代理的 commit 与 issue 文件中，编排器按需抽检而非全量消费。

#### 主代理验收（编排器逐 issue 验收）

编排器收到回执后逐 issue 验收，不盲信子代理自检：

1. **落盘校验**：`git log --oneline` 含该 commit 且 message 含 `#NN`；issue 文件 `Status: resolved` 且底部 `## 实施总结` 已落盘。
2. **抽检验证**：抽跑该 issue 相关测试（或 `tsc --noEmit` 抽检），不重跑全量套件；抽检失败即打回。
3. **改动边界**：`git diff <base>..HEAD --name-only` 核对无跨 issue 文件改动；有跨改视为不通过。
4. **卫生**：`git status` 无 `[DEBUG-...]` 残留与未跟踪临时文件。

任一项不通过 → 打回重派该子代理（仅该 issue），层内其他已通过不受影响；验收通过才计入层收敛。验收结论随层收敛一并输出。

子代理内部的回合连续性、任务分解、Todo 规定、Git 历史保护与单线模式完全一致（见 SKILL.md 回合连续性规则、stages.md 阶段③ 3e/3f/3h 与 Git 安全前置）。子代理同样在入口记录 `BASE_HEAD` 并在每阶段出口校验 `git merge-base --is-ancestor $BASE_HEAD HEAD`，禁止 `git reset --hard`/`git checkout .`/`git clean -fd`/`git stash push --include-untracked` 等。

### A4. 全量收敛

全部层逐 issue 验收通过后，编排器执行：

1. **全量测试套件**：跑仓库完整测试套件（阶段④口径），失败则按 A5 回退。
2. **历史校验**：执行 `git merge-base --is-ancestor $BASE_HEAD HEAD`，若为 false 说明编排过程中历史被改写，立即经 `git reflog` 恢复后重跑收敛。
3. **目录卫生**：`git status` 确认无 `[DEBUG-...]` 残留、无未跟踪临时文件；有残留则仅删本次临时产物后重检，禁止 `git reset --hard`/`git checkout .`/`git clean -fd`/`git stash push --include-untracked` 等。
4. **汇总总结**：在会话输出汇总各 issue 的回执卡片关键信息（提交 hash / seams / 验收 checkbox / 测试结果 / 文档对齐）；不另写汇总文件，不透传子代理全量日志（各 issue 的 `## 实施总结` 已落盘，详查落盘文件）。

### A5. 回退与冲突

- **子代理内回退**：按 SKILL.md 回退路由在子代理内闭环（typecheck 失败 → ③、测试失败 → ③、review 不通过 → ③/②/①）。
- **层收敛失败**：层内任一子代理未达到 `resolved`（测试失败 / review 不通过 / commit-check 门禁失败）→ 该 issue 保持原 `Status`，编排器在层等待结束后报告失败清单，不自动进入下一层；待修复后重派该层失败节点。
- **全量收敛失败**：A4 全量测试失败 → 定位到失败测试归属的 issue，回到其所在层重派对应子代理。
- **文件冲突**：同层子代理若触及同一文件，后完成者 rebase 解决冲突后重跑 typecheck + 相关测试；跨层天然串行无冲突。冲突解决禁止使用 `git reset --hard`/`git checkout .`/`git clean -fd`/`git stash push --include-untracked` 丢弃对方提交，rebase 后必校验 `git merge-base --is-ancestor $BASE_HEAD HEAD` 且 `git log --oneline` 含全部层提交；冲突检测以 `git` 合并结果为准，编排器不做静态预判。
- **环依赖**：A0 检测到环即报错终止，不派发任何子代理。

### 出口条件
- 全部 issue `Status: resolved` + 各自 `## 实施总结` 已落盘
- 全量测试套件通过
- 工作区干净（`git status` 无残留）

### 边界
- 单 issue / 单 spec 不走本附录
- 子代理不跨 issue 改动；编排器不替子代理写实现代码
- 汇总总结只在对话输出，不落盘额外汇总文件
