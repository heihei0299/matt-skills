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
const finalize = read('.agents/skills/tdd-implement/references/finalize.md');

test('tdd-implement exposes the current two-stage delivery lifecycle', () => {
  assert.match(skill, /name: tdd-implement/);
  assert.match(skill, /spec\/task/);
  assert.match(skill, /test-first\/TDD/);
  assert.match(skill, /### ① Red-Green/);
  assert.match(skill, /### ② Verify/);
  assert.doesNotMatch(skill, /### ③/);
  assert.match(skill, /## Finalize/);
});

test('current references define the issue delivery contract', () => {
  assert.match(skill, /\[orchestration\.md\]\(references\/orchestration\.md\)/);
  assert.match(skill, /\[verify\.md\]\(references\/verify\.md\)/);
  assert.match(skill, /\[finalize\.md\]\(references\/finalize\.md\)/);
  assert.match(orchestration, /每个 issue 仍按 `Red-Green → Verify → Finalize` 独立完成/);
  assert.match(verify, /当前 issue 的必要验证通过/);
  assert.match(finalize, /仅在 Verify 与 Review 通过后执行/);
});

test('review becomes incremental after the one full review', () => {
  assert.match(skill, /full_review_done = false/);
  assert.match(skill, /open_findings = \[\]/);
  assert.match(skill, /full_review_done = true[\s\S]*不得再次启动完整双轴 Review/);
  assert.match(skill, /增量 Review 不调用完整 `code-review`/);
  assert.match(skill, /full_review_done = true[\s\S]*open_findings[\s\S]*为空/);
});

test('each issue gets one full review and one independent commit', () => {
  assert.match(skill, /每个 issue 的完整 Review 通过后创建一个独立 commit/);
  assert.match(finalize, /2\. 为当前 issue 创建一个独立 commit/);
  assert.match(orchestration, /当前 issue 的完整 Review 通过并完成独立 commit 后，才进入下一个 issue/);
  assert.match(orchestration, /每个完成的 issue 均有独立 commit/);
});

test('Finalize commits before tracker sync and resolves only after state sync', () => {
  assert.match(finalize, /2\. 为当前 issue 创建一个独立 commit[\s\S]*3\. 更新 Acceptance Criteria 与 progress\/tracker[\s\S]*4\. 收尾状态同步成功后，将 issue 标记 `resolved`/);
});

test('tdd-implement avoids obsolete references and commit-check coupling', () => {
  assert.doesNotMatch(skill, /references\/(contract|red-green|stages)\.md/);
  assert.doesNotMatch(orchestration, /red-green\.md|commit-check|scan-sensitive\.sh/);
  assert.doesNotMatch(skill, /commit-check|scan-sensitive\.sh/);
});
