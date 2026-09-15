import {
  DEFAULT_PROPRIETARY_SKILLS,
  isDistributableSkill,
} from './skill-boundaries.js';

function asSet(value) {
  return value instanceof Set ? new Set(value) : new Set(value ?? []);
}

export function resolveSkillNames({ availableNames, mode = 'default', engineering, required }) {
  if (mode !== 'default' && mode !== 'all') {
    throw new Error(`unknown skill selection mode: ${mode}`);
  }

  const available = asSet(availableNames);
  const candidates = mode === 'all'
    ? available
    : new Set([
      ...asSet(engineering),
      ...asSet(required),
      ...DEFAULT_PROPRIETARY_SKILLS,
    ]);

  return [...candidates]
    .filter((name) => available.has(name) && isDistributableSkill(name, available))
    .sort();
}
