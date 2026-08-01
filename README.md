# matt-skills

mattpocock/skills（`skills/engineering` + `skills/productivity`）的配置仓库：工作区内容镜像为 `template/` 模板快照，将快照整个复制到目标仓库根目录，再按下方命令拉取上游技能，即完成初始化。

## 模板结构

```
template/
├── .agents/skills/   2 个独有技能（tdd-implement、grill-to-spec）
├── AGENTS.md         项目级全局配置（行为路由 + 分文件指针）
├── CONTEXT.md        术语表
└── docs/agents/      5 个分文件（运行时纪律 / 技能设计 / issue tracker / triage labels / domain）
```

## 初始化

将 `template/` 整个文件夹复制到目标仓库根目录：

```sh
cp -r template/. /path/to/target/
```

然后拉取上游技能（engineering 17 个 + productivity 5 个）：

```sh
git clone --depth 1 https://github.com/mattpocock/skills.git /tmp/mattpocock-skills
cp -r /tmp/mattpocock-skills/skills/engineering/. .agents/skills/
cp -r /tmp/mattpocock-skills/skills/productivity/. .agents/skills/
rm -rf /tmp/mattpocock-skills
```

上游没有 `tdd-implement`、`grill-to-spec`，复制天然不冲突。目标仓库会话即自动加载全部技能与项目级全局配置（行为路由表、分文件约定）。

## 维护约定

改动 8 项内容的工作区（仓库根目录的 `.agents/skills/`、`AGENTS.md`、`CONTEXT.md`、`docs/agents/`）后，必须同步到 `template/` 对应路径；同步方向单向：工作区 → 模板快照。`test/template-sync.test.js` 守护同步，漏同步测试即红。

新增技能前先查上游 `mattpocock/skills` 是否已存在；仅上游没有的技能才作为独有技能落在本仓库（当前独有：tdd-implement、grill-to-spec），上游技能一律不进 `template/`。

## 开发

```sh
npm test
```
