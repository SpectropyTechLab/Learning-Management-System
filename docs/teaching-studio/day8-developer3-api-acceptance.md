# Day 8 Developer 3 API Acceptance

## Scope and decision

The frontend integration surface for layouts, screens, tag discovery, previews and branch return is accepted after resolving two response inconsistencies. Newly created Screen elements now use `id`, matching Screen read and save responses. These Studio controllers now return one structured error envelope with a stable code and message.

Verification results:

- Developer 3 focused acceptance: 23 passed, 0 failed.
- Full backend regression: 130 passed, 0 failed.
- Real local database and Storage integration: publication, authorization, immutable release, HTML launch and browser ZIP launch passed.
- Focused ESLint and diff validation: passed.
- Database migration required for these Developer 3 changes: none.

## Stable success envelope

All covered endpoints return their payload inside `data`:

```json
{
  "data": {}
}
```

## Create a Screen from a layout

```http
POST /api/studio/sessions/21/screens
Content-Type: application/json
```

```json
{
  "creation_mode": "layout",
  "layout_id": 5,
  "title": "Opening",
  "elements": [
    {
      "id": "heading",
      "slotId": "title",
      "type": "title",
      "content": { "text": "Equivalent Fractions" },
      "position": {}
    }
  ]
}
```

The response uses the same `id`, `slotId`, `type`, `content` and `position` element fields returned by Screen read and save APIs. It also returns empty `tags` and `branches` arrays for a newly created Screen.

## Save tags and editable Screen content

```http
PATCH /api/studio/screens/31
Content-Type: application/json
```

```json
{
  "revision_no": 1,
  "title": "Opening",
  "screen_settings": { "grid": true },
  "tags": ["fractions", "visual"],
  "elements": [
    {
      "id": "heading",
      "slotId": "title",
      "type": "title",
      "content": { "text": "Equivalent Fractions" },
      "position": {}
    }
  ]
}
```

Tags are trimmed, lowercased and deduplicated. A stale `revision_no` returns HTTP 409.

## Discover Screen previews by tags

```http
GET /api/studio/screens/discovery?tags=fractions,visual&session_id=21
```

```json
{
  "data": {
    "query": { "tags": ["fractions", "visual"], "match": "all" },
    "screens": [
      {
        "source": "current",
        "release_id": null,
        "session_id": 21,
        "screen_id": 31,
        "screen_number": 1,
        "display_order": 0,
        "revision_no": 2,
        "title": "Opening",
        "layout_id": 5,
        "tags": ["fractions", "visual"]
      }
    ]
  }
}
```

Authors receive current Screen previews. Client and school readers receive only accessible immutable release previews.

## Enter and return from a branch

```http
POST /api/studio/branch-runs/80/enter
Content-Type: application/json
```

```json
{
  "branch_key": "repair",
  "origin": {
    "session_id": 21,
    "screen_id": 31,
    "release_id": 12,
    "reveal_state": { "step": 2 },
    "annotations": [],
    "interaction_state": { "answer": "1/3" },
    "focus": { "element_id": "question-1" }
  }
}
```

```http
POST /api/studio/branch-runs/80/return
```

The return response contains `restored_origin` separately from branch state. The frontend must restore the origin fields rather than copying branch-only annotations or interactions.

## Stable error envelope

```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Screen revision is stale; reload before saving"
  }
}
```

Branch runtime errors retain their specific codes, such as `BRANCH_DEPTH_LIMIT_REACHED`.

## Verification and blocker register

| Item | Result | Owner | Severity and schedule impact |
| --- | --- | --- | --- |
| Layout validation and version API | Passed | Dhanunjaya | None |
| Screen create, read, save and reorder API | Passed | Dhanunjaya | None |
| Tag normalization and all-tag discovery | Passed | Dhanunjaya | None |
| Current and immutable release previews | Passed | Dhanunjaya | None |
| Nested branch entry and exact origin return | Passed | Dhanunjaya | None |
| Production maximum branch depth | Awaiting product confirmation; current default is 3 | Product owner | Medium; must be fixed before frontend branch navigation is finalized |

Actual human hours must be entered by the owner in the management workbook.
