# matt-skills

Personal workflow glossary. Execution policy belongs to `AGENTS.md`, project intent and boundaries belong to `PROJECT.md`, durable decisions belong to ADRs, and operational procedures belong to Skills.

## Workflow

**Personal Workflow**（个人工作流）:
The owner's default way to turn work into an agreed, executable, reviewed, and accepted change. The repository and its deployment tools support this workflow but do not define a second public-first workflow.
_Avoid_: generic agent workflow, distribution workflow

**Requirements Alignment**（需求对齐）:
The stage where the user's problem, desired outcome, constraints, and acceptance shape become shared understanding before a Spec is written.
_Avoid_: implementation planning, ticket drafting

**Spec**（规格）:
The agreed description of the problem, user-facing solution, decisions, scope, and acceptance boundary. A Spec is not a glossary or a list of implementation commands.
_Avoid_: plan, task list

**Executable Ticket**（可执行票据）:
A user-confirmed, independently actionable slice of work with a clear outcome, acceptance criteria, and any blocking relationship.
_Avoid_: TODO, unconfirmed issue

**Acceptance**（验收）:
The user's confirmation that the delivered behavior satisfies the agreed Spec and executable tickets.
_Avoid_: test pass, code review

**Tracker**（任务跟踪器）:
The place that records executable tickets, their blocking relationships, and their progress. It is not the source of domain vocabulary or durable architectural decisions.
_Avoid_: source of truth for the whole project

**ADR**（架构决策记录）:
A durable record of a hard-to-reverse, surprising, or trade-off-heavy decision and the reason it was chosen.
_Avoid_: meeting note, implementation diary

**Skill**（技能）:
An operational procedure an agent can invoke for a particular kind of work. An upstream Skill keeps its upstream meaning; a wrapper may compose or route Skills without redefining them.
_Avoid_: policy, project context

**Upstream Skill**（上游技能）:
A Skill whose body is maintained by the upstream source and mirrored into the Workspace. Local routing may select it, but personal workflow documents do not silently change its meaning.
_Avoid_: forked behavior

**Wrapper**（包装器）:
A local routing layer that selects or sequences existing Skills for a workflow while leaving each selected Skill's own contract intact.
_Avoid_: replacement skill

**Behavior Change**（行为变更）:
A change that affects a user- or caller-observable outcome and therefore normally follows the TDD discipline before Review and Acceptance.
_Avoid_: every file edit

**Simple Task**（简单任务）:
A bounded task whose intent and result are already clear and whose work is mechanical or explicitly non-behavioral; it may take the smallest direct path.
_Avoid_: under-specified task

**Commit Check**（提交检查）:
An explicit readiness assessment after Review and before staging. It reports `ready to stage` or a blocking reason; staging, committing, and repeating completed verification belong elsewhere.
_Avoid_: commit executor

**Template / CLI Deployment**（模板 / CLI 部署）:
The mechanism that projects the personal Workspace into a target repository for reuse. It is a deployment concern, not the authority for the owner's workflow decisions.
_Avoid_: primary product
