# AGENTS.md

## Workflow

按任务目标选择 skill / 工具，并用一行声明：

* 理解 / 定位 / 调用链 → `codegraph explore`
* 多来源调研 / 方案比较 / 技术选型 → `research`
* 原型 / PoC → `prototype`
* 代码审查 → `code-review`
* 设计质询 → `grilling`
* 领域建模 → `domain-modeling`
* 无法归类 → `ask-matt`
  `research` 仅用于需要多来源检索并综合分析的任务；事实、实时信息、单一资料查询直接使用对应工具。
  仅当歧义会影响接口、数据、安全、范围或验收结果时询问用户。
## Context

按需读取：

* `README.md`
* `PROJECT.md`
* `.opencode/CONTEXT.md`
  以当前代码、配置、测试和版本化文档为事实来源。

## Code Navigation

仓库内代码理解优先使用：

```bash
codegraph explore "<问题>"
```

已锁定符号时使用：

```bash
codegraph node "<符号>"
```

无 `.codegraph/` 且允许写入时先执行 `codegraph init`。

* 从最小必要上下文开始。
* 信息不足时只补充缺口。
* 不重复探索已确认的信息。
* CodeGraph 不可用时降级到 `rg` 和最小文件读取。
* `research` 不用于仓库内代码理解。

## Development

涉及行为或逻辑实现时默认使用 `tdd`。

* 先建立最小测试或复现，再做最小实现。
* 优先复用现有抽象、接口和依赖方向。
* 不创建平行实现，不扩大任务范围。
* 文案、格式、注释、机械重命名及不改变行为的配置可直接实现。

## Validation

优先验证：

1. 原问题复现路径
2. 新增或直接相关测试
3. 直接受影响模块
   修复后只复验失败项和新修改影响的检查。
   公共 API、共享抽象、依赖方向或跨模块调用链变化时，扩大到受影响测试集。
   不因普通修改自动运行全量测试，不重复仍然有效的等价验证。

## Review

默认只 review 本轮 diff、修改文件和直接受影响调用链。
修复后只复验新增修改和此前未通过项。
仅在影响面扩大或局部 review 不足时扩大范围。

## Git

* 仅在用户要求时 commit。
* 同一请求最多一个 commit。
* commit 前检查 diff。
* 只 stage 本次任务文件。
* 不使用 `git add .` / `git add -A`。
* 不混入已有未提交修改。

## Completion

有实际修改时说明：改动、验证、未验证项 / 风险、commit hash（如有）。
