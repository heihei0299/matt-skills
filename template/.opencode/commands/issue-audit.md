---
description: 审计 feature 的 issue 完成情况（四维：完成度 / spec 遵守 / ADR 遵守 / 文档一致性），只审计不修改
agent: issue-audit
subtask: true
---

对 feature `$ARGUMENTS` 执行 issue 审计。

加载 `issue-audit` skill 并按其流程完整执行：逐票核对验收标准、核对 spec 的 Implementation Decisions 与 Out of Scope、核对 docs/adr/ 的架构决策、核对 README 等文档与实现的一致性。遵守其证据分级（L1/L2/L3）与问题分级（阻断/非阻断）。

铁律：**只审计，不修改任何现有文档与代码**——不写文件、不勾选、不改 Status；审计报告以中文在对话中输出。
