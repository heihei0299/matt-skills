#!/usr/bin/env node
import { cp, readFile, readdir, rm, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
async function copyDirRecursive(src, dest) {
  await mkdir(dest, { recursive: true });
  for (const entry of await readdir(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) await copyDirRecursive(s, d);
    else if (entry.isFile()) await cp(s, d);
  }
}
async function tryCopy(src, dest) { try { await cp(src, dest); } catch {} }
async function tryCopyDir(src, dest) { try { await copyDirRecursive(src, dest); } catch {} }
async function main() {
  await rm(path.join(ROOT, 'template'), { recursive: true, force: true });
  await mkdir(path.join(ROOT, 'template'), { recursive: true });
  // 全量快照：.agents/skills 全部 32 技能（排除本地符号链接与备份）
  const skillsSrc = path.join(ROOT, '.agents/skills');
  const entries = await readdir(skillsSrc, { withFileTypes: true });
  const skills = entries.filter(e => e.isDirectory() && !e.name.endsWith('.bak') && e.name !== 'skill-creator' && e.name !== '.git').map(e => e.name);
  for (const skill of skills) {
    const src = path.join(skillsSrc, skill);
    await copyDirRecursive(src, path.join(ROOT, 'template/.agents/skills', skill));
  }
  // harness 技能目录保留空占位，供项目自定义技能使用
  await mkdir(path.join(ROOT, 'template/.pi/skills'), { recursive: true });
  await mkdir(path.join(ROOT, 'template/.opencode/skills'), { recursive: true });
  // 空目录占位，避免 git 忽略空目录
  await writeFile(path.join(ROOT, 'template/.pi/skills/.gitkeep'), '');
  await writeFile(path.join(ROOT, 'template/.opencode/skills/.gitkeep'), '');
  // 说明文件：供项目自定义技能
  await writeFile(path.join(ROOT, 'template/.pi/skills/README.md'), '# 项目技能（pi）\n\n此目录用于存放项目自定义技能（project-local skills）。\n共享技能（上游 + 独有）统一在 `.agents/skills/`。\n');
  await writeFile(path.join(ROOT, 'template/.opencode/skills/README.md'), '# 项目技能（opencode）\n\n此目录用于存放项目自定义技能（project-local skills）。\n共享技能（上游 + 独有）统一在 `.agents/skills/`。\n');
  await copyDirRecursive(path.join(ROOT, '.opencode/agents'), path.join(ROOT, 'template/.opencode/agents'));
  await copyDirRecursive(path.join(ROOT, '.opencode/commands'), path.join(ROOT, 'template/.opencode/commands'));
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
  // 根级 opencode.jsonc 透传到模板（若存在），供 target 直接使用；同时确保 template/.opencode/opencode.jsonc 指向 .agents/skills
  // opencode 通过 .opencode 配置发现技能，统一源为 ../.agents/skills，已在文档说明；此处不强写 config，保持最小变更
  console.log('template built: all', skills.length, 'skills to template/.agents/skills');
}
main().catch((e) => { console.error(e); process.exit(1); });
