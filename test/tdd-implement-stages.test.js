import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(path.join(dir, file), 'utf8');
const skill = read('.agents/skills/tdd-implement/SKILL.md');
const orchestration = read('.agents/skills/tdd-implement/references/orchestration.md');
const verify = read('.agents/skills/tdd-implement/references/verify.md');
const review = read('.agents/skills/tdd-implement/references/review.md');
const finalize = read('.agents/skills/tdd-implement/references/finalize.md');

test('tdd-implement exposes the issue delivery lifecycle and delegates details', () => {
  assert.match(skill, /name: tdd-implement/);
  assert.match(skill, /spec\/task/);
  assert.match(skill, /test-first\/TDD/);
  assert.match(skill, /`Red-Green → Verify → Review → Finalize`/);
  assert.match(skill, /### ① Red-Green/);
  assert.match(skill, /### ② Verify/);
  assert.match(skill, /### ③ Review/);
  assert.match(skill, /## Finalize/);
  assert.match(skill, /\[review\.md\]\(references\/review\.md\)/);
});

test('references own their focused parts of the issue contract', () => {
  assert.match(orchestration, /每个 issue 仍按 `Red-Green → Verify → Review → Finalize` 独立完成/);
  assert.match(verify, /当前 issue 的必要验证通过/);
  assert.match(review, /仅在 Verify 通过后执行/);
  assert.match(finalize, /仅在 Verify 与 Review 通过后执行/);
  assert.match(finalize, /Finalize 只负责 tracker\/progress\/status 收尾/);
});

test('full review consumes a committed review point', () => {
  assert.match(skill, /完整 Review 前必须形成 committed Review Point/);
  assert.match(review, /代码、测试、文档和配置均已完成/);
  assert.match(review, /唯一的 Review Point commit/);
  assert.match(review, /不得按 Behavior、阶段或验证动作拆分 commit/);
  assert.match(review, /不存在属于当前 issue 交付内容的未提交修改/);
  assert.match(review, /fixed point：`issue_base`/);
  assert.match(review, /diff：`issue_base\.\.\.HEAD`/);
  assert.match(review, /不得用未提交 working tree 代替该 committed diff/);
});

test('review becomes incremental after one logical full review', () => {
  assert.match(review, /首次进入 Review 时初始化以下状态，且仅初始化一次/);
  assert.match(review, /返回 Red-Green \/ Verify 后继续 Review 时保留现有状态，不得重新初始化/);
  assert.match(review, /full_review_done = false/);
  assert.match(review, /open_findings = \[\]/);
  assert.match(review, /last_reviewed_head = null/);
  assert.match(review, /只有 `code-review` 要求的审查轴均正常返回并形成完整聚合结果后/);
  assert.match(review, /技术重试不算新的逻辑完整 Review/);
  assert.match(review, /full_review_done = true[\s\S]*不得再次启动完整双轴 Review/);
  assert.match(review, /`last_reviewed_head\.\.\.HEAD`/);
  assert.match(review, /增量 Review 不调用完整 `code-review`/);
  assert.match(review, /设置 `last_reviewed_head = HEAD`/);
  assert.match(review, /设置 `review_head = last_reviewed_head`/);
});

test('incremental review is capped at one logical round and one fix commit', () => {
  assert.match(review, /incremental_review_rounds = 0/);
  assert.match(review, /每个 issue 最多执行 1 个逻辑增量 Review 轮次/);
  assert.match(review, /一次性修复当前全部 open findings/);
  assert.match(review, /最多 1 个 finding-fix commit/);
  assert.match(review, /不得按 finding 拆分 commit/);
  assert.match(review, /技术失败不消耗轮次/);
  assert.match(review, /设置 `incremental_review_rounds \+= 1`/);
  assert.match(review, /`incremental_review_rounds >= 1`[\s\S]*不得再次启动增量 Review/);
  assert.match(review, /正常完成但仍有 open findings[\s\S]*停止当前 issue[\s\S]*不进入 Finalize/);
  assert.match(review, /`incremental_review_rounds <= 1`/);
});

test('each issue uses one review point commit and at most one finding-fix commit', () => {
  assert.match(skill, /Red-Green \/ Verify 期间不因 Behavior、阶段切换或验证动作创建 commit/);
  assert.match(review, /唯一的 Review Point commit/);
  assert.match(review, /最多 1 个 finding-fix commit/);
  assert.match(review, /最多包含 2 个由本技能产生的 issue commits/);
  assert.doesNotMatch(skill, /一个 issue 可以包含一个或多个 commits/);
});

test('Finalize closes issue state without a per-issue commit', () => {
  assert.match(finalize, /不为单个 issue 创建收尾 commit/);
  assert.match(finalize, /仓库内 tracker\/progress\/status 只记录为批次待同步状态/);
  assert.match(finalize, /Finalize 不创建 commit/);
  assert.match(finalize, /设置 `issue_head = review_head`/);
  assert.match(finalize, /最多创建 1 个 batch state-sync commit/);
  assert.match(finalize, /不属于任何单个 issue 的 `issue_base\.\.\.issue_head` 范围/);
  assert.match(finalize, /发现任何实现、测试、交付文档、配置或验证遗漏[\s\S]*立即停止当前 issue/);
  assert.doesNotMatch(finalize, /加入 `open_findings`|返回 Verify|增量 Review/);
});

test('multi-issue orchestration advances without per-issue status commits', () => {
  assert.match(orchestration, /issue_base = HEAD[\s\S]*Red-Green[\s\S]*Verify[\s\S]*Review[\s\S]*Finalize[\s\S]*issue_head = review_head/);
  assert.match(orchestration, /`issue_head = review_head`/);
  assert.match(orchestration, /下一个 issue 以当前 `issue_head` 作为新的 `issue_base`/);
  assert.match(orchestration, /最多创建 1 个 batch state-sync commit/);
  assert.match(orchestration, /每个 issue 最多包含 2 个由本技能产生的实现\/Review commits/);
});

test('tdd-implement avoids obsolete references and commit-check coupling', () => {
  assert.doesNotMatch(skill, /references\/(contract|red-green|stages)\.md/);
  assert.doesNotMatch(orchestration, /red-green\.md|commit-check|scan-sensitive\.sh/);
  assert.doesNotMatch(skill, /commit-check|scan-sensitive\.sh/);
});
