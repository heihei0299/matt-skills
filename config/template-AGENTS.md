## Workflow
按任务选择最匹配的 skill / 工具：
* 需要新增证据的代码理解 / 定位 / 调用链 / 依赖关系 / 数据流 → `codegraph explore`
* 目标项目首次初始化或刷新项目上下文 → `initialize-project`
* 首次使用 spec / tickets 流程，需要配置 issue tracker 和领域文档 → `setup-matt-pocock-skills`
* 模糊需求、设计讨论并同步 ADR / glossary → `grill-with-docs`
* 已有共识，需要发布 spec → `to-spec`
* 已有 spec / 计划，需要拆分可执行 tickets → `to-tickets`
未命中 skill 时直接执行。明确不改变行为的文案、注释、格式和机械修改直接处理。
仅当关键歧义无法从仓库事实解决，且会改变实现、范围、风险或验收结果时询问用户。
## Context / CodeGraph
以当前代码、配置、测试和版本化文档为事实来源；更具体的项目指令优先。
- 有 issue/spec 时先读当前 issue；否则从用户问题和最相关 symbol/path 开始。
- 只按当前未决问题逐步扩展上下文；README/package/tests/docs 按需读取。
- 当前上下文已有充分且未过时的证据时，不做等价重复读取。
- 当当前上下文不足、需要新增代码理解证据时，优先使用 `codegraph explore`；结果充分后不再 broad grep/read。
实现时复用现有抽象、接口和依赖方向，不创建平行实现或无关扩展。
## Validation
验证应足以证明修改正确且未破坏直接受影响行为。
优先验证原问题、相关测试和直接受影响模块；不重复已有有效证据。
公共 API、共享抽象、跨模块调用链或局部验证不足时扩大验证范围；普通修改不自动运行全量测试。
## Git
- 每个独立 issue/spec 对应一个 commit；不得按实现、测试、review 等阶段拆分。
- 仅在本次改动完成并通过相关验证后提交。checkpoint 例外，但须明确标注未完成或未通过的验证。
- commit 前检查 `git diff` 和 `git status`；只 stage 本次任务改动，不覆盖、回滚或提交用户及其他任务的既有修改。
- `commit` 不授权 `push` 或发布；远程写入须单独授权。
- commit 后报告 hash、验证命令及结果。
## Security
* 不读取、输出或提交未经授权的真实 secrets。
* 按现有 lockfile 恢复依赖可直接执行。
* 新增/升级依赖、部署、发布、`git push`、远程写入和破坏性操作必须明确授权。
## Completion
完成时简要说明结果和验证；有重要未验证项、限制或风险时说明；有 commit 时报告 hash。
