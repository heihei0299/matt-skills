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
  assert.ok(skill.split(/\r?\n/).length < 65, 'orchestrator should stay concise');
});

test('grill-to-spec carries its own turn continuity rule', () => {
  assert.match(skill, /回合连续性/);
  assert.match(skill, /Long-Horizon Skill/);
  assert.match(skill, /阶段 ① 达到出口后立即进入阶段 ②/);
  assert.match(skill, /进度汇报.*不是回合终点/);
  assert.match(skill, /不要求用户额外回复“继续”/);
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

test('rules contain only local deltas and delegate spec schema upstream', () => {
  assert.match(skill, /references\/rules\.md/);
  assert.match(rules, /Glossary 增量规则/);
  assert.match(rules, /ADR 增量规则/);
  assert.match(rules, /Spec 增量规则/);
  assert.match(rules, /to-spec.*唯一事实源/s);
  assert.match(rules, /不另造第二套 spec schema/);
  assert.doesNotMatch(rules, /完整七节模板/);
  assert.doesNotMatch(rules, /Problem Statement/);
  assert.doesNotMatch(rules, /As an <actor>/);
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
