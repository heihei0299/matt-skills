## Workflow
按任务选择最匹配的 skill / 工具：
* 代码理解 / 定位 / 调用链 / 依赖关系 / 数据流 → `codegraph explore`
* 行为修改 / 功能实现 / bug 修复 / 逻辑调整 → `tdd`
* 多来源调研 / 方案比较 / 技术选型 / 最佳实践 / 外部实现 → `research`
`research` 仅用于多来源综合；单一资料、官方文档和实时事实直接查询。
未命中 skill 时直接执行。明确不改变行为的文案、注释、格式和机械修改无需 `tdd`。
仅当关键歧义无法从仓库事实解决，且会改变实现、范围、风险或验收结果时询问用户。
## Context
以当前代码、配置、测试和版本化文档为事实来源；更具体的项目指令优先。
代码理解优先使用 `codegraph explore`；已锁定符号时使用 `codegraph node`。
只获取完成任务所需的最小上下文；信息充分后停止探索。CodeGraph 不足时降级到 `rg` 和必要文件读取。
## Progressive discovery
发现按当前 issue/spec 逐步展开：先读取当前 issue/spec，定位相关 symbol/path，读取最小实现面；只有具体未决问题需要时才扩展。
默认不自动读取 README.md、package.json、全部测试、架构文档或邻近模块。README、package/config、tests、docs 只在当前问题直接需要时读取，例如命令/包行为、公开契约、依赖版本、仓库执行规则或行为覆盖；合法的直接依赖仍可读取。
## Evidence reuse
当前上下文已有足够可靠证据时，不为确认同一事实重复搜索或读取。仅在证据不完整、与另一来源冲突、相关文件可能已过时、缺少所需精确来源位置/内容，或验证要求新观测时补充证据。
证据优先顺序：当前精确源码/结果 → 当前 issue evidence → codegraph result → 已完成 issue 的 ledger/git history → 定向读取/搜索 → 广泛探索。摘要不替代编辑或证明所需的精确源码；必要时仍读取，且后续 issue 可复用 ledger/git history。
实现时复用现有抽象、接口和依赖方向，不创建平行实现或无关扩展。
## Validation
验证应足以证明修改正确且未破坏直接受影响行为。
优先验证原问题、相关测试和直接受影响模块；不重复已有有效证据。
公共 API、共享抽象、跨模块调用链或局部验证不足时扩大验证范围；普通修改不自动运行全量测试。
## Git
* 仅在用户要求时 commit。
* commit 前检查 diff，只 stage 本次任务文件。
* 禁止 `git add .` / `git add -A`。
* 不覆盖、回滚或混入已有未提交修改。
## Security
* 不读取、输出或提交未经授权的真实 secrets。
* 按现有 lockfile 恢复依赖可直接执行。
* 新增/升级依赖、部署、发布、`git push`、远程写入和破坏性操作必须明确授权。
## Completion
完成时简要说明结果和验证；有重要未验证项、限制或风险时说明；有 commit 时报告 hash。
