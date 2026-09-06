# 多 issue 编排（按依赖串行，主代理直接执行）

本文件仅在多 `task` 编排时生效；单 `spec` / 单 `task` 走 [stages.md](stages.md) 单线 ①→⑦，主代理直接执行完整流程并单独提交，不经子代理。

多 issue 触发条件：`.scratch/<feature>/issues/` 下存在多个 `Type: task` 的 issue 文件（`wayfinder`/`to-tickets` 产出或等价），按 `Blocked by` 组织依赖。

三入口（单 `spec` / 单 `task` / 多 `task`）在单 issue 层面同构：`spec`/`issue` 均为 `task` 闭环输入，`research`/`prototype`/`grilling` 分流不进本技能。编排层 Feature—`.scratch/<feature>/` 下全部 `task` 按 `Blocked by` 分层。

## 目录

- [A0. 依赖图构建](#a0-依赖图构建)
- [A1. 拓扑分层](#a1-拓扑分层)
- [A2. 主代理串行调度](#a2-主代理串行调度)
- [A3. 层收敛](#a3-层收敛)
- [A4. 全量收敛](#a4-全量收敛)
- [出口条件](#出口条件)
- [边界](#边界)

---

### A0. 依赖图构建

1. 扫描 `.scratch/<feature>/issues/` 下全部 `NN-<slug>.md`，逐文件解析 `Blocked by` 行：
   - `Blocked by: None` / `Blocked by: （无` / 无此行 → 无依赖（frontier）
   - `Blocked by: 01, 02` / `Blocked by: 01（…）` → 依赖 `01`、`02` 对应的 issue 文件（按编号前缀匹配）
   - 无法解析的行 → 视为无依赖，并在编排总结中注明告警
2. 以 issue 编号为节点、`Blocked by` 为有向边构建 DAG；若检测到环，立即报错并列出环上节点，不进入调度。
3. 读取 `spec.md`（若存在）作为共享上下文；同时读取 `CONTEXT.md` 与 `docs/adr/` 供一致性校验。
4. **强制初始化 `progress.md`**：在 `.scratch/<feature>/progress.md` 落 `## DAG` + `## Layers (Kahn L1..Ln)` + `## Progress` 空表（`| NN | Status | Commit | Review | Tests |`），作为编排态唯一派生视图（真相源仍为 `spec` + `issues/*.md`）。
### A1. 拓扑分层

对 DAG 做 Kahn 分层（BFS 拓扑）：

```
L1 = 全部入度为 0 的节点（可立即开始）
L2 = 移除 L1 后入度为 0 的节点
…
Ln = 最后一层
```

每层内节点互无依赖（但仍串行执行，主代理一次一 issue）；层间有依赖，必须串行。分层结果在编排开始前一次性展示给用户确认（合规交互点），确认后才进入 A2。若两 issue 在阶段②已声明预期改动同一文件，建议追加 `Blocked by` 使其串行（轻提示，不强制）。

### A2. 分层调度（主代理串行）

```
for each 层 Li in L1..Ln:
  for each issue in Li（按编号顺序）:
    主代理直接执行该 issue 的完整 ①→⑦：
      ①理解需求 → ②确认 seams → ③红-绿循环（每 cycle 后 typecheck）→ ④相关测试 → ⑤code-review（双轴，逐 issue）→ ⑥commit-check + 单独 commit → ⑦收尾（Status: resolved + ## 实施总结 + map.md 指针如为 wayfinder 产物 + 目录卫生）
    产回执卡片（改动文件/测试结果/commit hash）并回写该 issue 文件后**强制更新 `progress.md` 该行**（`Status`/`Commit`/`Review`/`Tests`）后再取下一 issue
  层收敛：该层全部 issue `Status: resolved` 且 `progress.md` 同步为 `done`、各自独立 commit 已落盘、相关测试通过、`git status` 卫生、历史校验通过，才进下一层
全部层串行完成后进入 A4
```

- **回合连续性**：主代理在层内/层间不结束回合——一 issue 提交后立即取下一 issue，直到全部层完成或外部阻塞；预告下一 issue 后立即执行。
- **Git 历史保护**：进入 A2 前记录 `BASE_HEAD=$(git rev-parse HEAD)`，每 issue 提交前校验 `git merge-base --is-ancestor $BASE_HEAD HEAD`，失败即经 `git reflog` 恢复；为达 `git status` 干净仅删本次产生的 `[DEBUG-...]` 临时产物，禁止 `git reset --hard`/`git checkout .`/`git clean -fd`/`git stash push --include-untracked` 等。
- **Chunking**：每 issue 产回执卡片并回写后再继续，防单回合截断。

### A3. 层收敛

每层全部 issue 串行完成后，主代理执行层收敛 4 项（全部通过才进下一层）：
1. 该层全部 issue `Status: resolved` 且 `## 实施总结` 已落盘且 `progress.md` 同步为 `done`
2. 相关测试通过（该层 issue 相关；全量仅在 A4）
3. `git status` 卫生（仅删本次临时产物）
4. 历史校验 `git merge-base --is-ancestor $BASE_HEAD HEAD` 通过

任一失败定位到该层失败 issue，重做该 issue 的失败 seam/阶段后重检该层。

### A4. 全量收敛

全部层串行完成且各自层收敛通过后，执行：
1. **全量测试套件**：跑仓库完整测试套件（仅此一次全量）
2. **历史校验**：`git merge-base --is-ancestor $BASE_HEAD HEAD`，失败即 `reflog` 恢复后重跑
3. **目录卫生**：`git status` 无 `[DEBUG-...]` 残留、无未跟踪临时文件
4. **汇总总结**：在会话输出汇总各 issue 的回执卡片关键信息（提交 hash / seams / 验收 checkbox / 测试结果 / 文档对齐）；不另写汇总文件

### 出口条件

- 全部 issue `Status: resolved` + 各自 `## 实施总结` 已落盘且 `progress.md` 同步为 `done`
- 全量测试套件通过
- 工作区干净且 `progress.md` 与 `issues/*.md` 一致（不一致时以 `issues/*.md` 为准，`progress.md` 为派生可重算）

### 边界

- 单 issue / 单 spec 不走本文件编排，但一旦进入多 issue 编排（多 `task`），所有 issue 的 ①→⑦ 均由主代理串行直接执行，禁止子代理派发
- 不跨 issue 改动；主代理按层串行，一次一 issue 一 commit
- 汇总总结只在对话输出，不落盘额外汇总文件
- 必须先输出依赖图/DAG 与 Kahn 分层 `L1..Ln` 并确认后才进入 A2，禁止跳过计划直接执行导致乱序
- TDD 语义以 [tdd 技能](.agents/skills/tdd/SKILL.md) 为唯一事实源，不在本文件重写
