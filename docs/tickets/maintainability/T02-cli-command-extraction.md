# T02 — CLI Command Extraction

状态：Deferred / Triggered
优先级：P2
依赖：无

## 目标

当 `bin/cli.js` 的职责密度达到明确触发条件时，按 command 边界做一次轻量拆分，降低单文件冲突和认知负担，同时控制 AI file hopping。

## 触发条件

只有满足至少一项才开始实施：

1. 新增一个与 `install/init/sync` 同等级的大型 command。
2. 同一功能连续需要修改两个以上 command 的内部实现。
3. command 实现区频繁产生 merge conflict。
4. Review 中定位一个 command 必须反复跳过大量无关 command 代码。

未触发时，本 Ticket 保持 Deferred，不为“架构更漂亮”提前执行。

## 目标结构

```text
bin/
├── cli.js
├── skill-boundaries.js
├── skill-selection.js
└── commands/
    ├── install.js
    ├── init.js
    └── sync.js
```

实际只迁移达到压力点的 command；不要求一次拆完全部 command。

## 职责边界

`cli.js`：

- argv
- help
- parse
- dispatch

`commands/*.js`：

- 对应 command 的实际编排
- 可直接使用 Node fs/path
- 可直接调用现有 skill selection/boundary API

## 禁止

不得引入：

- CommandRegistry
- InstallService / SyncService
- SkillManager
- SkillRepository
- FileSystemAdapter
- Dependency Injection container

不得为了拆文件改变命令行为。

## 验收

- [ ] 实施前记录触发条件已经满足。
- [ ] 外部 CLI contract 不变。
- [ ] 每个 command 最多增加一层直接跳转。
- [ ] selection/boundary 事实源不复制。
- [ ] 没有新增通用 service 层。
- [ ] 原 command 对应测试仍覆盖真实 CLI 行为。
- [ ] 修改某一个 command 不要求同步修改其他 command 文件。

## 验证

只运行被迁移 command 的 CLI contract tests 和直接依赖测试。

## Review

只 Review extraction diff，重点判断：

- 是真正降低职责密度，还是单纯搬文件。
- 是否增加了跨文件导航成本。
- 是否产生新的重复 helper。
