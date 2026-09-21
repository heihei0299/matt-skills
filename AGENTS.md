本仓库遵循全局 `AGENTS.md`；以下规则仅用于具体化本项目工作流，不放宽全局安全、授权或运行时权限边界。

## Context / CodeGraph

以当前代码、配置、测试和版本化文档为项目事实来源；更具体的目录级规则优先。
有当前 issue / spec 时先读它；否则从用户问题和最相关的 symbol / path 开始。
只围绕当前未决问题扩展上下文；README、package、tests、docs 按需读取。
当前上下文已有充分且未过时的证据时，不做等价重复读取。
当前上下文不足且需要新增代码理解证据时，优先使用 `codegraph explore`；结果充分后不再执行等价的 broad grep / read。
实现时复用现有抽象、接口和依赖方向，不创建平行实现或无关扩展。

## Validation

优先验证原问题、相关测试和直接受影响模块。
公共 API、共享抽象、跨模块调用链或局部验证不足时扩大验证范围。
项目已有针对当前改动的验证入口时优先使用，不自行创建等价验证流程。

## Git

每个独立 issue / spec 对应一个交付 commit，不按实现、测试、review 等阶段拆分。
仅在本次任务完成并通过相关验证后 commit；明确要求 checkpoint 时可提交未完成状态，并注明未完成或未通过的验证。
commit 前检查 `git diff` 和 `git status`；只 stage 当前任务改动，不混入其他任务或用户已有修改。
commit 不授权 push、发布或其他远程写入。
commit 后报告 hash，以及本次执行的主要验证及结果。

## Completion

完成时简要说明结果、关键修改和验证。
存在重要未验证项、已知限制、既有失败或剩余风险时明确指出。
有 commit 时报告 commit hash。
