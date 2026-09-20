# Agent Entry

先读项目根目录的 `PROJECT.md` 与 `CONTEXT.md`；项目本地规则追加在本文件其他位置。

<!-- matt-skills:managed:start -->
需求对齐 → Spec → 版本化到 `docs/specs/<slug>.md` →（用户确认后）Tickets → `tdd` → `code-review` → 验收。

- 需求对齐 / 模糊设计 → `grill-to-spec`；已有共识 → `to-spec`。无论是否立即生成 ticket，已接受的 Spec 都必须持久化到目标仓库 `docs/specs/<slug>.md`；之后才能发布 ticket。
- Spec 已落盘后，Tickets 才能在用户确认拆分后由 `to-tickets` 生成；tracker/ticket 必须引用该版本化 Spec。
- 行为变更默认使用 `tdd`，完成后使用 `code-review` 并回到 Spec 验收。
- `commit-check` 仅在用户明确要求 commit 时使用；它只检查，不 stage 或 commit。
- 未命中 skill 时直接执行；上游 skills 保持原义。
<!-- matt-skills:managed:end -->
