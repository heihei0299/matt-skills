import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAP_DOCS, normalize } from './mirror-utils.js';

// Guard the Template Snapshot skeleton: only content owned by template/ is checked here.

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = (p) => path.join(dir, p);

const DOC_AGENTS = ['domain.md', 'issue-tracker.md', 'runtime-discipline.md', 'skill-design.md', 'triage-labels.md'];

test('template contains no persistent shared Skill mirror', () => {
  assert.equal(existsSync(root('template/.agents')), false);
  assert.ok(readdirSync(root('.agents/skills')).length > 0);
});

test('template harness skill dirs start as empty target placeholders', () => {
  for (const harness of ['template/.pi/skills', 'template/.opencode/skills']) {
    const entries = readdirSync(root(harness));
    assert.ok(entries.includes('.gitkeep'), `${harness} missing .gitkeep`);
    assert.ok(entries.includes('README.md'), `${harness} missing README.md`);
    const skills = entries.filter(e => !['.gitkeep','README.md'].includes(e));
    assert.deepEqual(skills, [], `${harness} should contain no real skills, only placeholders`);
  }
});


test('template harness directories contain only the basic framework', () => {
  for (const rel of [
    'template/.opencode/commands',
    'template/.opencode/agents',
    'template/.pi/agents',
    'template/.pi/prompts',
    'template/.codex',
  ]) {
    assert.equal(existsSync(root(rel)), false, `${rel} should not be distributed`);
  }
});

test('template/AGENTS.md uses the independent template source', () => {
  assert.equal(
    readFileSync(root('template/AGENTS.md'), 'utf8'),
    readFileSync(root('config/template-AGENTS.md'), 'utf8'),
  );
});

test('template/AGENTS.md contains the global-policy delegation and project workflow', () => {
  const agents = readFileSync(root('template/AGENTS.md'), 'utf8');
  assert.match(agents, /^本仓库遵循全局 `AGENTS\.md`；以下规则仅用于具体化本项目工作流，不放宽全局安全、授权或运行时权限边界。\n/);
  assert.doesNotMatch(agents, /matt-skills:managed|^# AGENTS\.md$|^## Workflow|^## Security|## 路由/m);
  assert.match(agents, /## Context \/ CodeGraph|## Validation|## Git|## Completion/g);
  assert.match(agents, /当前上下文不足且需要新增代码理解证据时，优先使用 `codegraph explore`/);
  assert.match(agents, /项目已有针对当前改动的验证入口时优先使用，不自行创建等价验证流程。/);
  assert.match(agents, /## Completion/);
  assert.doesNotMatch(agents, /其他 → `ask-matt`/);
});


test('template/.opencode/CONTEXT.md mirrors the root CONTEXT.md', () => {
  assert.equal(
    readFileSync(root('template/.opencode/CONTEXT.md'), 'utf8'),
    readFileSync(root('CONTEXT.md'), 'utf8'),
  );
});

test('template/.pi/CONTEXT.md mirrors the root CONTEXT.md', () => {
  assert.equal(
    readFileSync(root('template/.pi/CONTEXT.md'), 'utf8'),
    readFileSync(root('CONTEXT.md'), 'utf8'),
  );
});

test('template/.opencode/docs/agents mirrors the root docs/agents (path-mapped)', () => {
  for (const f of DOC_AGENTS) {
    assert.equal(
      normalize(readFileSync(root(path.join('template/.opencode/docs/agents', f)), 'utf8'), MAP_DOCS),
      readFileSync(root(path.join('docs/agents', f)), 'utf8'),
      `template/.opencode/docs/agents/${f} out of sync`,
    );
  }
});

test('template/.pi/docs/agents mirrors the root docs/agents (path-mapped)', () => {
  for (const f of DOC_AGENTS) {
    assert.equal(
      normalize(readFileSync(root(path.join('template/.pi/docs/agents', f)), 'utf8'), MAP_DOCS),
      readFileSync(root(path.join('docs/agents', f)), 'utf8'),
      `template/.pi/docs/agents/${f} out of sync`,
    );
  }
});

test('template provides a project context placeholder', () => {
  const project = readFileSync(root('template/PROJECT.md'), 'utf8');
  assert.match(project, /项目目标、范围、主要入口和关键约束/);
});

test('template/ carries exactly the inheritable skeleton items', () => {
  const entries = readdirSync(root('template')).sort();
  assert.deepEqual(entries, ['.opencode', '.pi', 'AGENTS.md', 'PROJECT.md']);
});

test('template/ internal markdown links resolve (except upstream skill refs)', () => {
  const mdFiles = [];
  const walk = (p) => {
    for (const entry of readdirSync(p)) {
      const full = path.join(p, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (entry.endsWith('.md')) mdFiles.push(full);
    }
  };
  walk(root('template'));
  const linkRe = /\[[^\]]*\]\(([^)\s]+)\)/g;
  for (const f of mdFiles) {
    const content = readFileSync(f, 'utf8');
    for (const m of content.matchAll(linkRe)) {
      const href = m[1];
      if (/^(https?:|mailto:|#)/.test(href)) continue;
      if (href.startsWith('.agents/')) continue;
      if (href.startsWith('./src/') || href.startsWith('src/') || href.includes('src/ordering') || href.includes('src/billing')) continue; // example paths in CONTEXT-FORMAT.md
      if (href === 'link') continue; // placeholder in wayfinder
      let target = path.resolve(path.dirname(f), decodeURIComponent(href.split('#')[0]));
      assert.ok(existsSync(target) && statSync(target).isFile(), `broken link in ${path.relative(dir, f)}: ${href} -> ${target}`);
    }
  }
});
