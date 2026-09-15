# Skill Selection Architecture Tickets

目标：在不继续扩大架构的前提下，把 Skill selection policy 从 `bin/cli.js` 收敛为单一入口，进一步降低 Change Amplification。只做规则收口，不改 Template 架构，不引入 Service/Manager/Registry 层。

## Ticket 1 — 建立统一 Skill Selection Policy

新增 `bin/skill-selection.js`，提供纯逻辑入口，例如 `resolveSkillNames({ availableNames, mode, engineering, required })`。

职责：处理 `default/all`、engineering、required、proprietary、repo-local、去重和稳定排序。

约束：不得执行文件复制、CLI 输出、prompt、target path 或 template 操作。

验收：
- [x] Skill selection 只有一个核心入口
- [x] 输入相同则输出稳定
- [x] 不依赖 `process.cwd()`
- [x] 不产生文件系统写操作

## Ticket 2 — CLI 统一消费 Selection Result

修改 `bin/cli.js`，让 `list`、`install`、`init`、`sync` 以及相关统计统一消费 selection policy 的结果，不再各自重新实现 Skill 分类规则。

目标调用链：`CLI args -> selection policy -> copy/sync/install -> output`。

验收：
- [x] `init` 不自行实现 Skill 分类
- [x] `sync` 不自行实现 Skill 分类
- [x] `install` 不自行实现 Skill 分类
- [x] `list` 与统计使用相同 selection 语义
- [x] CLI 对外行为保持不变

## Ticket 3 — 固化 Classification / Selection 边界

保持 `bin/skill-boundaries.js` 只负责静态分类与分类合法性；`bin/skill-selection.js` 只负责根据调用模式计算本次最终 Skill 集合。

边界：
- `skill-boundaries.js`：proprietary、distributable、repo-local、default proprietary、分类一致性
- `skill-selection.js`：default/all selection、集合合并、过滤、排序

验收：
- [x] classification 与 selection 无重复规则
- [x] selection 不复制 `proprietary.json` 的分类逻辑
- [x] 不新增 `SkillManager`、`SkillService`、Registry 或其他中间抽象层

## Ticket 4 — 建立 Selection Contract Tests

新增 `test/skill-selection.test.js`，只测试 selection 行为，不锁定内部实现。

至少覆盖：default 包含 engineering、required、default proprietary；all 包含全部 distributable Skill；repo-local 永远排除；unknown 不进入结果；结果去重并稳定排序。

验收：
- [x] 测试不依赖 CLI 文案
- [x] 测试不锁定 Set/Array 等内部实现
- [x] 修改 selection 实现但保持行为时无需修改测试

## Ticket 5 — 删除 CLI 中重复 Selection 逻辑

完成迁移后检查 `bin/cli.js` 中对 engineering、required、default proprietary、repo-local、distributable 的直接组合判断。只保留命令自身真正需要的 orchestration 判断。

目标：以后修改“哪些 Skill 应被选择”时，不需要同时修改多个 command。

验收：
- [x] `list/install/init/sync` 不存在平行 selection 实现
- [x] Skill 分类规则变化主要落在 config/boundary/selection 层
- [x] 不扩大到 Template、Harness 或 Skill 内容重构

## Ticket 6 — 增量验证与 Change Amplification 验收

先验证直接受影响路径，不在每个小步骤运行全量测试。稳定后再按项目授权规则执行最终验证。

建议局部范围：`test/skill-selection.test.js`、`test/cli-init.test.js`、`test/distribution-boundaries.test.js` 及实际受影响的 install/sync/list 测试。

Change Amplification 场景验收：
- [x] 修改普通 Skill 文案只需修改 `.agents/skills/<skill>`
- [x] 修改 default selection 规则不需要分别修改 init/sync/install
- [x] 新增 distributable Skill 不需要给多个 command 增加专用分支
- [x] repo-local 仍不会被分发
- [x] project-local 仍会被保留
- [x] 无新的 Template Skill mirror 或 generated Skill snapshot

## 执行记录

- 远程文档合并：`be2807e`。
- Ticket 1：`1f0b3e4`，新增纯 `resolveSkillNames` selection policy。
- Ticket 2：`fa5aad3`，CLI 的 list/install/init/sync/统计统一消费 selection result。
- Ticket 3：`d5f55ab`，移除 classification 层重复的 selection 组合入口。
- Ticket 4：`2801c34`，补齐 selection contract 测试。
- Ticket 5：在 `fa5aad3` 完成 CLI 重复 selection 逻辑迁移，并经静态边界核对确认。
- Ticket 6：局部验证 `43/43` 通过；最终双轴 Review 相对 `be2807e` 通过，无 blocking finding。

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
