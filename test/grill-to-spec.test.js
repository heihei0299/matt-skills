import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Regression tests for the "ADR written without explicit user confirmation"
// hazard. Root cause: the upstream domain-modeling skill only says "offer to
// create" an ADR — nothing mandates a full-draft review + explicit confirmation
// before writing, and the inline CONTEXT.md update habit invites the model to
// treat ADRs like glossary entries. Fix: grill-to-spec (the proprietary
// orchestrator, the only durable place this repo can carry the rule) mandates
// draft → confirm → write, no exceptions. These tests guard against a future
// refactor silently deleting that rule.

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const skillPath = path.join(dir, '.agents', 'skills', 'grill-to-spec', 'SKILL.md');
const tmplPath = path.join(dir, 'template', '.opencode', 'skills', 'grill-to-spec', 'SKILL.md');

const skill = readFileSync(skillPath, 'utf8');

test('SKILL.md mandates explicit user confirmation for ADR writes, no exceptions', () => {
  assert.match(skill, /写入 ADR 必须由用户显式确认/);
  assert.match(skill, /无任何例外/);
  assert.match(skill, /不可撤销/);
});

test('SKILL.md distinguishes ADRs from inline glossary updates', () => {
  assert.match(skill, /ADR 与 glossary 不对称/);
  assert.match(skill, /inline/);
  assert.match(skill, /禁止把 inline 逻辑套用到 ADR/);
});

test('stage ① carries the draft → confirm → write sub-flow', () => {
  assert.match(skill, /ADR 子流转/);
  assert.match(skill, /完整标题\+正文展示给用户审阅/);
  assert.match(skill, /「确认\/写入」才落盘/);
  assert.match(skill, /未确认前不得创建或写入/);
});

test('template mirror stays in sync with the workspace copy', () => {
  assert.equal(readFileSync(tmplPath, 'utf8'), skill);
});

test('产出物表 lists exactly the three deliverables with their format sources', () => {
  assert.match(skill, /## 产出物/);
  assert.match(skill, /\| Glossary \|/);
  assert.match(skill, /\| ADR \|/);
  assert.match(skill, /\| Spec \|/);
  assert.match(skill, /CONTEXT-FORMAT\.md/);
  assert.match(skill, /ADR-FORMAT\.md/);
  assert.match(skill, /Problem Statement \/ Solution \/ User Stories \/ Implementation Decisions \/ Testing Decisions \/ Out of Scope \/ Further Notes/);
});

test('Glossary 守则 aligns with CONTEXT-FORMAT.md', () => {
  assert.match(skill, /零实现细节/);
  assert.match(skill, /WHAT 非 HOW/);
  assert.match(skill, /通用编程概念不收/);
  assert.match(skill, /_Avoid_/);
  assert.match(skill, /懒创建/);
  assert.match(skill, /inline 更新，不批量/);
});

test('ADR 守则 aligns with ADR-FORMAT.md', () => {
  assert.match(skill, /`0001-slug\.md` 顺序递增/);
  assert.match(skill, /扫描最高号 \+1/);
  assert.match(skill, /标题 \+ 1-3 句正文/);
  assert.match(skill, /`docs\/adr\/` 懒创建/);
});

test('Spec 守则 aligns with to-spec template', () => {
  assert.match(skill, /`As an <actor>, I want a <feature>, so that <benefit>`/);
  assert.match(skill, /不含文件路径\/代码片段/);
  assert.match(skill, /注明来源并裁剪至决策部分/);
  assert.match(skill, /既有优先于新建、取最高、理想数量 1/);
  assert.match(skill, /`ready-for-agent`/);
  assert.match(skill, /`Status:` 行记录/);
});

test('stage ② shows the spec draft for user confirmation before publishing', () => {
  assert.match(skill, /展示给用户确认/);
  assert.match(skill, /不新增采访提问/);
  assert.match(skill, /\.scratch\/<feature-slug>\/spec\.md/);
});
