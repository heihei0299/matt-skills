# 守则：Grill-to-Spec 本地增量规则

本文件只保存 `grill-to-spec` 相对上游 `grill-with-docs` / `to-spec` 的**增量约束**。Spec 的章节、User Story 形状、Implementation Decisions 等格式全部以 `to-spec` 为唯一事实源，本文件不复制上游模板。

## Glossary 增量规则

- 懒创建：首个术语解析时才建 `CONTEXT.md`；多上下文时先确认归属，归属不清则询问。
- 只收本上下文特有术语；定义 WHAT 非 HOW，避免把 glossary 变成实现草稿。
- glossary 可按上游流程 inline 更新，不额外增加确认轮次。

## ADR 增量规则

- 只有同时满足“难逆转 / 无上下文费解 / 存在真实权衡”时才提议 ADR。
- 决策共识形成后直接落盘；不向用户展示 ADR 正文，不增加独立确认轮次。
- 不把 ADR 当 glossary 一样静默 inline 更新。

## Spec 增量规则

- Spec 的结构与字段全部委托 `to-spec`，本文件不维护第二份模板。
- seam 提案作为共识的一部分确认，不展示由此生成的 spec 正文。
- 共识（含 seam）达成后直接写入并标记 `ready-for-agent`，不设置发布前确认。
- 全文沿用已经确认的 glossary 词汇，并尊重所触区域既有 ADR。

## Issue 增量规则

- 按已配置的 issue tracker 直接发布 issue；issue 正文不在对话中展示。
- 发布后只报告 issue 标识、状态和未纳入范围，不复制正文。

## 反模式

- 不复制 `to-spec` 的章节清单、User Story 模板或 Implementation Decisions 细则。
- 不产出 Glossary / ADR / Spec 之外的额外设计文件。
- 不把本文件当逐条朗读的对话脚本；它只约束本地增量行为。
