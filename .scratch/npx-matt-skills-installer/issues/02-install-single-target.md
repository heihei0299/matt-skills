# 02 — install 单目标安装

**What to build:** `install` 子命令能交互式勾选技能，并拷贝到项目级 `.agents/skills/`（或 `--dest` 指定的任意目录），重复安装默认跳过、`--force` 覆盖，结束输出汇总。

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] `install` 默认目标为当前目录 `.agents/skills/`，`--dest <path>` 可覆盖
- [ ] 交互式多选技能（`prompts`，空格勾选、回车确认），`--all` 跳过勾选
- [ ] 拷贝含各技能全部附属文件（`agents/`、模板、脚本等），用递归复制
- [ ] 目标已存在同名技能时默认跳过并报告；`--force` 覆盖
- [ ] 结束输出「已装 N、跳过 M、目标路径」；未选任何技能时给出提示并以 0 退出
- [ ] 实测：`node bin/cli.js install --all --force --dest /tmp/ms-test` 后目标出现全部技能且附属文件完整（抽查 triage/AGENT-BRIEF.md、tdd/tests.md）
