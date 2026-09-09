# Functional-test instance schema

`scaffold-functional-test` 生成的实例清单以本文件为唯一字段契约。实例是声明式输入，不把执行逻辑散落在生成器正文中。

## Common required fields

每个实例都必须包含：

- `prompt`：实例要覆盖的用户行为；
- `type`：实例类型，必须是 `cli`、`http`、`browser` 或 `file` 之一；
- `source`：spec 章节/行号，或 README / `--help` 的明确来源。

`setup`、`env`、`timeout`、`teardown` 为跨类型可选字段。不要为了凑字段写 `none`；某个断言维度不适用时直接省略。

## Type-specific contract

### `type: cli`

必须包含：

- `command`：实际执行命令；
- `expected exit code`：预期退出码。

按需包含：

- `expected stdout phrases`；
- `expected stderr phrases`；
- `expected files/content`。

### `type: http`

必须包含：

- `request`：method + URL/path + 必要 headers/body；
- `expected status`：预期 HTTP status。

按需包含：

- `expected body`；
- `expected headers`；
- `expected side effects`。

### `type: browser`

必须包含：

- `entrypoint`：已有页面、dev server 或浏览器入口；
- `steps`：最小用户操作序列；
- `assertions`：DOM、可见文本、URL、网络或控制台等用户可观察断言。

browser 实例不要求伪造 `stdout` 或 `exit code` 字段；执行器负责记录浏览器证据和必要截图/trace 路径。

### `type: file`

必须包含：

- `command` 或已有生成入口；
- `expected files/content`：应出现、变化或保持不变的文件与内容断言。

按需包含 `expected exit code`、stdout/stderr 断言。

## Assertion rules

- 只写可机器验证或可明确观察的断言，不把“应该正常”“体验良好”这类自然语言目标当作 assertion；
- 一个实例可以有多个断言，但每个断言必须能回溯到 `source`；
- 优先验证用户可观察行为，不把内部实现细节当作功能结果；
- 同一行为存在多种入口时，选择最接近真实使用路径的类型和入口，不强行统一成 CLI。

## Fingerprint

实例 reference 头部必须包含：

- `spec hash`：源 spec 文件字节的 SHA-256；
- `generatedAt`：生成时的 ISO 8601 时间戳。

执行或更新前发现 hash 不一致时，报告 spec 已变更并给出 regenerate 建议；未经用户确认不覆盖实例清单。

## Protected content

`<!-- manual -->` 与其保护段属于人工维护内容。更新生成物时保留原文；需要改变人工段时先展示 diff 并获得用户确认。
