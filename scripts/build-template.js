#!/usr/bin/env node
import { cp, readdir, rm, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

async function main() {
  await rm(path.join(ROOT, 'template'), { recursive: true, force: true });
  await mkdir(path.join(ROOT, 'template'), { recursive: true });
  await writeFile(
    path.join(ROOT, 'template/PROJECT.md'),
    '# Project Context\n\n<!-- 请在目标仓库中填写项目目标、范围、主要入口和关键约束。代理操作规则放在 AGENTS.md。 -->\n',
  );
  // Harness skill dirs are initialized as default project skill targets.
  await mkdir(path.join(ROOT, 'template/.pi/skills'), { recursive: true });
  await mkdir(path.join(ROOT, 'template/.opencode/skills'), { recursive: true });
  await writeFile(path.join(ROOT, 'template/.pi/skills/.gitkeep'), '');
  await writeFile(path.join(ROOT, 'template/.opencode/skills/.gitkeep'), '');
  await writeFile(
    path.join(ROOT, 'template/.pi/skills/README.md'),
    '# 项目技能（pi）\n\n此目录用于存放项目 skills（共享或 project-local）。\n共享技能默认在 `.pi/skills/`；同步不会删除额外的项目自定义 skills。\n',
  );
  await writeFile(
    path.join(ROOT, 'template/.opencode/skills/README.md'),
    '# 项目技能（opencode）\n\n此目录用于存放项目 skills（共享或 project-local）。\n共享技能默认在 `.opencode/skills/`；同步不会删除额外的项目自定义 skills。\n',
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
  const issueAuditPrompt = path.join(ROOT, 'template/.pi/prompts/issue-audit.md');
  await mkdir(path.dirname(issueAuditPrompt), { recursive: true });
  await cp(path.join(ROOT, '.pi/prompts/issue-audit.md'), issueAuditPrompt);
  await copyDirRecursive(path.join(ROOT, '.opencode/agents'), path.join(ROOT, 'template/.pi/agents'));
  const templateAgents = await readFile(path.join(ROOT, 'config/template-AGENTS.md'), 'utf8');
  await writeFile(path.join(ROOT, 'template/AGENTS.md'), templateAgents);
  await cp(path.join(ROOT, 'CONTEXT.md'), path.join(ROOT, 'template/.opencode/CONTEXT.md'));
  await cp(path.join(ROOT, 'CONTEXT.md'), path.join(ROOT, 'template/.pi/CONTEXT.md'));
  await copyDirRecursive(path.join(ROOT, 'docs/agents'), path.join(ROOT, 'template/.opencode/docs/agents'));
  await copyDirRecursive(path.join(ROOT, 'docs/agents'), path.join(ROOT, 'template/.pi/docs/agents'));
  console.log('template built: skeleton');
}

main().catch((error) => { console.error(error); process.exit(1); });
