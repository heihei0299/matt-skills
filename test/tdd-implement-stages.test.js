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
  assert.match(review, /不存在属于当前 issue 交付内容的未提交修改/);
  assert.match(review, /fixed point：`issue_base`/);
  assert.match(review, /diff：`issue_base\.\.\.HEAD`/);
  assert.match(review, /不得用未提交 working tree 代替该 committed diff/);
});

test('review becomes incremental after one logical full review', () => {
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

test('issue history is a bounded commit range rather than one required commit', () => {
  assert.match(skill, /一个 issue 可以包含一个或多个 commits/);
  assert.match(skill, /不要求固定 commit 数量/);
  assert.match(orchestration, /`issue_base\.\.\.review_head` 是已完成 Review 的实现范围/);
  assert.match(orchestration, /`issue_base\.\.\.issue_head` 是当前 issue 的完整提交范围/);
  assert.match(orchestration, /`issue_head` 是下一个 issue 的 `issue_base`/);
  assert.doesNotMatch(skill, /完整 Review 通过后创建一个独立 commit/);
  assert.doesNotMatch(finalize, /为当前 issue 创建一个独立 commit/);
});

test('Finalize changes only issue state after review and records issue_head', () => {
  assert.match(finalize, /不修改已经 Review 的代码、测试、交付文档或配置/);
  assert.match(finalize, /状态同步修改了仓库内的 tracker\/progress\/status 文件[\s\S]*将这些状态修改提交/);
  assert.match(finalize, /不得在该提交中混入产品实现或其它未 Review 的交付修改/);
  assert.match(finalize, /设置 `issue_head = HEAD`/);
  assert.match(finalize, /需要修改代码、测试、交付文档或配置[\s\S]*加入 `open_findings`[\s\S]*增量 Review/);
});

test('multi-issue orchestration advances only from a finalized issue boundary', () => {
  assert.match(orchestration, /issue_base = HEAD[\s\S]*Red-Green[\s\S]*Verify[\s\S]*Review[\s\S]*Finalize[\s\S]*issue_head = HEAD/);
  assert.match(orchestration, /下一个 issue 以当前 `issue_head` 作为新的 `issue_base`/);
  assert.match(orchestration, /一个 issue Finalize 完成后立即进入下一个可调度 issue/);
});

test('tdd-implement avoids obsolete references and commit-check coupling', () => {
  assert.doesNotMatch(skill, /references\/(contract|red-green|stages)\.md/);
  assert.doesNotMatch(orchestration, /red-green\.md|commit-check|scan-sensitive\.sh/);
  assert.doesNotMatch(skill, /commit-check|scan-sensitive\.sh/);
});
