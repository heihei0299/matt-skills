import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAP_SKILL, MAP_DOCS, MAP_AGENTS, normalize } from './mirror-utils.js';

// Guard the template snapshot: template/ is what init copies into target
// repos. The workspace mirrors into template/ with a path mapping (skills
// singular source, discipline docs and glossary land under .opencode/.pi,
// AGENTS.md at the top level), so the mirror checks normalize the template
// copies back to workspace paths before comparing. Edit the workspace, then re-sync.

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = (p) => path.join(dir, p);

const DOC_AGENTS = ['domain.md', 'issue-tracker.md', 'runtime-discipline.md', 'skill-design.md', 'triage-labels.md'];

// Config-repo positioning: template/ ships ALL skills via .agents/skills (single source)
// Upstream + proprietary together (32). Harness skill dirs .pi/skills / .opencode/skills
// are empty placeholders for project-local custom skills.
const ALL_SKILLS = readdirSync(root('.agents/skills')).filter(n => !n.endsWith('.bak') && n !== 'skill-creator' && n !== '.git').sort();
const PROPRIETARY_SKILLS = ['ci-guard', 'tdd-implement', 'grill-to-spec', 'diagnose-fix', 'commit-check', 'scaffold-functional-test'];

function readDirRecursive(dirPath) {
  const out = [];
  for (const entry of readdirSync(dirPath)) {
    const full = path.join(dirPath, entry);
    if (statSync(full).isDirectory()) out.push(...readDirRecursive(full));
    else out.push(full);
  }
  return out.sort();
}

test('template/.agents/skills mirrors .agents/skills fully (single source)', () => {
  const wsSkills = readdirSync(root('.agents/skills')).filter(n => !n.endsWith('.bak') && n !== 'skill-creator').sort();
  const tmplSkills = readdirSync(root('template/.agents/skills')).sort();
  assert.deepEqual(tmplSkills, wsSkills.filter(n => n !== '.git').sort(), 'template/.agents/skills listing out of sync');
  for (const skill of wsSkills) {
    if (skill === '.git' || skill.endsWith('.bak') || skill === 'skill-creator') continue;
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

test('template/.agents/skills carries both upstream and proprietary (full 32)', () => {
  const tmplSkills = readdirSync(root('template/.agents/skills')).sort();
  const wsSkills = readdirSync(root('.agents/skills')).filter(n => !n.endsWith('.bak') && n !== 'skill-creator' && n !== '.git').sort();
  assert.deepEqual(tmplSkills, wsSkills, 'template/.agents/skills should contain all workspace skills');
  for (const p of PROPRIETARY_SKILLS) {
    assert.ok(tmplSkills.includes(p), `proprietary ${p} missing in template/.agents/skills`);
  }
  const upstream = wsSkills.filter(n => !PROPRIETARY_SKILLS.includes(n));
  assert.ok(upstream.length >= 20, 'expected many upstream skills in template');
  for (const u of upstream.slice(0,3)) {
    assert.ok(tmplSkills.includes(u), `upstream ${u} missing in template/.agents/skills`);
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

test('template/.opencode/commands mirrors all commands in sync', () => {
  const wsCommands = readdirSync(root('.opencode/commands')).sort();
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

test('template/AGENTS.md mirrors the root AGENTS.md (path-mapped)', () => {
  assert.equal(
    normalize(readFileSync(root('template/AGENTS.md'), 'utf8'), MAP_AGENTS),
    readFileSync(root('AGENTS.md'), 'utf8'),
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
