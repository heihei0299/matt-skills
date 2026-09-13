# 守则：Grill-to-Spec 本地增量规则

本文件只保存 `grill-to-spec` 相对上游 `grill-with-docs` / `to-spec` 的**增量约束**。Spec 的章节、User Story 形状、Implementation Decisions 等格式全部以 `to-spec` 为唯一事实源，本文件不复制上游模板。

## 预检与状态规则

- 写入前只读确认 issue tracker、目标上下文、feature slug、已有 spec/issue 和当前状态；tracker 未配置或目标不可写时不写 ADR/spec/issue。
- feature slug 是 spec 路径和 issue 幂等键；候选不明确或冲突时才询问。
- 记录共识、ADR、spec、issue、`ready-for-agent` 出口；重跑从第一个未完成出口继续，不重复已成功动作。
- 已有相同共识的 feature 只报告已有路径或标识；设计变化走变更流程，不创建重复 issue。

## Glossary 增量规则

- 懒创建：首个术语解析时才建 `CONTEXT.md`；多上下文时先确认归属，归属不清则询问。
- 只收本上下文特有术语；定义 WHAT 非 HOW，避免把 glossary 变成实现草稿。
- glossary 可按上游流程 inline 更新，不额外增加确认轮次；设计变化时按历史保留规则修正。

## ADR 增量规则

- 只有同时满足“难逆转 / 无上下文费解 / 存在真实权衡”时才提议 ADR。
- ADR 不像 glossary 一样静默 inline 更新；等最终决策清单确认后直接落盘，不展示正文，不增加独立确认轮次。
- 用户改变决策时不静默覆盖旧 ADR；按项目 ADR 规则追加、废弃或标记 superseded。

## Spec 增量规则

- Spec 的结构与字段全部委托 `to-spec`，本文件不维护第二份模板。
- 代码理解和 seam 分析属于共识阶段；seam 纳入最终决策清单，不在发布阶段再次询问。
- 决策清单确认后直接写入 spec；不展示 spec 正文或草稿。
- 全文沿用已经确认的 glossary 词汇，并尊重所触区域既有 ADR。

## Issue 增量规则

- 按已配置的 issue tracker 直接发布唯一 spec issue；implementation tickets 交给 `to-tickets`。
- issue 正文不在对话中展示；发布成功后设置 `ready-for-agent`。
- issue 创建成功但 label/status 更新失败时保留 issue，报告标识和失败点，不删除、不误报为 ready。
- 设计变化委托 tracker 的原生更新语义：本地追加变更记录，远端按 body/comment/关联关系更新；不另造版本模板。

## 失败与 Git 边界

- 任一步失败都保留已成功写入的内容并报告部分状态；不做跨文件或跨 tracker 回滚，不盲目重试。
- 本 skill 不自动创建 Git commit；发布文档与 Git 提交是两个独立出口。

## 反模式

- 不复制 `to-spec` 的章节清单、User Story 模板或 Implementation Decisions 细则。
- 不产出 Glossary / ADR / Spec 之外的额外设计文件。
- 不把本文件当逐条朗读的对话脚本；它只约束本地增量行为。
