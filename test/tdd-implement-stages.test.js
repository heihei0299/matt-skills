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
  assert.match(skill, /test-first\/TDD/);
  assert.match(skill, /`Red-Green → Verify → Review → Finalize`/);
  assert.match(skill, /### ① Red-Green/);
  assert.match(skill, /### ② Verify/);
  assert.match(skill, /### ③ Review/);
  assert.match(skill, /## Finalize/);
});

test('full review consumes one committed review point', () => {
  assert.match(skill, /完整 Review 前只形成 1 个 committed Review Point/);
  assert.match(review, /唯一的 Review Point commit/);
  assert.match(review, /不得按 Behavior、阶段或验证动作拆分 commit/);
  assert.match(review, /fixed point：`issue_base`/);
  assert.match(review, /diff：`issue_base\.\.\.HEAD`/);
  assert.match(review, /不得用未提交 working tree 代替该 committed diff/);
});

test('each issue invokes code-review exactly once at most', () => {
  assert.match(skill, /每个 issue 最多调用 1 次 `code-review`/);
  assert.match(skill, /该调用一旦启动即消耗唯一机会/);
  assert.match(review, /每个 issue 最多调用 1 次 `code-review`/);
  assert.match(review, /不得因 findings、修复、工具错误、stream interruption、sub-agent failure 或其它原因再次调用 `code-review`/);
  assert.match(review, /技术原因未形成完整聚合结果[\s\S]*不得重跑 `code-review`/);
});

test('blocking findings are fixed directly without TDD or incremental review', () => {
  assert.match(review, /一次性直接修复当前全部 blocking findings/);
  assert.match(review, /修复阶段不得返回 Red-Green，不执行 TDD/);
  assert.match(review, /必要验证/);
  assert.match(review, /最多 1 个 finding-fix commit/);
  assert.match(review, /修复后禁止 Incremental Review，禁止再次调用 `code-review`/);
  assert.match(review, /Incremental Review 调用次数为 0/);
  assert.doesNotMatch(review, /incremental_review_rounds|last_reviewed_head/);
});

test('review head stays at the sole reviewed point and issue head may include one post-review fix', () => {
  assert.match(review, /设置 `review_head = HEAD`，记录本次唯一 Review 的 committed Review Point/);
  assert.match(review, /finding-fix commit 位于 `review_head` 之后/);
  assert.match(finalize, /`HEAD != review_head`[\s\S]*唯一的 finding-fix commit/);
  assert.match(finalize, /设置 `issue_head = HEAD`/);
  assert.match(orchestration, /`review_head\.\.\.issue_head` 只包含该唯一自动修复 commit/);
});

test('Finalize creates no per-issue status commit and batch sync remains bounded', () => {
  assert.match(finalize, /不为单个 issue 创建收尾 commit/);
  assert.match(finalize, /Finalize 不创建 commit/);
  assert.match(finalize, /最多创建 1 个 batch state-sync commit/);
  assert.match(finalize, /不属于任何单个 issue 的 `issue_base\.\.\.issue_head` 范围/);
});

test('multi-issue orchestration carries the final issue HEAD forward', () => {
  assert.match(orchestration, /issue_base = HEAD[\s\S]*Red-Green[\s\S]*Verify[\s\S]*Review[\s\S]*Finalize[\s\S]*issue_head = HEAD/);
  assert.match(orchestration, /下一个 issue 以当前 `issue_head` 作为新的 `issue_base`/);
  assert.match(orchestration, /每个完成 issue 只调用 1 次 `code-review`，Incremental Review 调用次数为 0/);
  assert.match(orchestration, /最多包含 2 个由本技能产生的实现\/修复 commits/);
});

test('tdd-implement avoids obsolete references and commit-check coupling', () => {
  assert.doesNotMatch(skill, /references\/(contract|red-green|stages)\.md/);
  assert.doesNotMatch(orchestration, /red-green\.md|commit-check|scan-sensitive\.sh/);
  assert.doesNotMatch(skill, /commit-check|scan-sensitive\.sh/);
  assert.match(verify, /当前 issue 的必要验证通过/);
});
