## 优先级

系统 / developer 指令 > 用户当次明确要求 > 本文件 > 全局 AGENTS.md > 技能（Skills）

## 基础偏好

- 执行类给短进度，分析类给结论/依据/权衡
- 不为严谨展开冗长流程；复杂/根因不明/高风险/跨模块才展开；回合连续性（逻辑单元一回合串行完成，见分文件）

## 能力边界

- 工具：以当前 harness 实际提供为准（bash / 文件读写 / grep / glob / 代码图 / 子代理 / 网页抓取等可用子集）；不硬编码不存在的工具；承诺前先检查 git/依赖/端口

## 快速上手

1. 读 `CONTEXT.md`（术语）——没有则跳过
2. 按行为路由表行动；未命中用 ask-matt 或直接澄清
3. 探索代码库：优先 codegraph CLI（`codegraph explore`），无索引时派 explore 子代理

## 执行原则

- 先澄清边界再实现；局部最小修改；用户当次指令优先于历史经验；脏工作区不回滚他人改动
- 执行与文档维护细则（沉淀门槛、条目格式）见分文件

## 安全边界

以全局 AGENTS.md 安全铁律为准，本仓库无附加差异。

## 行为路由（默认 22 自动发现，`--all` 展开至 32）

命中即行动，回复中简短声明所用技能与原因。

- 探索/定位/理解代码库 → 有 `.codegraph/` 索引：`codegraph explore`（CLI）优先；无索引用 explore 子代理
- 后台调研 → research；原型验证 → prototype
- 实现（有 spec 且要求 TDD/测试先行）→ tdd-implement（seam red-green）；实现（有 spec 不要求 TDD）→ implement（无 spec 先 to-spec）；测试先行 → tdd
- 设计打磨 → grilling；达成共识→spec → grill-to-spec（grilling→domain-modeling→to-spec）
- 领域术语/ADR → domain-modeling；模块接口 → codebase-design；巨型规划 → wayfinder
- 诊断 → diagnose-fix（编排 diagnosing-bugs + tdd，硬门槛）；审查 → code-review；合并冲突 → resolving-merge-conflicts；提交前 → commit-check（文档一致性 → 目录卫生 → commit message，三项）
- 分诊 → triage；架构扫描 → improve-codebase-architecture；综合 spec → to-spec；拆票 → to-tickets
- 可选（需 `--all` 才发现）：grill-me / grilling / handoff / teach / to-questionnaire / wait-what / writing-for-agents / ci-guard / scaffold-functional-test / instance-test
- 兜底 → ask-matt；模板维护 → README.md

显式触发（须用户 `/` 发起，默认 22 中仅 grill-to-spec/wayfinder/to-spec/to-tickets/triage/improve-codebase-architecture 为默认；其余 teach/handoff/writing-for-agents 需 `--all`）：grill-to-spec、wayfinder、to-spec、to-tickets、triage、improve-codebase-architecture、teach、handoff、writing-for-agents

## 分文件

- Issue tracker → `docs/agents/issue-tracker.md`；Triage labels → `docs/agents/triage-labels.md`；Domain docs → `docs/agents/domain.md`
- 术语表 → `CONTEXT.md`

## CodeGraph

仓库被 CodeGraph 索引（根目录存在 `.codegraph/`）时，理解/定位代码**优先于** grep/find/读文件——一次调用拿到相关符号源码与调用路径：

- **CLI**：`codegraph explore "<符号名或问题>"` 一次回答大部分代码问题——相关符号的逐字源码 + 调用路径（含 grep 追不上的动态分派跳转）。在 query 中指名文件/符号即可读取其带行号的当前源码。

没有 `.codegraph/` 目录则完全跳过 CodeGraph——是否建立索引由用户决定。
