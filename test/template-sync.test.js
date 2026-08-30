import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAP_SKILL, MAP_DOCS, MAP_AGENTS, normalize } from './mirror-utils.js';

// Guard the template snapshot: template/ is what init copies into target
// repos. The workspace mirrors into template/ with a path mapping (skills,
// discipline docs and glossary land under .opencode/, AGENTS.md at the top
// level), so the mirror checks normalize the template copies back to
// workspace paths before comparing. Edit the workspace, then re-sync.

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = (p) => path.join(dir, p);

const DOC_AGENTS = ['domain.md', 'issue-tracker.md', 'runtime-discipline.md', 'skill-design.md', 'triage-labels.md'];

// Config-repo positioning: template/ ships config + proprietary skills only.
// The 25 upstream skills (engineering/productivity) are fetched manually into
// target repos per README, so they must NOT be copied into template/.
// tdd-implement, grill-to-spec & diagnose-fix mirror from the workspace
// .agents/skills/; issue-audit ships as a subagent + command (workspace sources
// under .opencode/), not as a skill directory, so it is absent from template skills.
// Each proprietary skill mirrors to BOTH template/.opencode/skills/ (opencode
// distribution) and template/.pi/skills/ (pi standard distribution, auto-discovered
// from .pi/skills/).
const PROPRIETARY_SKILLS = ['tdd-implement', 'grill-to-spec', 'diagnose-fix', 'commit-check', 'scaffold-functional-test'];

function readDirRecursive(dirPath) {
  const out = [];
  for (const entry of readdirSync(dirPath)) {
    const full = path.join(dirPath, entry);
    if (statSync(full).isDirectory()) out.push(...readDirRecursive(full));
    else out.push(full);
  }
  return out.sort();
}

const MIRROR_TARGETS = [
  { name: 'template/.opencode/skills' },
  { name: 'template/.pi/skills' },
];

test('template skills mirror the proprietary skills to both harnesses (path-mapped)', () => {
  for (const skill of PROPRIETARY_SKILLS) {
    for (const target of MIRROR_TARGETS) {
      const wsFiles = readDirRecursive(root(path.join('.agents/skills', skill)));
      const tmplFiles = readDirRecursive(root(path.join(target.name, skill)));
      assert.deepEqual(
        tmplFiles.map((f) => path.relative(root(path.join(target.name, skill)), f)),
        wsFiles.map((f) => path.relative(root(path.join('.agents/skills', skill)), f)),
        `${target.name}/${skill} file listing out of sync`,
      );
      for (const f of wsFiles) {
        const rel = path.relative(root(path.join('.agents/skills', skill)), f);
        assert.equal(
          normalize(readFileSync(root(path.join(target.name, skill, rel)), 'utf8'), MAP_SKILL),
          readFileSync(f, 'utf8'),
          `${target.name}/${skill}/${rel} out of sync`,
        );
      }
    }
  }
});

test('template skills carry no upstream skills (both harness dirs)', () => {
  const wsSkills = readdirSync(root('.agents/skills')).sort();
  for (const target of MIRROR_TARGETS) {
    const tmplSkills = readdirSync(root(path.join(target.name))).sort();
    assert.deepEqual(tmplSkills, [...PROPRIETARY_SKILLS].sort());
    for (const skill of wsSkills) {
      if (PROPRIETARY_SKILLS.includes(skill)) continue;
      assert.ok(
        !tmplSkills.includes(skill),
        `upstream skill ${skill} must not be copied into template/ (fetch it per README instead)`,
      );
    }
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
  // pi has no subagent mechanism: the opencode command (agent/subtask frontmatter
  // + subagent wording) is adapted for pi as a prompt template. Guard both the
  // full equality of the pi copy and the adaptation deltas vs the opencode source.
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

test('template/.opencode/docs/agents mirrors the root docs/agents (path-mapped)', () => {
  for (const f of DOC_AGENTS) {
    assert.equal(
      normalize(readFileSync(root(path.join('template/.opencode/docs/agents', f)), 'utf8'), MAP_DOCS),
      readFileSync(root(path.join('docs/agents', f)), 'utf8'),
      `template/.opencode/docs/agents/${f} out of sync`,
    );
  }
});

// template/.pi follows the pi standard layout (.pi/skills/ auto-discovery) —
// no settings.json in the snapshot anymore, so no mirror assertion for it.

test('template/ carries exactly the inheritable items, nothing else', () => {
  const entries = readdirSync(root('template')).sort();
  assert.deepEqual(entries, ['.opencode', '.pi', 'AGENTS.md']);
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
      if (href.startsWith('.agents/')) continue; // hardcoded upstream skill ref, fetched at init
      const target = path.resolve(path.dirname(f), decodeURIComponent(href.split('#')[0]));
      assert.ok(statSync(target).isFile(), `broken link in ${path.relative(dir, f)}: ${href}`);
    }
  }
});
