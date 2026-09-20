import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = (file) => path.join(dir, file);
const read = (file) => readFileSync(root(file), 'utf8');

const skill = read('.agents/skills/commit-check/SKILL.md');
const scan = read('.agents/skills/commit-check/scripts/scan-sensitive.sh');

for (const section of [
  'Task basis',
  'Candidate commits',
  'Excluded changes',
  'Validation evidence',
  'Review evidence',
  'Sensitive-data scan',
  'Warnings',
  'Blockers',
]) {
  test(`commit-check fixes the ${section} output section`, () => {
    assert.match(skill, new RegExp(`^${section}$`, 'm'));
  });
}

test('commit-check is an explicit working-tree checker', () => {
  assert.match(skill, /name: commit-check/);
  assert.match(skill, /^disable-model-invocation:\s*true$/m);
  assert.match(skill, /用户显式调用 `\/commit-check`/);
  assert.match(skill, /不 stage、不 commit/);
  assert.match(skill, /不运行 tests\/build\/typecheck/);
  assert.match(skill, /不做 code review/);
  assert.match(skill, /Result: ready to stage \| blocked/);
});

test('candidate scope uses task basis and all working-tree change classes', () => {
  assert.match(skill, /Ticket/);
  assert.match(skill, /Spec/);
  assert.match(skill, /明确的用户请求/);
  assert.match(skill, /git status --short/);
  assert.match(skill, /git diff --cached/);
  assert.match(skill, /git diff --name-status/);
  assert.match(skill, /git ls-files --others --exclude-standard/);
  assert.match(skill, /task-owned candidates/);
  assert.match(skill, /excluded changes/);
  assert.match(skill, /staging plan/);
});

test('commit-check validates evidence instead of executing it', () => {
  assert.match(skill, /Validation evidence/);
  assert.match(skill, /Review evidence/);
  assert.match(skill, /diff.*变化.*失效|变化后.*失效/s);
  assert.match(skill, /受保护分支/);
  assert.match(skill, /验收/);
  assert.match(skill, /<type>\(<scope>\): <subject>/);
  assert.match(skill, /不主动重跑/);
});

test('sensitive scanner accepts candidate paths and keeps secrets out of output', () => {
  assert.match(skill, /scan-sensitive\.sh --files-from=-/);
  assert.match(skill, /`\.env` 或 `\.env\.\*`.*blocker/s);
  assert.match(skill, /高置信.*secret.*token.*private-key.*blocker/s);
  assert.match(skill, /false positive.*ready to stage/s);
  assert.match(scan, /--files-from=-/);
  assert.match(scan, /Possible structured secret found/);
  assert.match(scan, /Sensitive keyword found/);
  assert.doesNotMatch(scan, /git diff --cached/);
  assert.doesNotMatch(scan, /git diff -U0/);
});

test('proposed commit messages are a mandatory gate', () => {
  assert.match(skill, /\^\(feat\|fix\|docs\|chore\|refactor\|test\)/);
  assert.match(skill, /scope.*可省略/s);
  assert.match(skill, /不符合.*blocker/s);
  assert.doesNotMatch(skill, /建议 commit message/);
  assert.doesNotMatch(skill, /message 不合规.*warning/);
});

test('commit-check has no matt-skills-specific path adapter or workflow execution', () => {
  assert.doesNotMatch(skill, /matt-skills 路径适配/);
  assert.doesNotMatch(skill, /template-sync/);
  assert.doesNotMatch(skill, /调用.*tdd-implement/);
  assert.doesNotMatch(skill, /code-review/);
  assert.doesNotMatch(skill, /ready to commit/);
});

test('commit-check remains a local source skill', () => {
  assert.equal(existsSync(root('template/.agents/skills/commit-check')), false);
  assert.equal(existsSync(root('template/.opencode/commands/commit-check.md')), false);
  assert.equal(existsSync(root('.agents/skills/commit-check/SKILL.md')), true);
});
