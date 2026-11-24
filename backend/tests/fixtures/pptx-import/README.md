# PPTX Import Fixtures

Phase 0 uses two fixture classes:

1. A deterministic synthetic PPTX generated in `tests/studio-pptx-fixture-inspection.test.js` for automated package inspection tests.
2. Local acceptance decks identified by SHA-256 in `fixture-manifest.json`.

Large or proprietary decks are intentionally not committed. A local deck is the expected fixture only when its SHA-256 matches the manifest. Do not add user-specific absolute paths to the repository.

Inspect a password-free fixture without extracting or executing it:

```powershell
node scripts/inspect-pptx-fixture.mjs "C:\path\to\fixture.pptx" --summary
```

Run the fixture tests:

```powershell
node --test --test-concurrency=1 --experimental-test-isolation=none tests/studio-pptx-fixture-inspection.test.js
```

Encrypted/password-protected files are rejection fixtures. The importer must request a password-free `.pptx` and must not attempt password recovery.
