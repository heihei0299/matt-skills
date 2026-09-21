import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeManagedAgents, syncManagedAgents } from './agents.js';
import { pathExists, sameTree } from './filesystem.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const TEMPLATE_DIR = path.join(ROOT, 'template');
const DRY_RUN_PATHS = ['AGENTS.md', 'AGENTS.md.bak', '.opencode', '.pi', '.agents/skills', '.claude/skills'];

function shouldCopyTemplatePath(src) {
  const relative = path.relative(TEMPLATE_DIR, src);
  const parts = relative.split(path.sep);
  return !(parts[0] === '.agents' && parts[1] === 'skills');
}

export async function copyTemplate(target) {
  await cp(TEMPLATE_DIR, target, {
    recursive: true,
    force: true,
    filter: shouldCopyTemplatePath,
  });
}

export async function copyDryRunInputs(target, stage) {
  for (const relative of DRY_RUN_PATHS) {
    const source = path.join(target, relative);
    if (!await pathExists(source)) continue;
    const destination = path.join(stage, relative);
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(source, destination, { recursive: true, force: true });
  }
}

export async function compareDryRunTrees(target, stage) {
  const result = { added: [], updated: [], removed: [] };
  for (const relative of DRY_RUN_PATHS) {
    const before = path.join(target, relative);
    const after = path.join(stage, relative);
    const beforeExists = await pathExists(before);
    const afterExists = await pathExists(after);
    if (!beforeExists && afterExists) result.added.push(relative);
    else if (beforeExists && !afterExists) result.removed.push(relative);
    else if (beforeExists && afterExists && !await sameTree(before, after)) result.updated.push(relative);
  }
  return result;
}

export function formatTargetComparison({ target, result, onlyProgramming, refreshAgents }) {
  const lines = [
    `目标: ${target}`,
    `范围: ${onlyProgramming ? '默认 workflow' : '全部可分发'}${refreshAgents ? '；刷新 AGENTS.md' : ''}`,
    '',
  ];
  const totalDiff = result.added.length + result.updated.length + result.removed.length;
  if (totalDiff === 0) {
    lines.push('✅ 无需更新');
    return lines.join('\n');
  }
  if (result.added.length) lines.push(`新增 (${result.added.length}): ${result.added.join(', ')}`);
  if (result.updated.length) lines.push(`更新 (${result.updated.length}): ${result.updated.join(', ')}`);
  if (result.removed.length) lines.push(`删除 (${result.removed.length}): ${result.removed.join(', ')}`);
  return lines.join('\n');
}

export async function refreshAgentsFile(targetFile) {
  const templateFile = path.join(TEMPLATE_DIR, 'AGENTS.md');
  const current = await readFile(targetFile, 'utf8');
  const template = await readFile(templateFile, 'utf8');
  const merged = mergeManagedAgents(current, template);
  if (merged !== null) {
    if (merged !== current) await writeFile(targetFile, merged);
    return 'managed';
  }
  await cp(targetFile, `${targetFile}.bak`, { force: true });
  await cp(templateFile, targetFile, { force: true });
  return 'full';
}

export async function syncTemplate({ target, refreshAgents }) {
  const marker = path.join(target, 'AGENTS.md');
  if (!(await pathExists(marker))) {
    await copyTemplate(target);
    return { initialized: true, agentsManaged: false, agentsRefreshed: false, agentsRefreshMode: null };
  }

  let agentsManaged = false;
  let agentsRefreshed = false;
  let agentsRefreshMode = null;
  if (refreshAgents) {
    agentsRefreshMode = await refreshAgentsFile(marker);
    agentsRefreshed = true;
  } else {
    try {
      agentsManaged = await syncManagedAgents(marker, path.join(TEMPLATE_DIR, 'AGENTS.md'));
    } catch {}
  }
  await cp(path.join(TEMPLATE_DIR, '.opencode'), path.join(target, '.opencode'), { recursive: true, force: true });
  await cp(path.join(TEMPLATE_DIR, '.pi'), path.join(target, '.pi'), { recursive: true, force: true });
  return { initialized: false, agentsManaged, agentsRefreshed, agentsRefreshMode };
}
