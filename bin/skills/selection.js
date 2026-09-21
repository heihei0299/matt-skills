import { isDistributableSkill } from './boundaries.js';

function asSet(value) {
  return value instanceof Set ? new Set(value) : new Set(value ?? []);
}

export function resolveSkillNames({ availableNames, mode = 'default', defaults }) {
  if (mode !== 'default' && mode !== 'all') {
    throw new Error(`unknown skill selection mode: ${mode}`);
  }

  const available = asSet(availableNames);
  const candidates = mode === 'all' ? available : asSet(defaults);

  return [...candidates]
    .filter((name) => available.has(name) && isDistributableSkill(name, available))
    .sort();
}
