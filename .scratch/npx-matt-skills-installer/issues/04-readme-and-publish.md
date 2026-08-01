# 04 — README 与发布收尾

**What to build:** 完整的 README 使用文档与可跑通的发布流程；文档描述的用法与实现一致，发布前检查通过。

**Blocked by:** 03

**Status:** ready-for-agent

- [x] README 含：`npx @heihei0299/matt-skills install` / `list` 用法、工具目录对照表、全部 flag、装完生效方式（claude `/reload`、pi `/reload`、opencode/codex 下一轮会话生效）
- [x] README 含发布流程：`npm login` → `npm version patch` → `npm publish --access public`；技能改动需随新版本发布
- [x] `npm publish --dry-run` 通过且 tarball 内容与 README 声明一致

## Comments

- 2026-08 实施完成：`README.md` 重写，含 `npx @heihei0299/matt-skills install`/`list`/`list --json` 用法、4 工具 × 项目/全局目录对照表、全部 flag（`--tools`/`--all`/`--force`/`--global`/`--project`/`--dest`/`--json`/`--help`）、安装后生效方式（Claude Code/Pi `/reload`、OpenCode/Codex 下一轮会话生效）、发布流程（`npm login` → `npm version patch` → `npm publish --access public`）与「技能改动需随新版本发布」说明。
- 测试：新增 `test/package.test.js` 6 个用例（README 用法/映射/flags/生效方式/发布流程 + `npm pack --dry-run --json` tarball 含 `skills/`、`bin/cli.js`、`README.md`）；完整套件 `node --test` 46/46 通过。
- 发布验证：`npm publish --dry-run` 通过（74 文件，含更新后的 README 与 bin）；`package-lock.json` 已生成并纳入提交（仓库规则要求）。
- code-review 两轴均通过；已修：`install --help`/`list --help` 原先不生效（spec CLI 契约将 `--help` 列为 install 标志，README 亦列为通用 flag），改为 `--help`/`-h` 出现在任意参数位置均打印帮助并 exit 0，并补 2 个测试。
