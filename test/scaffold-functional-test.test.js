import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = (p) => path.join(dir, p);

const skillPath = root('.agents/skills/scaffold-functional-test/SKILL.md');
const yamlPath = root('.agents/skills/scaffold-functional-test/agents/openai.yaml');
const tmplAgents = root('template/.agents/skills/scaffold-functional-test/SKILL.md');
const templateSyncPath = root('test/template-sync.test.js');

test('scaffold-functional-test skill exists as proprietary skill', () => {
  assert.ok(existsSync(skillPath), 'workspace skill SKILL.md must exist');
  assert.ok(existsSync(yamlPath), 'agents/openai.yaml must exist');
  assert.ok(existsSync(tmplAgents), 'template .agents mirror must exist');
});

test('scaffold-functional-test SKILL.md carries required metadata and steps', () => {
  const content = readFileSync(skillPath, 'utf8');
  assert.match(content, /scaffold-functional-test/);
  assert.match(content, /Scaffold a repo-specific functional-test skill from spec/);
  assert.match(content, /disable-model-invocation:\s*false/);
  // 4 steps
  assert.match(content, /①.*采集/);
  assert.match(content, /②.*推导/);
  assert.match(content, /③.*脚手架/);
  assert.match(content, /④.*自验证/);
  // mandatory checklist gate
  assert.match(content, /清单确认/);
  assert.match(content, /溯源/);
  assert.match(content, /spec hash/);
  assert.match(content, /<!-- manual -->/);
  assert.match(content, /mktemp -d/);
  assert.match(content, /PASS m\/n/);
  assert.match(content, /--report/);
});

test('scaffold-functional-test is non-long-horizon (lightweight scaffold)', () => {
  const content = readFileSync(skillPath, 'utf8');
  assert.doesNotMatch(content, /Long-Horizon Skill/);
  assert.doesNotMatch(content, /回合连续性/);
  assert.match(content, /非 Long-Horizon/);
});

test('openai.yaml has correct interface for scaffold-functional-test', () => {
  const yaml = readFileSync(yamlPath, 'utf8');
  assert.match(yaml, /display_name/);
  assert.match(yaml, /Scaffold Functional Test/);
});

test('template-sync guards scaffold-functional-test and excludes instance-test', () => {
  const syncContent = readFileSync(templateSyncPath, 'utf8');
  assert.match(syncContent, /scaffold-functional-test/);
  assert.doesNotMatch(syncContent, /'instance-test'/);
  // Proprietary list should contain scaffold-functional-test
  assert.match(syncContent, /PROPRIETARY_SKILLS.*scaffold-functional-test/s);
});
