# Teacher Session Tracker Frontend Plan

## Overview

The Teacher Session Tracker should be built as a dedicated feature area, not as a large extension inside the existing `OrgDashboard` page.

Recommended frontend structure:

- `frontend/src/features/teaching-sessions/`
- `frontend/src/pages/teaching-sessions/`

## Frontend Goals

- support role-based flows cleanly
- separate platform planning UI from client execution UI
- keep screens modular and reusable
- allow progressive rollout by role

## Role-Based Screen Plan

### Content Authorizer Screens

1. `ProgramMicroScheduleUploadPage`
- upload Excel
- validate file
- preview parsed micro rows
- show upload/version status

2. `ProgramLessonPlannerUploadPage`
- upload planner file
- preview extracted planner sessions
- show upload/version status

3. `ProgramSessionMappingPage`
- show matched rows
- show unmatched or conflict rows
- provide review before publish

4. `ProgramSessionTemplatePublishPage`
- publish mapped template version
- list published and historical versions

### Super Admin Screens

5. `ClientTrackerEntitlementPage`
- enable or disable tracker for a client
- assign entitled programs to a client

### Client Admin Screens

6. `ClientTeachingSessionSetupPage`
- list entitled programs
- generate live teaching sessions
- assign school, batch, date, slot, and teacher

7. `TeacherTrackerPermissionPage`
- grant or revoke teacher tracker access

8. `ClientTeachingAnalyticsPage`
- show client-wide analytics
- filter by school, program, teacher, date, and status

### School Owner Screens

9. `SchoolTeachingAnalyticsPage`
- show school-only analytics
- monitor teacher performance and session status

### Teacher Screens

10. `TeacherSessionListPage`
- show assigned sessions
- today, upcoming, overdue, and completed views

11. `TeacherSessionUpdatePage`
- submit daily update
- update completion percentage
- add covered topics, pending topics, and remarks

12. `TeacherMyAnalyticsPage`
- show personal session analytics and recent update history

## Route Plan

Suggested route groups:

- `/content-authorizer/teaching-sessions/micro-schedule`
- `/content-authorizer/teaching-sessions/lesson-planner`
- `/content-authorizer/teaching-sessions/mapping`
- `/content-authorizer/teaching-sessions/templates`

- `/superadmin/teaching-sessions/entitlements`

- `/admin/teaching-sessions/setup`
- `/admin/teaching-sessions/permissions`
- `/admin/teaching-sessions/analytics`

- `/school-owner/teaching-sessions/analytics`

- `/teacher/teaching-sessions`
- `/teacher/teaching-sessions/:sessionId/update`
- `/teacher/teaching-sessions/analytics`

## Component Plan

Reusable components:

- `FileUploadCard`
- `UploadPreviewTable`
- `MappingSummaryCards`
- `MappingIssuesTable`
- `SessionTemplateTable`
- `EntitlementManager`
- `TeachingSessionFilters`
- `TeachingSessionTable`
- `TeacherSessionUpdateForm`
- `StatusBadge`
- `AnalyticsSummaryCards`

## State and Data Responsibilities

Frontend responsibilities:

- file upload initiation
- showing validation and parsing results
- presenting mapping review UI
- session generation forms
- permission management forms
- analytics filters and dashboards
- teacher update form interactions

Backend responsibilities that should not be duplicated in frontend:

- parsing logic
- mapping logic
- status calculation
- permission enforcement
- analytics aggregation rules

## UX Guidance

- keep role experiences separated
- show only relevant program/session scope for each role
- clearly distinguish draft uploads from published templates
- highlight status counts prominently for analytics views
- keep teacher update flow fast and form-focused

## Recommended Rollout Order

1. content authorizer upload pages
2. mapping and publish pages
3. super admin entitlement page
4. client admin setup page
5. client admin teacher permission page
6. teacher session list and update page
7. analytics pages for client, school, and teacher
