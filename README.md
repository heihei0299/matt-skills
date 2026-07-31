# @heihei0299/matt-skills

Matt Pocock 的工程技能集，打包为 npm 包，可安装到 Codex / Pi / OpenCode / Claude Code。

## 用法

列出包内全部技能及其描述：

```sh
npx @heihei0299/matt-skills list
# 机器可读输出
npx @heihei0299/matt-skills list --json
```

交互式安装（即将在后续版本提供）：

```sh
npx @heihei0299/matt-skills install
```

## 开发

```sh
node --test
npm pack --dry-run
```

## 发布

```sh
npm login
npm version patch
npm publish --access public
```
