#!/usr/bin/env node
import { cp, readdir, rm, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isRepoLocalSkill } from '../bin/skill-boundaries.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function copyDirRecursive(src, dest, filter = () => true) {
  if (!filter(src)) return;
  await mkdir(dest, { recursive: true });
  for (const entry of await readdir(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (!filter(s)) continue;
    if (entry.isDirectory()) await copyDirRecursive(s, d, filter);
    else if (entry.isFile()) await cp(s, d);
  }
}

async function tryCopy(src, dest) {
  try { await cp(src, dest); } catch {}
}

async function tryCopyDir(src, dest) {
  try { await copyDirRecursive(src, dest); } catch {}
}

async function main() {
  await rm(path.join(ROOT, 'template'), { recursive: true, force: true });
  await mkdir(path.join(ROOT, 'template'), { recursive: true });
  // Distribution snapshot: workspace skills minus repo-local skills.
  const skillsSrc = path.join(ROOT, '.agents/skills');
  const entries = await readdir(skillsSrc, { withFileTypes: true });
  const skills = entries
    .filter((entry) => entry.isDirectory())
    .filter((entry) => !entry.name.endsWith('.bak'))
    .filter((entry) => entry.name !== 'skill-creator' && entry.name !== '.git')
    .filter((entry) => !isRepoLocalSkill(entry.name))
    .map((entry) => entry.name);
  for (const skill of skills) {
    const src = path.join(skillsSrc, skill);
    await copyDirRecursive(src, path.join(ROOT, 'template/.agents/skills', skill));
  }

  // Harness skill dirs remain empty placeholders for project-local custom skills.
  await mkdir(path.join(ROOT, 'template/.pi/skills'), { recursive: true });
  await mkdir(path.join(ROOT, 'template/.opencode/skills'), { recursive: true });
  await writeFile(path.join(ROOT, 'template/.pi/skills/.gitkeep'), '');
  await writeFile(path.join(ROOT, 'template/.opencode/skills/.gitkeep'), '');
  await writeFile(
    path.join(ROOT, 'template/.pi/skills/README.md'),
    '# 项目技能（pi）\n\n此目录用于存放项目自定义技能（project-local skills）。\n共享技能统一在 `.agents/skills/`。\n',
  );
  await writeFile(
    path.join(ROOT, 'template/.opencode/skills/README.md'),
    '# 项目技能（opencode）\n\n此目录用于存放项目自定义技能（project-local skills）。\n共享技能统一在 `.agents/skills/`。\n',
  );

  await copyDirRecursive(path.join(ROOT, '.opencode/agents'), path.join(ROOT, 'template/.opencode/agents'));
  await copyDirRecursive(
    path.join(ROOT, '.opencode/commands'),
    path.join(ROOT, 'template/.opencode/commands'),
    (source) => path.basename(source) !== 'commit-check.md',
  );
  for (const name of ['.gitignore', 'package.json', 'package-lock.json']) {
    await tryCopy(path.join(ROOT, '.opencode', name), path.join(ROOT, 'template/.opencode', name));
  }
  await tryCopy(path.join(ROOT, '.pi/prompts/issue-audit.md'), path.join(ROOT, 'template/.pi/prompts/issue-audit.md'));
  await tryCopyDir(path.join(ROOT, '.opencode/agents'), path.join(ROOT, 'template/.pi/agents'));
  await cp(path.join(ROOT, 'AGENTS.md'), path.join(ROOT, 'template/AGENTS.md'));
  await cp(path.join(ROOT, 'CONTEXT.md'), path.join(ROOT, 'template/.opencode/CONTEXT.md'));
  await cp(path.join(ROOT, 'CONTEXT.md'), path.join(ROOT, 'template/.pi/CONTEXT.md'));
  await copyDirRecursive(path.join(ROOT, 'docs/agents'), path.join(ROOT, 'template/.opencode/docs/agents'));
  await copyDirRecursive(path.join(ROOT, 'docs/agents'), path.join(ROOT, 'template/.pi/docs/agents'));
  console.log('template built: distributable', skills.length, 'skills to template/.agents/skills');
}

main().catch((error) => { console.error(error); process.exit(1); });
