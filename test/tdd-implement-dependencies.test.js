import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(path.join(dir, file), 'utf8');
const orchestration = read('.agents/skills/tdd-implement/references/orchestration.md');
const template = read('template/.agents/skills/tdd-implement/references/orchestration.md');

test('tdd-implement fails closed when Blocked by cannot be parsed', () => {
  assert.match(orchestration, /Blocked by.*无法解析[\s\S]*fail closed/);
  assert.match(orchestration, /标记为 `blocked`/);
  assert.match(orchestration, /不得按“无依赖”继续/);
  assert.doesNotMatch(orchestration, /无法解析：按无依赖处理/);
});

test('tdd-implement fails closed on missing dependency nodes', () => {
  assert.match(orchestration, /依赖引用了不存在的 issue.*fail closed/);
  assert.match(orchestration, /报告缺失节点/);
  assert.match(orchestration, /A1 不开始/);
});

test('invalid dependencies cannot silently enter Kahn L1', () => {
  assert.match(orchestration, /不存在因无法解析依赖而被误放入 L1/);
  assert.match(orchestration, /重新构建 DAG/);
});

test('template keeps the dependency safety contract exactly', () => {
  assert.equal(template, orchestration);
});
