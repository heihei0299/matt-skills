# Red-Green

TDD 规则以 `.agents/skills/tdd/SKILL.md` 为唯一事实源。

将当前 issue 的待实现内容拆成可独立验证的 Behavior。

一次只推进一个 Behavior；每个需要实现或修改的 Behavior 都必须分别完成 `tdd` 规定的 Red → Green cycle 后才能进入下一个 Behavior。

前一个 Behavior 已完成 TDD，不代表后续 Behavior 可以直接修改实现代码。

已有行为无需修改且已由现有测试充分覆盖时，不强制制造 Red。

## 出口

- 所有需要实现或修改的 Behavior 均完成各自的 Red → Green cycle；
- Acceptance Criteria 对应行为通过相关验证。
