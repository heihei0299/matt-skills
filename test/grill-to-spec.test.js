import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAP_SKILL, normalize } from './mirror-utils.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = (file) => path.join(dir, file);
const skill = readFileSync(root('.agents/skills/grill-to-spec/SKILL.md'), 'utf8');
const rules = readFileSync(root('.agents/skills/grill-to-spec/references/rules.md'), 'utf8');

test('grill-to-spec is a thin upstream orchestrator', () => {
  assert.match(skill, /grill-with-docs/);
  assert.match(skill, /to-spec/);
  assert.match(skill, /只做两个上游 skill 的编排/);
  assert.match(skill, /不写代码、不修改源码或测试/);
  assert.match(skill, /只确认本次 seam|seam 提案/);
  assert.ok(skill.split(/\r?\n/).length < 60, 'orchestrator should stay concise');
});

test('grill-to-spec keeps only its durable confirmation gates', () => {
  assert.match(skill, /ADR 必须先展示完整草稿/);
  assert.match(skill, /用户明确确认后才写入/);
  assert.match(skill, /spec 草稿/);
  assert.match(skill, /一次明确确认/);
  assert.match(skill, /ready-for-agent/);
  assert.doesNotMatch(skill, /完整七节模板/);
  assert.doesNotMatch(skill, /Problem Statement \/ Solution \/ User Stories/);
  assert.doesNotMatch(skill, /\| Glossary \|.*\| ADR \|.*\| Spec \|/s);
});

test('format details stay disclosed in the dedicated reference', () => {
  assert.match(skill, /references\/rules\.md/);
  assert.match(rules, /Glossary/);
  assert.match(rules, /ADR/);
  assert.match(rules, /Spec/);
});

test('grill-to-spec template mirror stays path-mapped and exact', () => {
  assert.equal(
    normalize(readFileSync(root('template/.agents/skills/grill-to-spec/SKILL.md'), 'utf8'), MAP_SKILL),
    skill,
  );
  assert.equal(
    normalize(readFileSync(root('template/.agents/skills/grill-to-spec/references/rules.md'), 'utf8'), MAP_SKILL),
    rules,
  );
});
