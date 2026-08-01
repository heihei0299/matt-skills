# matt-skills

Matt Pocock 工程技能模板仓库：工作区内容镜像为 `template/` 模板快照，将快照整个复制到目标仓库根目录即完成初始化。

## 模板结构

```
template/
├── .agents/skills/   24 个技能
├── AGENTS.md         项目级全局配置（行为路由 + 分文件指针）
├── CONTEXT.md        术语表
└── docs/agents/      5 个分文件（运行时纪律 / 技能设计 / issue tracker / triage labels / domain）
```

## 初始化

将 `template/` 整个文件夹复制到目标仓库根目录：

```sh
cp -r template/. /path/to/target/
```

目标仓库会话即自动加载技能与项目级全局配置（行为路由表、分文件约定）。

## 维护约定

改动 8 项内容的工作区（仓库根目录的 `.agents/skills/`、`AGENTS.md`、`CONTEXT.md`、`docs/agents/`）后，必须同步到 `template/` 对应路径；同步方向单向：工作区 → 模板快照。`test/template-sync.test.js` 守护同步，漏同步测试即红。

## 开发

```sh
npm test
```
