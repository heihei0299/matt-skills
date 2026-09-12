import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAP_SKILL, MAP_DOCS, MAP_AGENTS, normalize } from './mirror-utils.js';
import {
  PROPRIETARY_SKILLS,
  DISTRIBUTABLE_PROPRIETARY_SKILLS,
  REPO_LOCAL_SKILLS,
} from '../bin/skill-boundaries.js';

// Guard the template snapshot: template/ is what init copies into target
// repos. The workspace mirrors into template/ with a path mapping (skills
// singular source, discipline docs and glossary land under .opencode/.pi,
// AGENTS.md at the top level), so the mirror checks normalize the template
// copies back to workspace paths before comparing. Edit the workspace, then re-sync.

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = (p) => path.join(dir, p);

const DOC_AGENTS = ['domain.md', 'issue-tracker.md', 'runtime-discipline.md', 'skill-design.md', 'triage-labels.md'];

// Template ships the distributable skill set; repo-local skills stay in the workspace only.
const WORKSPACE_SKILLS = readdirSync(root('.agents/skills'))
  .filter(n => !n.endsWith('.bak') && n !== 'skill-creator' && n !== '.git')
  .sort();
const DISTRIBUTABLE_SKILLS = WORKSPACE_SKILLS.filter((name) => !REPO_LOCAL_SKILLS.has(name));

function readDirRecursive(dirPath) {
  const out = [];
  for (const entry of readdirSync(dirPath)) {
    const full = path.join(dirPath, entry);
    if (statSync(full).isDirectory()) out.push(...readDirRecursive(full));
    else out.push(full);
  }
  return out.sort();
}

test('template/.agents/skills mirrors distributable .agents/skills (single source)', () => {
  const tmplSkills = readdirSync(root('template/.agents/skills')).sort();
  assert.deepEqual(tmplSkills, DISTRIBUTABLE_SKILLS, 'template/.agents/skills listing out of sync');
  for (const skill of DISTRIBUTABLE_SKILLS) {
    const wsFiles = readDirRecursive(root(path.join('.agents/skills', skill)));
    const tmplFiles = readDirRecursive(root(path.join('template/.agents/skills', skill)));
    assert.deepEqual(
      tmplFiles.map((f) => path.relative(root(path.join('template/.agents/skills', skill)), f)),
      wsFiles.map((f) => path.relative(root(path.join('.agents/skills', skill)), f)),
      `template/.agents/skills/${skill} file listing out of sync`,
    );
    for (const f of wsFiles) {
      const rel = path.relative(root(path.join('.agents/skills', skill)), f);
      assert.equal(
        normalize(readFileSync(root(path.join('template/.agents/skills', skill, rel)), 'utf8'), MAP_SKILL),
        readFileSync(f, 'utf8'),
        `template/.agents/skills/${skill}/${rel} out of sync`,
      );
    }
  }
});

test('template/.agents/skills carries distributable proprietary and excludes repo-local', () => {
  const tmplSkills = readdirSync(root('template/.agents/skills')).sort();
  assert.deepEqual(tmplSkills, DISTRIBUTABLE_SKILLS, 'template/.agents/skills should contain only distributable skills');
  for (const name of DISTRIBUTABLE_PROPRIETARY_SKILLS) {
    assert.ok(tmplSkills.includes(name), `distributable proprietary ${name} missing in template/.agents/skills`);
  }
  for (const name of REPO_LOCAL_SKILLS) {
    assert.equal(tmplSkills.includes(name), false, `repo-local ${name} must not be in template/.agents/skills`);
  }
  const upstream = WORKSPACE_SKILLS.filter((name) => !PROPRIETARY_SKILLS.has(name));
  assert.ok(upstream.length >= 20, 'expected many upstream skills in template');
  for (const name of upstream.slice(0, 3)) {
    assert.ok(tmplSkills.includes(name), `upstream ${name} missing in template/.agents/skills`);
  }
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

const COMMANDS_DIR = 'commands';

test('template/.opencode/agents carries issue-audit in sync', () => {
  assert.equal(
    normalize(readFileSync(root('template/.opencode/agents/issue-audit.md'), 'utf8'), MAP_AGENTS),
    readFileSync(root('.opencode/agents/issue-audit.md'), 'utf8'),
    'template/.opencode/agents/issue-audit.md out of sync',
  );
});

test('template/.opencode/commands mirrors distributable commands in sync', () => {
  const wsCommands = readdirSync(root('.opencode/commands'))
    .filter((name) => name !== 'commit-check.md')
    .sort();
  const tmplCommands = readdirSync(root('template/.opencode/commands')).sort();
  assert.deepEqual(tmplCommands, wsCommands, 'command file listing out of sync');
  for (const f of wsCommands) {
    assert.equal(
      normalize(readFileSync(root(path.join('template/.opencode', COMMANDS_DIR, f)), 'utf8'), MAP_AGENTS),
      readFileSync(root(path.join('.opencode', COMMANDS_DIR, f)), 'utf8'),
      `template/.opencode/${COMMANDS_DIR}/${f} out of sync`,
    );
  }
});

test('template/.pi/prompts carries the pi issue-audit command in sync', () => {
  const piPrompt = readFileSync(root('template/.pi/prompts/issue-audit.md'), 'utf8');
  const wsPrompt = readFileSync(root('.pi/prompts/issue-audit.md'), 'utf8');
  assert.equal(piPrompt, wsPrompt, 'template/.pi/prompts/issue-audit.md out of sync');
  const ocCommand = readFileSync(root('.opencode/commands/issue-audit.md'), 'utf8');
  assert.doesNotMatch(piPrompt, /^agent: /m, 'pi prompt must not carry subagent frontmatter');
  assert.doesNotMatch(piPrompt, /^subtask: /m, 'pi prompt must not carry subtask frontmatter');
  assert.match(piPrompt, /^argument-hint: /m, 'pi prompt should advertise its argument');
  assert.match(piPrompt, /\$ARGUMENTS/, 'pi prompt keeps the argument placeholder');
  assert.doesNotMatch(piPrompt, /subagent 内不执行/, 'subagent wording is pi-incompatible');
  assert.match(ocCommand, /^agent: /m, 'opencode source keeps its subagent delegation');
});

test('template/AGENTS.md mirrors root AGENTS.md except intentional template omissions', () => {
  const expected = readFileSync(root('AGENTS.md'), 'utf8')
    .replace('* bug / 异常 / 性能 → `diagnose-fix`\n', '')
    .replace('* 优先于 `Read`、`grep`、`rg`、`find` 和代码探索子代理。\n', '');
  assert.equal(
    normalize(readFileSync(root('template/AGENTS.md'), 'utf8'), MAP_AGENTS),
    expected,
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

test('template/ carries exactly the inheritable items', () => {
  const entries = readdirSync(root('template')).sort();
  assert.deepEqual(entries, ['.agents', '.opencode', '.pi', 'AGENTS.md']);
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
      // .agents/skills 内的相对链接在模板中实际文档位于 .opencode/.pi，需回退检查
      if (!existsSync(target) && f.includes('template/.agents/skills')) {
        const alt1 = target.replace('/template/docs/', '/template/.opencode/docs/');
        const alt2 = target.replace('/template/docs/', '/template/.pi/docs/');
        const alt3 = target.replace('/template/.agents/docs/', '/template/.opencode/docs/');
        if (existsSync(alt1)) target = alt1;
        else if (existsSync(alt2)) target = alt2;
        else if (existsSync(alt3)) target = alt3;
        else {
          // 也可能是 CONTEXT.md 位于 .opencode/.pi
          const alt4 = target.replace('/template/CONTEXT.md', '/template/.opencode/CONTEXT.md');
          const alt5 = target.replace('/template/CONTEXT.md', '/template/.pi/CONTEXT.md');
          if (existsSync(alt4)) target = alt4;
          else if (existsSync(alt5)) target = alt5;
        }
      }
      assert.ok(existsSync(target) && statSync(target).isFile(), `broken link in ${path.relative(dir, f)}: ${href} -> ${target}`);
    }
  }
});
