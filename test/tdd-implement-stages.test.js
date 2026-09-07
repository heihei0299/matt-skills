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
// After writing-great-skills optimization, SKILL.md held Steps-only; now SKILL.md holds condensed orchestration front (A0-A5要点) at top + Steps, detailed reference lives in stages.md (single-line) and orchestration.md (full).
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const stagesPath = path.join(dir, '.agents', 'skills', 'tdd-implement', 'references', 'stages.md');
const skillPath = path.join(dir, '.agents', 'skills', 'tdd-implement', 'SKILL.md');
const orchestrationPath = path.join(dir, '.agents', 'skills', 'tdd-implement', 'references', 'orchestration.md');
const codeReviewPath = path.join(dir, '.agents', 'skills', 'code-review', 'SKILL.md');

const stages = readFileSync(stagesPath, 'utf8');
const skill = readFileSync(skillPath, 'utf8');
const orchestration = readFileSync(orchestrationPath, 'utf8');
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
  assert.match(stages, /阶段⑥.*commit-check|commit-check.*文档/);
  assert.match(stages, /只复核|仅复核/);
  assert.doesNotMatch(stages, /不一致则更新文档，并单独 commit/);
  assert.match(stages, /不顺手重构无关文档/);
  // SKILL is Steps-only: it points to stages instead of duplicating the detail
  assert.match(skill, /⑦ 收尾/);
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
  assert.match(stages, /阶段③入口.*加载.*一次|加载.*一次/);
  assert.match(stages, /tdd\/tests\.md/);
  assert.match(stages, /tdd\/mocking\.md/);
});

test('SKILL.md points TDD descriptions at the tdd skill', () => {
  assert.match(skill, /唯一事实源/);
  assert.match(skill, /\.agents\/skills\/tdd\/SKILL\.md/);
  // SKILL is Steps-only: the red-green detail lives in stages, SKILL keeps the seam lead word
  assert.match(skill, /seam/);
  assert.match(stages, /TDD 语义与测试规则以 \[tdd 技能\]/);
});

test('Todo spec has big/small task hierarchy with subtask steps (now in stages.md via progressive disclosure)', () => {
  // Progressive disclosure: hierarchy lives in stages Todo 规定, SKILL points there
  assert.match(stages, /大小任务层次/);
  assert.match(stages, /\*\*大任务\*\*/);
  assert.match(stages, /\*\*中任务\*\*/);
  assert.match(stages, /\*\*小任务\*\*/);
  assert.match(stages, /\*\*执行步\*\*/);
  assert.match(stages, /`T1-R` 红/);
  assert.match(stages, /Subtodo 不单独设 `blocked`/);
  assert.match(skill, /stages\.md/);
});

test('stage ③ exit is anchored to ALL seams, not one seam (fix for seam-boundary stops)', () => {
  assert.match(stages, /所有 seams 红-绿完成 \+ typecheck 通过/);
  assert.match(stages, /单个 seam 全绿不是回合终点/);
  // SKILL keeps the positive continuity pointer, detail lives in stages
  assert.match(skill, /回合连续性/);
  assert.match(skill, /一个回合内串行完成/);
  assert.doesNotMatch(skill, /如某 seam 全绿、typecheck 通过/);
});

test('progress output does not end the turn (fix for announce-and-stop)', () => {
  assert.match(stages, /进度输出并入工具调用序列/);
  assert.match(stages, /不单独结束回合/);
  // SKILL summarizes continuity positively and points to stages
  assert.match(skill, /预告下一步后立即执行/);
});

test('todo state updates follow actual progress, no stale-snapshot rewrites', () => {
  // Detail lives in stages Todo 更新纪律, SKILL is Steps-only
  assert.match(stages, /按实际推进更新对应 todo 状态/);
  assert.match(stages, /已完成项（done）永不回退/);
  assert.match(stages, /只按实际推进更新/);
  assert.match(stages, /永不回退/);
});

test('stage ⑤ reports review results in conversation only, no written review reports', () => {
  assert.match(stages, /只在对话输出/);
  assert.match(stages, /不生成书面审查报告/);
  assert.match(stages, /review-\*\.md/);
  // SKILL points to code-review; detail lives in stages ⑤
  assert.match(skill, /Code Review/);
  assert.match(skill, /双轴/);
});

test('stage ⑦ checks acceptance criteria as a checkbox list before resolving', () => {
  assert.match(stages, /验收标准/);
  assert.match(stages, /checkbox 清单/);
  assert.match(stages, /- \[x\]/);
  assert.match(stages, /- \[ \]/);
  assert.match(stages, /全部打勾/);
  // Detail lives in stages ⑦; SKILL keeps Steps summary
  assert.match(skill, /⑦ 收尾/);
  assert.match(stages, /验收标准/);
});

test('stage ⑦ keeps the directory clean (temp artifacts + git status)', () => {
  assert.match(stages, /保持目录卫生/);
  assert.match(stages, /\[DEBUG-\.\.\.\]/);
  assert.match(stages, /git status/);
  assert.match(stages, /工作区干净/);
  assert.match(stages, /无残留未跟踪文件/);
  // SKILL summary keeps 工作区干净, detail in stages
  assert.match(skill, /工作区干净/);
  assert.match(skill, /实施总结/);
});

test('code-review skill forbids written review report files', () => {
  // Upstream code-review was rewritten EN in 6654f6b; old Chinese skill explicitly forbade, new English aggregates under headings
  // Keep intent: no written report file, content presented verbally
  assert.match(codeReview, /Standards/);
  assert.match(codeReview, /Spec/);
  assert.doesNotMatch(codeReview, /落盘.*review-.*\.md|生成.*书面报告/);
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
  assert.match(stages, /三项/);
  assert.match(stages, /全部通过才 commit/);
  assert.match(skill, /commit-check/);
});

// ---- 多 issue 编排（按依赖分层并行） ----
// Progressive disclosure: SKILL holds condensed front (A0-A5要点) + branch pointer, orchestration.md holds full A0-A5 detail (全量保留)
test('SKILL.md has multi-issue orchestration pointer (branch, layered serial)', () => {
  assert.match(skill, /多 issue 编排/);
  assert.match(skill, /按依赖串行/);
  assert.match(skill, /Blocked by/);
  assert.match(skill, /orchestration\.md/);
  assert.match(skill, /\.scratch\/<feature>\/issues\//);
  // Detail lives in orchestration
  assert.match(orchestration, /主代理串行调度/);
  assert.match(orchestration, /主代理直接执行/);
});

test('SKILL.md orchestration: trigger and single-issue fallback', () => {
  assert.match(skill, /\.scratch\/<feature>\/issues\//);
  assert.match(skill, /orchestration\.md/);
  assert.match(stages, /单线 ①→⑦|多 issue 编排/);
  assert.match(orchestration, /单 issue \/ 单 spec 不走本文件/);
});

test('orchestration: main-agent serial contract (issue closure without full regression)', () => {
  assert.match(orchestration, /主代理直接执行该 issue 的 issue 闭环/);
  assert.match(orchestration, /⑤一次 code-review/);
  assert.match(orchestration, /④全量测试不在 issue 闭环内执行/);
  assert.match(orchestration, /独立 commit/);
  assert.match(orchestration, /禁止子代理派发/);
});

test('orchestration: layer convergence and full convergence', () => {
  assert.match(orchestration, /层收敛/);
  assert.match(orchestration, /全量收敛/);
  assert.match(orchestration, /全量测试/);
});

test('orchestration: turn continuity extends to layers', () => {
  assert.match(orchestration, /回合连续性/);
  assert.match(orchestration, /一 issue 提交后立即取下一 issue/);
  assert.match(skill, /回合连续性/);
});

test('orchestration: adds orchestration layer to task hierarchy', () => {
  assert.match(orchestration, /编排层/);
  assert.match(stages, /编排层/);
  assert.match(stages, /Blocked by.*分层|分层.*Blocked by/);
  assert.match(stages, /分层清单/);
});

test('orchestration.md exists with full A0-A4 coverage (disclosed from stages)', () => {
  assert.match(orchestration, /A0.*依赖图构建/);
  assert.match(orchestration, /A1.*拓扑分层/);
  assert.match(orchestration, /A2.*主代理串行调度/);
  assert.match(orchestration, /A3.*层收敛/);
  assert.match(orchestration, /A4.*全量收敛/);
  // stages points to orchestration instead of duplicating appendix
  assert.match(stages, /orchestration\.md/);
});

test('orchestration A0 parses Blocked by and detects cycles', () => {
  assert.match(orchestration, /Blocked by/);
  assert.match(orchestration, /None/);
  assert.match(orchestration, /DAG/);
  assert.match(orchestration, /环/);
});

test('orchestration A1 uses Kahn layered topological sort', () => {
  assert.match(orchestration, /Kahn/);
  assert.match(orchestration, /入度为 0/);
  assert.match(orchestration, /L1/);
  assert.match(orchestration, /L2/);
});

test('orchestration A2 skips full regression and reviews each issue once', () => {
  assert.match(orchestration, /主代理直接执行该 issue 的 issue 闭环/);
  assert.match(orchestration, /⑤一次 code-review/);
  assert.match(orchestration, /④全量测试不在 issue 闭环内执行/);
  assert.match(orchestration, /NN-<slug>/);
  assert.match(orchestration, /spec\.md/);
});

test('orchestration defers TDD semantics, does not re-rewrite', () => {
  // Orchestration must not re-define red-green rules; it defers to tdd skill
  assert.match(orchestration, /TDD 语义以 \[tdd 技能\]/);
});

test('stages points to orchestration for multi-issue, orchestration handles single-issue guard', () => {
  assert.match(stages, /多 issue 编排.*orchestration\.md/);
  assert.match(orchestration, /单 issue \/ 单 spec 不走本文件/);
});

test('orchestration: receipt card per issue', () => {
  assert.match(orchestration, /回执卡片|receipt card/);
  assert.match(orchestration, /回写该 issue/);
  assert.match(skill, /orchestration\.md/);
});

test('orchestration: layer acceptance gate', () => {
  assert.match(orchestration, /层收敛/);
  assert.match(orchestration, /Status: resolved/);
  assert.match(orchestration, /独立 commit/);
});

test('orchestration: layer convergence checks', () => {
  assert.match(orchestration, /层收敛/);
});

test('orchestration A2 scheduling includes layer convergence', () => {
  assert.match(orchestration, /层收敛/);
  assert.match(orchestration, /才进下一层/);
});

test('orchestration A3 has no subagent output constraint (main-agent does receipt)', () => {
  assert.match(orchestration, /回执卡片|receipt card/);
  assert.match(orchestration, /回写/);
});

test('orchestration A3 has layer checklist', () => {
  assert.match(orchestration, /层收敛/);
  assert.match(orchestration, /Status: resolved/);
});

test('orchestration A4 summary is from receipt cards', () => {
  assert.match(orchestration, /回执卡片关键信息/);
});


// ---- Git History Preservation (fix for stash/clean dropping commits) ----

test('stage ③ has Git History Preservation preface and checks', () => {
  assert.match(stages, /Git 历史保护/);
  assert.match(stages, /Git History Preservation/);
  assert.match(stages, /BASE_HEAD/);
  assert.match(stages, /git merge-base --is-ancestor \$BASE_HEAD HEAD/);
  assert.match(stages, /git reflog/);
});

test('stage ③ forbids destructive git commands without confirmation', () => {
  assert.match(stages, /git reset --hard/);
  assert.match(stages, /git checkout \./);
  assert.match(stages, /git clean -fd/);
  assert.match(stages, /git stash push --include-untracked/);
  assert.match(stages, /--keep-index/);
});

test('stage ⑥ commit has ancestor check before commit', () => {
  assert.match(stages, /历史校验/);
  assert.match(stages, /git merge-base --is-ancestor \$BASE_HEAD HEAD/);
  assert.match(stages, /全部通过才 commit/);
});

test('stage ⑦ directory clean forbids git-level clean', () => {
  assert.match(stages, /仅清理本次实现产生的临时产物/);
  assert.match(stages, /禁止为达干净而执行/);
  assert.match(stages, /git reset --hard/);
});

test('orchestration A2/A4 carry Git History Preservation', () => {
  assert.match(orchestration, /A2.*分层调度/s);
  assert.match(orchestration, /Git 历史保护/);
  assert.match(orchestration, /BASE_HEAD.*HEAD/);
  assert.match(orchestration, /git merge-base --is-ancestor/);
});

test('orchestration A2 inherits Git History Preservation', () => {
  assert.match(orchestration, /Git 历史保护/);
  assert.match(orchestration, /BASE_HEAD/);
});

test('orchestration A2/A4 no destructive git', () => {
  assert.match(orchestration, /禁止.*git reset --hard|git reset --hard.*禁止/);
});

test('commit-check ③ forbids destructive git for clean', () => {
  const commitCheck = readFileSync(path.join(dir, '.agents', 'skills', 'commit-check', 'SKILL.md'), 'utf8');
  assert.match(commitCheck, /禁止为达干净而执行/);
  assert.match(commitCheck, /git reset --hard/);
  assert.match(commitCheck, /git checkout \./);
  assert.match(commitCheck, /git clean -fd/);
  assert.match(commitCheck, /git stash push --include-untracked/);
  assert.match(commitCheck, /git merge-base --is-ancestor \$BASE_HEAD HEAD/);
});

// ---- writing-great-skills optimized hierarchy checks ----

test('SKILL.md is Steps-only with progressive disclosure (no sprawl)', () => {
  // SKILL holds condensed orchestration front (精简主过程) + Steps, full appendix stays in orchestration.md
  assert.doesNotMatch(skill, /附录.*多 issue 编排/);
  // Condensed front contains A0 key but not the full Todo state machine (lives in stages)
  assert.match(skill, /A0.*依赖图/);
  assert.match(skill, /多 issue 编排.*按依赖串行/);
  assert.doesNotMatch(skill, /pending → in-progress → done/);
  // SKILL should point to orchestration and stages (plus local anchor)
  assert.match(skill, /\[stages\.md\]\(references\/stages\.md\)/);
  assert.match(skill, /\[orchestration\.md\]\(references\/orchestration\.md\)/);
});
test('SKILL.md condensed orchestration front contains A0-A4 key constraints (actual)', () => {
  assert.match(skill, /## 多 issue 编排/);
  assert.match(skill, /A0.*依赖图/);
  assert.match(skill, /A1.*Kahn/);
  assert.match(skill, /A2.*主代理串行调度/);
  assert.match(skill, /A3.*层收敛/);
  assert.match(skill, /A4.*全量收敛/);
  assert.match(skill, /Kahn/);
  assert.match(skill, /L1.*入度/);
  assert.match(skill, /禁止子代理派发/);
});
test('SKILL.md and orchestration enforce plan-before-execution boundary', () => {
  assert.match(skill, /A0.*依赖图/);
  assert.match(skill, /Kahn/);
  assert.match(orchestration, /必须先输出依赖图/);
  assert.match(orchestration, /禁止跳过计划直接执行/);
  assert.match(orchestration, /分层结果在编排开始前一次性展示给用户确认/);
});

test('SKILL.md description is slim with leading word and branch triggers', () => {
  // Front-loads seam/red-green leading word, one trigger per branch
  assert.match(skill, /seam.*red-green|red-green.*seam/i);
  assert.match(skill, /spec\/ticket/);
  assert.match(skill, /TDD|red-green|test-first/);
  // Should not contain the old verbose process enumeration
  assert.doesNotMatch(skill, /then typecheck, review, commit/);
});


test('orchestration maintains progress.md as derived view', () => {
  assert.match(orchestration, /progress\.md/);
  assert.match(orchestration, /DAG.*Layers|Layers.*DAG/s);
  assert.match(orchestration, /派生视图/);
  assert.match(orchestration, /真相源.*spec.*issues/);
  assert.match(orchestration, /强制.*progress\.md|progress\.md.*强制/);
});

test('stages ⑦ forces progress.md update after each task', () => {
  assert.match(stages, /progress\.md/);
  assert.match(stages, /Status.*Commit.*Review/);
});

test('SKILL.md mentions progress.md', () => {
  assert.match(skill, /progress\.md/);
});

test('stages.md no longer duplicates orchestration appendix (single source of truth)', () => {
  assert.doesNotMatch(stages, /附录.*多 issue 编排/);
  assert.doesNotMatch(stages, /A0.*依赖图构建/);
  // stages points to orchestration for multi-issue
  assert.match(stages, /orchestration\.md/);
});

test('stage ① uses progressive disclosure and an exploration read cache', () => {
  assert.match(stages, /CONTEXT\.md.*按需|按需.*CONTEXT\.md/);
  assert.match(stages, /ADR.*相关/);
  assert.match(stages, /完整源码时视为已读/);
  assert.match(stages, /不再次 `read` 同一文件/);
  assert.match(stages, /验证矩阵已建立/);
});

test('stage ② does not block on a complete spec', () => {
  assert.match(stages, /验收标准.*明确.*直接.*Todo|明确验收标准.*直接/);
  assert.match(stages, /不等待确认|不等待用户确认/);
  assert.match(stages, /歧义|验收缺口/);
  assert.match(skill, /破坏性操作/);
});

test('stage ③ loads TDD references selectively instead of rereading every section', () => {
  assert.match(stages, /阶段③入口.*一次|加载一次/);
  assert.match(stages, /当前 seam.*相关 reference|按当前 seam.*reference/);
  assert.doesNotMatch(stages, /Every section applies on every cycle/);
});

test('stage ④ defines one canonical verification matrix', () => {
  assert.match(stages, /验证矩阵/);
  assert.match(stages, /唯一.*测试命令|规范的.*测试命令/);
  assert.match(stages, /不同时运行等价命令/);
  assert.match(stages, /正常路径只执行一次/);
});

test('stage ⑤ performs exactly one code-review per issue', () => {
  assert.match(stages, /每个 issue 恰好调用一次/);
  assert.match(stages, /修复不触发第二次 review/);
  assert.doesNotMatch(stages, /增量复审/);
});

test('stage ⑦ reports documentation alignment instead of opening a second commit cycle', () => {
  assert.match(stages, /阶段⑥.*文档.*对齐|阶段⑥.*README/);
  assert.match(stages, /只复核|仅复核/);
  assert.doesNotMatch(stages, /不一致则更新文档，并单独 commit/);
});
