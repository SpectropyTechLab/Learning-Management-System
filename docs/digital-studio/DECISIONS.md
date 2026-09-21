# Architecture and delivery decision log

[Handbook](README.md). Initial record: 19 September 2026. These summarize conversation decisions and implementation, not invented formal approvals.

| ID | Decision | Reason / consequence | Status |
|---|---|---|---|
| ADR-001 | Build inside Spectropy OS | Reuse identity/navigation; shared deployments require regression/recovery | Implemented |
| ADR-002 | Use separate `studio_*` tables | Separate content; user references and shared resources remain | Implemented |
| ADR-003 | Role plus individual pilot permission | Limited rollout; no implicit sharing or broad role grant | One pilot enabled |
| ADR-004 | Canonical Studio source and packaged LMS copies | LMS deploys independently; sync/parity required | Implemented; complete source-control coverage needs decision |
| ADR-005 | Validated JSON workspace with revisions | Common import/AI/editor contract; prevent stale replacement | Implemented |
| ADR-006 | Replaceable AI provider/model support in V1 | OpenRouter preference can change; keys remain server-side | Adapters built; production activation pending |
| ADR-007 | Documents are examples, not fixed templates | Future layouts vary; preserve source and report uncertainty | Bounded imports implemented |
| ADR-008 | Limited live manual integration before improvements | Manager requires progress inside main OS | Implemented; supersedes staging-first order for this pilot |
| ADR-009 | Immutable reviewed lesson snapshots | Separate drafts from reviewed versions; not course assignment | Local tested; live acceptance pending |
| ADR-010 | Bounded BYTEA assets and same-process optional worker | Small starting footprint; storage/concurrency need hardening | Implemented; production AI inactive |
| ADR-011 | Living documentation with development | End-to-end understanding throughout delivery | Handbook/process established |

For future decisions record date, context, chosen approach, alternatives, consequences, status and superseding decision when applicable. Preserve earlier decisions as history.

## ADR-012 — Match the existing OS brand

19 September 2026. User requested brand consistency. Studio interface follows the standard Content Authorizer OS navy/blue theme and inherits the host font. Keep changes in scoped Studio CSS; preserve authored slide rendering and immutable content. Introduce a branded slide theme separately as an explicit choice. See [brand guidelines](BRAND_GUIDELINES.md). Local implementation, deployment pending.
