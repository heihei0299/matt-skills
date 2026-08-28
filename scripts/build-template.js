#!/usr/bin/env node
import { cp, readFile, readdir, rm, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROPRIETARY = JSON.parse(await readFile(path.join(ROOT, 'config/proprietary.json'), 'utf8'));
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
  for (const skill of PROPRIETARY) {
    const src = path.join(ROOT, '.agents/skills', skill);
    await copyDirRecursive(src, path.join(ROOT, 'template/.opencode/skills', skill));
    await copyDirRecursive(src, path.join(ROOT, 'template/.pi/skills', skill));
  }
  await copyDirRecursive(path.join(ROOT, '.opencode/agents'), path.join(ROOT, 'template/.opencode/agents'));
  await copyDirRecursive(path.join(ROOT, '.opencode/commands'), path.join(ROOT, 'template/.opencode/commands'));
  for (const name of ['.gitignore', 'package.json', 'package-lock.json']) {
    await tryCopy(path.join(ROOT, '.opencode', name), path.join(ROOT, 'template/.opencode', name));
  }
  await tryCopy(path.join(ROOT, '.pi/prompts/issue-audit.md'), path.join(ROOT, 'template/.pi/prompts/issue-audit.md'));
  // .pi/agents is a copy of .opencode/agents for pi distribution (historical)
  await tryCopyDir(path.join(ROOT, '.opencode/agents'), path.join(ROOT, 'template/.pi/agents'));
  await cp(path.join(ROOT, 'AGENTS.md'), path.join(ROOT, 'template/AGENTS.md'));
  await cp(path.join(ROOT, 'CONTEXT.md'), path.join(ROOT, 'template/.opencode/CONTEXT.md'));
  await copyDirRecursive(path.join(ROOT, 'docs/agents'), path.join(ROOT, 'template/.opencode/docs/agents'));
  await copyDirRecursive(path.join(ROOT, 'docs/agents'), path.join(ROOT, 'template/.pi/docs/agents'));
  console.log('template built: proprietary', PROPRIETARY.length, 'skills');
}
main().catch((e) => { console.error(e); process.exit(1); });
