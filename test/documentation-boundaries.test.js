import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => readFileSync(path.join(ROOT, relative), 'utf8');

const README = read('README.md');
const CONTEXT = read('CONTEXT.md');
const TEMPLATE_CONTEXT = read('template/.opencode/CONTEXT.md');
const SKILL_DESIGN = read('docs/agents/skill-design.md');
const config = JSON.parse(read('config/proprietary.json'));

test('README documents the proprietary distribution boundary', () => {
  assert.match(README, /7 个独有|proprietary.*7/i);
  const distributableSection = README.match(/### 可分发的 5 个([\s\S]*?)### 仓库内部的 2 个/)?.[1];
  const repoLocalSection = README.match(/### 仓库内部的 2 个([\s\S]*?)## 初始化/)?.[1];
  assert.ok(distributableSection, 'missing distributable proprietary section');
  assert.ok(repoLocalSection, 'missing repo-local proprietary section');
  for (const name of config.distributable) {
    assert.match(distributableSection, new RegExp(name));
    assert.doesNotMatch(repoLocalSection, new RegExp(name));
  }
  for (const name of config.repoLocal) {
    assert.match(repoLocalSection, new RegExp(name));
    assert.doesNotMatch(distributableSection, new RegExp(name));
  }
  assert.match(README, /默认 programming 范围中的 4 个独有/);
  for (const name of config.default) assert.match(README, new RegExp(name));
  assert.match(README, /不会.*(init|install|sync).*分发|不.*分发.*用户项目/s);
  assert.doesNotMatch(README, /独有 6|全量 32|全量 33|默认.*26/);
});

test('CONTEXT distinguishes workspace and distributable template', () => {
  assert.match(CONTEXT, /repo-local/);
  assert.match(CONTEXT, /never distributed|永远不.*分发/);
  assert.match(CONTEXT, /distributable|可分发/);
  assert.doesNotMatch(CONTEXT, /full 32|ALL skills already included|All 32 skills/);
  assert.equal(TEMPLATE_CONTEXT, CONTEXT);
});

test('public skill-design docs do not link template users to repo-local commit-check', () => {
  assert.doesNotMatch(SKILL_DESIGN, /\.agents\/skills\/commit-check\/SKILL\.md/);
  assert.match(SKILL_DESIGN, /workspace-only|workspace.*only|不.*template/);
});
