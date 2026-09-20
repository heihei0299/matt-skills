---
name: grill-to-spec
description: "Router：编排 grill-with-docs → to-spec，把模糊想法打磨成可执行 Spec。Use when the user asks to grill/design/polish an idea into a spec——只产出领域文档与 spec，不写代码。"
disable-model-invocation: true
---

# Grill to Spec

只做两个上游 skill 的编排：先把想法打磨成共识，再把共识发布成 spec。本 skill 不写代码、不修改源码或测试、不自动 commit。

## 流程

### 0. 预检

- 只读确认 issue tracker、目标上下文、feature slug 和已有 spec/issue 状态。
- tracker 未配置、slug 不明确或目标路径不可写时，在任何 ADR/spec/issue 写入前报告阻塞。
- 已有同一 feature 的产物先读取并比较；相同共识不重复发布，设计变化进入变更流程。

### ① 形成共识

调用 [`grill-with-docs`](.agents/skills/grill-with-docs/SKILL.md)，由 `grilling` 与 `domain-modeling` 完成采访、术语和设计决策。

- glossary 按上游规则 inline 更新；
- 只有同时满足 ADR 条件时才提出 ADR，但 ADR 等最终决策清单确认后再写入；
- 在本阶段让 [`to-spec`](.agents/skills/to-spec/SKILL.md) 做代码理解和 seam 分析；seam 是共识的一部分，不单独制造发布确认；
- 形成精简决策清单：目标、范围、关键选择、seam、未纳入范围和待验证假设；只展示清单，不展示任何 ADR/spec/issue 正文或草稿；
- 用户确认决策清单后，立即进入阶段 ②。

出口：决策清单已确认，glossary 已按需更新；尚未确认的 ADR/spec/issue 不写入。

### ② 发布 spec

将已确认的决策清单和 seam 分析交给 `to-spec`；此处只综合、写入和发布，不重新采访或再次确认 seam。

- 按 ADR → spec → issue 的顺序执行：先将已接受的 Spec 版本化写入目标仓库 `docs/specs/<slug>.md`，再发布 issue/ticket；不创建空的 `docs/specs` 目录。
- 每个 issue/ticket 必须引用 `docs/specs/<slug>.md`；issue 发布成功后设置 `ready-for-agent`；格式细则只读取 [`references/rules.md`](references/rules.md)。
- 相同 feature 复用已有产物，设计变化按 tracker 的更新语义保留历史；
- 任一步失败都保留已成功写入的内容，记录状态和失败点，重跑时从第一个未完成出口继续；不回滚、不重复发布。

出口：ADR 与版本化 Spec 已写入，引用该 Spec 的 issue/ticket 已发布；只报告路径或标识、状态和未纳入范围，不复制正文。

## 回合连续性

本 skill 是 Long-Horizon Skill。预检、阶段 ①、代码理解、决策清单确认后的阶段 ② 在同一任务链连续执行；进度汇报和阶段切换不是回合终点。仅在需要设计确认、决策清单确认、外部阻塞、用户主动停止或整个 skill 出口时暂停；确认完成后不要求用户额外回复“继续”。

## 本 skill 独有门禁

- 文档正文永不展示；用户只确认精简决策清单，发布后只接收元数据报告；
- ADR/spec/issue 不设置额外草稿确认；
- 不写代码、不修改源码或测试、不自动 commit；实现 tickets 交给 `to-tickets`。

## 异常

- 用户放弃或没有可形成 spec 的主题时终止；
- issue tracker 未配置时报告配置阻塞，不绕过发布；
- 用户改变已确认设计时回到阶段 ①，按变更语义保留历史，不静默覆盖。
