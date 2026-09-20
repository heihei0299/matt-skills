import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(path.join(dir, file), 'utf8');

const agents = read('AGENTS.md');
const templateAgents = read('template/AGENTS.md');
const project = read('PROJECT.md');
const grillToSpec = read('.agents/skills/grill-to-spec/SKILL.md');

test('workspace keeps its personal development route', () => {
  assert.match(agents, /需求对齐 \/ 模糊设计 → `grill-to-spec`/);
  assert.match(agents, /行为变更 → `tdd`/);
  assert.match(agents, /Review → `code-review`/);
  assert.match(agents, /提交前检查 → 显式 `commit-check`/);
});

test('template keeps a short entry with a centrally managed route block', () => {
  assert.match(templateAgents, /^# Agent Entry/m);
  assert.match(templateAgents, /matt-skills:managed:start/);
  assert.match(templateAgents, /需求对齐 → Spec → 版本化到 `docs\/specs\/<slug>\.md` →（用户确认后）Tickets → `tdd` → `code-review` → 验收/);
  assert.match(templateAgents, /`commit-check` 仅在用户明确要求 commit 时使用/);
  assert.match(templateAgents, /matt-skills:managed:end/);
  assert.doesNotMatch(templateAgents, /## Context \/ CodeGraph|## Validation|## Security|## Git/);
  assert.doesNotMatch(templateAgents, /`implement`/);
});

test('template route preserves explicit ticket confirmation and local project context', () => {
  assert.match(templateAgents, /to-tickets/);
  assert.match(templateAgents, /用户确认/);
  assert.match(templateAgents, /PROJECT\.md/);
  assert.match(templateAgents, /CONTEXT\.md/);
  assert.match(templateAgents, /未命中 skill 时直接执行/);
});


test('accepted Specs are versioned before tracker publication', () => {
  for (const content of [agents, project, templateAgents, grillToSpec]) {
    assert.match(content, /docs\/specs\/<slug>\.md/);
  }
  assert.match(agents, /发布.*ticket|ticket.*引用/);
  assert.match(templateAgents, /发布.*ticket|ticket.*引用/);
  assert.match(grillToSpec, /先.*docs\/specs\/<slug>\.md.*再.*(?:issue|ticket)/s);
  assert.match(grillToSpec, /(?:issue|ticket).*引用.*docs\/specs\/<slug>\.md/s);
});

test('direct to-spec route persists the accepted Spec without changing upstream semantics', () => {
  assert.match(agents, /已有共识 → `to-spec`.*docs\/specs\/<slug>\.md/s);
  assert.match(templateAgents, /已有共识 → `to-spec`.*docs\/specs\/<slug>\.md/s);
  assert.match(project, /上游 `to-spec` 原义保持不变/);
  assert.match(grillToSpec, /不创建空的 `docs\/specs` 目录/);
});
