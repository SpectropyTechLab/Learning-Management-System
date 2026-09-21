# Digital Studio change and release history

[Handbook](README.md). Product phases, code releases and documentation revisions are separate.

## Version 1 · Phase 1 — brand alignment released 21 September 2026

19 September 2026. Replaced green interface accents and serif UI headings with the OS navy/blue palette, neutral surfaces and inherited sans-serif font. Updated local preview styling and synchronized the deployable CSS/manifest. Preserved authored slide appearance and saved content. No database, permission, backend or provider configuration changes; implemented locally on 19 September and deployed through GitHub main on 21 September. Added brand guidance and the next delivery sequence.

Validation: source/package parity, focused TypeScript, Vite/PWA build and the local browser workflow passed (including mobile overflow and mocked AI review). Local publication uses mock transport and does not validate production publication. Existing large-chunk and outdated Browserslist warnings remain.

## Handbook revision 1 — included in the 21 September release

19 September 2026. Established the living handbook for **Version 1 · Phase 1**: requirements, user guide, architecture, data/API, operations/recovery, status/roadmap, tests/risks and decisions. Added a maintenance checklist and working instructions. Clarified historical status notes. No runtime, database or hosting changes are part of this documentation update. Published with the branding release on 21 September.

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

### 21 September deployment evidence

- GitHub main: `dd934ba3fd486ddf493bb3d95bc4d070de1f2e4c`, fast-forward after branch build; no PR used.
- Vercel preview: `9djujZU9yWJPQnEihxYYBcbDZmgg` Ready. Production: `9NqVp1H2NSiKBvxkBruhJPouHJ4y` Ready, current www.spectropy.com domain.
- Render remains on `90c2e8ce` / `dep-dan8652jnfac738krvc0`; backend source is unchanged in this release. No manual backend redeploy or database action was performed.
- Signed-in live pilot: refreshed Studio shows white/navy interface and sans-serif headings; existing sample opens and draft presentation displays its saved content. Publication not attempted.
- Local OpenRouter authentication and catalogue checks passed without generation; no default model or staging database is configured. Production AI remains off.
- Rollback reference: prior Vercel `HxUg3THfUxj99FAYq9oeZxTQZwfE`, prior frontend commit `90c2e8ce`. Revert only the branding runtime change when appropriate; retain database content.
