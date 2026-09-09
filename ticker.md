# matt-skills 第四批重构 Ticket Index

本文件是第四批重构计划的索引。详细执行内容已按原计划拆成 8 个 ticket 文件；未重新细化、合并或扩大 ticket 范围。

## 固定分类契约

| 分类 | 成员 |
|---|---|
| Proprietary（独有） | `ci-guard`、`tdd-implement`、`grill-to-spec`、`diagnose-fix`、`commit-check`、`scaffold-functional-test`、`show-me` |
| Distributable proprietary（可分发独有） | `tdd-implement`、`diagnose-fix`、`grill-to-spec`、`scaffold-functional-test`、`show-me` |
| Repo-local（仓库内部） | `ci-guard`、`commit-check` |
| Default proprietary（默认独有） | `tdd-implement`、`diagnose-fix`、`grill-to-spec`、`show-me` |

必须保持：

- distributable proprietary 与 repo-local 不相交；
- 两者并集等于 proprietary；
- default proprietary 是 distributable proprietary 的子集；
- `--all` 表示全部可分发 skill，不表示 workspace 全集；
- repo-local skill 不通过 `list`、`install`、`init`、`sync` 或 global install 分发；
- 目标仓库已有的 repo-local 副本只保留并提示，不自动删除或覆盖；
- workspace 保留两个 repo-local skill，template 不包含它们；
- 数量统计和 CLI help 使用运行时数据，文档只保留有明确上下文的分类契约数字；
- 不新增 skill、不重设计现有 skill、不做破坏性 migration、不改变 upstream sync 基本模型。

## 依赖图

```text
01 分类契约与不变量
├── 02 list/install 分发边界
├── 03 init 分发边界
├── 04 sync 迁移安全与 cleanup
└── 06 动态统计与 CLI help

02 + 03 + 04
└── 05 template 净化与分发兼容

05 + 06
└── 07 README、CONTEXT 与公开文档口径

02 + 03 + 04 + 05 + 06 + 07
└── 08 真实 CLI fixture、全仓 audit 与最终门禁
```

## Ticket 文件

1. [01 — 建立 skill 分类单一事实源与集合不变量](.scratch/fourth-batch-distribution-boundaries/issues/01-skill-classification-contract.md)
2. [02 — 让 list 与 install 只处理可分发 skill](.scratch/fourth-batch-distribution-boundaries/issues/02-list-install-distribution-boundary.md)
3. [03 — 让 init 只初始化可分发内容](.scratch/fourth-batch-distribution-boundaries/issues/03-init-distribution-boundary.md)
4. [04 — 让 sync 安全迁移并修复旧镜像 cleanup](.scratch/fourth-batch-distribution-boundaries/issues/04-sync-migration-cleanup.md)
5. [05 — 净化 Template Snapshot 并保持分发兼容](.scratch/fourth-batch-distribution-boundaries/issues/05-template-snapshot-distribution.md)
6. [06 — 动态化 CLI 统计、帮助文本与模式语义](.scratch/fourth-batch-distribution-boundaries/issues/06-dynamic-cli-stats-help.md)
7. [07 — 统一 README、CONTEXT 与公开文档口径](.scratch/fourth-batch-distribution-boundaries/issues/07-docs-vocabulary-alignment.md)
8. [08 — 建立真实 CLI 分发边界回归矩阵并完成最终 audit](.scratch/fourth-batch-distribution-boundaries/issues/08-cli-fixtures-final-audit.md)

## 执行规则

- 每个 ticket 文件只描述一个原计划阶段，并包含目标、阻塞关系、验收标准和验证方式。
- 按编号和 `Blocked by` 顺序推进；前置 ticket 未完成时不执行后续 ticket。
- 每个 ticket 完成后必须保留可验证证据；最终 ticket 负责跨命令 fixture、全仓 audit 和完整门禁。
- 测试、构建和 CI 执行遵守当前环境的编译授权要求。
