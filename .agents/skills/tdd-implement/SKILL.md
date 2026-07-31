---
name: tdd-implement
description: "Implement work from spec/ticket using strict TDD (red-green) workflow, then typecheck, code review, and commit."
---

# TDD Implement

整合 **implement** + **tdd** 两个技能的完整实现流程。

## 流程速览

```
① 理解需求 → ② 确认 Seams → ③ TDD 开发循环 → ④ 完整测试套件 → ⑤ Code Review → ⑥ Commit
```

各阶段详细定义见 [`stages.md`](stages.md)。

## 路由规则

### 正常流转

| 当前阶段 | 出口条件 | 下一阶段 |
|----------|----------|----------|
| ① 理解需求 | 需求已澄清，无歧义 | → ② 确认 Seams |
| ② 确认 Seams | 用户确认 seams 清单 | → ③ TDD 开发 |
| ③ TDD 开发 | 所有 seams 红-绿完成，typecheck 通过 | → ④ 完整测试套件 |
| ④ 完整测试套件 | 全部测试通过 | → ⑤ Code Review |
| ⑤ Code Review | 审查通过 | → ⑥ Commit |
| ⑥ Commit | commit 完成 | ✅ 结束 |

### 回退路由

| 当前阶段 | 回退条件 | 回退目标 |
|----------|----------|----------|
| ③ TDD 开发 | typecheck 失败 | 回退到 ③，修复类型错误 |
| ④ 完整测试套件 | 测试失败 | 回退到 ③，修复失败测试 |
| ⑤ Code Review | 审查发现问题（实现错误） | 回退到 ③，修复实现 |
| ⑤ Code Review | 审查发现问题（seams 遗漏） | 回退到 ②，补充 seams |
| ⑤ Code Review | 审查发现问题（需求偏差） | 回退到 ①，澄清需求 |

## 禁止行为

- 不得在 seams 确认前写任何测试
- 不得水平切片（一次性写完所有测试）
- 不得在绿阶段超前实现未被测试覆盖的功能
- 不得在 TDD 循环阶段做重构（重构属于 code review）
- 不得跳过 typecheck
- 不得在 code review 之前 commit

## 引用

- TDD 核心规则：[tdd 技能](../tdd/SKILL.md)
- 测试标准：[tdd/tests.md](../tdd/tests.md)
- Mock 指南：[tdd/mocking.md](../tdd/mocking.md)
