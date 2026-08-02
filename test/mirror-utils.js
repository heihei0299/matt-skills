// Shared path-mapping for the template snapshot mirror tests.
//
// template/ is what init copies into target repos. Skill-to-skill references
// are hardcoded .agents/skills/<skill>/ paths (same in both copies), so the
// only remaining mapping is for repo-file references: the template copies
// point at the target-repo layout (.opencode/docs/agents/, .opencode/CONTEXT.md)
// while the workspace copies point at the workspace layout.

export const MAP_SKILL = [
  [/\.\.\/\.\.\/\.\.\/\.opencode\/docs\/agents\//g, '../../docs/agents/'],
  [/\.opencode\/docs\/agents\//g, 'docs/agents/'],
  [/\.opencode\/CONTEXT\.md/g, 'CONTEXT.md'],
];

export const MAP_DOCS = [
  [/\.\.\/\.\.\/skills\//g, '../../.agents/skills/'],
  [/\.opencode\/docs\/agents\//g, 'docs/agents/'],
  [/\.opencode\/skills\//g, '.agents/skills/'],
  [/\.opencode\/CONTEXT\.md/g, 'CONTEXT.md'],
];

export const MAP_AGENTS = [
  [/\.opencode\/docs\/agents\//g, 'docs/agents/'],
  [/\.opencode\/CONTEXT\.md/g, 'CONTEXT.md'],
];

export const normalize = (s, map) => map.reduce((acc, [re, to]) => acc.replace(re, to), s);
