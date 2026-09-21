import { readFile, writeFile } from 'node:fs/promises';

export const AGENTS_MANAGED_START = '<!-- matt-skills:managed:start -->';
export const AGENTS_MANAGED_END = '<!-- matt-skills:managed:end -->';

export function findManagedBlock(content) {
  const start = content.indexOf(AGENTS_MANAGED_START);
  if (start < 0 || content.indexOf(AGENTS_MANAGED_START, start + AGENTS_MANAGED_START.length) >= 0) return null;
  const endStart = content.indexOf(AGENTS_MANAGED_END, start + AGENTS_MANAGED_START.length);
  if (endStart < 0 || content.indexOf(AGENTS_MANAGED_END, endStart + AGENTS_MANAGED_END.length) >= 0) return null;
  return { start, end: endStart + AGENTS_MANAGED_END.length };
}

export function mergeManagedAgents(current, template) {
  const currentBlock = findManagedBlock(current);
  const templateBlock = findManagedBlock(template);
  if (!currentBlock || !templateBlock) return null;
  const managed = template.slice(templateBlock.start, templateBlock.end);
  return current.slice(0, currentBlock.start) + managed + current.slice(currentBlock.end);
}

export async function syncManagedAgents(targetFile, templateFile) {
  const current = await readFile(targetFile, 'utf8');
  const template = await readFile(templateFile, 'utf8');
  const merged = mergeManagedAgents(current, template);
  if (merged === null) return false;
  if (merged !== current) await writeFile(targetFile, merged);
  return true;
}
