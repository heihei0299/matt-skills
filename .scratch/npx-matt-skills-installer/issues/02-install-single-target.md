# 02 — install 单目标安装

**What to build:** `install` 子命令能交互式勾选技能，并拷贝到项目级 `.agents/skills/`（或 `--dest` 指定的任意目录），重复安装默认跳过、`--force` 覆盖，结束输出汇总。

**Blocked by:** 01

**Status:** ready-for-agent

- [x] `install` 默认目标为当前目录 `.agents/skills/`，`--dest <path>` 可覆盖
- [x] 交互式多选技能（`prompts`，空格勾选、回车确认），`--all` 跳过勾选
- [x] 拷贝含各技能全部附属文件（`agents/`、模板、脚本等），用递归复制
- [x] 目标已存在同名技能时默认跳过并报告；`--force` 覆盖
- [x] 结束输出「已装 N、跳过 M、目标路径」；未选任何技能时给出提示并以 0 退出
- [x] 实测：`node bin/cli.js install --all --force --dest /tmp/ms-test` 后目标出现全部技能且附属文件完整（抽查 triage/AGENT-BRIEF.md、tdd/tests.md）

## Comments

- 2026-06 实施完成：`bin/cli.js` 新增 `install`（`--all`/`--force`/`--dest`），非 `--all` 走 `prompts` multiselect 交互多选；非 TTY 环境提示并 exit 1（避免脚本静默成功）；`--dest` 缺值报错 exit 1。
- 测试：`test/cli.test.js` 新增 7 个用例（拷贝+附属文件、默认目录、重跑跳过、`--force` 覆盖、`--dest` 缺值、非 TTY 守卫），`node --test` 12/12 通过。
- 交互路径人工验证（pty）：`script` 下空格+回车只装选中技能；空勾选回车输出「未选择任何技能，未安装」exit 0。
- code-review 两轴均通过；已修：`--dest` 缺值静默回退、非 TTY 静默成功、测试去重。
