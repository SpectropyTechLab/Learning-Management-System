# Documentation maintenance and change process

Effective 19 September 2026. [Handbook](README.md)

## Working rule

Documentation is part of implementation. Update affected pages while working, then reconcile them with tested results before handoff. Record uncertainty immediately. Do not mark local tests as live verification or a planned feature as shipped.

This handbook is maintained in the LMS repository alongside deployable code. The canonical Studio source is still in the sibling folder. Documentation-only changes do not require production deployment: main pushes may automatically deploy Vercel and Render.

## Update checklist

| Change | Pages to update |
|---|---|
| Feature / scope | PRODUCT, STATUS_AND_ROADMAP, USER_GUIDE, CHANGELOG |
| Architecture / provider | ARCHITECTURE, DECISIONS, affected operations and risks |
| Database / API | DATA_AND_API, migration/recovery notes in OPERATIONS, test evidence |
| User workflow | USER_GUIDE, acceptance results and limitations |
| Release / configuration / permissions | OPERATIONS, CHANGELOG, STATUS_AND_ROADMAP |
| Bug / security fix | CHANGELOG, TESTING_AND_RISKS and affected reference pages |

## Definition of done

- State intended behavior and affected requirement IDs.
- Describe implemented behavior and explicitly retain unfinished parts.
- Record data, permission and configuration changes separately.
- Record relevant tests, environments, results, failures and unrun checks.
- Update user instructions, architecture/API details and recovery steps where affected.
- Capture substantive design rationale in DECISIONS.
- Reconcile phase status and change history; validate links and exclude secrets.
- Include documentation with the corresponding reviewed code change. Record organizational sign-off only when actually given.

This is a working convention, not an installed CI gate. Repository instructions remind coding agents to follow it; human review still matters. If work is blocked, document completed work, the blocker and next step.

## Reusable change record

```markdown
### YYYY-MM-DD — Change title
- Product phase / code commit:
- Requirement IDs and reason:
- Before → after behavior:
- Data, permission and configuration impact:
- Tests: environment, command/workflow, result and evidence:
- Deployment state: local / preview / production:
- Risks, limitations and recovery:
- Documentation pages updated:
- Business / technical review: pending or actual reviewer/date:
```

## Review cadence and format

Agree scope/acceptance at phase start. Update documentation during each change. Reconcile tests, migration and risks before release; record actual deployment evidence afterward. At phase review, confirm owners and backlog. This happens within work tasks; no background automation is configured.

Keep the business phase, package version, API version and document schema version distinct. Proposed phase dates or approvals must not be invented.

Markdown is the maintained source because GitHub can display and compare it alongside code. A dated Word/PDF management copy can be exported later; it must not become a competing stale source of truth.

## Required start-of-task workflow — Phase 2

Before each implementation task: inspect current code, branch/dirty state, generated-copy parity, relevant requirements and prior test evidence; report recorded-live, local-preview and missing behavior. Define a concrete acceptance outcome and plan before editing. Use current primary-source research when adopting libraries/providers or relying on unstable facts. Ask for product-specific micro-details when evidence cannot decide them; label reversible engineering assumptions. Do not substitute internet advice for Spectropy role/curriculum/academic decisions.

Implement canonically, test affected behavior, update current status/limitations/decisions and demonstrate a preview for review. Deployment follows review through the linked Git workflow, compatible version rollout, recovery preparation and production verification. Documentation-only work never triggers deployment. The old Phase 2 sequence is paused. Do not claim a new release complete until the replacement workflow and acceptance gates have been agreed and verified; PENDING_WORKFLOW.md is a backlog, not approval. Prefer reconciling current sections to accumulating contradictory appendices; retain history in CHANGELOG.
