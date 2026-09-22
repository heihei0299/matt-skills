本仓库遵循全局 `AGENTS.md`；以下规则仅具体化项目工作流，不放宽全局安全、授权或权限边界。

## CodeGraph

- 若不存在 `.codegraph/`，先执行 `codegraph init`。
- 代码理解、定位、调用流分析、排错及修改前探索优先使用 `codegraph explore`。
- `codegraph explore` 已返回的源码不再使用 `rg` / Read 重复读取或手工重建调用链。
- 仅对未覆盖、未索引或 stale banner 指出的内容使用 `rg` / Read。

## Validation

- 优先验证原问题、相关测试和直接受影响模块；涉及公共 API、共享抽象或跨模块调用时扩大范围。
- 优先使用项目已有验证入口，不创建等价流程。
- 完成时报告关键修改和验证结果；未验证项、既有失败或剩余风险必须明确指出。

## Git

- 每个独立 issue / spec 对应一个交付 commit，不按实现、测试或 review 阶段拆分。
- 仅在任务完成并通过相关验证后 commit；明确要求 checkpoint 时可提交未完成状态，并注明未完成验证。
- commit 前检查 `git diff` 和 `git status`，仅 stage 当前任务改动。
- commit 不授权 push、发布或其他远程写入。
- commit 后报告 hash 和主要验证结果。
