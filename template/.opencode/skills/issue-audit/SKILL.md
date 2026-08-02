---
name: issue-audit
description: 审计一个 feature 的 issue 完成情况——逐票核对验收标准（完成度）、是否严格遵守 spec 的 Implementation Decisions 与 Out of Scope、是否遵守 docs/adr/ 的架构决策、以及 README 等文档是否与实现一致（无过期信息）。只审计、不修改任何文件，报告以中文在对话中输出。使用场景：feature 收尾后、发布前、或对完成度存疑时；输入为 feature slug（如 token-usage-stats）。
---

# Issue Audit

对 `<feature-slug>` 指向的整个 feature 做完成度审计：spec + 全部 issue 逐票核对，四维结论。

## 铁律

- **只审计，不修改任何现有文档与代码。** 不写任何文件（含 `.scratch/` 下的 issue/spec 文件）、不勾选、不改 Status、不生成报告文件。产出仅是对话中的中文审计报告。
- 审计与被审计分离：发现问题不修复、不流转，只在报告中记录，由用户/主 agent/triage 决定处置。

## 输入

- 必须参数：`<feature-slug>`（如 `token-usage-stats`），对应目录 `.scratch/<feature-slug>/`
- 从以下来源收集约定与事实：
  - `.scratch/<feature-slug>/spec.md`（Implementation Decisions、Testing Decisions、Out of Scope）
  - `.scratch/<feature-slug>/issues/*.md`（每票的验收标准、Blocked by 依赖）
  - `docs/adr/*.md`（架构决策，审计对象）
  - `.opencode/CONTEXT.md`（术语表，违反术语视为 spec 遵守问题）
  - 当前工作树代码 + 只读 git 历史（提交哈希作为"确实做过"的证据）

## 四维审计

1. **完成度**：逐票核对每个 issue 的验收标准（checkboxes）——逐条判定满足/未满足，引用代码位置、单测名、提交哈希作为证据。
2. **Spec 遵守**：spec.md 的 Implementation Decisions 是否被落实、是否违背；Testing Decisions 的测试是否真实存在；**Out of Scope 是否被越过**（实现做了 spec 明说不做的事 = 阻断项）。
3. **ADR 遵守**：每个 `docs/adr/NNNN-*.md` 的决策在当前实现中是否被遵守（如 0001 流式不缓冲、0002 对话边界由客户端标识决定）。
4. **文档一致性**：README.md / README_ZH.md（及受影响的其他用户文档）与当前实现是否一致——无过期信息、无声称未实现的功能（如 feature 中某 UI 尚未实现，文档不得声称其存在）、命令示例与界面描述与实际一致。

## 证据分级（下结论的纪律）

- **L1 静态**：读代码、读 git 提交记录、核对单测存在性与断言内容。默认使用。
- **L2 测试套件**：运行仓库完整测试套件（本仓库：`cargo test --lib` 于项目根；如有 JS 侧测试一并运行）。每次审计必跑。
- **L3 端到端**：仅在以下情形升级——① 某验收标准明确要求"链路可用/端到端"（如 07 的"真实请求 → 日志 → 接口 → 展示"）；② L1 静态核对发现不一致、仅靠静态无法定案时。
- **弱证据不足**：间接、缺失、仅一致的证据不足以支撑"通过"结论；无法取证到位的条目标为非阻断疑点并注明"需要升级证据"。

## 问题分级

- **阻断项（must-fix）**：验收标准未达成、违反 ADR、越过 Out of Scope、违背 spec 决策。
- **非阻断项（should-note）**：文档措辞、建议性改进、证据仅间接的疑点。
- feature 结论 = 阻断项数 + 非阻断项数；**阻断为 0 才判定通过**。

## 边界矩阵（何时用本技能）

| 工具 | 输入 | 审计对象 | 触发时机 |
|------|------|----------|----------|
| `issue-audit`（本技能） | feature slug | 完成度**状态**（issue/spec/ADR/文档） | feature 收尾后、发布前、存疑时 |
| `code-review` | git 固定点 | 一段 **diff 增量**（Standards + Spec） | 每次实现完成后（tdd-implement 阶段⑤） |
| `triage` | issue/PR 编号 | issue **生命周期流转**（分类/验证/写 brief） | issue 前端处理 |

## 执行步骤

1. 解析输入：确认 `.scratch/<feature-slug>/` 存在，列出 spec 与全部 issue。
2. 收集约定：读 spec.md、全部 issues、`docs/adr/`、`.opencode/CONTEXT.md`。
3. 逐票核对（维度 1）：每票验收标准逐条判定，记录证据。
4. 维度 2/3：以 spec 决策与 ADR 对照当前代码实现。
5. 维度 4：对照 README 等文档与当前实现。
6. 跑 L2 测试套件；按规则决定是否升级 L3。
7. 汇总四维报告（对话输出，中文）。

## 报告模板

```markdown
## Issue 审计报告：<feature-slug>

### 结论总览
- 阻断项：N 项 / 非阻断项：M 项 → 通过 / 未通过

### 维度 1 · 完成度（逐票）
- 01 <标题>：满足 / 未满足（验收标准逐条 + 证据）

### 维度 2 · Spec 遵守
- 满足 / 违反（引用 spec 行号 + 代码证据）

### 维度 3 · ADR 遵守
- 0001 ...：遵守 / 违反（证据）

### 维度 4 · 文档一致性
- README.md：一致 / 过期信息（引用行 + 实现事实）

### 未满足项清单（显式记录）
- [阻断] 05 ...：原因 + 需要什么
- [非阻断] ...：原因

### 备注
- 证据级别说明（哪些条目用了 L2/L3）
- 审计为纯只读，未修改任何文件
```
