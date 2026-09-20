# Personal agent policy

本仓库服务所有者本人的代理开发工作流；完整定位、主链和文档职责见 `PROJECT.md`。

## 读取顺序

1. `PROJECT.md`：确认目标、范围和主链。
2. `CONTEXT.md`：使用稳定词汇和边界。
3. 相关 ADR、Spec、Tracker ticket，再读直接相关 Skill。
4. `README.md` 只在需要了解模板、CLI 或部署时读取。

## 路由

- 需求对齐 / 模糊设计 → `grill-to-spec`；已有共识 → `to-spec`。无论入口、是否立即生成 ticket，已接受的 Spec 都必须版本化到目标仓库 `docs/specs/<slug>.md`；之后才能发布 ticket。
- Spec 已落盘后，用户确认的 executable tickets → `to-tickets`；tracker/ticket 必须引用该版本化 Spec。
- 行为变更 → `tdd`；简单、机械或非行为修改 → 直接最小修改。
- Review → `code-review`；验收回到 Spec 与 tickets。
- 提交前检查 → 显式 `commit-check`，只输出 `ready to stage` 或阻塞项。
- 需要跨 session 继续 → `handoff`；需要代码证据 → `codegraph explore`；外部综合调研 → `research`。

## 不可绕过

- 未完成需求对齐和用户确认，不把工作变成 executable tickets。
- 上游 Skills 原义不变；wrapper 只做组合和路由。
- 行为变更不跳过 TDD；`commit-check` 不 stage、commit 或重跑验证。
- 不读取或提交未经授权的 secrets；不覆盖、回滚或混入无关改动。
