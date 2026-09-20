import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const skill = readFileSync(path.join(root, '.agents/skills/tdd-implement/SKILL.md'), 'utf8');
const orchestration = readFileSync(
  path.join(root, '.agents/skills/tdd-implement/references/orchestration.md'),
  'utf8',
);

test('startup stays scoped to the current issue', () => {
  assert.match(skill, /Implementation context is current-issue scoped/);
  assert.match(skill, /Read the current issue body/);
  assert.match(skill, /Do not read future issue bodies/);
  assert.match(skill, /ID, title, status, and dependency/);
  assert.match(skill, /Expand another issue only when the current issue explicitly depends/);
  assert.match(skill, /Read only the specific dependent section needed/);
});

test('a complete active Skill is not read again for confirmation', () => {
  assert.match(skill, /complete active Skill content is already present in the current conversation/);
  assert.match(skill, /do not read the same Skill file again merely to confirm its rules/);
  assert.match(skill, /partial\/summary copy/);
  assert.match(skill, /file is known to have changed during the session/);
  assert.match(skill, /user explicitly requests a fresh read/);
});

test('orchestration builds dependencies from metadata without future issue bodies', () => {
  assert.match(orchestration, /调度元数据/);
  assert.match(orchestration, /ID、Status、Blocked by/);
  assert.match(orchestration, /不得为构建依赖图读取未来 issue 正文/);
  assert.match(orchestration, /Acceptance Criteria/);
  assert.match(orchestration, /定点搜索\/范围读取/);
  assert.match(orchestration, /字段无法解析、依赖节点不存在或出现环时/);
  assert.match(orchestration, /不降级为无依赖/);
  assert.match(orchestration, /Kahn/);
});

test('context-scope rules preserve issue implementation and delivery workflow', () => {
  assert.match(skill, /current-issue referenced specs/);
  assert.match(skill, /relevant tests/);
  assert.match(skill, /Red-Green → Verify → Record → Finalize/);
  assert.match(skill, /delivery commit/);
  assert.match(skill, /最终验证|final verification/);
});
