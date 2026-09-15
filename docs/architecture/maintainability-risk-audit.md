# 可维护性专项审计报告

审计基线：`main@1c9bbad62804206213e77f300733442e352e70d1`

## 1. 审计目标

本次只审计当前架构中仍值得关注的三类维护风险：

1. `bin/cli.js` 职责密度继续上升。
2. `config/engineering.json` / `config/required.json` 与 `bin/cli.js` fallback 数组形成双事实源。
3. `.opencode/agents` 同时作为 OpenCode 与 Pi 的 agent 构建来源，命名与实际职责可能逐步偏离。

本次不重新审计已经结项的 Skill mirror、Skill Selection、Template Skill snapshot 等问题，也不启动新一轮大规模架构重构。

## 2. 当前架构结论

当前主依赖方向仍然健康：

```text
config / canonical content
          │
          ▼
skill-boundaries
          │
          ▼
skill-selection
          │
          ▼
       cli.js
          │
          ▼
 target repository
```

Skill 正文已经保持单一事实源，selection policy 也已独立为纯逻辑层。当前风险主要集中在 CLI 编排层和少量配置/构建边界，而不是核心 Skill 分发模型。

综合判断：

- 当前架构可以继续维护。
- 不需要再次做大规模分层。
- 应优先消除真实双事实源。
- 其余两项采用“触发式重构”，而不是立即抽象。

## 3. Finding A — Config fallback 双事实源

严重度：P1 Maintainability

### 现状

`bin/cli.js` 中：

- `loadEngineeringSkills()` 首先读取 `config/engineering.json`，读取失败时退回一份硬编码数组。
- `loadRequiredSkills()` 首先读取 `config/required.json`，读取失败时退回另一份硬编码数组。

因此同一个业务事实存在两份定义：

```text
config/*.json
    │
    ├── 正常路径
    │
    └── 读取失败
          ↓
    cli.js fallback
```

### 风险

1. 修改配置时容易遗漏 fallback。
2. 正常路径测试通过，并不能证明 fallback 与配置仍一致。
3. 安装包损坏或配置 JSON 非法时，CLI 会静默切换到另一套可能过期的行为。
4. 未来维护者无法快速判断哪一份才是真正 canonical source。
5. 这是明确的 Change Amplification：一次分类调整理论上需要同步修改两处。

### 建议

确立 `config/engineering.json` 与 `config/required.json` 为唯一事实源，删除硬编码 fallback。

读取失败、JSON 非法、结构非法时直接 fail closed，并输出可定位的错误信息。

建议保留轻量 helper，例如：

```js
async function loadSkillSet(file, label) {
  const raw = await readFile(file, 'utf8');
  const value = JSON.parse(raw);
  if (!Array.isArray(value) || value.some((name) => typeof name !== 'string')) {
    throw new Error(`invalid ${label} skill config`);
  }
  return new Set(value);
}
```

不要为了这个改动新建 ConfigService、Repository 或配置框架。

### 预期收益

修改 engineering / required 分类后，只需要修改对应 JSON 和必要 contract test。

目标：

```text
classification change
      ↓
config only
      ↓
selection behavior
```

## 4. Finding B — cli.js 职责密度

严重度：P2 / Triggered Refactor

### 现状

`bin/cli.js` 当前同时包含：

- help 文本
- 参数解析
- Skill discovery
- frontmatter parsing
- prompt
- install
- init
- sync
- check
- 文件系统编排
- 统计与用户输出
- tool → directory mapping

这说明模块内部职责正在变重，但目前依赖方向仍然清楚，且命令逻辑集中在一个文件可降低 AI file hopping。

### 风险

如果继续加入大型 command 或多个 command 频繁同时修改，`cli.js` 会逐渐成为高冲突、高认知负担文件。

但现在立即引入 Service/Manager/Repository 层，会把当前问题从“单文件偏大”变成“跨文件跳转过多”。

### 建议

当前不主动拆。

只在以下任一触发条件出现时执行轻量 Command Extraction：

1. 新增一个与 `install/init/sync` 同等级的大型 command。
2. 同一功能连续需要修改两个以上 command 的内部实现。
3. `cli.js` 中 command 实现的 review 经常需要跨越不相关代码定位。
4. merge conflict 或回归明显集中在 command 实现区。

触发后只拆：

```text
bin/
├── cli.js
└── commands/
    ├── install.js
    ├── init.js
    └── sync.js
```

`cli.js` 保留 argv、parse、dispatch；command 模块可以直接使用现有 fs、selection、boundary 模块。

禁止顺带引入：

- CommandRegistry
- InstallService
- SyncService
- SkillManager
- SkillRepository
- FileSystemAdapter

### 预期收益

在真正出现压力后降低单文件冲突，同时保持最多 1 次 command 跳转，不增加无价值抽象。

## 5. Finding C — Harness canonical source 命名偏差

严重度：P2 / Triggered Refactor

### 现状

`scripts/build-template.js` 当前把：

```text
.opencode/agents
   ├──→ template/.opencode/agents
   └──→ template/.pi/agents
```

因此 `.opencode/agents` 在物理路径上属于 OpenCode，但实际承担了部分 shared agent canonical source 的职责。

当前 agent 数量和分化程度很低，因此这还不是实际故障。

### 风险

如果未来继续增加跨 Harness agent，会出现：

- 文件路径名称无法表达共享职责。
- OpenCode-specific 内容可能被误复制到 Pi。
- builder 可能逐步增加 harness-specific filter/branch。
- 修改者需要先理解“OpenCode 目录其实部分是共享源”这一隐含规则。

### 建议

当前不迁移目录，只建立明确触发条件。

满足任一条件后再执行 neutral source migration：

1. 出现第二个跨 Harness agent。
2. OpenCode 与 Pi 的 agent 内容开始出现差异。
3. builder 对 agent 出现 harness-specific 条件分支。
4. 维护者需要通过注释才能判断某 agent 是否可复制到另一 Harness。

推荐迁移目标：

```text
shared/agents/
      │
      ├──→ template/.opencode/agents
      └──→ template/.pi/agents
```

优先使用 `shared/agents/`，避免裸 `agents/` 与 `.agents/skills/` 在视觉和语义上混淆。

迁移时只移动真正 shared 的 agent；Harness-specific agent 保留在各自来源目录。

## 6. 优先级

```text
现在执行
└── T01 Config Single Source

条件触发
├── T02 CLI Command Extraction
└── T03 Shared Harness Agent Source
```

三张 Ticket 互相无依赖，可分别实现、验证和 Review。

## 7. 禁止的过度重构

本轮后续工作不应引入：

- Service / Manager / Repository 分层
- 新的统一 Registry
- 新的 generated snapshot
- 新的 Template Skill mirror
- 为未来可能出现的 Harness 差异提前建立复杂 manifest
- 因一张 Ticket 顺手修改另外两项风险

## 8. 验收原则

每张 Ticket：

- 只解决一个风险。
- 只运行直接受影响测试，除非用户另行授权全量测试。
- 完成后只做该 Ticket diff 的增量 Review。
- 不因为“顺手更干净”扩大架构范围。

最终目标不是进一步增加层数，而是维持：

```text
单一事实源
+ 单向依赖
+ 小修改范围
+ 低 file hopping
```
