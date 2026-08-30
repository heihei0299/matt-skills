import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = (p) => path.join(dir, p);

const skillPath = root('.agents/skills/instance-test/SKILL.md');
const instancesPath = root('.agents/skills/instance-test/references/instances.md');
const yamlPath = root('.agents/skills/instance-test/agents/openai.yaml');

test('instance-test skill is matt-skills exclusive demo (not generic executor)', () => {
  assert.ok(existsSync(skillPath));
  const content = readFileSync(skillPath, 'utf8');
  assert.match(content, /instance-test/);
  assert.match(content, /disable-model-invocation:\s*true/);
  // must indicate it's the demo for matt-skills
  assert.match(content, /matt-skills 专属/);
  assert.match(content, /示范/);
  // must not be generic template wording
  assert.doesNotMatch(content, /Generic template/);
  // execution semantics retained
  assert.match(content, /mktemp -d/);
  assert.match(content, /PASS m\/n/);
  assert.match(content, /expected vs actual/);
});

test('instance-test openai.yaml is exclusive demo', () => {
  assert.ok(existsSync(yamlPath));
  const yaml = readFileSync(yamlPath, 'utf8');
  assert.match(yaml, /Instance Test/);
});

test('instances.md is derived from sync-merge-update spec with traceability', () => {
  assert.ok(existsSync(instancesPath));
  const content = readFileSync(instancesPath, 'utf8');
  // header fingerprint
  assert.match(content, /spec hash/);
  assert.match(content, /sync-merge-update/);
  assert.match(content, /generatedAt/);
  // traceability
  assert.match(content, /溯源/);
  assert.match(content, /spec\.md/);
  // controlled extension model
  assert.match(content, /type:\s*cli/);
  // covers sync behaviors
  assert.match(content, /sync/);
  assert.match(content, /sync --apply/);
  assert.match(content, /sync --force/);
  assert.match(content, /update.*已合并/);
  // must not be old 6 instances generic
  assert.doesNotMatch(content, /Fresh init/);
  // manual protection
  assert.match(content, /<!-- manual -->/);
});

test('instance-test is not in template (workspace-only demo)', () => {
  assert.ok(!existsSync(root('template/.opencode/skills/instance-test/SKILL.md')));
  assert.ok(!existsSync(root('template/.pi/skills/instance-test/SKILL.md')));
});
