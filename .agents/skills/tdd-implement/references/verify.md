# Verify

验证必须对应当前最终 diff；实现或测试变化后，只重新验证受影响证据。

## 顺序

`必要验证 → 必要真实运行验证 → 完整 code-review → finding 增量复核`

## 规则

- 只验证当前 issue 的必要范围，不因进入 Verify 自动扩大测试范围。
- ticket 要求真实运行验证时，执行与验收目标匹配的实际验证。
- 最终 diff 稳定后执行一次完整 `code-review`。
- blocking finding 修复后，只重新验证受影响范围，并仅对该 finding 及其直接影响执行增量 Review。
- 未受影响的 Review 结论继续有效，不重新执行完整双轴 Review。
- 若修复产生新的 Behavior，返回 Red-Green 对该 Behavior 执行 TDD；完成后再回到 Verify 验证受影响范围。

## 出口

- 当前 issue 的必要验证通过；
- 要求的真实运行验证完成；
- 完整 Review 已完成；
- 所有 blocking finding 已关闭。
