# Skill Selection P1 修复报告

## 1. 修复目标

解决当前唯一未关闭项：`matt-skills install` 的交互候选范围可能被 Skill Selection 重构意外收窄。

本轮只确认并修复该行为，不继续进行架构重构。目标状态：P0 = 0、P1 = 0、P2 = 0。

## 2. 当前问题

当前 `installCommand()` 先按 `all` 计算 `onlyProgramming`，再用同一范围生成自动分发集合和交互候选集合。因此普通 `matt-skills install` 会进入 default selection，并只向 `promptSkills()` 提供默认 programming Skill。

这里需要区分两个概念：

- Distribution Scope：命令自动选择哪些 Skill。
- Interactive Catalog：用户在交互界面允许主动选择哪些 Skill。

`resolveSkillNames()` 应负责自动 selection policy，不应在没有明确产品要求的情况下隐式决定交互式 UI catalog。

## 3. Ticket 1：确认历史行为

检查 P1 引入前的 `installCommand()`，确认普通 `matt-skills install` 的交互候选实际是：

- A：全部 distributable Skill；或
- B：default programming Skill。

判断规则：

- 若历史行为是 A，恢复全部 distributable Skill 作为 interactive catalog。
- 若历史行为已经是 B，不修改生产逻辑，只补 CLI contract test 并关闭 P1。

禁止根据当前实现反推历史产品语义。

## 4. Ticket 2：必要时修复 install 语义

如果确认发生行为回归，只修改 `installCommand()`，明确分离自动 selection 与 interactive catalog。

目标语义：

```text
install --all
└── 自动选择全部 distributable Skill

install（interactive）
└── 展示历史产品语义规定的可安装 Skill catalog
```

如果历史行为为全部 distributable，交互模式应读取全部 distributable Skill，而不是 default selection。

不要为了 UI 增加 `interactive`、`prompt`、`catalog` 等 `resolveSkillNames()` mode。

## 5. Ticket 3：保持 Selection Policy 边界

保持依赖方向：

```text
skill-boundaries.js
        ↓
skill-selection.js
        ↓
cli.js
```

职责保持为：

- `skill-boundaries.js`：什么 Skill 可以分发。
- `skill-selection.js`：default/all 自动范围是什么。
- `cli.js`：具体命令如何消费这些范围，以及交互行为。

不引入 `SkillService`、`SkillManager`、`InteractiveSkillResolver`、`CatalogRegistry`。

## 6. Ticket 4：增加 CLI 回归测试

重点补 CLI/install contract test，不继续扩大 `skill-selection.test.js`。

至少覆盖：

1. 普通 `matt-skills install`：交互候选符合确认后的历史语义；repo-local 不可安装。
2. `matt-skills install --all`：无需 Skill prompt，自动选择全部 distributable Skill，repo-local 不进入安装集合。

测试 observable behavior，不锁定内部函数调用次数、Set 实现、内部变量名或具体调用顺序。

## 7. Ticket 5：增量验证

修改完成后只运行直接受影响测试，例如：

```bash
node --test \
  test/skill-selection.test.js \
  <现有 install CLI 测试文件>
```

如果 install 行为由 `distribution-boundaries.test.js` 覆盖，则加入该文件。

本阶段不因为这个 P1 自动执行全量测试。

## 8. Ticket 6：增量 Review 与结项

修复后只 Review 当前 P1 finding 与本次新增 diff，不重新启动完整架构 Review。

验收清单：

- [ ] install 历史产品语义得到确认。
- [ ] 如存在回归，已恢复原行为。
- [ ] interactive catalog 行为正确。
- [ ] `--all` 行为没有改变。
- [ ] repo-local 仍然无法分发。
- [ ] `resolveSkillNames()` 没有承担 UI policy。
- [ ] init/sync 没有受到影响。
- [ ] 没有引入新的 selection 事实源。
- [ ] 没有扩大修改范围。
- [ ] CLI contract test 覆盖该行为。
- [ ] 直接受影响测试通过。
- [ ] 增量 Review 无新增 finding。

完成条件：

```text
P0 = 0
P1 = 0
P2 = 0

Skill Selection Policy：完成
Change Amplification 整改：完成
架构继续重构：停止
```

## 范围限制

本次原则上不修改：`template/`、`scripts/build-template.js`、`.opencode/`、`.pi/`、`.agents/skills/` 内容、init/sync 架构以及 CLI 模块划分。只有在 P1 修复证明存在直接依赖时才允许最小调整。
