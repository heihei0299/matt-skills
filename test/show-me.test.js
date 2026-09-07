import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(path.join(dir, file), 'utf8');

const skill = read('.agents/skills/show-me/SKILL.md');
const templateSkill = read('template/.agents/skills/show-me/SKILL.md');

test('show-me is a read-only real-evidence display skill', () => {
  assert.match(skill, /只读展示/);
  assert.match(skill, /不要修改源码、测试或配置/);
  assert.match(skill, /优先实际运行/);
  assert.match(skill, /git status/);
  assert.match(skill, /未完成真实运行验证/);
});

test('show-me defines a compact reproducible report', () => {
  for (const field of ['展示方式', '实际执行的命令\/入口', '实际可见结果', '产物或 URL', '未验证项与限制']) {
    assert.match(skill, new RegExp(field));
  }
  assert.match(skill, /不默认写报告文件/);
  assert.match(skill, /清理本次创建的资源/);
});

test('show-me template mirror stays exact', () => {
  assert.equal(templateSkill, skill);
});
