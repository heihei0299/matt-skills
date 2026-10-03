---
name: ci-guard
description: "matt-skills 仓库专用 GitHub Actions / npm release gate。仅在用户显式调用并且当前仓库身份确认是 @heihei0299/matt-skills 时执行。"
disable-model-invocation: true
---

# CI Guard

这是 **matt-skills 仓库专用** skill，不是通用 CI skill。用户显式调用后，第一步先读取当前 `package.json`；只有 `name` 精确等于 `@heihei0299/matt-skills` 时才继续。身份不匹配立即停止并报告 `repo mismatch`，不得把本仓库的 workflow、tag 或 npm 发布假设套到其它项目。

身份确认后，读取 `.github/workflows/ci.yml`，以实际 workflow 的 job、input、condition 和权限为事实源；不要假设不存在的 job、input 或自动回滚行为。产品代码 bug 的诊断和修复交给 `diagnose-fix`，不在此重复通用诊断。

## 场景选择

- 用户请求发布、打 release tag 或发布 npm → **发布路径**；
- 用户修改 workflow，或报告 Actions 红/偶发红 → **workflow 维护路径**；
- tag 已发布但 registry、release 或 post-check 异常 → **发布后故障路径**。

只执行命中的路径；普通发布不运行与当前 workflow 无关的 lint、dry-run 或 dispatch。

## 发布路径

1. 读取当前 package metadata 和 workflow；确认正式 tag 的 commit 可从 `main` 到达，目标 tag 尚不存在，版本与 tag 约定一致。
2. 运行项目规定的测试和 `npm pack --dry-run`，确认发布内容和实际结果。
3. 只有前两步通过后才创建并推送 `vX.Y.Z` tag；不从非 `main` commit 推送正式 tag。
4. 等待 tag workflow 完成，确认 `verify` 成功后才进入 `publish`，并记录 Actions run URL、job 结论和实际 npm tag。
5. 使用 `npm view <package>@<version> version` 或 registry API 回读，确认发布版本真实可见。

出口：tag、Actions 和 registry 的实际结果均已记录；任一失败都阻断“发布成功”结论。

## Workflow 维护路径

1. 读取当前 workflow，按实际内容检查触发器、`publish.needs`、job `if`、权限和 concurrency；不硬编码 job 名称。
2. 只有 workflow 在本次范围内发生变化，或故障需要时，才运行已安装的 `actionlint` / `yamllint`；工具不可用就记录 `unavailable`，不得伪报通过。
3. 需要 dry-run 或手动 dispatch 时，只使用 workflow 已声明的 input；不得传入未声明的 `dry_run` 等参数。若无安全的 dry-run input，改用静态依赖检查或一次不发布的验证运行。
4. 失败时区分 workflow wiring、项目测试、授权/registry 和 runner 环境；只修复当前请求范围内的问题。

出口：实际 workflow 结构、检查命令和运行结果均有证据；未验证项明确列出。

## 发布后故障路径

1. 读取对应 Actions run、npm registry 和 Git tag 的实际状态，确认是未发布、发布延迟、重复版本、授权失败还是 post-check 失败。
2. 创建或补充带 run URL 的 issue，记录 registry 查询结果和失败分类。
3. 只按照当前 workflow 声明的人工回滚步骤操作；不自行声称删除 release、删除 tag 或 `npm unpublish` 已发生。

出口：故障分类、保留的远端对象和人工下一步均已明确。

## 不做什么

- 不在非 `@heihei0299/matt-skills` 仓库执行；
- 不把每次发布都扩展为完整 CI 工具链演练；
- 不引用不存在的 `build` job、`dry_run` input 或 `rollback_version` input；
- 不把历史事故描述当成当前仓库事实；
- 不自动删除 tag/release，不静默吞掉 publish 或 post-check 失败。
