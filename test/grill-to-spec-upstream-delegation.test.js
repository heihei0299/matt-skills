import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = (file) => path.join(dir, file);
const rules = readFileSync(root('.agents/skills/grill-to-spec/references/rules.md'), 'utf8');
const templateRules = readFileSync(root('template/.agents/skills/grill-to-spec/references/rules.md'), 'utf8');

test('grill-to-spec delegates spec shape to upstream to-spec', () => {
  assert.match(rules, /Spec 的结构与字段全部委托 `to-spec`/);
  assert.match(rules, /不维护第二份模板/);
  assert.match(rules, /不复制 `to-spec` 的章节清单/);
  assert.doesNotMatch(rules, /Problem Statement\s*\/\s*Solution\s*\/\s*User Stories/);
  assert.doesNotMatch(rules, /As an <actor>, I want a <feature>/);
});

test('grill-to-spec local rules mirror stays exact', () => {
  assert.equal(templateRules, rules);
});
