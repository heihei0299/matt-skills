---
name: grill-to-spec
description: "Router：编排 grill-with-docs → to-spec 的完整通道。"
disable-model-invocation: true
---

# Grill to Spec

**grill-with-docs**（grilling + domain-modeling）和 **to-spec** 的编排器——设计被压力测试后才进入综合。

## 职责

| 做 | 不做 |
|----|------|
| 引导用户从模糊想法 → 结构化 spec | 不写实现代码 |
| grilling 逐问挑战、打磨设计 | 不拆 tickets（`/to-tickets` 职责） |
| 同步产出领域文档（glossary + ADR） | 不调用 `/code-review` |
| 综合对话为可执行的 spec 文档 | 阶段②仅综合，不新增采访 |
| 发布 spec 到 tracker，标 `ready-for-agent` | 不维护已发布的 spec |

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

- 阶段①完成前不得进入阶段②
- 阶段②仅综合，不新增采访
- 事实自行查证，不询问用户
- spec 使用接口/类型/行为描述，而非文件路径或代码段（prototype 产出除外，须注明来源）

## 引用

- [grill-with-docs](../grill-with-docs/SKILL.md)
- [grilling](../grilling/SKILL.md)
- [domain-modeling](../domain-modeling/SKILL.md)
- [to-spec](../to-spec/SKILL.md)
