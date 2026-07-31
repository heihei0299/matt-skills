# 01 — 包骨架与 list 命令

**What to build:** 仓库可以作为 npm 包 `@heihei0299/matt-skills` 发布的最小骨架；运行 `npx @heihei0299/matt-skills list`（本地即 `node bin/cli.js list`）能列出包内全部 24 个技能。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] 仓库根新增 `package.json`：`name: @heihei0299/matt-skills`、`version: 0.1.0`、`type: module`、`engines.node >= 18`、`bin: { "matt-skills": "bin/cli.js" }`、`files: ["skills/", "bin/", "README.md"]`、`publishConfig.access: public`、运行时依赖仅 `prompts`
- [ ] 新增 `bin/cli.js`（ESM + shebang）：无参数/`--help` 打印帮助；`list` 子命令枚举 `skills/` 下含 `SKILL.md` 的目录，读取 frontmatter 展示 name 与 description
- [ ] 新增 `.gitignore`（`node_modules/`）
- [ ] `node bin/cli.js list` 输出 24 个技能
- [ ] `npm pack --dry-run` 确认 tarball 含 `skills/` 与 `bin/`
