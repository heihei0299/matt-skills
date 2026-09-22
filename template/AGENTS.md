本仓库继承全局 `AGENTS.md`；以下规则仅具体化项目工作流，不放宽其边界。

## CodeGraph
- 需要理解或修改代码时，若无 `.codegraph/`，先执行 `codegraph init`；定位、调用流分析和排错优先使用 `codegraph explore`。
- 不重复读取 `codegraph explore` 已返回的源码；仅对未覆盖、未索引或 stale 内容使用 `rg` / Read，必要时刷新索引。

## Validation
- 在全局授权范围内，优先验证原问题和直接影响范围；涉及公共 API、共享抽象或跨模块调用时扩大验证。
- 报告修改、验证结果、未验证项、既有失败和剩余风险；有 commit 时附 hash。

## Git
- 获得 commit 授权后，每个独立 issue / spec 创建一个交付 commit，不按实现阶段拆分；checkpoint 须注明未完成状态。
- commit 前检查 `git diff` 和 `git status`，仅 stage 当前任务改动；commit 不授权远程写入。
