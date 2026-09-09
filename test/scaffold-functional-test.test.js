import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = (file) => path.join(dir, file);
const skillPath = root('.agents/skills/scaffold-functional-test/SKILL.md');
const schemaPath = root('.agents/skills/scaffold-functional-test/references/schema.md');
const yamlPath = root('.agents/skills/scaffold-functional-test/agents/openai.yaml');
const templateSkillPath = root('template/.agents/skills/scaffold-functional-test/SKILL.md');
const templateSchemaPath = root('template/.agents/skills/scaffold-functional-test/references/schema.md');
const templateSyncPath = root('test/template-sync.test.js');
const proprietaryConfig = JSON.parse(readFileSync(root('config/proprietary.json'), 'utf8'));
const skill = readFileSync(skillPath, 'utf8');
const schema = readFileSync(schemaPath, 'utf8');

test('scaffold-functional-test skill and schema exist in workspace and template', () => {
  for (const file of [skillPath, schemaPath, yamlPath, templateSkillPath, templateSchemaPath]) {
    assert.ok(existsSync(file), `${file} must exist`);
  }
});

test('scaffold-functional-test keeps a four-step generation flow', () => {
  assert.match(skill, /Scaffold a repo-specific functional-test skill from spec/);
  assert.match(skill, /disable-model-invocation:\s*false/);
  assert.match(skill, /①.*采集/);
  assert.match(skill, /②.*推导并确认/);
  assert.match(skill, /③.*生成或更新/);
  assert.match(skill, /④.*结构验证/);
  assert.match(skill, /确认前不落盘/);
  assert.match(skill, /不默认执行完整实例集/);
  assert.match(skill, /用户明确要求运行实例集/);
});

test('scaffold-functional-test validates generated structure instead of running by default', () => {
  assert.match(skill, /references\/schema\.md/);
  assert.match(skill, /文件存在、schema 字段、实例类型、实例溯源、spec hash/);
  assert.match(skill, /SHA-256/);
  assert.match(skill, /generatedAt/);
  assert.match(skill, /manual/);
  assert.match(skill, /不启动服务/);
  assert.match(skill, /副作用/);
  assert.doesNotMatch(skill, /默认.*PASS m\/n/);
});

test('schema uses common provenance plus type-specific contracts', () => {
  for (const field of ['prompt', 'type', 'source']) {
    assert.match(schema, new RegExp(field));
  }
  for (const type of ['cli', 'http', 'browser', 'file']) {
    assert.match(schema, new RegExp(`type: ${type}`));
  }
  assert.match(schema, /expected exit code/);
  assert.match(schema, /expected status/);
  assert.match(schema, /entrypoint/);
  assert.match(schema, /assertions/);
  assert.match(schema, /expected files\/content/);
  assert.match(schema, /不强行统一成 CLI/);
  assert.match(schema, /SHA-256/);
  assert.match(schema, /ISO 8601/);
  assert.match(schema, /<!-- manual -->/);
});

test('skill captures evidence according to instance type', () => {
  assert.match(skill, /`cli`、`http`、`browser` 或 `file`/);
  assert.match(skill, /HTTP 的 status\/body\/headers/);
  assert.match(skill, /browser 的页面\/DOM\/network\/console/);
  assert.match(skill, /不把所有行为强制降格成 CLI 测试/);
});

test('template-sync keeps the generated scaffold mirror and excludes demo instance skill', () => {
  const syncContent = readFileSync(templateSyncPath, 'utf8');
  assert.ok(proprietaryConfig.distributable.includes('scaffold-functional-test'));
  assert.match(syncContent, /DISTRIBUTABLE_PROPRIETARY_SKILLS/);
  assert.doesNotMatch(syncContent, /'instance-test'/);
});

test('scaffold-functional-test template mirror stays exact', () => {
  assert.equal(readFileSync(templateSkillPath, 'utf8'), skill);
  assert.equal(readFileSync(templateSchemaPath, 'utf8'), schema);
});
