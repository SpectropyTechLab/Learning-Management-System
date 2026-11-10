# Day 6 Developer 2 Handoff: HTML and ZIP Runtime

**Status:** backend implementation complete on 2026-10-29.

## What was implemented

Studio authors can now upload and preview two executable Resource types:

- `html`: one self-contained HTML file.
- `zip`: a browser-ready ZIP containing an HTML entry point and its local files.

ZIP files are inspected in memory and are never extracted onto the application server's filesystem. The original upload remains in the private `studio-resources` bucket. Each accepted ZIP file is also copied to a unique, immutable Storage prefix so the browser runtime can request individual files.

No schema migration is required. The selected entry point continues to use `resource_versions.entry_point`, while the generated immutable file manifest is stored under `resource_versions.metadata_json.runtime`.

## API contract

### Create or version an executable Resource

The existing Day 5 endpoints remain the upload endpoints:

- `POST /api/studio/resources`
- `POST /api/studio/resources/:resourceId/versions`

For `html` and `zip`, a file is required. A ZIP may include an `entry_point` form field. Without one, the inspector selects `index.html`, preferring the shallowest matching path. If there is no `index.html`, a ZIP with exactly one HTML file can use that file.

### Create an author preview launch

`POST /api/studio/resource-versions/:versionId/launch`

Only `super_admin` and `content_authorizer` can use this draft-preview endpoint. A successful response includes:

```json
{
  "data": {
    "launchable": true,
    "resource_id": 10,
    "resource_version_id": 21,
    "launch_url": "/api/studio/runtime/<short-lived-token>/index.html",
    "expires_in_seconds": 300,
    "sandbox": ["allow-scripts"],
    "controls": {
      "reload": true,
      "fullscreen": true,
      "download": true
    },
    "fallback": {
      "type": "download",
      "endpoint": "/api/studio/resource-versions/21/download"
    }
  }
}
```

The frontend should place `launch_url` in an iframe whose `sandbox` value is exactly the returned permissions. It must not add `allow-same-origin`.

### Runtime assets and fallback download

- `GET /api/studio/runtime/:launchToken/*` serves a manifest-approved package file.
- `GET /api/studio/resource-versions/:versionId/download` returns a short-lived signed URL for the original upload.

An older ZIP version without prepared runtime metadata returns `launchable: false`, `error_code: PACKAGE_NOT_PREPARED`, and the download fallback rather than failing without guidance.

## Validation and isolation

An upload is rejected when it contains an unsafe path, duplicate path, symbolic link, blocked executable/server file type, excessive file size/count, suspicious compression ratio, missing local HTML dependency, external HTML dependency, `<base href>`, or no valid HTML entry point.

Runtime delivery adds a restrictive Content Security Policy with `sandbox allow-scripts`, blocks forms, plugins, external content and parent-page access, and adds no-referrer, no-store and MIME-sniffing protections. The URL contains a short-lived, runtime-only signed token, not the user's LMS access token. Each requested file must exist in the stored immutable manifest.

## Configuration

Optional environment settings:

- `STUDIO_RUNTIME_SECRET`: separate runtime signing secret; falls back to `JWT_SECRET`.
- `STUDIO_RUNTIME_TOKEN_SECONDS`: token lifetime, constrained to 60-900 seconds; default 300.
- `STUDIO_RUNTIME_FRAME_ANCESTORS`: comma-separated allowed Studio origins; falls back to `CORS_ORIGIN`.
- `STUDIO_PACKAGE_MAX_FILES`: default 500.
- `STUDIO_PACKAGE_MAX_FILE_BYTES`: default 25 MB.
- `STUDIO_PACKAGE_MAX_TOTAL_BYTES`: default 100 MB extracted.
- `STUDIO_PACKAGE_MAX_COMPRESSION_RATIO`: default 200.

## Verification evidence

- Backend CI: 96 of 96 tests passed.
- Day 6 tests cover entry-point discovery, local dependency validation, missing dependencies, path traversal, external scripts, immutable extracted uploads, teacher denial, signed runtime launch, asset delivery and isolation headers.
- ESLint completed with zero errors for the changed runtime files.

## Integration boundary

This endpoint is intentionally an **author draft-preview** API. Teacher access must come from Developer 1's immutable published-release manifest so a teacher never launches a mutable draft Resource version. Once that published projection is available, it should issue the same restricted runtime token for the release-pinned `resource_version_id`.

SCORM behavior is not changed here; it belongs to Day 7. The teacher-facing iframe and player controls belong to the later viewer/frontend work.
