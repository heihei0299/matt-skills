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

test('template harness skill dirs are empty placeholders (project custom only)', () => {
  for (const harness of ['template/.pi/skills', 'template/.opencode/skills']) {
    const entries = readdirSync(root(harness));
    assert.ok(entries.includes('.gitkeep'), `${harness} missing .gitkeep`);
    assert.ok(entries.includes('README.md'), `${harness} missing README.md`);
    const skills = entries.filter(e => !['.gitkeep','README.md'].includes(e));
    assert.deepEqual(skills, [], `${harness} should contain no real skills, only placeholders`);
  }
});


test('template issue-audit projection keeps its configuration contract', () => {
  const prompt = readFileSync(root('template/.pi/prompts/issue-audit.md'), 'utf8');
  const agent = readFileSync(root('template/.opencode/agents/issue-audit.md'), 'utf8');
  assert.match(prompt, /^argument-hint: /m);
  assert.match(prompt, /\$ARGUMENTS/);
  assert.doesNotMatch(prompt, /^agent: /m);
  assert.match(agent, /^mode: subagent/m);
  assert.match(agent, /# Issue Auditor/);
});

test('template/AGENTS.md uses the independent template source', () => {
  assert.equal(
    readFileSync(root('template/AGENTS.md'), 'utf8'),
    readFileSync(root('config/template-AGENTS.md'), 'utf8'),
  );
});

test('template/AGENTS.md exposes exactly one managed block', () => {
  const agents = readFileSync(root('template/AGENTS.md'), 'utf8');
  assert.equal((agents.match(/<!-- matt-skills:managed:start -->/g) ?? []).length, 1);
  assert.equal((agents.match(/<!-- matt-skills:managed:end -->/g) ?? []).length, 1);
  assert.ok(
    agents.indexOf('<!-- matt-skills:managed:start -->') < agents.indexOf('<!-- matt-skills:managed:end -->'),
  );
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

test('template provides a project context placeholder referenced by AGENTS.md', () => {
  const agents = readFileSync(root('template/AGENTS.md'), 'utf8');
  const project = readFileSync(root('template/PROJECT.md'), 'utf8');
  assert.match(agents, /PROJECT\.md/);
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
