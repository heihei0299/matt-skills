---
name: grill-to-spec
description: "Router：编排 grill-with-docs → to-spec，把模糊想法打磨成可执行 Spec。Use when the user asks to grill/design/polish an idea into a spec——只产出领域文档与 spec，不写代码。"
disable-model-invocation: true
---

# Grill to Spec

只做两个上游 skill 的编排：先把想法打磨成共识，再把共识发布成 spec。本 skill 不写代码、不修改源码或测试。

## 流程

### ① 形成共识

调用 [`grill-with-docs`](.agents/skills/grill-with-docs/SKILL.md)，由 `grilling` 与 `domain-modeling` 完成采访、术语和设计决策。

- glossary 按上游规则 inline 更新；
- 只有确需 ADR 时才创建 ADR；
- 决策共识形成后直接写入 ADR，不向用户展示 ADR 正文，不增加单独确认轮次。

出口：用户确认共识已达成，且已确定的 glossary/ADR 已写入。

### ② 发布 spec

将已确认的共识交给 [`to-spec`](.agents/skills/to-spec/SKILL.md)，完成代码库理解、seam 提案和 spec 组装。

- 将 seam 提案作为共识的一部分确认，不展示由此生成的文档正文；
- 共识（含 seam）达成后，直接写入/发布 spec 与 issue，不设置发布前确认；
- 发布时使用 `ready-for-agent`，格式细则只读取 [`references/rules.md`](references/rules.md)。

出口：spec/issue 已写入或发布，只报告路径或标识、状态和未纳入范围。

## 回合连续性

本 skill 是 Long-Horizon Skill。阶段 ① 达到出口后立即进入阶段 ②；正常的阶段切换、进度汇报或“接下来生成 spec”不是回合终点。仅在必须获得用户确认的设计问题、明确外部阻塞、用户主动停止或整个 skill 出口时暂停。文档写入/发布不另起确认回合，不要求用户额外回复“继续”。

## 本 skill 独有门禁

- ADR：决策共识 → 直接落盘，不展示正文、不设置独立确认；
- spec/issue：共识与 seam 达成后直接写入/发布，不展示正文、不设置发布前确认；
- 全程不写代码、不修改测试、不执行实现。

## 异常

- 用户放弃或没有可形成 spec 的主题时终止；
- issue tracker 未配置时报告配置阻塞，不绕过发布；
- 用户改变已确认的设计时回到 ①，不在 ② 静默扩大范围。
