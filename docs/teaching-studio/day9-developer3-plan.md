# Day 9 Developer 3 Plan

**Owner:** Developer 3 - Dhanunjaya  
**Area:** Frontend integration - Studio entry, editor shell, blank canvas and ordered Screen navigation  
**Capacity:** 8 hours  
**Day objective:** A Content Authorizer can enter Teaching Studio, use the Session selected through Developer 2's flow, create or open a blank Screen, and navigate the Session's Screens in persisted order.

## Dependency decision

Day 9 may start because the Day 8 backend acceptance gate passed. Developer 3's backend contracts for layouts, Screens and stable error envelopes are accepted. The frontend shell must not invent a second Session model or bypass Developer 2's hierarchy and Session selection work.

| Dependency | Current evidence | Status for Day 9 | Owner / action |
| --- | --- | --- | --- |
| Day 8 backend gate | `day8-complete-handoff.md`; combined backend acceptance passed | Ready | No action before starting |
| Content Authorizer authentication | Existing `Protect`, `useAuth` and authenticated `api` client | Ready | Reuse; do not add separate Studio authentication |
| Application shell | `TeachingSessionsShell` already reuses `DashboardLayout` and role branding | Ready with adjustment | Developer 3 adds a clear Content Authorizer Studio entry and active navigation state |
| Studio route | `/teaching-studio` exists, currently permits author and reader roles | Partially ready | Day 9 authoring entry must be Content Authorizer-safe; do not expose author controls to reader roles |
| Session hierarchy/create/select | Day 9 Developer 2 scope; no dedicated Studio Session list/create route is present in the current backend route set | Blocking for the final integrated acceptance case, not for shell construction | Developer 2 supplies selected Session contract and UI integration point |
| List ordered Screens | `GET /api/studio/sessions/:sessionId/screens` returns `session_revision_no` and ordered `screens` | Ready | Developer 3 consumes after a Session ID is selected |
| Create blank Screen | `POST /api/studio/sessions/:sessionId/screens` with `{ "creation_mode": "blank" }` | Ready | Developer 3 wires the blank-screen action |
| Open one Screen | `GET /api/studio/screens/:screenId` | Ready | Developer 3 loads the selected Screen into the canvas shell |
| Persist Screen order | `PATCH /api/studio/sessions/:sessionId/screens/reorder` requires the complete ordered ID list and `session_revision_no` | Ready, optional Day 9 stretch | Navigation must display backend order even if drag reorder is deferred |
| Default layouts | Day 10 scope | Not a Day 9 dependency | Keep the Day 9 canvas genuinely blank; do not pull the layout gallery into this milestone |

## Required integration contract with Developer 2

Developer 2 remains responsible for cascading curriculum selection and separate Studio Session creation/selection. The handoff into Developer 3's editor must provide:

```ts
type SelectedStudioSession = {
  id: number;
  title: string;
  subtopicId: number;
};
```

The selected Session ID should be represented in the route, preferably:

```text
/teaching-studio/sessions/:sessionId
```

This makes refresh, direct navigation and integration testing deterministic. Until Developer 2's selection UI is merged, Developer 3 may use the route parameter with an existing fixture Session. A hard-coded production Session ID or a duplicate Session picker is not acceptable.

Before integration, confirm:

- the exact Session create/list response envelope;
- whether the selector navigates to the route or renders the editor with a selected value;
- the empty state when the hierarchy contains no Session;
- ownership of loading, invalid-selection and cross-tenant error messages.

## Implementation plan

### 1. Studio navigation entry and route boundary - 1 hour

- Add a visible Teaching Studio entry to the Content Authorizer navigation.
- Reuse the existing authenticated application layout and role branding.
- Add the Session-aware editor route while retaining a useful `/teaching-studio` entry state.
- Ensure authoring buttons are rendered only for `content_authorizer` (and `super_admin` only if product confirms it), matching server-side permissions.
- Treat route protection as UX only; continue relying on backend authorization.

### 2. Split the current prototype into an editor shell - 1.5 hours

- Refactor `TeachingStudioPage.tsx` so Day 9 is not coupled to the Day 10 layout gallery prototype.
- Introduce small focused components for:
  - Studio entry/empty state;
  - editor toolbar/header;
  - ordered Screen navigator;
  - blank canvas;
  - loading, empty and recoverable error states.
- Preserve the existing layout definitions and `SlideCanvas` for Day 10; do not delete prototype assets.

### 3. Connect ordered Screen navigation - 1.5 hours

- Load `GET /api/studio/sessions/:sessionId/screens` through the shared authenticated `api` client.
- Store both `screens` and `session_revision_no`; the revision is required by the reorder API.
- Display Screens by the backend's `display_order`, using Screen IDs as React keys and navigation identities.
- Select the first Screen after initial load unless the URL identifies another valid Screen.
- Load the selected Screen and show its title/number in the editor shell.
- Provide clear empty, 401/403, 404 and general retry states using the Day 8 structured error envelope.

### 4. Create and open a genuinely blank Screen - 1 hour

- Call `POST /api/studio/sessions/:sessionId/screens` with:

```json
{
  "creation_mode": "blank",
  "title": "Untitled Screen"
}
```

- Do not send `layout_id` or preset `elements`.
- Append or refetch using the persisted response, then select the new Screen.
- Render an empty 16:9 canvas when the Screen has no elements.
- Disable duplicate submissions and show pending, success and failure feedback.

### 5. Focused verification - 1 hour

- Verify Content Authorizer entry and route protection.
- Verify loading, no-Session-selected, no-Screens and API-failure states.
- Verify a blank Screen request contains no layout or elements.
- Verify the created Screen is selected and remains present after refetch/reopen.
- Verify ordered navigation uses stable Screen IDs rather than titles or array indexes.
- Run the frontend production build and focused lint on changed files.

### 6. Peer review - 1 hour

- Review Developer 2's selected-Session contract and error-state ownership.
- Review API typings against the accepted Day 8 payload examples.
- Check keyboard focus, accessible names, visible selection and narrow-screen behavior.
- Confirm Day 10 layout code and assets remain intact.

### 7. Integration and handoff - 1 hour

- Integrate with Developer 2's hierarchy/Session selector.
- Run the acceptance path with a real permitted Session.
- Record actual hours, changed files, test/build results and remaining blockers.
- Hand off the Session-aware shell to Day 10 without claiming layout application is complete.

## Suggested frontend structure

```text
frontend/src/features/teaching-studio/
  TeachingStudioPage.tsx
  api/studioScreensApi.ts
  components/StudioEditorShell.tsx
  components/StudioScreenNavigator.tsx
  components/BlankScreenCanvas.tsx
  types.ts
```

Use the existing `frontend/src/lib/api.ts`. Do not add another Axios instance or new package for Day 9.

## Acceptance cases

1. A signed-in Content Authorizer can see and open the Teaching Studio entry.
2. With no selected Session, Studio shows a deliberate selection prompt rather than making an invalid API request.
3. After Developer 2 selects a valid hierarchy and Session, the editor loads that Session's Screens in persisted order.
4. With no Screens, the editor shows an empty navigation state and an enabled **Create blank Screen** action.
5. Creating a blank Screen sends `creation_mode: "blank"`, creates no preset elements and opens an empty 16:9 canvas.
6. Selecting another Screen uses its stable ID and loads the correct persisted Screen.
7. Refreshing the Session route reopens the same Session without relying on transient component state.
8. Loading and API failures are visible and recoverable; the UI does not show false success.
9. Reader roles cannot use Content Authorizer author controls, and server authorization remains the final enforcement layer.
10. Frontend production build and focused lint pass.

## Out of scope for Day 9

- Applying the fourteen default layouts (Day 10).
- Custom layout forms (Day 11).
- Element editing, drag/resize and resource placement (Day 12).
- Drawing tools and teacher annotations (Day 13).
- Undo/redo and full save recovery (Day 14).
- Teacher branch entry/return UI (Day 15).

## Blocker register

| Blocker / risk | Severity | Schedule impact | Required decision |
| --- | --- | --- | --- |
| Studio Session list/create frontend contract is not yet available in the inspected routes | High for final Day 9 acceptance | Shell work can proceed; integrated hierarchy-to-blank-Screen scenario cannot close | Developer 2 supplies and demonstrates the contract |
| `/teaching-studio` currently permits reader roles although Day 9 is an authoring milestone | Medium | Risk of confusing or exposed author UI | Confirm whether the route is split into author/editor and later reader/player routes |
| Current page is a static Day 10-style layout prototype | Medium | Refactor must preserve layout assets while introducing the Day 9 shell | Keep layout catalog modules isolated and reusable |
| Production maximum branch depth remains unconfirmed | None for Day 9 | No Day 9 delay | Product owner must decide before Day 15 branch navigation |

## Definition of done

Developer 3's Day 9 scope is complete only when the Content Authorizer entry, Session-aware editor shell, blank canvas and ordered Screen navigation work against the accepted backend APIs, the Developer 2 selector handoff is integrated, verification passes, and all remaining blockers have an owner and schedule impact.
