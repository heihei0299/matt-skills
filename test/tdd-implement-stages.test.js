import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAP_SKILL, normalize } from './mirror-utils.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const skillPath = path.join(dir, '.agents', 'skills', 'tdd-implement', 'SKILL.md');
const stagesPath = path.join(dir, '.agents', 'skills', 'tdd-implement', 'references', 'stages.md');
const orchestrationPath = path.join(dir, '.agents', 'skills', 'tdd-implement', 'references', 'orchestration.md');
const templateSkillPath = path.join(dir, 'template', '.agents', 'skills', 'tdd-implement', 'SKILL.md');
const templateStagesPath = path.join(dir, 'template', '.agents', 'skills', 'tdd-implement', 'references', 'stages.md');
const templateOrchestrationPath = path.join(dir, 'template', '.agents', 'skills', 'tdd-implement', 'references', 'orchestration.md');

const skill = readFileSync(skillPath, 'utf8');
const stages = readFileSync(stagesPath, 'utf8');
const orchestration = readFileSync(orchestrationPath, 'utf8');

test('frontmatter triggers on spec/ticket test-first implementation', () => {
  assert.match(skill, /name: tdd-implement/);
  assert.match(skill, /spec.*ticket|ticket.*spec/);
  assert.match(skill, /test-first|TDD/);
  assert.match(skill, /Contract/);
  assert.match(skill, /Red-Green/);
  assert.match(skill, /Verify/);
  assert.match(skill, /Finalize/);
});

test('SKILL.md exposes exactly three delivery stages plus non-stage Finalize', () => {
  assert.match(skill, /三阶段 Steps/);
  assert.match(skill, /① \*\*Contract\*\*/);
  assert.match(skill, /② \*\*Red-Green\*\*/);
  assert.match(skill, /③ \*\*Verify\*\*/);
  assert.doesNotMatch(skill, /④ \*\*/);
  assert.match(skill, /Finalize（非阶段）/);
});

test('each SKILL step has a checkable exit condition', () => {
  assert.match(skill, /需求无待决歧义/);
  assert.match(skill, /所有 Behaviors.*有效 Red.*typecheck/);
  assert.match(skill, /最终 diff.*相关证据通过/);
  assert.match(skill, /commit 已创建.*Acceptance Criteria 全部通过/);
});

test('detailed references define the same three stages plus Finalize', () => {
  assert.match(stages, /## 阶段 ① Contract：明确交付契约/);
  assert.match(stages, /## 阶段 ② Red-Green：行为级 TDD/);
  assert.match(stages, /## 阶段 ③ Verify：最终验证与审查/);
  assert.match(stages, /## Finalize：非阶段交付收尾/);
  assert.doesNotMatch(stages, /阶段 ④/);
});

test('Contract extracts acceptance criteria and maintains a scope ledger', () => {
  assert.match(stages, /Acceptance Criteria/);
  assert.match(stages, /Scope Ledger/);
  assert.match(stages, /必须实现：/);
  assert.match(stages, /明确不做：/);
  assert.match(stages, /允许触及：/);
  assert.match(stages, /当前 Behavior 必须修复/);
  assert.match(stages, /当前 issue 需要新增 Behavior/);
  assert.match(stages, /后续 ticket/);
  assert.match(stages, /与当前 feature 无关/);
});

test('Contract performs the required Preflight once', () => {
  assert.match(stages, /Preflight/);
  assert.match(stages, /当前 `HEAD`/);
  assert.match(stages, /工作区状态/);
  assert.match(stages, /BASE_HEAD=\$\(git rev-parse HEAD\)/);
  assert.match(stages, /test、typecheck、build 命令/);
  assert.match(stages, /subagent model/);
  assert.match(stages, /browser 或 Playwright/);
  assert.match(stages, /真实运行验证方式/);
  assert.match(stages, /验证矩阵已建立/);
});

test('Contract defines the seam and behavior boundaries', () => {
  assert.match(stages, /一个 Seam 是一个公共可观察边界/);
  assert.match(stages, /一个 Behavior 是一个红-绿 cycle/);
  assert.match(stages, /一个 Seam 可以包含多个 Behaviors/);
  assert.match(stages, /输入、可观察输出/);
  assert.match(stages, /对应 Acceptance Criterion/);
  assert.match(stages, /验证层级/);
  assert.match(stages, /只有出现需求歧义、验收缺口、范围变化、破坏性操作/);
});

test('quality gates are explicit and non-optional', () => {
  assert.match(stages, /不可省略的质量门禁/);
  assert.match(stages, /当前 issue 的范围/);
  assert.match(stages, /有效 Red/);
  assert.match(stages, /最终 diff.*typecheck/);
  assert.match(stages, /真实运行验证/);
  assert.match(stages, /Standards.*Spec Review/);
  assert.match(stages, /README\/docs/);
  assert.match(stages, /独立 commit/);
  assert.match(stages, /Tracker/);
});

test('Red-Green uses behavior cycles rather than seam-sized todos', () => {
  assert.match(stages, /按 Behavior 建立 Todo，而不是按 Seam/);
  assert.match(stages, /Todo：一个 Behavior cycle/);
  assert.match(stages, /B1-R.*红/);
  assert.match(stages, /B1-G.*绿/);
  assert.match(stages, /B1-T.*typecheck/);
  assert.match(stages, /每个 Behavior 连续执行/);
  assert.match(stages, /所有 Behaviors.*有效 Red/);
  assert.match(stages, /全部 Behavior Todo 为 `completed`/);
});

test('Red-Green requires an effective red before implementation', () => {
  assert.match(stages, /只有通过公共接口观察到.*目标行为尚未实现.*断言失败才是有效 Red/);
  assert.match(stages, /语法错误/);
  assert.match(stages, /缺失 helper\/fixture/);
  assert.match(stages, /测试环境启动失败/);
  assert.match(stages, /timeout/);
  assert.match(stages, /命令中断/);
  assert.match(stages, /formatter/);
  assert.match(stages, /typecheck/);
  assert.match(stages, /最小相关测试/);
});

test('Red-Green carries continuity and chunking rules', () => {
  assert.match(skill, /Long-Horizon Skill/);
  assert.match(skill, /Turn Continuity/);
  assert.match(skill, /Chunking/);
  assert.match(stages, /在一个回合内串行完成/);
  assert.match(stages, /确认全绿后立即进入下一个 Behavior/);
  assert.match(stages, /一个 Seam 全绿只是内部进度，不是阶段出口/);
  assert.match(stages, /预告下一步后立即执行/);
  assert.match(stages, /进度输出并入工具调用序列/);
  assert.match(stages, /150 行/);
  assert.match(stages, /5 处/);
});

test('Verify follows test, build, runtime, and one review in order', () => {
  const ordered = /当前 issue 影响范围测试[\s\S]*必要 build[\s\S]*必要真实运行验证[\s\S]*两个独立 reviewer/;
  assert.match(stages, ordered);
  assert.match(stages, /多 issue 模式只运行当前 issue 影响范围内的完整测试/);
  assert.match(stages, /单 issue 或单 spec 模式运行仓库完整测试/);
  assert.match(stages, /不同时运行等价命令/);
  assert.match(stages, /专用 browser 工具/);
  assert.match(stages, /项目已有 Playwright/);
  assert.match(stages, /HTTP\/CLI 只能补充 API 验证/);
});

test('Verify records real process evidence and cleans it up', () => {
  assert.match(stages, /隔离配置和临时端口/);
  assert.match(stages, /保存 PID/);
  assert.match(stages, /实际请求结果或页面可见结果/);
  assert.match(stages, /清理进程和临时目录/);
});

test('Verify requires two independent reviewer subagents, one axis per subagent', () => {
  assert.match(stages, /两个独立.*reviewer/);
  assert.match(stages, /Standards-only/);
  assert.match(stages, /Spec-only/);
  assert.match(stages, /并行/);
  assert.match(stages, /同一.*reviewer.*不能.*两个轴/);
  assert.match(stages, /两个 reviewer 都必须返回结果/);
  assert.match(stages, /review_axes/);
  assert.match(stages, /blocked\/unavailable/);
});

test('Verify limits review to one round with two independent axis-specific reviewers', () => {
  assert.match(stages, /每个 issue 恰好执行一次正式双轴 review round/);
  assert.match(stages, /Standards-only reviewer/);
  assert.match(stages, /Spec-only reviewer/);
  assert.match(stages, /互不掩盖/);
  assert.match(stages, /≤ 400 words \/ ≤ 40 行/);
  assert.match(stages, /当前 issue blocking/);
  assert.match(stages, /后续 ticket/);
  assert.match(stages, /advisory/);
  assert.match(stages, /out of scope/);
  assert.match(stages, /不重新启动完整双轴 review/);
  assert.match(stages, /不生成 `review-\*\.md`/);
});

test('Finalize commits directly after Verify without extra safety or staged-diff gates', () => {
  assert.match(stages, /README\/docs\/config\/package 同步/);
  assert.match(stages, /直接创建一个独立 commit/);
  assert.match(stages, /不执行额外敏感信息\/安全扫描/);
  assert.match(stages, /不做 `git diff --cached` 复核/);
  assert.match(stages, /不设置额外 commit message 门禁/);
  assert.match(stages, /仓库级 Git 安全与历史保护规则仍然适用/);
});

test('Finalize closes the tracker only after the three stages', () => {
  assert.match(stages, /逐条勾选 Acceptance Criteria/);
  assert.match(stages, /将 issue 状态改为 `resolved`/);
  assert.match(stages, /追加实施总结/);
  assert.match(stages, /progress\.md/);
  assert.match(stages, /commit hash、message/);
  assert.match(stages, /真实运行结果/);
  assert.match(stages, /Finalize 开始后不新增产品 Behavior/);
  assert.match(stages, /只有三个阶段与 Finalize 全部通过/);
  assert.match(stages, /工作区符合预期/);
});

test('cross-stage failure budget and evidence invalidation are explicit', () => {
  assert.match(stages, /Tool Failure Budget/);
  assert.match(stages, /首次失败/);
  assert.match(stages, /最多一次有依据的 fallback/);
  assert.match(stages, /blocked\/unavailable/);
  assert.match(stages, /相同命令或工具参数不原样连续重试/);
  assert.match(stages, /timeout 或中断后缩小/);
  assert.match(stages, /验证证据失效/);
  assert.match(stages, /任何产品代码或测试文件再次变化/);
  assert.match(stages, /旧的测试、typecheck、build 和 review 证据立即失效/);
  assert.match(stages, /只能使用最后一次修改之后的结果/);
});

test('Git history preservation protects BASE_HEAD and forbids destructive cleanup', () => {
  assert.match(stages, /Git History Preservation/);
  assert.match(stages, /每个阶段出口和 commit 前/);
  assert.match(stages, /git reflog/);
  assert.match(stages, /git reset --hard/);
  assert.match(stages, /git checkout \./);
  assert.match(stages, /git clean -fd/);
  assert.match(stages, /git stash push --include-untracked/);
  assert.match(stages, /--keep-index/);
});

test('state mapping distinguishes Todo, Issue, and Progress', () => {
  assert.match(stages, /Todo:\s+pending \| in_progress \| completed \| blocked/);
  assert.match(stages, /Issue:\s+ready-for-agent \| in_progress \| resolved \| blocked/);
  assert.match(stages, /Progress:\s+pending \| in_progress \| done \| blocked/);
  assert.match(stages, /Finalize 完成后 Issue 为 `resolved`、Progress 为 `done`/);
});

test('SKILL points to the disclosed three-stage and orchestration references', () => {
  assert.match(skill, /\[stages\.md\]\(references\/stages\.md\)/);
  assert.match(skill, /\[orchestration\.md\]\(references\/orchestration\.md\)/);
  assert.match(skill, /progress\.md/);
  assert.match(skill, /每个 issue 只提交一个独立 commit/);
});

test('orchestration defines A0-A5 without adding delivery stages', () => {
  assert.match(orchestration, /A0-A5 是编排控制活动，不是额外的产品交付阶段/);
  assert.match(orchestration, /A0：依赖图与编排 Preflight/);
  assert.match(orchestration, /A1：Kahn 拓扑分层/);
  assert.match(orchestration, /A2：分层串行调度/);
  assert.match(orchestration, /A3：层收敛/);
  assert.match(orchestration, /A4：全量收敛/);
  assert.match(orchestration, /A5：回退与冲突处理/);
});

test('orchestration A0 builds a DAG and initializes progress', () => {
  assert.match(orchestration, /Blocked by/);
  assert.match(orchestration, /DAG/);
  assert.match(orchestration, /检测到环/);
  assert.match(orchestration, /BASE_HEAD=\$\(git rev-parse HEAD\)/);
  assert.match(orchestration, /强制初始化.*progress\.md/);
  assert.match(orchestration, /派生视图/);
  assert.match(orchestration, /真相源.*spec.*issues/);
});

test('orchestration A1 uses Kahn layers and one confirmation checkpoint', () => {
  assert.match(orchestration, /Kahn 分层/);
  assert.match(orchestration, /L1 = 全部入度为 0/);
  assert.match(orchestration, /L2 = 移除 L1 后入度为 0/);
  assert.match(orchestration, /L1\.\.Ln/);
  assert.match(orchestration, /一次性向用户展示 DAG/);
  assert.match(orchestration, /得到确认后进入 A2/);
});

test('orchestration A2 runs three stages then Finalize serially per issue', () => {
  assert.match(orchestration, /主代理执行三个阶段/);
  assert.match(orchestration, /① Contract/);
  assert.match(orchestration, /② Red-Green/);
  assert.match(orchestration, /③ Verify/);
  assert.match(orchestration, /Finalize（非阶段/);
  assert.match(orchestration, /独立 commit/);
  assert.match(orchestration, /全仓测试不在每个 issue 中重复执行/);
  assert.match(orchestration, /一次正式 Review round/);
  assert.match(orchestration, /两个独立 reviewer/);
  assert.match(orchestration, /Standards-only 与 Spec-only/);
  assert.match(orchestration, /回执卡片/);
  assert.match(orchestration, /Status\/Commit\/Review\/Tests/);
});

test('orchestration converges layers and runs full regression once', () => {
  assert.match(orchestration, /A3：层收敛/);
  assert.match(orchestration, /所有 issue `Status: resolved`/);
  assert.match(orchestration, /git status/);
  assert.match(orchestration, /A4：全量收敛/);
  assert.match(orchestration, /一次仓库全量测试/);
  assert.match(orchestration, /多 issue 流程唯一的全量回归点/);
  assert.match(orchestration, /汇总只在对话输出/);
});

test('orchestration A5 classifies rollback and conflicts', () => {
  assert.match(orchestration, /A5 负责所有编排级失败/);
  assert.match(orchestration, /Contract 歧义/);
  assert.match(orchestration, /Red-Green 的有效 Red/);
  assert.match(orchestration, /Verify 的测试/);
  assert.match(orchestration, /Finalize 的必要 docs/);
  assert.match(orchestration, /全量测试失败/);
  assert.match(orchestration, /Blocked by/);
  assert.match(orchestration, /多 issue 预期修改同一文件/);
  assert.match(orchestration, /不跨 issue 无记录改动/);
});

test('template mirrors the three tdd-implement files', () => {
  assert.equal(normalize(readFileSync(templateSkillPath, 'utf8'), MAP_SKILL), skill);
  assert.equal(normalize(readFileSync(templateStagesPath, 'utf8'), MAP_SKILL), stages);
  assert.equal(normalize(readFileSync(templateOrchestrationPath, 'utf8'), MAP_SKILL), orchestration);
});

test('tdd-implement keeps Finalize lightweight and avoids commit-check coupling', () => {
  assert.doesNotMatch(skill, /commit-check/);
  assert.doesNotMatch(stages, /\[commit-check\]/);
  assert.doesNotMatch(orchestration, /commit-check/);
  assert.doesNotMatch(skill, /scan-sensitive\.sh/);
  assert.doesNotMatch(stages, /scan-sensitive\.sh/);
  assert.doesNotMatch(orchestration, /scan-sensitive\.sh/);
});
