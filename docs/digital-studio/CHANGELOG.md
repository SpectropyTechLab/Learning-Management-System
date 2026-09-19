# Digital Studio change and release history

[Handbook](README.md). Product phases, code releases and documentation revisions are separate.

## Unreleased documentation — handbook revision 1

19 September 2026. Established the living handbook for **Version 1 · Phase 1**: requirements, user guide, architecture, data/API, operations/recovery, status/roadmap, tests/risks and decisions. Added a maintenance checklist and working instructions. Clarified historical status notes. No runtime, database or hosting changes are part of this documentation update. Record remote publication separately when performed.

## Version 1 · Phase 1 — initial live integration

19 September 2026. Commit `90c2e8ceb20ef65e2055a54b555e9ad36631af23`.

- Added Digital Studio last in the Content Authorizer sidebar, using OS login, permissions and shell.
- Packaged editor/backend in the LMS repository, with lazy-loaded route and `/api/studio/v1` API.
- Created six separate Studio tables with RLS and restricted browser access. Added one targeted pilot permission separately; no existing LMS business records rewritten.
- Tested on a pilot branch, then pushed directly to main. Vercel and Render deployed successfully; no pull request was used.
- Live checks passed for create/edit/autosave/reopen/draft presentation and basic existing OS page loads. Retained a labeled sample draft.
- AI remained unconfigured. Live publication was blocked by approval review and not executed. Live upload and additional account/scale checks remain pending.
- Local evidence: 26 Studio tests, five focused OS permission tests, focused TypeScript and Vite/PWA build passed.

See [OPERATIONS.md](OPERATIONS.md) for deployment/recovery details and [TESTING_AND_RISKS.md](TESTING_AND_RISKS.md) for evidence limits.
