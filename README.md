# @heihei0299/matt-skills

Matt Pocock 的工程技能集，打包为 npm 包，可一键安装到 Codex / Pi / OpenCode / Claude Code。技能内容随包版本发布，用户重跑 install 即可升级。

## 用法

列出包内全部技能及其描述：

```sh
npx @heihei0299/matt-skills list
# 机器可读输出
npx @heihei0299/matt-skills list --json
```

交互式安装（先勾选工具，再勾选技能）：

```sh
npx @heihei0299/matt-skills install
```

免交互安装（CI / 脚本）：

```sh
npx @heihei0299/matt-skills install --tools codex,claude --all
```

重复安装默认跳过已存在的同名技能，本地修改不会被覆盖；升级时加 `--force` 覆盖。

## 工具目录对照

| 工具 | 项目级（默认） | 全局（--global） |
|------|----------------|------------------|
| codex | `.agents/skills/` | `~/.codex/skills/` |
| pi | `.pi/skills/` | `~/.pi/agent/skills/` |
| opencode | `.opencode/skills/` | `~/.config/opencode/skills/` |
| claude | `.claude/skills/` | `~/.claude/skills/` |

## Flags

| flag | 说明 |
|------|------|
| `--tools <a,b>` | 指定工具，跳过工具勾选（CI） |
| `--all` | 安装全部技能，跳过技能勾选 |
| `--global` | 装到各工具的全局技能目录（基于 `$HOME`） |
| `--project` | 装到当前项目目录（默认） |
| `--dest <path>` | 装到任意单目录；覆盖工具映射并忽略 `--tools` |
| `--force` | 覆盖已存在的同名技能 |
| `--json` | `list` 输出 JSON |
| `--help` | 显示帮助 |

## 安装后生效

- Claude Code：`/reload`
- Pi：`/reload`
- OpenCode：下一轮会话生效
- Codex：下一轮会话生效

## 开发

```sh
node --test
npm pack --dry-run
```

## 发布

技能改动必须发布新版本，用户才能获取更新。

```sh
npm login
npm version patch
npm publish --access public
```
