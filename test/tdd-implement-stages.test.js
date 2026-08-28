import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Regression tests for the "AI stops prematurely mid-TDD-cycle" bug.
// Root cause: stage ③ never told the agent to keep executing within a turn,
// so the model ended its turn at "announce next step" points (red→green gap,
// seam→seam gap). Fix: a positive "回合连续性" rule + 3c says go immediately.
// These tests guard against a future refactor silently deleting that rule.

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const stagesPath = path.join(dir, '.agents', 'skills', 'tdd-implement', 'references', 'stages.md');
const skillPath = path.join(dir, '.agents', 'skills', 'tdd-implement', 'SKILL.md');
const codeReviewPath = path.join(dir, '.agents', 'skills', 'code-review', 'SKILL.md');

const stages = readFileSync(stagesPath, 'utf8');
const skill = readFileSync(skillPath, 'utf8');
const codeReview = readFileSync(codeReviewPath, 'utf8');

test('stage ③ has a turn-continuity rule (fix for premature stop)', () => {
  assert.match(stages, /回合连续性/);
  assert.match(stages, /在一个回合内串行完成/);
  // Positive phrasing, not a bare prohibition
  assert.match(stages, /每完成一个 seam 立即进入下一个/);
});

test('stage ③ has a chunking rule (fix for giant turns)', () => {
  assert.match(stages, /任务分解/);
  assert.match(stages, /Chunking/);
  assert.match(stages, /150 行/);
  assert.match(stages, /5 处/);
  assert.match(stages, /每批后立即 typecheck 验证/);
});

test('SKILL.md declares the skill as a long-horizon skill', () => {
  assert.match(skill, /长程任务/);
  assert.match(skill, /Long-Horizon Skill/);
  assert.match(skill, /CONTEXT\.md/);
  assert.match(skill, /skill-design\.md/);
  assert.match(skill, /Turn Continuity/);
  assert.match(skill, /Chunking/);
});
test('3c says move to the next seam immediately within the same turn', () => {
  assert.match(stages, /立即进入下一个 seam/);
});

test('stage ⑦ closes the loop: issue status + implementation summary', () => {
  assert.match(stages, /阶段 ⑦/);
  assert.match(stages, /Status:/);
  assert.match(stages, /resolved/);
  assert.match(stages, /实施总结/);
  assert.match(skill, /⑦ 收尾/);
  assert.match(skill, /实施总结/);
});

test('stage ⑦ carries the doc-alignment step', () => {
  assert.match(stages, /文档对齐/);
  assert.match(stages, /README/);
  assert.match(stages, /单独 commit/);
  assert.match(stages, /不顺手重构无关文档/);
  assert.match(skill, /⑦ 收尾（文档对齐/);
  assert.match(stages, /- 文档对齐：/);
});

test('SKILL.md no longer mandates the Goal mode (removed)', () => {
  assert.doesNotMatch(skill, /Goal 模式/);
  assert.doesNotMatch(skill, /goal_complete/);
});

test('stage ③ does not re-rewrite TDD semantics deferred to the tdd skill', () => {
  assert.doesNotMatch(stages, /只写刚好能让当前测试通过的最小代码/);
  assert.doesNotMatch(stages, /断言值来自独立来源/);
  assert.doesNotMatch(stages, /垂直切片逐条推进/);
  assert.doesNotMatch(stages, /每次只做一个 seam/);
  assert.doesNotMatch(stages, /重构留到 code review 阶段/);
});

test('SKILL.md reference section keeps the tests.md and mocking.md links', () => {
  assert.match(skill, /tdd\/tests\.md/);
  assert.match(skill, /tdd\/mocking\.md/);
});

test('stage ③ defers TDD semantics to the tdd skill (single source of truth)', () => {
  assert.match(stages, /以 \[tdd 技能\]\(\.agents\/skills\/tdd\/SKILL\.md\) 为唯一事实源/);
  assert.match(stages, /不再在此重写/);
  assert.match(stages, /循环前与循环中都查阅/);
  assert.match(stages, /tdd\/tests\.md/);
  assert.match(stages, /tdd\/mocking\.md/);
});

test('SKILL.md points TDD descriptions at the tdd skill', () => {
  assert.match(skill, /唯一事实源/);
  assert.match(skill, /\.agents\/skills\/tdd\/SKILL\.md/);
  assert.match(skill, /③ TDD 开发循环的红-绿规则见/);
});

test('SKILL.md todo spec has big/small task hierarchy with subtask steps', () => {
  assert.match(skill, /大小任务层次/);
  assert.match(skill, /\*\*大任务\*\*/);
  assert.match(skill, /\*\*中任务\*\*/);
  assert.match(skill, /\*\*小任务\*\*/);
  assert.match(skill, /\*\*执行步\*\*/);
  assert.match(skill, /`T1-R` 红/);
  assert.match(skill, /Subtodo 不单独设 `blocked`/);
});

test('stage ③ exit is anchored to ALL seams, not one seam (fix for seam-boundary stops)', () => {
  assert.match(stages, /所有 seams 红-绿完成 \+ typecheck 通过/);
  assert.match(stages, /单个 seam 全绿不是回合终点/);
  assert.match(skill, /单个 seam 全绿只是阶段③的内部步骤，不是回合终点/);
  assert.doesNotMatch(skill, /如某 seam 全绿、typecheck 通过/);
});

test('progress output does not end the turn (fix for announce-and-stop)', () => {
  assert.match(stages, /进度输出并入工具调用序列/);
  assert.match(stages, /不单独结束回合/);
  assert.match(skill, /输出进度\/预告本身不结束回合/);
});

test('todo state updates follow actual progress, no stale-snapshot rewrites', () => {
  assert.match(skill, /只按实际推进更新/);
  assert.match(skill, /永不回退/);
  assert.match(stages, /按实际推进更新对应 todo 状态/);
  assert.match(stages, /已完成项（done）永不回退/);
});

test('stage ⑤ reports review results in conversation only, no written review reports', () => {
  assert.match(stages, /只在对话输出/);
  assert.match(stages, /不生成书面审查报告/);
  assert.match(stages, /review-\*\.md/);
  assert.match(skill, /审查结果只在对话输出/);
  assert.match(skill, /不生成书面审查报告/);
});

test('stage ⑦ checks acceptance criteria as a checkbox list before resolving', () => {
  assert.match(stages, /验收标准/);
  assert.match(stages, /checkbox 清单/);
  assert.match(stages, /- \[x\]/);
  assert.match(stages, /- \[ \]/);
  assert.match(stages, /全部打勾/);
  assert.match(skill, /验收标准逐条转写为 checkbox 清单并打勾/);
  assert.match(skill, /全部 `- \[x\]` 才允许标 `resolved`/);
});

test('stage ⑦ keeps the directory clean (temp artifacts + git status)', () => {
  assert.match(stages, /保持目录卫生/);
  assert.match(stages, /\[DEBUG-\.\.\.\]/);
  assert.match(stages, /git status/);
  assert.match(stages, /工作区干净/);
  assert.match(stages, /无残留未跟踪文件/);
  assert.match(skill, /保持目录卫生/);
  assert.match(skill, /git status/);
});

test('code-review skill forbids written review report files', () => {
  assert.match(codeReview, /只在对话输出/);
  assert.match(codeReview, /不生成任何书面报告文件/);
  assert.match(codeReview, /review-\*\.md/);
});

test('stage ⑤ reviews along two axes (Standards + Spec), independent reports', () => {
  assert.match(stages, /双轴/);
  assert.match(stages, /Standards/);
  assert.match(stages, /Spec/);
  assert.match(stages, /互不掩盖/);
  assert.match(skill, /双轴/);
});

test('stage ⑥ embeds the commit-check gate before commit', () => {
  assert.match(stages, /commit-check/);
  assert.match(stages, /四项/);
  assert.match(stages, /全部通过才 commit/);
  assert.match(skill, /commit-check/);
});

// ---- 多 issue 编排（按依赖分层并行） ----

test('SKILL.md has multi-issue orchestration section (layered parallel)', () => {
  assert.match(skill, /多 issue 编排/);
  assert.match(skill, /按依赖分层并行/);
  assert.match(skill, /Blocked by/);
  assert.match(skill, /编排器职责/);
  assert.match(skill, /单 issue 单代理/);
  assert.match(skill, /分层并行/);
});

test('SKILL.md orchestration: trigger and single-issue fallback', () => {
  assert.match(skill, /\.scratch\/<feature>\/issues\//);
  assert.match(skill, /单 issue \/ 单 spec 仍走上节单线流程/);
  assert.match(skill, /不为单 issue 引入编排/);
});

test('SKILL.md orchestration: subagent contract (full ①→⑦ each issue)', () => {
  assert.match(skill, /各自治完成完整 tdd-implement 流程/);
  assert.match(skill, /①→⑦/);
  assert.match(skill, /独立 commit/);
  assert.match(skill, /禁止跨 issue 改动/);
});

test('SKILL.md orchestration: conflict and convergence', () => {
  assert.match(skill, /冲突处理/);
  assert.match(skill, /rebase/);
  assert.match(skill, /收敛/);
  assert.match(skill, /全量测试/);
});

test('SKILL.md orchestration: turn continuity extends to layers', () => {
  assert.match(skill, /编排模式下回合连续性延伸至/);
  assert.match(skill, /一层内全部子代理派发后/);
});

test('SKILL.md orchestration: adds orchestration layer to task hierarchy', () => {
  assert.match(skill, /编排层/);
  assert.match(skill, /Blocked by.*分层/);
  assert.match(skill, /分层清单/);
});

test('stages.md appendix exists with full A0-A5 coverage', () => {
  assert.match(stages, /附录.*多 issue 编排/);
  assert.match(stages, /A0.*依赖图构建/);
  assert.match(stages, /A1.*拓扑分层/);
  assert.match(stages, /A2.*分层调度/);
  assert.match(stages, /A3.*子代理契约/);
  assert.match(stages, /A4.*全量收敛/);
  assert.match(stages, /A5.*回退与冲突/);
});

test('stages.md A0 parses Blocked by and detects cycles', () => {
  assert.match(stages, /Blocked by/);
  assert.match(stages, /None/);
  assert.match(stages, /DAG/);
  assert.match(stages, /环/);
});

test('stages.md A1 uses Kahn layered topological sort', () => {
  assert.match(stages, /Kahn/);
  assert.match(stages, /入度为 0/);
  assert.match(stages, /L1/);
  assert.match(stages, /L2/);
});

test('stages.md A3 subagent is a full single-issue tdd-implement unit', () => {
  assert.match(stages, /以 \[tdd 技能\]/);
  assert.match(stages, /禁止.*跨 issue 改动/);
  assert.match(stages, /NN-<slug>/);
  assert.match(stages, /spec\.md/);
  assert.match(stages, /①→⑦/);
  assert.match(stages, /完整的 tdd-implement 单 issue 执行单元/);
});

test('stages.md orchestration defers TDD semantics, does not re-rewrite', () => {
  // Appendix must not re-define red-green rules; it defers to tdd skill
  assert.match(stages, /TDD 语义以 \[tdd 技能\]/);
});

test('stages.md appendix does not apply to single-issue runs', () => {
  assert.match(stages, /单 issue \/ 单 spec 不走本附录/);
});
