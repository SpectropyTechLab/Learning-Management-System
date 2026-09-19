# Digital Studio documentation maintenance

For Studio tasks, read `docs/digital-studio/README.md` and `MAINTENANCE.md`. Current baseline: Version 1 · Phase 1, limited live pilot.

- Update affected handbook pages alongside code, before task completion.
- Distinguish live verified, local verified, blocked and planned. Record actual tests, deployment evidence and limitations.
- Record material changes in CHANGELOG and substantive decisions in DECISIONS.
- Document migrations and permissions separately. Keep Studio content in separate tables; preserve existing LMS business data unless specifically authorized otherwise.
- Keep secrets, tokens and unnecessary customer data out of docs.
- Canonical source is in sibling `Digital_Teaching_Classroom/application`; use its sync script and parity check for generated copies.
- Documentation-only tasks do not imply production deployment; main pushes can auto-deploy.

These conventions do not authorize new external actions or override user scope.
