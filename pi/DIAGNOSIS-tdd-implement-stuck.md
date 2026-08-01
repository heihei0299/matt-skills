# 诊断报告：tdd-implement 执行时 AI 擅自卡住

- **日期**：2026-07-31
- **诊断依据**：pi 会话导出 `pi-session-2026-07-31T19-05-13-899Z_019fb990-f9ab-7e2f-a8be-53ca3410de36.html`（158 entries）+ 技能文本 + git 历史
- **状态**：已修复 + 已落地

---

## 1. 症状

用 tdd-implement 技能要求 AI 实现 issue 时，AI 在"预告下一步"处擅自结束回合，等用户说"继续"才动。用户在**一次会话中被迫打断四次**："你为什么会突然停止" → "为什么会出现…" → "为什么又断了" → "分析截断的原因"。

典型断点（均来自真实会话）：

- 红测试刚确认失败 → 只说"红 ✓。加 EPIPE 处理：" → 回合结束，绿实现拖到下一回合
- 写完 README → 只说"批次 C：发布验证…" → 回合结束
- `npm pack --dry-run` 通过 → 只说"第 2 步：npm publish…" → 回合结束

---

## 2. 复现与反馈回路

解出完整会话导出，写检测器：**签名 = 回合末 assistant 消息含文本、无工具调用、内容在预告下一步**。在 trace 上运行结果：

| 回合 | 末条消息 | 判定 |
|---|---|---|
| T0 | "写完整 README…先核对实现与文档一致性再落笔。" | 🔴 预告即停 |
| T1 | "红 ✓。加 EPIPE 处理："（红刚过，绿未写） | 🔴 预告即停 |
| T2 | "README 主体完成。批次 C：发布验证…" | 🔴 预告即停 |
| T3 | "tarball 含…批次 C 第 2 步：npm publish…" | 🔴 预告即停 |
| T4 | 完整汇报（全部完成） | 🟢 正常结束 |

**4/5 回合命中。** 最小复现（T1）：红测试确认失败 → 只写一句"加 EPIPE 处理" → 回合结束。用户被迫连续说"继续"。

---

## 3. 根因分析：两种机制

### 机制 A（一次性，非复发）：输出/上下文触顶

T0 是巨型回合——`write` 重写整个 `bin/cli.js`（6.3KB）、`replace` 一次插入 127 行测试、多次 `printf` 管道探索 prompts 行为。单回合输出总量超限被强制截断。**只解释 T0，不解释 T1-T3**（它们只有 6-12 个 entries，是小回合）。

### 机制 B（主要复发模式）：模型回合终止倾向 + 无 /goal 时 harness 不施压

- 会话模型为 `deepseek-v4-flash`（flash 级，弱回合持久力），思考级别被手动拉到 xhigh
- pi 系统提示唯一强反卡住指令 **"keep working until the goal is complete; do not stop with only a plan or partial progress" 仅在 /goal 激活时生效**；本次会话 goal 工具调用为 **0**，这条防线完全未挂载
- 关键证据：T0 连续跑了 111 个 entries（模型有持久力），却停在**任意叙述点**而非技能定义的 seam/阶段边界 → 不是"能力做不到"，是"没有约束促使它继续"

---

## 4. 分级假设与验证

| 假设 | 判定 | 证据 |
|---|---|---|
| H1 主因：模型回合终止倾向 + 无 /goal 约束 | ✅ 成立 | goal 调用 0；小回合也停；停点不在技能边界 |
| H2 放大：技能缺"连续执行"指令，反而制造停顿点 | ✅ 成立 | stages.md ③"一次只做一个""每个 cycle 后 typecheck"、阶段②强制确认；技能从无回合级出口条件 |
| H3 一次性：T0 输出触顶 | ✅ 成立（仅 T0） | 巨型回合；T1-T3 为小回合不受此影响 |
| H4 技能阶段机直接触发停顿 | ❌ 排除 | 停点都在任意叙述点，不在 ②/③/④ 之间 |

---

## 5. 结论（回答"是技能的原因吗"）

**不是唯一原因，但技能负有可修的责任。**

- **不是唯一原因**：T1-T3 的"预告即停"本质是 flash 模型回合终止倾向 + harness 无 /goal 时不施压，与技能无关。AI 自诊"回合管理失误"这部分没错。
- **但技能负有责任**：它要求 6 阶段、11 seam 的长程连续执行，却从不告诉模型别停。对照 writing-great-skills 的 failure modes，技能缺一条**回合级 completion criterion**——"连续执行直到出口条件达成"。pi 自己都知道给 /goal 配 "do not stop with only a plan"，tdd-implement 没有等价物。
- **AI 自诊"不是技能的原因"只说对一半**：回合管理是表层机制，技能缺正面连续执行规则才是可修根因。

---

## 6. 修复方案与落点

按 writing-great-skills 的 **negation 原则**（写正面行为，不用禁止式）：

**改动文件**（两份同步）：
- `.agents/skills/tdd-implement/stages.md`
- `skills/tdd-implement/stages.md`

**修改 1**：阶段③操作节顶部新增**回合连续性**规则：

> **回合连续性**：红 → 绿 → typecheck → 切换下一 seam 是连续动作，在一个回合内串行完成，直到本阶段出口条件达成后才结束回合。每完成一个 seam 立即进入下一个——不中途停顿、不预告下一步、不等待用户确认。

**修改 2**：3c 切换 seam 改为：

> 当前 seam 的红-绿完成后，**立即进入下一个 seam（同一回合内连续执行，不停顿等待用户）**

---

## 7. 回归测试

新增 `test/tdd-implement-stages.test.js`（node --test，3 个断言）：

1. 阶段③含"回合连续性"规则且为正面表述
2. 3c 含"立即进入下一个 seam"
3. `skills/` 镜像副本与 `.agents/` 保持同步

**验证结果**：完整测试套件 15/15 通过（原 12 + 新 3），两份 stages.md diff 一致。

---

## 8. 预防建议（未来）

- **主因修复（已选方案 A + C）**
- **方案 A（/goal 启动长任务）**：长任务用 `/goal <任务>` 启动而非普通消息——pi-goal 扩展已安装，会注入 "Keep working until this goal is completely resolved end-to-end. Do not stop at analysis, a plan, TODO list, partial fixes, or suggested next steps."，并在 agent 空闲（`agent_settled`）时自动注入 continuation 消息，模型预告即停也会被自动推着继续，无需用户说"继续"。示例：`/goal 严格按 tdd-implement 技能实现 .scratch/npx-matt-skills-installer/issues/02-04`
- **方案 C（全局 AGENTS.md 兜底）**：已在 `~/.pi/agent/AGENTS.md` 追加"长任务回合规则"——执行多步任务时除非遇到需要用户决策的点，否则不在中途结束回合；预告下一步后立即继续执行，不等用户说"继续"。所有普通会话（无 /goal）均生效
- **技能设计规范**：所有长程多阶段技能必须自带"回合连续性"正面规则，不能依赖 harness 的 /goal 防线（无 /goal 时不存在）
- **模型选择**：flash 级模型做长程 agentic 任务时，卡住概率显著更高；关键长任务用 `/model` 切非 flash 模型或 /goal 模式
- **进度编排**：巨型回合（单次 write 大文件、批量 replace 上百行）易触顶被截断，拆小步执行

### 落地状态

三条预防建议已固化为仓库制度（2026-07-31）：

- **技能设计规范** → `docs/agents/skill-design.md`（规则 1 回合连续性为主体，规则 2/3 呼应）；术语单一来源 `CONTEXT.md`；根因决策记录为 `docs/adr/0001-turn-continuity-rule.md`
- **模型选择** → `AGENTS.md`「运行纪律（长程任务）」节（本仓库运行纪律，不进 npm 包）
- **进度编排** → `AGENTS.md` 运行纪律节（量化阈值：write >150 行、replace >5 处）+ skill-design.md 规则 3
- **守护**：`test/skill-design.test.js` 覆盖全部产物，防未来误删/改坏
