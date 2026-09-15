# matt-skills 修改放大治理执行计划

## 1. 目标

解决当前：

```text
小型 Skill 修改
→ 测试修改
→ template 生成代码修改
→ Skill snapshot 修改
→ orchestration/assertion 修改
```

的问题。

最终达到：

```text
普通 Skill 文案修改
→ 只修改 Skill

Skill 行为改变
→ Skill + 对应 contract test

Distribution 改变
→ distribution code + distribution test
```

## 2. 实施原则

本次只解决 Change Amplification。

不顺手重构：

```text
整个 CLI
全部 Skill
整个 test suite
sync-upstream
package architecture
```

不引入：

```text
复杂 manifest system
AST parser
大型 schema framework
新的 build framework
```

优先删除不必要的层，而不是再增加抽象。

## 3. Ticket 划分

本轮拆成 5 张 Ticket：

```text
T1  固化 Canonical Source / Distribution Boundary
T2  删除 template Skill Mirror
T3  统一 init/sync/install Skill 分发
T4  重构测试边界
T5  收敛验证与维护文档
```

依赖：

```text
T1
 │
 ▼
T2
 │
 ▼
T3
 │
 ▼
T4
 │
 ▼
T5
```

建议串行实施。

# T1 — 固化 Skill 单一事实源

## 目标

正式建立：

```text
.agents/skills = Skill 唯一事实源
template = project skeleton
skill-boundaries = distribution policy
CLI = assembly
```

## 主要文件

```text
bin/cli.js
bin/skill-boundaries.js
scripts/build-template.js
```

## 工作项

### 1. 检查 init

确认 `init` 最终可以不依赖：

```text
template/.agents/skills
```

即可完成 Skill 安装。

### 2. 检查 sync

确认 `sync` 已能直接：

```text
SKILLS_DIR
→ target/.agents/skills
```

同步。

### 3. 检查 install

保持当前：

```text
SKILLS_DIR
→ target
```

路径。

### 4. 明确职责

代码中应能够清晰看出：

```text
Template content
≠
Skill content
```

## 不做

本票不要删除 template mirror。

先证明：

```text
即使没有 template Skill mirror
CLI 仍有完整分发路径
```

## Acceptance Criteria

```text
[ ] init 可以从 canonical SKILLS_DIR 安装 Skill
[ ] sync 可以从 canonical SKILLS_DIR 同步 Skill
[ ] install 继续从 canonical SKILLS_DIR 安装 Skill
[ ] repo-local 判断仍由现有 boundary 负责
[ ] 默认 programming Skill 范围不改变
[ ] --all 行为不改变
```

# T2 — 删除 template/.agents/skills Mirror

## 目标

消除第二份长期 Skill 副本。

## 修改文件

```text
scripts/build-template.js
template/.agents/skills/**
```

## 工作项

### 1. 删除 build-template Skill snapshot 逻辑

删除：

```text
skillsSrc
readdir(.agents/skills)
repo-local filtering
skill copy loop
```

也就是当前：

```text
.agents/skills/*
→ template/.agents/skills/*
```

的整个阶段。

### 2. 删除无用 import

如果：

```js
isRepoLocalSkill
```

在 `build-template.js` 中不再使用，删除 import。

### 3. 删除目录

删除：

```text
template/.agents/skills/
```

全部内容。

不要留下：

```text
template/.agents/skills/.gitkeep
```

除非后续代码存在真正需要。

### 4. target 目录改为运行时创建

目标项目中的：

```text
target/.agents/skills
```

由 CLI：

```text
mkdir
+
copy Skill
```

产生。

## build-template 新职责

最终应只负责：

```text
PROJECT.md
AGENTS.md
.opencode/
.pi/
docs/context mirror
```

不应：

```text
枚举 Skill
判断 Skill 是否 distributable
复制 Skill
```

## Acceptance Criteria

```text
[ ] template/.agents/skills 已删除
[ ] build-template 不再读取 .agents/skills
[ ] build-template 不再知道 Skill 列表
[ ] build-template 不再判断 repo-local Skill
[ ] build-template 不再生成 Skill snapshot
[ ] 修改 Skill 后运行 build-template 不产生 Skill diff
```

# T3 — 统一 Skill Distribution

## 目标

所有 Skill 安装统一：

```text
.agents/skills
      ↓
CLI
      ↓
target/.agents/skills
```

## 修改文件

主要：

```text
bin/cli.js
```

必要时：

```text
bin/skill-boundaries.js
```

但除非发现真实问题，否则不修改 boundary。

## 3.1 init

目标流程：

```text
copy template skeleton
↓
mkdir target/.agents/skills
↓
计算 Skill set
↓
copy canonical Skills
↓
完成
```

### Default

保持：

```text
default programming skills
```

### --all

保持：

```text
all distributable skills
```

### Repo-local

必须继续排除。

## 3.2 sync

目标：

```text
同步 skeleton
+
直接同步 canonical Skills
```

删除所有逻辑上的：

```text
template 先复制一份 Skill
然后 Skill sync 再覆盖一次
```

最终每个 Skill 只写一次。

## 3.3 install

原则上保持现状。

只检查：

```text
init
sync
install
```

是否使用一致的 Skill selection 规则。

## 3.4 可选小型 helper

只有发现明显重复时，才考虑提取：

```js
resolveSkillSet(...)
```

或：

```js
copySelectedSkills(...)
```

不要创建：

```text
DistributionManager
InstallerService
ManifestEngine
```

之类过度抽象。

## Acceptance Criteria

```text
[ ] init 不读取 template/.agents/skills
[ ] sync 不读取 template/.agents/skills
[ ] install 不读取 template/.agents/skills
[ ] 默认 init Skill 集合保持一致
[ ] init --all 保持一致
[ ] sync 默认范围保持一致
[ ] sync --all 保持一致
[ ] repo-local 不会被分发
[ ] project-local Skill 不会被误删
[ ] 每个共享 Skill 只有 canonical source
```

# T4 — 重构测试边界

## 目标

删除：

```text
mirror tests
重复 exact-match tests
非必要自然语言耦合
```

保留真正的：

```text
behavior contracts
distribution contracts
```

## 4.1 template-sync.test.js

修改：

```text
test/template-sync.test.js
```

### 删除

整个：

```text
template/.agents/skills mirrors distributable .agents/skills
```

测试。

删除：

```text
template/.agents/skills carries distributable proprietary...
```

相关检查。

### 保留

Template 自己真正拥有的内容：

```text
AGENTS.md
PROJECT.md
.opencode
.pi
docs/context
```

这些仍可以保持 mirror/structure 验证。

## 4.2 tdd-implement-stages.test.js

修改：

```text
test/tdd-implement-stages.test.js
```

### 删除

```text
template mirrors current tdd-implement files
```

整个测试。

### 保留

真正稳定的 contract：

```text
Red-Green
→ Verify
→ Finalize
```

保留 reference：

```text
orchestration.md
verify.md
finalize.md
```

存在和被引用的检查。

保留：

```text
obsolete contract/red-green/stages reference 不再出现
```

保留：

```text
commit-check / scan-sensitive 不重新耦合
```

如果这些确实属于长期边界。

## 4.3 tdd-implement-dependencies.test.js

修改：

```text
test/tdd-implement-dependencies.test.js
```

### 删除

```js
const template = ...
```

删除：

```text
template keeps dependency safety contract exactly
```

### 保留三个行为

#### Invalid Blocked by

非法 dependency 不能被解释为：

```text
无依赖
```

#### Missing Node

依赖不存在时不能正常继续受影响任务。

#### Cycle

依赖环不能静默继续。

## 4.4 减少文案级 assertion

原则：

```text
1 个 contract
≈
1 个清晰测试
```

而不是：

```text
1 个 contract
=
多个中文句子必须同时存在
```

## 4.5 Distribution Test

扩展现有：

```text
test/cli-init.test.js
```

或：

```text
test/distribution-boundaries.test.js
```

不要为了形式强制新建文件。

目标测试：

```text
创建 tmp target
↓
执行 init
↓
检查最终 target
```

验证：

```text
target/.agents/skills
```

真的拥有正确 Skill。

### Default Init Test

检查：

```text
默认 programming Skill 存在
非默认 Skill 根据规则不出现
repo-local 不出现
```

### --all Init Test

检查：

```text
所有 distributable Skill 存在
repo-local Skill 不存在
```

### Skeleton Test

同时确认：

```text
AGENTS.md
PROJECT.md
.opencode/
.pi/
```

仍正常初始化。

### Sync Test

确保：

```text
旧项目
↓
sync
↓
Skill 被直接从 canonical source 更新
```

不依赖 template mirror。

## Acceptance Criteria

```text
[ ] 无任何 Skill template exact mirror test
[ ] 无 tdd-implement template mirror test
[ ] 无 dependency template mirror test
[ ] lifecycle contract 仍有覆盖
[ ] dependency safety contract 仍有覆盖
[ ] distribution 最终 target 有测试
[ ] repo-local boundary 有测试
[ ] --all/default 行为有测试
[ ] 单纯中文措辞调整不会触发大量 unrelated test 修改
```

# T5 — 收敛验证与维护规则

## 目标

证明 Change Amplification 实际下降，而不是仅仅代码看起来更干净。

## 5.1 场景验证：普通文案

修改：

```text
.agents/skills/tdd-implement/references/finalize.md
```

中一个非行为句子。

预期 `git diff --name-only` 只包含该 canonical 文件，不应出现：

```text
template/
test/
scripts/
bin/
```

变化。

## 5.2 场景验证：行为契约

修改一个真正 contract，例如“Finalize 必须在 Verify 后”。

预期允许：

```text
Skill/reference
+
对应 contract test
```

变化。

不应出现 template Skill snapshot。

## 5.3 场景验证：新增 Skill

新增：

```text
.agents/skills/example-skill/
```

预期只需要：

```text
Skill
+
必要 boundary/config
```

不应要求手动创建 `template/.agents/skills/example-skill`。

## 5.4 场景验证：Init

创建临时目录，执行实际 init。

最终检查：

```text
target/
├── AGENTS.md
├── PROJECT.md
├── .agents/skills/
├── .opencode/
└── .pi/
```

## 5.5 场景验证：Sync

创建一个旧目标项目，修改 canonical Skill 内容后执行 sync。

检查 target Skill 直接收到最新 canonical 内容。

## 5.6 最终 Test Strategy

中间实施阶段只跑直接相关测试，例如：

```text
build-template related
cli-init
cli-sync
distribution-boundaries
tdd-implement contract
```

不要每个小步骤都重复跑全部测试。

由于本轮最终涉及 init、sync、distribution、template generation，属于公共基础设施，最终 diff 稳定后再进行一次完整项目测试。

# 6. 建议文件变更范围

主要修改：

```text
scripts/build-template.js
bin/cli.js

test/template-sync.test.js
test/tdd-implement-stages.test.js
test/tdd-implement-dependencies.test.js

可能：
test/cli-init.test.js
test/cli-sync-default.test.js
test/distribution-boundaries.test.js
```

删除：

```text
template/.agents/skills/**
```

文档：

```text
docs/architecture/change-amplification-audit.md
docs/architecture/change-amplification-plan.md
```

# 7. 提交建议

如果按多个 commit：

```text
refactor(distribution): define canonical skill source
refactor(template): remove skill snapshot mirror
refactor(cli): assemble skills from canonical source
test: replace skill mirror checks with distribution contracts
docs: document distribution architecture
```

如果按当前仓库规则合并成一次：

```text
refactor: decouple skill distribution from template snapshots
```

# 8. 风险与回滚

## 风险最高点

`init`。

以前 template 已经包含 Skill。删除 mirror 后，`init` 必须显式完成 Skill assembly。

因此执行顺序必须：

```text
先确认 CLI 能独立安装 Skill
↓
再删除 template mirror
```

不能先删 mirror 再补 init。

## 回滚边界

如果删除 mirror 后发现初始化异常，可回滚 T2 与 T3，恢复旧的 `template/.agents/skills` 路径。

因此 T1 必须先完成并验证。

# 9. Definition of Done

```text
[ ] .agents/skills 是唯一共享 Skill source

[ ] template/.agents/skills 不存在

[ ] build-template 不再读取 Skill

[ ] init 直接从 .agents/skills 安装

[ ] sync 直接从 .agents/skills 同步

[ ] install 保持 canonical source

[ ] repo-local 策略保持正确

[ ] project-local Skill 保留

[ ] template Skill mirror tests 已删除

[ ] tdd-implement mirror tests 已删除

[ ] dependency mirror tests 已删除

[ ] lifecycle contract tests 保留

[ ] dependency safety tests 保留

[ ] 最终 init distribution 有集成覆盖

[ ] 普通 Skill 文案修改只产生 canonical source diff

[ ] Skill 行为改变最多影响 Skill + contract test

[ ] 用户可见 init/sync/install 行为无回归
```

# 10. 最终维护规则

整改完成后长期遵守：

1. `.agents/skills` 是共享 Skill 唯一事实源。
2. Template 不包含共享 Skill 副本。
3. Template 只负责项目 skeleton。
4. CLI 负责 skeleton + Skill 的组装。
5. Skill 测试验证行为 contract，不验证非必要措辞。
6. Distribution 测试验证最终 target。
7. 不使用中间 mirror 来证明最终分发正确。
8. 同一个 contract 不在多个测试文件重复验证。
9. 普通文案变化不要求修改测试。
10. Generated 内容不得重新成为人工维护的第二份源码。

# 11. 成功标准

### 普通修改

```text
修改一个 Skill 文案
→ 1 file changed
```

### 行为修改

```text
修改 Skill contract
→ Skill source + 对应 contract test
```

如果未来再次出现：

```text
小改 Skill
+
改 template
+
改 mirror test
+
改 orchestration unrelated test
```

说明架构重新产生了 Change Amplification，需要阻止。

# 12. 实施结果

本计划已按 `T1 → T2 → T3 → T4` 完成，`T5` 负责本节的长期维护收敛：

- `T1`（`c856461`）：CLI 初始化从 canonical Skill source 组装，并同步更新分发边界文档。
- `T2`（`1478efe`）：删除 Template Snapshot 中的共享 Skill mirror，生成器只构建 skeleton。
- `T3`（`73ad948`）：`init`、`sync`、`install` 统一使用 canonical Skill selection；同步不删除 harness 目录中的项目自定义 Skill。
- `T4`（`19eaf9a`）：删除 Skill/template/dependency mirror exact-match 测试，保留 lifecycle、dependency safety、skeleton 和最终 distribution contract。

长期维护规则补充：

1. `.agents/skills` 是共享 Skill 的唯一 canonical source。
2. Template Snapshot 不持有共享 Skill 副本；Target Repository 的 Skill 目录由 CLI 组装。
3. `.pi/skills` 与 `.opencode/skills` 视为 project-local Skill 目录；`sync` 不因名称与共享 Skill 相同而删除其中已有的 project-local Skill。
4. 变更验证以最终 Target Repository 行为为主，不以中间目录 mirror 为证据。
5. 普通 Skill/reference 措辞变化不应触发 Template、mirror test 或无关 orchestration test 修改。

# 13. 场景验证记录

以下验证使用最高 seam：实际 CLI 调用与最终 Target Repository 文件系统，而不是 Workspace/Template 中间副本。

| 场景 | 可重复验证 | 结果 |
|---|---|---|
| 普通 Skill/reference 措辞 | `node --test test/build-template.test.js test/template-sync.test.js`；在隔离 Git fixture 中修改一句 canonical Skill 文案后执行 `git diff --name-only` | 生成器 skeleton 检查 1 项、Template structure/contract 检查 11 项通过（共 12 项）；变更面只包含 `.agents/skills/example/SKILL.md` |
| Skill 行为 contract | `node --test test/tdd-implement-stages.test.js test/tdd-implement-dependencies.test.js test/tdd-implement-context-routing.test.js` | 9 项 lifecycle、reference 和 dependency safety 测试通过；不依赖 Template Skill 副本 |
| 新增 distributable Skill | `node --test test/cli-init.test.js`，其中 `init --all includes every distributable source skill directory` 使用临时 canonical source Skill 验证；初始化清单从 canonical source/config 计算 | 临时 Skill 无需创建 Template mirror 即进入最终 Target Repository；新增 Skill 不需要同步维护测试清单 |
| Initialize / Sync | `node --test test/cli-init.test.js test/distribution-boundaries.test.js` | 初始化、`--all`、同步、canonical 内容更新、repo-local 排除和 project-local 保留均通过 |

变更面规则由实现和测试共同固定：普通文案只改 canonical source；行为 contract 才增加对应 contract test；新增 Skill 只增加 canonical source 与必要 boundary/config，不增加 Template Skill 副本。
