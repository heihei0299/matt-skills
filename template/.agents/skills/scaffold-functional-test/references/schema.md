# Functional-test instance schema

`scaffold-functional-test` 生成的实例清单以本文件为唯一字段契约。实例是声明式输入，不把执行逻辑散落在生成器正文中。

## Required fields

每个实例必须包含：

- `prompt`：实例要覆盖的用户行为；
- `command`：实际执行的命令或入口；
- `expected files/content`：预期文件、副作用或内容；无文件副作用时明确写 `none`；
- `expected stdout phrases`：预期 stdout/stderr 短语；无要求时明确写 `none`；
- `expected exit code`：预期退出码；
- `source`：spec 章节/行号，或 README / `--help` 的明确来源。

## Optional fields

可按实例需要增加：

- `setup`、`env`、`timeout`、`type`、`teardown`；
- `type` 缺省为 `cli`；
- 需要展示多个文件或短语时使用列表，不把不可验证的自然语言目标当作断言。

## Fingerprint

实例 reference 头部必须包含：

- `spec hash`：源 spec 文件字节的 SHA-256；
- `generatedAt`：生成时的 ISO 8601 时间戳。

执行或更新前发现 hash 不一致时，报告 spec 已变更并给出 regenerate 建议；未经用户确认不覆盖实例清单。

## Protected content

`<!-- manual -->` 与其保护段属于人工维护内容。更新生成物时保留原文；需要改变人工段时先展示 diff 并获得用户确认。
