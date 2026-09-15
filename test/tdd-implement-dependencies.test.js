import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(path.join(dir, file), 'utf8');
const orchestration = read('.agents/skills/tdd-implement/references/orchestration.md');

test('tdd-implement stops when Blocked by cannot be parsed', () => {
  assert.match(orchestration, /`Blocked by` 无法解析[\s\S]*停止受影响调度并报告/);
  assert.match(orchestration, /不降级为无依赖/);
  assert.doesNotMatch(orchestration, /无法解析：按无依赖处理/);
});

test('tdd-implement stops on missing dependency nodes', () => {
  assert.match(orchestration, /依赖节点不存在[\s\S]*停止受影响调度并报告/);
  assert.match(orchestration, /依赖缺失或存在环/);
});

test('invalid dependencies cannot silently continue as no dependency', () => {
  assert.match(orchestration, /字段无法解析、依赖节点不存在或出现环时/);
  assert.match(orchestration, /不降级为无依赖/);
});
