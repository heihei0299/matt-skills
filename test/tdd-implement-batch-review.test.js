import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(path.join(root, file), 'utf8');
const skill = read('.agents/skills/tdd-implement/SKILL.md');
const orchestration = read('.agents/skills/tdd-implement/references/orchestration.md');
const issueLoop = orchestration.match(/```text\nbatch_base = HEAD[\s\S]*?```/)?.[0] ?? '';

test('issue execution records evidence without a routine review', () => {
  assert.notEqual(issueLoop, '');
  assert.match(issueLoop, /for each executable issue:/);
  assert.match(issueLoop, /issue_base = HEAD[\s\S]*Red-Green[\s\S]*Verify[\s\S]*Record Evidence[\s\S]*issue_head = HEAD/);
  assert.doesNotMatch(issueLoop, /Review|code-review/);
});

test('each verified issue writes a minimal execution evidence ledger', () => {
  assert.match(skill, /\.scratch\/tdd-implement\//);
  assert.match(skill, /Issue: <id>/);
  assert.match(skill, /issue_base: <sha>/);
  assert.match(skill, /issue_head: <sha>/);
  assert.match(skill, /Acceptance:/);
  assert.match(skill, /TDD:/);
  assert.match(skill, /Verify:/);
  assert.match(skill, /Rulings:/);
  assert.match(skill, /不保存完整测试输出/);
});

test('batch review consumes all issue evidence after verification', () => {
  assert.match(orchestration, /全部当前 batch 可执行 issue 完成后/);
  assert.match(orchestration, /batch 内全部 issue 已 Verify/);
  assert.match(orchestration, /evidence ledger 完整/);
  assert.match(orchestration, /Batch Review/);
});
