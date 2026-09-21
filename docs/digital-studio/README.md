# Spectropy Digital Studio — living project handbook

- **Organization:** Spectropy Edutech Pvt. Ltd.
- **Product:** AI Powered Digital Classroom Studio, inside Spectropy OS/LMS
- **Current delivery:** Version 1 · Phase 1 — limited live integration and manual authoring pilot
- **Documentation baseline:** 19 September 2026 · revision 1
- **Verified frontend release:** `dd934ba3fd486ddf493bb3d95bc4d070de1f2e4c` (21 September 2026); unchanged backend remains at `90c2e8ce`

## Start here

Digital Studio helps an author turn a teaching brief into a lesson plan, a slide script and an editable classroom presentation. It opens inside the existing OS and reuses its login and permissions. It is not a separate account system.

The initial integration is live. One verified Content Authorizer pilot account has access. Manual creation, editing, saving, reopening and draft presentation were checked through the production OS. AI adapters exist in code, but production AI is not configured. This is the first phase of Version 1, not completion of the whole BRD or an enterprise-readiness certification.

This handbook is the **current-state documentation entry point**. It is maintained with code changes, not assembled only at project end. Historical BRDs and plans explain intent; they do not prove a feature has shipped.

## Reading paths

| Reader | Read first | Then |
|---|---|---|
| Manager / new stakeholder | This page, [product and scope](PRODUCT.md) | [status and roadmap](STATUS_AND_ROADMAP.md), [release history](CHANGELOG.md) |
| Content author | [User guide](USER_GUIDE.md) | Capability status and limitations in [status](STATUS_AND_ROADMAP.md) |
| Developer | [Architecture](ARCHITECTURE.md) | [Data and API](DATA_AND_API.md), [development and operations](OPERATIONS.md) |
| QA / release operator | [Testing and risks](TESTING_AND_RISKS.md) | [Operations](OPERATIONS.md), [change process](MAINTENANCE.md) |
| Future maintainer | All of the above | [Decision log](DECISIONS.md) and linked source files |

See also [brand guidelines](BRAND_GUIDELINES.md) for the OS visual reference and [next delivery steps](STATUS_AND_ROADMAP.md#next-delivery-steps) for the immediate sequence.

## How to read status

- **Live verified:** checked on the deployed OS; the exact checked behavior is stated.
- **Implemented / local verified:** code and local evidence exist; not a promise of production validation.
- **Pending validation:** needs an explicit check or decision.
- **Planned:** not available yet; sequencing and acceptance are proposals unless approved.

The product label “Version 1 · Phase 1,” the npm package version `0.1.0`, API path `/v1`, document `schemaVersion: 1`, and Git commit are separate identifiers. Updating one does not automatically update the others.

## Documentation ownership

The person implementing a change updates the affected handbook pages in the same change. The business owner confirms scope and acceptance; the technical reviewer verifies implementation and evidence. Named organizational owners are still to be assigned. Do not invent sign-offs or mark a planned capability complete without evidence.

See [MAINTENANCE.md](MAINTENANCE.md) for the required update checklist and reusable change record. Documentation does not update itself in the background: each development/release task must include it.

## Source material and precedence

1. Current source, migrations, deployed evidence and this handbook's dated status.
2. Current user-approved scope decisions, recorded in [DECISIONS.md](DECISIONS.md).
3. Historical discovery, implementation plans and verification notes under the sibling `Digital_Teaching_Classroom` folder.
4. BRD `SPECTROPY_Teaching_Studio_BRD_Teacher_Ecosystem_v2.0.docx` and proposed architecture `SPECTROPY_Teaching_Studio_Developer_Solution_Architecture_v1.0.docx`, under `Digital_Teaching_Classroom/BRD_R&D Resarch and Documentaion`.

If evidence conflicts, investigate and record the correction; do not silently assume a plan is implemented. This handbook's initial requirements mapping summarizes the existing discovery and code, not a new clause-by-clause audit of both Word documents.

Keep credentials, cookies, tokens, private connection strings, student records and raw production exports out of documentation. Configuration variable names and non-secret deployment identifiers are sufficient.
