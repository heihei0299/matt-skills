# T01 — Config Single Source

状态：Resolved
优先级：P1 Maintainability
依赖：无

## 目标

删除 `bin/cli.js` 中 engineering / required 的硬编码 fallback，确立：

- `config/engineering.json`
- `config/required.json`

为唯一事实源。

## 修改范围

允许：

- `bin/cli.js`
- 直接覆盖 config 加载失败/非法结构的测试文件
- 如现有测试结构需要，可新增一个小型 config-loading contract test

原则上不修改：

- `bin/skill-selection.js`
- `bin/skill-boundaries.js`
- `scripts/build-template.js`
- Template / Harness
- Skill 内容

## 实现要求

1. 删除两份硬编码 fallback 数组。
2. 读取配置失败时 fail closed。
3. JSON 解析失败时提供可定位错误。
4. 配置必须是字符串数组；非法结构应报错。
5. 如提取 helper，只允许轻量函数，不新建 Service/Manager/Repository。
6. 保持现有 selection 行为不变。

推荐形态：

```js
async function loadSkillSet(file, label) {
  const raw = await readFile(file, 'utf8');
  const value = JSON.parse(raw);
  if (!Array.isArray(value) || value.some((name) => typeof name !== 'string')) {
    throw new Error(`invalid ${label} skill config`);
  }
  return new Set(value);
}
```

## Contract

正常配置：

```text
config → Set → resolveSkillNames
```

异常配置：

```text
missing / invalid JSON / invalid shape
                ↓
           explicit error
```

不得静默继续。

## 验收

- [x] engineering 只有 JSON 一份事实源。
- [x] required 只有 JSON 一份事实源。
- [x] CLI 不再包含对应完整 fallback 列表。
- [x] 缺失配置会失败。
- [x] 非法 JSON 会失败。
- [x] 非字符串数组会失败。
- [x] 正常 list/init/install/sync selection 行为不变。
- [x] 没有新增配置框架或抽象层。

## 验证

只运行直接受影响的 config/CLI/selection tests。

不自动运行全量测试。

## Review

完成后只 Review 本 Ticket diff。

重点检查：

- 是否真正删除双事实源。
- 是否把 fallback 转移到了另一个文件。
- 错误是否可定位。
- 是否意外改变 default/all selection。

## Resolution

- Commit：`c479907 fix(config): make skill config loading fail closed`
- 发布白名单补充 `config/required.json`，避免 npm 包缺少正常 CLI 所需配置。
- 直接验证：`node --test test/cli-config-loading.test.js test/skill-selection.test.js test/cli.test.js test/cli-init.test.js test/distribution-boundaries.test.js`，67/67 通过。
- 完整 Review 后修复两个 blocking finding，并完成直接影响范围的增量 Review：PASS。
