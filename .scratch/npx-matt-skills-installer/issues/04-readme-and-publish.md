# 04 — README 与发布收尾

**What to build:** 完整的 README 使用文档与可跑通的发布流程；文档描述的用法与实现一致，发布前检查通过。

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] README 含：`npx @heihei0299/matt-skills install` / `list` 用法、工具目录对照表、全部 flag、装完生效方式（claude `/reload`、pi `/reload`、opencode/codex 下一轮会话生效）
- [ ] README 含发布流程：`npm login` → `npm version patch` → `npm publish --access public`；技能改动需随新版本发布
- [ ] `npm publish --dry-run` 通过且 tarball 内容与 README 声明一致
