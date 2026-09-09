# Verify

仅在 `tdd-implement` Step ③ 读取。验证必须对应当前最终 diff；产品代码或测试再次变化时，旧证据失效。

## 固定顺序

`影响范围测试 → 必要 build → 必要真实运行验证 → 一次 Standards + Spec Review → blocking 修复后的定向复核`

## 规则

- 单 issue / 单 spec：按 Contract 验证矩阵运行完整相关测试；多 issue：只跑当前 issue 影响范围，全仓测试留给 orchestration A4。
- ticket 要求真实运行时，优先专用 browser，其次项目已有 Playwright；HTTP/CLI 不能替代 WebUI 可见验证。
- 临时进程必须使用隔离配置/端口，记录 PID 与实际结果，结束后清理。
- 每个 issue 恰好一次正式 Review round：并行启动两个独立 reviewer invocation/process，一个只执行 Standards-only，一个只执行 Spec-only；同一 invocation 不得覆盖两个轴。两份结果齐全前保持 `blocked/unavailable` 或未完成状态。
- findings 只分为当前 blocking、后续 ticket、advisory、out of scope；仅修当前 blocking。
- 修复 blocking 后只重跑受影响测试/typecheck 与 delta recheck，不重复完整双轴 review；修复不会重置已完成的两个 review axes。

## 出口

- 最终 diff 的相关测试/typecheck/build 通过；
- 要求的真实运行验证有实际证据；
- 一次 Standards + Spec Review 已完成；
- 无 blocking finding；
- 最后一次证据产生在最后一次相关修改之后。
