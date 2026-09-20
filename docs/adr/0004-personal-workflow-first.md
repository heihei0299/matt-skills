# Personal workflow is the primary product

Status: accepted

本仓库首先服务所有者本人的 Agent 代理开发工作流；模板和 CLI 是把该工作流部署到其他仓库的机制，外部复用是副产品。主链固定为“需求对齐 → Spec → 用户确认的 executable tickets → 行为变更默认 TDD → code-review → 验收”，简单、机械或明确不改变行为的任务可直接做最小修改。

## Decision

`PROJECT.md` 记录定位、范围和文档职责；`AGENTS.md` 只保留读取顺序、路由和不可绕过边界；`CONTEXT.md` 只维护 glossary；Spec、ADR、Tracker 和 Skills 分别承担需求共识、持久决策、可执行工作项和操作程序。上游 Skills 原义不变，个人适配只通过 wrapper 或路由完成。

`commit-check` 是主链末端的显式检查器：它在 Review 之后报告 `ready to stage` 或阻塞项，不负责 staging、commit，也不重复已完成的验证。

## Considered options

- 以模板/CLI 分发为首要产品：拒绝，因为它会让个人工作流的目标、词汇和决策服从部署副本。
- 修改上游 Skills 以适应个人偏好：拒绝，因为会破坏上游同步边界；组合和路由足以表达个人流程。
- 让实现阶段自动提交：拒绝，因为提交需要独立的范围、敏感信息和消息检查，并保留所有者的最终控制权。

## Consequences

个人根文档是工作流事实源；模板和 CLI 的变化不能反向改变个人决策。工作流增加了用户确认和 Review 的边界，但减少了重复实现、重复验证和上游语义漂移。`commit-check` 的 ready-to-stage 契约需要由后续 skill 实现变更落实；本 ADR 只记录决策，不改变上游 Skill body。
