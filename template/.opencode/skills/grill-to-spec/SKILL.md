---
name: grill-to-spec
description: "Router：编排 grill-with-docs → to-spec，只打磨设计与产出文档/spec，不写代码。"
disable-model-invocation: true
---

# Grill to Spec

**grill-with-docs**（grilling + domain-modeling）与 **to-spec** 的编排器。本 skill 只做编排：把设计压力测试成共识，把共识综合成 spec 发布——不写代码，不动源码。

## 职责

| 做 | 不做 |
|----|------|
| 编排 `grill-with-docs` → `to-spec` 完整通道 | 不编写代码、不修改任何源码（含测试） |
| 引导用户从模糊想法 → 结构化 spec | 不拆 tickets（`/to-tickets` 职责） |
| grilling 逐问挑战、打磨设计 | 不调用 `/code-review` |
| 同步产出领域文档（glossary + ADR） | 阶段②仅综合，不新增采访 |
| 综合对话为可执行的 spec 文档并发布 | 不维护已发布的 spec |
| 产出物仅限领域文档与 spec | 实现与修复交给实现类 skill（如 `/tdd-implement`） |

## 流程

```text
① Grill with docs → ② Synthesize to spec
```

① 加载 `/grill-with-docs`：grilling 采访 + domain-modeling 产出 glossary/ADR。出口：用户确认共识达成。
② 加载 `/to-spec`：探索代码、确认 seams、编写并发布 spec，标 `ready-for-agent`。出口：spec 已发布。

## 回退

| 触发点 | 条件 | 动作 |
|--------|------|------|
| ② seam 确认 | 用户不同意 seams | → ① 补充 |
| ② 综合时 | 关键信息缺失 | → ① 补采 |
| ② 发布后 | spec 有问题 | → ① 重新循环 |

## 异常终止

| 情况 | 处理 |
|------|------|
| 用户中途放弃 / 无主题 | 终止 |
| tracker 未配置 | 提示 `/setup-matt-pocock-skills`，终止 |
| ① 超过 5 轮无进展 | 建议暂停或缩小范围 |

## 约束

- ① 出口达成后方可进入 ②
- 全程不写代码、不动源码：唯一允许写入的文件是领域文档（`CONTEXT.md`/ADR）与 spec
- ② 探索代码只为确认 seams 与术语——只读不改

## 引用

- [grill-with-docs](../grill-with-docs/SKILL.md)
- [grilling](../grilling/SKILL.md)
- [domain-modeling](../domain-modeling/SKILL.md)
- [to-spec](../to-spec/SKILL.md)
