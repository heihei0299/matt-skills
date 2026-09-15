# matt-skills 修改放大问题审计报告

## 1. 审计目标

本次审计聚焦 `matt-skills` 当前的可维护性问题：

> 为什么一个很小的 Skill 修改，经常同时要求修改测试、生成代码、template 镜像以及 orchestration 相关内容。

审计重点不是测试数量本身，而是：

- 修改传播范围；
- 重复事实源；
- 生成物与源码的耦合；
- 测试与自然语言文案的耦合；
- 模块职责是否清晰。

## 2. 结论摘要

当前存在明显的 **Change Amplification（修改放大）**。

一个 Skill 的局部修改可能传播到：

```text
.agents/skills/<skill>
        ↓
template/.agents/skills/<skill>
        ↓
template mirror tests
        ↓
skill-specific tests
        ↓
orchestration/dependency assertions
```

核心问题可归纳为四项：

1. `template/.agents/skills` 成为了第二份持久化 Skill 副本。
2. CLI 已经存在直接 Skill 分发能力，却仍保留 template Skill snapshot。
3. 部分测试验证自然语言写法，而不是行为契约。
4. 多层测试重复验证同一个 mirror/invariant。

其中第一项是最主要的架构问题。

## 3. 当前架构

共享 Skill 当前主要存放于：

```text
.agents/skills/
```

与此同时 `scripts/build-template.js` 会再次生成：

```text
template/.agents/skills/
```

用户最终安装时又通过 CLI 将 Skill 同步到：

```text
target/.agents/skills/
```

形成：

```text
Canonical Skill
.agents/skills
      │
      ▼
Generated Skill Snapshot
template/.agents/skills
      │
      ▼
Target Project
```

但 CLI 当前本身又已经具备：

```text
.agents/skills
      │
      ▼
target/.agents/skills
```

的直接同步能力。

因此目前存在两条重叠的 Skill 分发路径。

## 4. 问题一：Skill 存在两份长期持久化副本

理论上的 Skill 事实源是：

```text
.agents/skills/
```

但下面的内容也被提交进 Git：

```text
template/.agents/skills/
```

并且有测试要求它与 workspace Skill 保持一致，所以它虽然被称为 generated snapshot，实际上具备源码的全部维护成本：

- 出现在 Git diff；
- 参与代码审查；
- 可能产生 merge conflict；
- 需要专门 rebuild；
- 测试要求同步；
- 错误同步时需要修复提交。

因此实际效果接近两份事实源，而不是单一事实源。

## 5. 问题二：Template 与 Distribution 职责重叠

当前 `template/` 同时承担：

```text
项目骨架
+
共享 Skill 内容
```

但 Skill 分发逻辑本身已经存在于 CLI。

当前 CLI 已经知道 `SKILLS_DIR`，并可以根据 `skill-boundaries.js`、默认 programming 集合、`--all` 和 repo-local 规则决定应该安装哪些 Skill。

因此 `template/.agents/skills` 并不是 Skill 分发的必要组成部分。

当前架构实际上是：

```text
                 ┌─ build-template ─► template Skill snapshot
.agents/skills ──┤
                 └─ CLI ────────────► target Skill
```

两套机制维护同一结果。

## 6. 问题三：生成物进入日常开发闭环

近期围绕 `tdd-implement` 的修改已经表现出这一问题。

一个 reference 的流程顺序调整，本来只涉及：

```text
.agents/skills/tdd-implement/references/*
```

但随后还需要：

```text
template/.agents/skills/tdd-implement/*
```

重新同步，并出现独立的 template rebuild 提交。

这说明 generated snapshot 已经侵入正常开发路径。

理想的 generated artifact 应当：

- 不提交 Git；或
- 在发布阶段自动生成。

而不应该成为每次修改 Skill 后必须同步维护的第二份内容。

## 7. 问题四：测试绑定具体文案

部分测试使用：

```js
assert.match(content, /具体中文句子/);
```

例如 dependency/orchestration 测试会匹配：

```text
停止受影响调度并报告
不降级为无依赖
依赖节点不存在
```

这些规则本身有价值，但测试方式把“行为语义”和“具体措辞”绑定在一起。

结果是：

```text
含义不变
+
重新表述
=
测试失败
```

普通文档维护因此被错误提升为契约修改。

## 8. 问题五：Mirror 测试重复

目前存在多层 mirror 检查：

### 全局 Template Mirror

`template-sync.test.js` 验证：

```text
template/.agents/skills
==
.agents/skills
```

### Skill-specific Mirror

`tdd-implement-stages.test.js` 又单独验证：

```text
template tdd-implement
==
workspace tdd-implement
```

### Dependency-specific Mirror

`tdd-implement-dependencies.test.js` 又验证 workspace orchestration 与 template orchestration 完全一致。

因此形成：

```text
global mirror test
+
skill mirror test
+
dependency mirror test
```

三层验证同一个事实。

## 9. 问题六：测试职责混合

以 `tdd-implement` 为例，当前相关测试混合承担：

```text
Skill 格式验证
生命周期验证
reference 验证
具体文案验证
dependency policy 验证
orchestration 验证
template mirror 验证
distribution 验证
```

理想情况下应分离为：

```text
Skill Structure
Skill Contract
Distribution
CLI Behavior
```

每种测试只保护自己的责任边界。

## 10. 问题七：维护成本与行为风险不匹配

当前极小文案变化和真正行为变化，可能产生相近的工程成本：

```text
source
template
tests
snapshot rebuild
```

这说明当前架构无法根据修改风险进行局部化。

## 11. 根因

本次审计认为根因是以下设计叠加：

```text
生成快照长期提交
+
CLI 与 template 双重分发
+
mirror exact-match
+
自然语言 regex contract
+
重复测试同一事实
```

最终形成：

```text
修改 Skill
  ↓
修改 generated copy
  ↓
调整 exact-match tests
  ↓
调整 wording tests
  ↓
重新验证 distribution
```

因此问题属于架构性问题。

## 12. 风险评估

### 可维护性风险：高

随着 Skill 数量和 reference 数量增加，workspace copy、template copy 与测试之间的同步成本会持续上升。

### 回归风险：中

大量 exact-match 测试更多证明“两个副本一样”，而不是“最终用户得到的分发结果正确”。

### Review 成本：高

generated diff 会显著扩大 review 面积，真正有意义的修改容易淹没在机械复制 diff 中。

### AI 开发成本：高

Agent 可能需要同时读取 canonical source、template mirror、mirror tests、skill tests 与 distribution tests，增加上下文、token 使用和错误修改概率。

## 13. 目标架构

共享 Skill：

```text
.agents/skills/
```

作为唯一事实源。

Template：

```text
template/
```

只承担项目骨架。

Distribution：

```text
bin/cli.js
+
bin/skill-boundaries.js
```

负责将：

```text
template skeleton
+
selected skills
```

组装为最终用户项目。

目标：

```text
           .agents/skills
           Canonical Source
                  │
                  ▼
         Distribution Policy
                  │
                  ▼
             CLI Assembly
            ↙           ↘
       template          skills
       skeleton
            \            /
             ▼          ▼
              Target Repo
```

## 14. 理想修改传播范围

| 修改 | 正常影响 |
|---|---|
| Skill 措辞 | 1 个 Skill 文件 |
| reference 措辞 | 1 个 reference |
| Skill 行为变化 | Skill + contract test |
| orchestration 行为变化 | orchestration + contract test |
| 新增 Skill | Skill + 必要边界配置 |
| CLI 分发变化 | CLI + distribution test |
| Template 骨架变化 | template + template test |

普通 Skill 修改不应再触发 template Skill snapshot。

## 15. 审计结论

当前 `matt-skills` 的主要维护性瓶颈不是代码规模，而是：

> 同一个 Skill 内容跨多个持久化副本和测试层重复表达。

优先级最高的两个整改点：

### P0：删除持久化 Skill mirror

删除：

```text
template/.agents/skills
```

### P0：删除围绕 mirror 建立的重复 exact-match tests

将测试重点转向：

```text
canonical Skill contract
+
最终 distribution result
```

成功标准：

> 修改一个 Skill 的非行为内容时，只需要修改这个 Skill 本身。
