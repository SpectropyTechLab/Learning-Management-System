# Day 2 — Package runtime feasibility and estimate decision

**Gate status:** complete as an evidence-based feasibility report on 2026-10-28.

## Result in plain words

The repository can inspect and unpack representative packages, and it contains a partial SCORM 1.2 player. It does **not** currently demonstrate full SCORM support. In particular, SCORM 2004, multi-SCO navigation, sequencing/rollup, dependable resume and sandboxed cross-frame communication are not ready to claim as supported.

## Evidence matrix

| Package/runtime capability | Day 2 result | Evidence and gap |
|---|---|---|
| External link | Demonstrated for discovery fixture | Fixture and metadata contract exist. Approved-domain policy and end-to-end player test remain untested. |
| Single-file HTML | Demonstrated for discovery fixture | Valid fixture exists. End-to-end isolated launch and persistence are untested. |
| Browser-ready ZIP | Demonstrated for ZIP inspection only | Fixture extracts and contains a launch file. A generic browser-ZIP import/player path is not implemented. |
| SCORM 1.2 single SCO | Partial | ZIP/manifest ingestion and `window.API` exist. API completeness, synchronous commit behavior, resume and cross-origin discovery are not demonstrated. |
| SCORM 1.2 multi-SCO | Blocked | Import selects the first manifest resource; no LMS table of contents or SCO navigation state exists. |
| SCORM 2004 1st/2nd/3rd/4th single SCO | Blocked | Player does not expose `window.API_1484_11`; the 2004 data model is not implemented. Only a 4th-edition synthetic fixture exists. |
| SCORM 2004 multi-SCO | Blocked | 2004 runtime plus activity-tree navigation, sequencing and rollup are absent. |
| Initialize/terminate | Partial, SCORM 1.2 only | Basic methods exist; lifecycle conformance is not tested. |
| Status and score | Partial, SCORM 1.2 only | A small subset maps to persistence. 2004 completion/success/score data are absent. |
| Acknowledged persistence | Blocked | Current `LMSCommit` returns a Promise, while package-facing SCORM calls must behave synchronously. |
| Suspend/resume | Blocked | `suspend_data` can be written/read by backend routes, but the player does not restore the runtime data model on launch. |
| Isolation | Blocked | The iframe has no sandbox policy, package assets are served through an authenticated proxy, and the API is attached to the frontend parent on another origin in common local deployments. |
| Sequencing/rollup | Blocked | No activity-tree or sequencing engine is present. |

“Demonstrated” here applies only to the named synthetic fixture and is not a universal compatibility claim. Real vendor packages remain **untested** until supplied.

## Technical findings

1. `backend/services/scorm.service.js` reads the manifest but chooses only the first resource `href`. That is not a multi-SCO implementation.
2. `frontend/src/lib/ScormAPIWrapper.ts` implements only a subset of SCORM 1.2 and has no SCORM 2004 API object.
3. The current commit call is asynchronous from the package's perspective. The runtime needs a spec-compatible acknowledgement strategy.
4. `ScormPlayer.tsx` installs `window.API` on the frontend window while the package is commonly served by the backend origin. Same-origin rules can prevent package discovery of that parent API.
5. The player does not provide a package navigation tree, sequencing engine, rollup, edition detection or restored data model.
6. The current iframe has no explicit sandbox/allow-list contract, and putting an access token in a launch URL increases exposure through logs/history.

## Runtime decision

Do not extend the handwritten wrapper into a full conformance engine. Use a maintained runtime adapter behind a Spectropy-owned interface, while keeping ingestion, authorization, persistence and UI in this repository. `scorm-again` is a candidate for a spike because its project documents SCORM 1.2/2004 APIs, synchronous commits, cross-frame support and sequencing; adoption still requires license/security review and our own fixture/vendor tests.

The authoritative conformance target remains the ADL SCORM documentation and test suites. A library's feature claim is not a Spectropy compatibility claim.

## Revised estimate and release boundary

Full support for SCORM 1.2 plus every SCORM 2004 edition, multi-SCO sequencing and rollup cannot responsibly be promised inside the remaining 21-day implementation window from the current baseline.

Recommended staged boundary:

1. **Core release:** external links, isolated single-file HTML, browser-ready ZIP, SCORM 1.2 single-SCO, and SCORM 2004 single-SCO basic lifecycle/status/score/suspend-resume.
2. **Compatibility expansion:** real vendor packages, failure recovery, stricter MIME/path handling and cross-browser testing.
3. **Advanced runtime:** multi-SCO navigation plus SCORM 2004 sequencing/rollup only after a maintained runtime spike passes ADL and vendor fixtures.

Day 2 therefore changes the estimate from “all listed SCORM variants in the base build” to a staged delivery with explicit evidence gates.

## Exit criteria for a future support claim

- Runtime/library version and package fixture identity recorded.
- Import rejects unsafe paths and identifies edition, organizations, resources and SCO count.
- Package finds the correct API through the chosen isolation boundary.
- Initialize, set/get, commit and terminate return conforming values.
- Status, score and suspend data persist and restore after closing/reopening.
- Multi-SCO navigation and, for 2004, sequencing/rollup pass targeted tests.
- At least one synthetic fixture and representative real vendor fixture pass per claimed category.

## References used for the feasibility decision

- [ADL SCORM best-practices guide and official resource overview](https://www.adlnet.gov/assets/uploads/SCORM_Users_Guide_for_Programmers.pdf)
- [ADL SCORM 2004 conformance requirements](https://www.adlnet.gov/assets/uploads/SCORM_2004_4ED_v1_1_TR_20090814.pdf)
- [`scorm-again` project documentation](https://github.com/jcputney/scorm-again) — candidate only, not yet an adopted dependency
