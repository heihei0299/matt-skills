---
name: scaffold-functional-test
disable-model-invocation: false
description: "Scaffold a repo-specific functional-test skill from spec — use when the user wants to generate a customized functional-test suite/skill from a spec/README/help; not for regular instance execution (use the generated instance-test skill) nor for TDD (use tdd-implement)"
---

# Scaffold Functional Test

从仓库 spec 生成仓库专属的功能测试 skill。它是一次性 scaffold，不负责常规实例执行，也不进入 TDD 红绿循环。

生成物：`.agents/skills/<repo>-functional-test/`，至少包含 `SKILL.md` 与 `references/instances.md`；可按需要包含 runner。实例字段、溯源、指纹和保护段统一遵循 [`references/schema.md`](references/schema.md)。生成物纳入 git，但不复制到 `template/`。

## 流程

### ① 采集行为

读取用户指定的 spec，默认 `.scratch/<feature>/spec.md`；同时读取相关 `CONTEXT.md` 与 ADR。以 Acceptance Criteria 固定待覆盖行为清单。

spec 不存在时可从 README 与 `--help` 建立候选清单，但必须把它标为候选并进入下一步确认，不得把推断当成需求。

出口：行为清单的来源、范围和未覆盖项已明确。

### ② 推导并确认实例

按 [`references/schema.md`](references/schema.md) 为每个行为生成实例草案：每个实例必须有溯源，不能用无来源的隐含行为扩张范围。向用户展示实例清单并等待一次确认；确认前不落盘。

出口：实例清单已确认，每个实例字段完整且可追溯。

### ③ 生成或更新

写入定制 skill 和实例 reference：

- 写入 spec 的 SHA-256 `spec hash` 与 ISO `generatedAt`；
- 保留 `<!-- manual -->` 保护段；
- 新建直接生成；更新已有生成物时先展示 diff，用户确认后才覆盖；
- 不把本次生成物写入 `template/`。

出口：文件结构、指纹和人工段均符合 schema。

### ④ 结构验证

生成后立即做快速、确定性的结构验证：文件存在、schema 字段、实例溯源、spec hash、`generatedAt`、manual 段保护和内部链接均通过后再报告成功。不默认执行完整实例集，不启动服务，不产生功能测试副作用。

出口：结构验证结果为 `PASS`，失败则报告具体 gap，不回滚生成物。

## 可选行为验证

仅当用户明确要求运行实例集时，才调用生成的功能测试 skill 执行隔离、串行的实例验证；届时按实例捕获 stdout/stderr、exit code 和 expected-vs-actual evidence，并由执行 skill 报告 `PASS m/n`。这不是 scaffold 的默认步骤。

## 不做什么

- 不替代生成后的功能测试 skill；
- 不替代 `tdd`、`tdd-implement` 或 `commit-check`；
- 不覆盖 `<!-- manual -->` 段，不静默重生成，不把 README/`--help` 推断写成无溯源实例。

## 引用

- 实例 schema：[`references/schema.md`](references/schema.md)
- 领域术语：`CONTEXT.md`
- 技能设计规则：`docs/agents/skill-design.md`
- 示范产物：`.agents/skills/instance-test/`
