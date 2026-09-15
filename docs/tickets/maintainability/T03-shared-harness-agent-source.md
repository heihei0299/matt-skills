# T03 — Shared Harness Agent Source

状态：Deferred / Triggered
优先级：P2
依赖：无

## 目标

只有当跨 Harness agent 真实增长或发生差异时，把共享 agent canonical source 从 `.opencode/agents` 迁移到中性目录，消除路径名与实际职责不一致的问题。

## 触发条件

满足至少一项才实施：

1. 出现第二个跨 Harness agent。
2. OpenCode 与 Pi 的 agent 内容需要不同版本。
3. `scripts/build-template.js` 对 agent 开始出现 harness-specific filter/branch。
4. 维护者无法仅通过目录结构判断某 agent 是否 shared。

未触发时不迁移。

## 推荐目标

```text
shared/agents/
      │
      ├──→ template/.opencode/agents
      └──→ template/.pi/agents

.opencode/agents/
      └── OpenCode-specific only

.pi/agents/
      └── Pi-specific only
```

如果当时没有 harness-specific agent，可暂时只保留 `shared/agents/`。

## 实施范围

允许：

- 新建 `shared/agents/`
- 移动真正 shared 的 agent source
- 调整 `scripts/build-template.js`
- 调整直接关联的 builder contract tests

原则上不修改：

- Skill distribution
- `.agents/skills`
- skill-selection
- CLI command architecture

## 实现要求

1. 明确区分 shared 与 harness-specific source。
2. builder 对 shared source 采用简单直接 copy。
3. 不引入 manifest，除非届时已经存在多个不同映射规则且直接 copy 无法表达。
4. 不保留两份相同 shared agent source。
5. Template 仍然是构建输出，不作为 canonical source。

## 验收

- [ ] shared agent 只有一个 canonical source。
- [ ] source 路径名称与共享职责一致。
- [ ] OpenCode-specific 内容不会被复制到 Pi。
- [ ] Pi-specific 内容不会被复制到 OpenCode。
- [ ] builder 中不需要通过隐含约定解释来源。
- [ ] 没有重新引入 snapshot/mirror 双维护。

## 验证

只运行 builder 和 harness distribution 直接相关测试。

## Review

只 Review Harness source migration diff。

重点检查：

- 是否确实已经满足触发条件。
- 是否为了一个共享文件提前制造复杂 mapping。
- 是否保持 canonical source 单一。
