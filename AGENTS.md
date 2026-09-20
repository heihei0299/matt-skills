## 路由
命中即执行，并简短声明使用的 skill / 工具。
* 理解 / 定位 / 调用链 → `codegraph explore`
* 外部调研 / 方案比较 → `research`
* 原型 / PoC → `prototype`
* 简单修改 → 直接实现
* TDD / 集成测试 → `tdd`
* bug / 异常 / 性能 → `diagnose-fix`
* 代码审查 → `code-review`
* 设计质询 → `grilling`
* 领域建模 → `domain-modeling`
* 无法归类 → `ask-matt`
\仅当关键歧义会改变结果时询问用户。

## 项目上下文
开始任务前按需读取：
- `PROJECT.md`（若存在）：项目目标、范围和主要入口
- `README.md`（若存在）：用户视角的使用与开发说明
- `CONTEXT.md`（若存在）：领域术语与边界

## Progressive discovery
发现按当前 issue/spec 逐步展开：先读取当前 issue/spec，定位相关 symbol/path，读取最小实现面；只有具体未决问题需要时才扩展。
默认不自动读取 README.md、package.json、全部测试、架构文档或邻近模块。README、package/config、tests、docs 只在当前问题直接需要时读取，例如命令/包行为、公开契约、依赖版本、仓库执行规则或行为覆盖；合法的直接依赖仍可读取。

## Evidence reuse
当前上下文已有足够可靠证据时，不为确认同一事实重复搜索或读取。仅在证据不完整、与另一来源冲突、相关文件可能已过时、缺少所需精确来源位置/内容，或验证要求新观测时补充证据。
证据优先顺序：当前精确源码/结果 → 当前 issue evidence → codegraph result → 已完成 issue 的 ledger/git history → 定向读取/搜索 → 广泛探索。摘要不替代编辑或证明所需的精确源码；必要时仍读取，且后续 issue 可复用 ledger/git history。

## Codegraph query discipline
具体实现问题的 codegraph 查询必须对应当前未决问题，优先询问 symbol、behavior、call-chain 或 state owner；查询结果足够后只读取回答问题所需的文件/范围，不默认用广泛 grep/find/read 重复相同发现。
Read/grep 仍可用于精确源码、codegraph 未提供的范围、生成/动态路径或确认具体怀疑的引用；架构范围的探索仅在用户要求架构分析时展开。

## CodeGraph
仓库内代码理解首先使用：
```bash
codegraph explore "<问题>"
```
无 `.codegraph/` 时：
```bash
codegraph init
codegraph explore "<问题>"
```
* 优先于 `Read`、`grep`、`rg`、`find` 和代码探索子代理。
* 从最小必要上下文开始；返回完整源码即视为已读。
* 信息不足时只针对缺口继续 `explore`；已锁定符号时使用 `codegraph node`。
* CodeGraph 无法提供必要信息时，才降级到最小必要的读取 / 搜索。
* `research` 只用于仓库外信息。
## 执行
默认闭环：
```text
定位 → 实现 → 验证 → 修正
```
* 以仓库当前代码、类型、配置、测试和版本化文档为事实来源。
* 优先复用现有抽象、接口和依赖方向。
* 不创建平行实现，不扩大任务范围。
* 简单任务直接执行；复杂任务需要时形成最小可执行计划。
* 仅在需要用户判断或授权时中断闭环。
## 验证
服从全局授权规则。
* 默认只验证本次修改及直接受影响路径；优先相关单测、单文件测试、模块测试和原复现路径。
* 修复什么就测试什么；根据反馈继续修正，不重复等价检查。
* 不因每个小步骤自动扩大测试范围。
* 仅当修改跨模块、触及公共接口/核心基础设施、局部验证不足以证明正确、进入发布/合并最终验收，或用户明确要求时，才考虑更大范围验证。
## Review
* 默认只 review 本轮 diff、修改文件及直接受影响调用链。
* 修复后只复验新增修改和此前未通过项，不重复审查无关代码。
* 仅在影响面明显扩大、局部 review 无法建立信心、进入发布/合并最终验收，或用户明确要求时扩大 review 范围。
## Harness
同类问题反复出现时，优先将约束落实到测试、lint、类型、工具或代码结构，而不是继续扩充本文件。
## Git
* 提交前检查 diff。
* 只 stage 本次任务文件。
* 不使用 `git add .` / `git add -A`。
