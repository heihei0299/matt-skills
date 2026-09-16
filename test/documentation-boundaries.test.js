import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => readFileSync(path.join(ROOT, relative), 'utf8');

const README = read('README.md');
const CONTEXT = read('CONTEXT.md');
const TEMPLATE_OPENCODE_CONTEXT = read('template/.opencode/CONTEXT.md');
const TEMPLATE_PI_CONTEXT = read('template/.pi/CONTEXT.md');
const SKILL_DESIGN = read('docs/agents/skill-design.md');
const RUNTIME = read('docs/agents/runtime-discipline.md');
const TEMPLATE_OPENCODE_SKILL_DESIGN = read('template/.opencode/docs/agents/skill-design.md');
const TEMPLATE_PI_SKILL_DESIGN = read('template/.pi/docs/agents/skill-design.md');
const TEMPLATE_OPENCODE_RUNTIME = read('template/.opencode/docs/agents/runtime-discipline.md');
const TEMPLATE_PI_RUNTIME = read('template/.pi/docs/agents/runtime-discipline.md');
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

test('CONTEXT is repository vocabulary only and mirrors into both harness templates', () => {
  assert.match(CONTEXT, /repo-local/i);
  assert.match(CONTEXT, /distributable|可分发/i);
  assert.doesNotMatch(CONTEXT, /## Skill Design|BASE_HEAD|references\/stages\.md|Turn Continuity|Progress Chunking/);
  assert.equal(TEMPLATE_OPENCODE_CONTEXT, CONTEXT);
  assert.equal(TEMPLATE_PI_CONTEXT, CONTEXT);
});

test('deprecated skill-design no longer owns runtime policy', () => {
  assert.match(SKILL_DESIGN, /Deprecated/);
  assert.match(SKILL_DESIGN, /not.*normative rule source/i);
  assert.doesNotMatch(SKILL_DESIGN, /BASE_HEAD|references\/stages\.md|Turn Continuity|Progress Chunking|Git History Preservation/);
  assert.equal(TEMPLATE_OPENCODE_SKILL_DESIGN, SKILL_DESIGN);
  assert.equal(TEMPLATE_PI_SKILL_DESIGN, SKILL_DESIGN);
});

test('runtime discipline delegates policy to AGENTS and owning skills', () => {
  assert.match(RUNTIME, /active project `AGENTS\.md`/);
  assert.match(RUNTIME, /skill owns only its own lifecycle/);
  assert.doesNotMatch(RUNTIME, /BASE_HEAD|references\/stages\.md|Turn Continuity|Progress Chunking|Git History Preservation/);
  assert.equal(TEMPLATE_OPENCODE_RUNTIME, RUNTIME);
  assert.equal(TEMPLATE_PI_RUNTIME, RUNTIME);
});
