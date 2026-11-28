# Teaching Studio Gap Bridge Feature Specification

**Status:** Product behavior confirmed; Milestones 1-5 implemented locally (database migration not yet deployed)  
**Date:** 27 November 2026  
**Scope:** Authoring, publication, and teacher presentation runtime for version 1

## 1. Purpose

Gap Bridge lets an author attach optional supporting content to one specific Screen. During a live lesson, a teacher can temporarily open that content to address a knowledge gap and then return to the parent Screen at the exact point where teaching paused.

Gap Bridge is not a replacement for the existing Branching feature:

| Capability | Branching | Gap Bridge |
|---|---|---|
| Selection owner | Teacher during teaching | Author during design |
| Content selection | Search and filter related published content | Named targets curated for the current Screen |
| Scope | Flexible discovery | Specific parent Screen only |
| Teacher presentation | Teacher chooses any available result | Teacher chooses only author-configured Gap Bridges |
| Navigation | Independent related content | Temporary child view that returns to its parent |

Gap Bridge is also separate from Screen/Section Zoom. Zoom is an element-driven presentation path; Gap Bridge is a Screen-level author-curated teaching aid.

## 2. Confirmed product contract

1. A Gap Bridge belongs to exactly one parent Screen.
2. A parent Screen may have multiple Gap Bridges.
3. Every Gap Bridge has an author-provided, teacher-facing name.
4. Every Gap Bridge contains exactly one target Screen in version 1.
5. A target is one of:
   - a locally created child Screen owned by the source Session; or
   - an existing main or Gap Bridge child Screen from another published Session.
6. An external target cannot come from the same Session as the parent Screen.
7. A local child Screen:
   - is owned by the source Session;
   - appears beneath its parent in the authoring navigator;
   - is excluded from the main Screen numbering and linear presentation flow;
   - is reviewed and published with the source Session; and
   - cannot own another Gap Bridge in version 1.
8. An external target remains part of its original Session. Gap Bridge stores a reference and does not copy or move it.
9. Teachers see Gap Bridges only after the source Session is approved and published.
10. At runtime, an external target resolves from the destination Session's most recent published release.
11. Publishing a newer destination release does not require republishing the source Session.
12. If the target Screen is absent from the destination Session's latest published release, the Gap Bridge is unavailable and the teacher receives a controlled message.
13. Opening a Gap Bridge does not alter the main presentation sequence.
14. Previous, Next, Return, Close, and Escape from an open Gap Bridge return to its parent Screen.
15. Returning restores the parent at the same point where the teacher left it.
16. Gap Bridge has a separate teacher control from Branching.
17. Nested Gap Bridges and Gap Bridge analytics are outside version 1.

## 3. Terminology

- **Source Session:** The Session being authored and presented.
- **Parent Screen:** The numbered main-flow Screen that owns a Gap Bridge.
- **Local child Screen:** A Screen authored specifically for one parent and published with the source Session.
- **External target Screen:** A stable Screen identity belonging to another Session.
- **Source release:** The approved immutable release containing the parent and its Gap Bridge definitions.
- **Destination release:** The latest published release of an external target's Session.

## 4. Authoring experience

### 4.1 Command placement

Add a dedicated contextual **Gap Bridge** ribbon at the far-right end. It is hidden during normal editing. The existing **Insert > Navigation > Gap Bridge** command shows and opens that ribbon and its right-side pane. Selecting a Gap Bridge child in the Screen navigator also shows and activates the ribbon; selecting a normal Screen hides it again.

The ribbon provides Add (Create new child or Select existing), Edit, Preview, Delete, ordering, and a command to show or hide the Gap Bridge pane.

The command is disabled when:

- no Screen is selected;
- the editor is read-only; or
- the selected Screen is itself a Gap Bridge child.

### 4.2 Management pane

The right-side pane shows the parent Screen and only its Gap Bridges as children. Every child has a three-dot action menu and supports:

- listing their names and target summaries;
- adding a locally created child Screen;
- selecting an external published Screen;
- previewing a target;
- renaming a Gap Bridge;
- changing a target by deleting the Gap Bridge and creating a new one;
- reordering multiple Gap Bridges;
- removing a Gap Bridge; and
- opening a local child Screen in the normal Screen editor.

Names are required, trimmed, and unique within a parent Screen using case-insensitive comparison. Recommended maximum length is 120 characters.

### 4.3 Screen navigator

The authoring navigator displays local child Screens beneath their parent without assigning normal Screen numbers:

```text
Screen 1
Screen 2
  Gap Bridge: Review fractions
  Gap Bridge: Worked example
Screen 3
```

External targets may also appear beneath the parent as mapped items, but must be visually distinguished from locally owned child Screens. Opening an external item provides a read-only preview; it must not edit the destination Session.

Main Screen reordering must ignore child Screens. Moving a parent moves its visual subtree in the navigator without changing Gap Bridge order.

### 4.4 Creating a local child

Creating a local child must atomically create both the child Screen and its Gap Bridge definition. The author then edits the child with the existing Screen canvas and element tools.

Removing a local-child Gap Bridge must require confirmation because its child content is owned exclusively by that mapping. Confirmation deletes the draft child and its elements. Removing an external mapping deletes only the mapping.

## 5. External target selection

Each result is a labeled Screen card with a miniature rendered from its immutable published snapshot. The card identifies the published Screen title, main Screen or Gap Bridge child type, parent Screen for a child, Session, Topic, and release number.

The picker searches Screens from other Sessions' latest published releases. It must:

- use the source Session's Chapter as its discovery boundary, matching Branching;
- present results as Chapter, Topic, Session, then Screen hierarchy;
- exclude the current source Session;
- return only Sessions and Screens the author is permitted to discover;
- enforce the existing client/tenant boundary;
- never return drafts or unpublished revisions;
- include both main Screens and published Gap Bridge child Screens;
- show child Screens both nested under their original parent and in an all-results view with a child label;
- reuse all Branching filters: text, Topic, Subtopic, tags, pedagogy, Bloom level, and target exam; and
- show destination Session, Screen title/number, curriculum context, and latest release number.

The stored external locator is the destination `session_id` plus stable `screen_id`. It intentionally does not pin a release number.

External references are soft runtime references rather than ownership relationships. Deleting or republishing destination content must not mutate an already published source release. The resolver validates the locator against the destination's latest release each time it is opened.

## 6. Proposed persistence model

Gap Bridge must not reuse `screen_branches`. The existing table requires same-Session destinations and represents a different feature and runtime contract.

### 6.1 Screens

Extend `screens` with:

```text
screen_kind       main | gap_bridge_child, default main
parent_screen_id  nullable self-reference to screens.id
```

Rules:

- `main` requires `parent_screen_id IS NULL`.
- `gap_bridge_child` requires a parent in the same Session.
- The parent must be `main`.
- A child cannot be used as another child's parent.
- Main Screens retain required `screen_number` values.
- Child Screens have no user-visible `screen_number`.

The current `(session_id, screen_number)` uniqueness must become a partial uniqueness rule for main Screens. `screen_number` should be nullable for child Screens. Existing main rows remain unchanged.

### 6.2 Gap Bridges

Proposed logical table:

```text
gap_bridges
  id
  source_session_id
  source_screen_id
  name
  target_kind              child | external
  child_screen_id          nullable
  external_session_id      nullable
  external_screen_id       nullable
  display_order
  created_by
  created_at
  updated_at
```

Required invariants:

- The source Screen is a main Screen in `source_session_id`.
- `child` requires only `child_screen_id`.
- The child belongs to `source_session_id` and names `source_screen_id` as its parent.
- `external` requires only `external_session_id` and `external_screen_id`.
- An external Session cannot equal `source_session_id`.
- A local child is owned by exactly one Gap Bridge.
- Display order is unique within a source Screen.
- A normalized name is unique within a source Screen.
- Mutations return the source Session to draft and increment its revision through the existing workflow mechanism.

Database constraints should enforce structural invariants. Service validation should enforce publication, tenant, role, and latest-release rules.

## 7. Proposed author API

All endpoints use existing Studio authentication, tenant checks, author roles, and stale-revision protection.

```text
GET    /api/studio/screens/:screenId/gap-bridges
POST   /api/studio/screens/:screenId/gap-bridges/external
POST   /api/studio/screens/:screenId/gap-bridges/child
PATCH  /api/studio/gap-bridges/:gapBridgeId
DELETE /api/studio/gap-bridges/:gapBridgeId
PATCH  /api/studio/screens/:screenId/gap-bridges/reorder
GET    /api/studio/gap-bridge-targets
```

Example external creation request:

```json
{
  "name": "Review fractions",
  "external_session_id": 205,
  "external_screen_id": 981,
  "source_session_revision_no": 14
}
```

Example local-child creation request:

```json
{
  "name": "Worked example",
  "title": "Worked example",
  "creation_mode": "blank",
  "source_session_revision_no": 14
}
```

Mutations are atomic. A stale source revision returns `409`; invalid relationships return `422`; inaccessible content returns `403`; missing records return `404`.

## 8. Publication contract

Publishing the source Session freezes:

- parent-to-Gap-Bridge membership;
- teacher-facing names;
- order;
- target kinds and locators; and
- complete local child Screen content and resource versions.

The main `manifest.screens` array must continue to contain only numbered main-flow Screens so existing Previous/Next behavior remains linear.

Recommended manifest extension:

```json
{
  "manifest_version": 5,
  "screens": [],
  "gap_bridges": [
    {
      "gap_bridge_id": 41,
      "source_screen_id": 120,
      "name": "Review fractions",
      "display_order": 0,
      "target_kind": "external",
      "external_target": {
        "session_id": 205,
        "screen_id": 981
      }
    },
    {
      "gap_bridge_id": 42,
      "source_screen_id": 120,
      "name": "Worked example",
      "display_order": 1,
      "target_kind": "child",
      "child_screen_id": 1220
    }
  ],
  "gap_bridge_screens": [
    {
      "screen_id": 1220,
      "parent_screen_id": 120,
      "title": "Worked example",
      "elements": []
    }
  ]
}
```

Local child content is an immutable source-release snapshot. External content is not embedded; its logical locator is resolved dynamically.

Publication validation fails when:

- a local child is missing or invalid;
- a child is attached to more than one mapping;
- nesting is detected;
- a name is blank or duplicated for the parent;
- an external target is in the source Session;
- an external target has no published destination at publication time; or
- tenant/security rules are violated.

## 9. Teacher runtime contract

### 9.1 Availability and control

The player derives available Gap Bridges from the current source release and current parent Screen.

- Show a distinct Gap Bridge button when at least one bridge is available for the current parent.
- Do not combine it with the existing Branching button or discovery panel.
- Hide or disable it on Screens without Gap Bridges.
- Selecting it shows the ordered author-provided names.

### 9.2 Target resolution

Local child targets load directly from `gap_bridge_screens` in the source manifest.

External targets require a protected resolver:

```text
GET /api/studio/published-releases/:sourceReleaseId/gap-bridges/:gapBridgeId/resolve
```

The resolver must:

1. verify teacher access to the published source release;
2. verify that the bridge belongs to that immutable release;
3. load the destination Session's latest published release;
4. find the stable destination Screen ID in that release;
5. return only the resolved Screen payload needed for presentation; and
6. return a controlled unavailable response when resolution fails.

Recommended unavailable response:

```json
{
  "error": {
    "code": "GAP_BRIDGE_TARGET_UNAVAILABLE",
    "message": "This Gap Bridge content is no longer available in the latest published Session."
  }
}
```

An approved bridge should authorize presentation of only its resolved target Screen within the same tenant; it must not expose the rest of the destination Session or bypass the tenant boundary.

### 9.3 Parent-state preservation

Before opening a Gap Bridge, capture a return checkpoint containing at least:

- source release, Session, and parent Screen IDs;
- animation/build step and triggered cues;
- teacher annotations and annotation history for the parent;
- selected/focused element;
- active embedded resource or simulation identity;
- serializable embedded interaction state where supported;
- presentation zoom and relevant viewport state;
- blank-screen mode and media playback state where applicable; and
- presenter/audience synchronization state.

The preferred frontend architecture is to keep the parent presentation mounted and show the Gap Bridge in a temporary presentation layer. This preserves React and embedded runtime state more reliably than navigating away and reconstructing the parent. Parent media and simulations must be paused or suspended while the bridge is open so they do not continue invisibly.

Returning must remove the temporary layer, restore the checkpoint, resume eligible paused content, and broadcast the restored parent state to the audience/presenter channel.

Gap Bridge state is ephemeral in version 1. It does not create analytics events or persistent branch-run history. A full browser refresh may restart the normal published player unless a broader player-resume feature is implemented separately.

### 9.4 Navigation while open

Because a Gap Bridge contains one Screen:

- Previous returns to the parent.
- Next returns to the parent.
- Return/Close returns to the parent.
- Escape returns to the parent.
- Main Screen numbering and progress remain unchanged.
- The target Screen cannot expose its own Gap Bridge control.

## 10. Permissions and security

- Author mutations use the existing Studio author roles.
- Teachers can only discover Gap Bridges contained in an approved published source release they can access.
- External selection and runtime resolution enforce client/tenant isolation server-side.
- A bridge grants access only to its one resolved Screen, not the complete destination Session.
- Draft local child content is never returned through teacher published APIs.
- External target metadata must not reveal inaccessible draft or administrative information.

## 11. Version 1 exclusions

- Nested Gap Bridges
- Multiple Screens inside one Gap Bridge
- Conditional or automatic Gap Bridge triggers
- Student-selected Gap Bridges
- Gap Bridge usage analytics
- Persistent Gap Bridge run history
- Cross-tenant targets
- Editing an external target from the source editor
- Automatically converting an external target into a local copy

## 12. Acceptance criteria

### Authoring

- An author can create multiple named Gap Bridges for a main Screen.
- An author can create and edit a local child without adding it to main numbering.
- An author can select a Screen only from another Session's published content.
- External selection never returns the current Session or drafts.
- The navigator shows local children beneath their parent.
- Main Screen reordering and numbering exclude child Screens.
- A child cannot own a Gap Bridge.
- Rename, reorder, preview, and remove operations persist correctly; target replacement is rejected.
- Every mutation returns the source Session to draft and participates in revision conflict handling.

### Review and publication

- Teachers cannot see draft Gap Bridge changes.
- Review validation identifies broken local children and invalid external locators.
- A published release contains ordered definitions and complete local child snapshots.
- Main Screens remain the only entries in the linear `screens` manifest list.

### Teacher presentation

- Gap Bridge and Branching have separate controls.
- The Gap Bridge control appears only for a parent with published definitions.
- The teacher sees the author's names in the configured order.
- A local child opens without entering normal Screen navigation.
- An external target resolves from the destination's latest published release.
- A newer destination publication is used without republishing the source.
- A removed destination Screen produces a controlled unavailable message.
- Previous, Next, Close, Return, and Escape restore the parent.
- Animation position, annotations, focus, embedded interaction state, and presenter/audience state are restored to the point where the teacher left.
- The target cannot open a nested Gap Bridge.

### Regression and security

- Existing Branching discovery behavior is unchanged.
- Existing Zoom behavior is unchanged.
- Existing published releases without `gap_bridges` continue to play.
- Tenant boundaries and role checks are enforced for every authoring and runtime request.
- Teachers cannot use the resolver to retrieve arbitrary destination Screens.

## 13. Recommended implementation sequence

1. Add schema migration and database constraints.
2. Add service validation and author CRUD APIs.
3. Update Screen listing, numbering, reordering, deletion, and workflow validation for child Screens.
4. Add author picker, management panel, and navigator hierarchy.
5. Extend publication manifest generation and validation.
6. Add protected latest-release runtime resolution.
7. Add the separate teacher control and temporary presentation layer.
8. Implement checkpoint capture/restoration and presenter/audience synchronization.
9. Add backend, frontend model, component, and end-to-end acceptance tests.
10. Verify existing Branching, Zoom, publication, and linear navigation regressions before release.
