# Skill Selection Architecture Tickets

目标：在不继续扩大架构的前提下，把 Skill selection policy 从 `bin/cli.js` 收敛为单一入口，进一步降低 Change Amplification。只做规则收口，不改 Template 架构，不引入 Service/Manager/Registry 层。

## Ticket 1 — 建立统一 Skill Selection Policy

新增 `bin/skill-selection.js`，提供纯逻辑入口，例如 `resolveSkillNames({ availableNames, mode, engineering, required })`。

职责：处理 `default/all`、engineering、required、proprietary、repo-local、去重和稳定排序。

约束：不得执行文件复制、CLI 输出、prompt、target path 或 template 操作。

验收：
- [ ] Skill selection 只有一个核心入口
- [ ] 输入相同则输出稳定
- [ ] 不依赖 `process.cwd()`
- [ ] 不产生文件系统写操作

## Ticket 2 — CLI 统一消费 Selection Result

修改 `bin/cli.js`，让 `list`、`install`、`init`、`sync` 以及相关统计统一消费 selection policy 的结果，不再各自重新实现 Skill 分类规则。

目标调用链：`CLI args -> selection policy -> copy/sync/install -> output`。

验收：
- [ ] `init` 不自行实现 Skill 分类
- [ ] `sync` 不自行实现 Skill 分类
- [ ] `install` 不自行实现 Skill 分类
- [ ] `list` 与统计使用相同 selection 语义
- [ ] CLI 对外行为保持不变

## Ticket 3 — 固化 Classification / Selection 边界

保持 `bin/skill-boundaries.js` 只负责静态分类与分类合法性；`bin/skill-selection.js` 只负责根据调用模式计算本次最终 Skill 集合。

边界：
- `skill-boundaries.js`：proprietary、distributable、repo-local、default proprietary、分类一致性
- `skill-selection.js`：default/all selection、集合合并、过滤、排序

验收：
- [ ] classification 与 selection 无重复规则
- [ ] selection 不复制 `proprietary.json` 的分类逻辑
- [ ] 不新增 `SkillManager`、`SkillService`、Registry 或其他中间抽象层

## Ticket 4 — 建立 Selection Contract Tests

新增 `test/skill-selection.test.js`，只测试 selection 行为，不锁定内部实现。

至少覆盖：default 包含 engineering、required、default proprietary；all 包含全部 distributable Skill；repo-local 永远排除；unknown 不进入结果；结果去重并稳定排序。

验收：
- [ ] 测试不依赖 CLI 文案
- [ ] 测试不锁定 Set/Array 等内部实现
- [ ] 修改 selection 实现但保持行为时无需修改测试

## Ticket 5 — 删除 CLI 中重复 Selection 逻辑

完成迁移后检查 `bin/cli.js` 中对 engineering、required、default proprietary、repo-local、distributable 的直接组合判断。只保留命令自身真正需要的 orchestration 判断。

目标：以后修改“哪些 Skill 应被选择”时，不需要同时修改多个 command。

验收：
- [ ] `list/install/init/sync` 不存在平行 selection 实现
- [ ] Skill 分类规则变化主要落在 config/boundary/selection 层
- [ ] 不扩大到 Template、Harness 或 Skill 内容重构

## Ticket 6 — 增量验证与 Change Amplification 验收

先验证直接受影响路径，不在每个小步骤运行全量测试。稳定后再按项目授权规则执行最终验证。

建议局部范围：`test/skill-selection.test.js`、`test/cli-init.test.js`、`test/distribution-boundaries.test.js` 及实际受影响的 install/sync/list 测试。

Change Amplification 场景验收：
- [ ] 修改普通 Skill 文案只需修改 `.agents/skills/<skill>`
- [ ] 修改 default selection 规则不需要分别修改 init/sync/install
- [ ] 新增 distributable Skill 不需要给多个 command 增加专用分支
- [ ] repo-local 仍不会被分发
- [ ] project-local 仍会被保留
- [ ] 无新的 Template Skill mirror 或 generated Skill snapshot

## 完成标准

最终依赖方向保持：

```text
config / skill-boundaries
          |
          v
   skill-selection
          |
          v
       bin/cli.js
          |
          v
   target repository
```

本轮完成后停止主动拆分；只有真实变更压力证明 CLI orchestration 仍存在明显耦合时，再启动下一轮架构调整。
