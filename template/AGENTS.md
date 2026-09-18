# AGENTS.md

<!-- matt-skills:managed:start -->
## Workflow

按任务选择最匹配的 skill / 工具：

* 代码理解 / 定位 / 调用链 → `codegraph explore`
* 多来源调研 / 方案比较 / 技术选型 → `research`
* 原型 / PoC → `prototype`
* 代码审查 → `code-review`
* 设计质询 → `grilling`
* 领域建模 → `domain-modeling`
* 其他 → `ask-matt`

`research` 仅用于多来源综合分析；事实、实时信息和单一资料查询直接使用对应工具。

仅当歧义影响接口、数据、安全、范围或验收结果时询问用户。

## Context

按需读取 `README.md`、`PROJECT.md`、`CONTEXT.md`。

以当前代码、配置、测试和版本化文档为事实来源；项目特定规则、命令和完成标准以更具体的 `AGENTS.md` 为准。

## Code Navigation

仓库内代码理解优先使用：

```bash
codegraph explore "<问题>"
```

已锁定符号时：

```bash
codegraph node "<符号>"
```

需要索引且适合写入时可执行 `codegraph init`。

从最小必要上下文开始，只补充缺失信息，不重复探索已确认内容。CodeGraph 不可用时降级到 `rg` 和最小文件读取。

## Development

行为或逻辑实现默认使用 `tdd`：

* 先建立最小测试或可重复复现，再做最小实现。
* 无适用自动化测试时，使用最小可验证方式证明行为正确。
* 复用现有抽象、接口和依赖方向，不创建平行实现或扩大范围。
* 文案、格式、注释、机械重命名和不改变行为的配置可直接修改。

## Validation & Review

优先验证原问题复现路径、新增或直接相关测试及直接受影响模块。

修复后只复验失败项及新增修改；仅当公共 API、共享抽象、依赖方向、跨模块调用链或影响面扩大时扩大验证范围。

不重复仍然有效的等价验证，不因普通修改自动运行全量测试；更具体规则要求的检查除外。

变更审查默认聚焦本轮 diff、修改文件和直接受影响调用链；任务本身要求更广范围时按任务范围审查。

## Git

* 仅在用户要求时 commit。
* commit 前检查 diff。
* 只 stage 本次任务文件。
* 禁止 `git add .` / `git add -A`。
* 不混入已有未提交修改。

## Security

* 不读取或提交 secrets。
* 安装或升级依赖、部署、发布、`git push`、远程写操作及破坏性命令，必须获得用户对当前操作的明确授权。

## Completion

完成时说明改动或审查结论、已执行验证、未执行验证及原因、剩余风险；如有 commit，报告 commit hash。
<!-- matt-skills:managed:end -->
