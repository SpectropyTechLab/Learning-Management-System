# Teacher Session Tracker Backend Plan

## Overview

The Teacher Session Tracker should be built as a dedicated backend module following the project’s current layering:

- `routes/`
- `controllers/`
- `services/`
- `repositories/`
- `schemas/`

This feature should not be tightly mixed into the existing organization or admin modules.

## Suggested Backend Files

- `backend/routes/teachingSessions.routes.js`
- `backend/controllers/teachingSessions.controller.js`
- `backend/services/teachingSessions.service.js`
- `backend/repositories/teachingSessions.repository.js`
- `backend/schemas/teachingSessions.schema.js`

Optional later split if the module grows:

- `programPlanning.service.js`
- `teachingTracking.service.js`
- `teachingAnalytics.service.js`

## API Areas by Role

### 1. Content Authorizer APIs

Responsibilities:

- upload micro schedule
- list micro schedule uploads
- read parsed micro rows
- upload lesson planner
- list lesson planner uploads
- read parsed planner sessions
- run mapping preview
- publish session template version
- list published template versions

Backend work:

- validate file format
- parse source documents
- normalize rows and sessions
- create template mapping records
- store publish state

### 2. Super Admin APIs

Responsibilities:

- enable tracker feature for a client
- disable tracker feature for a client
- assign or revoke program entitlement
- list client entitlements

Backend work:

- maintain `client_entitlements`
- enforce feature and program access rules

### 3. Client Admin APIs

Responsibilities:

- list entitled programs
- generate live teaching sessions from published templates
- list teaching sessions
- assign school, batch, teacher, date, and slot
- grant or revoke teacher tracker access
- view client analytics

Backend work:

- create live `teaching_sessions`
- copy published template content into live records
- maintain `teacher_session_tracker_permissions`
- aggregate client-wide analytics

### 4. School Owner APIs

Responsibilities:

- read school-scoped teaching sessions
- read school-scoped analytics

Backend work:

- enforce school-level scope
- aggregate school-specific analytics

### 5. Teacher APIs

Responsibilities:

- list assigned sessions
- get session details
- submit daily updates
- read personal analytics
- read own session update history

Backend work:

- verify teacher permission and ownership
- create `teaching_session_updates`
- update latest live session state
- aggregate teacher self analytics

## Service Layer Logic

The service layer should own:

- file validation
- parser orchestration
- row normalization
- session normalization
- mapping rules
- publish rules
- client entitlement checks
- teacher access checks
- live session generation
- session status calculation
- analytics aggregation

## Repository Layer Logic

Repository methods should cover:

- upload metadata insert and list
- parsed micro rows insert and list
- parsed planner sessions insert and list
- template insert, list, and publish update
- entitlement insert, update, and list
- live teaching session insert, update, and list
- session update history insert and list
- teacher tracker permission insert, update, and list
- analytics queries

## Validation Plan

Validation should exist for:

- upload file type and required identifiers
- micro schedule row structure
- lesson planner session structure
- publish action requirements
- entitlement payloads
- live session generation payloads
- teacher update payloads

## Status Logic

The backend should centrally compute these statuses:

- `not_started`
- `completed`
- `partially_completed`
- `not_completed`
- `update_pending`
- `lagging`

Suggested rules:

- teacher submits completed -> `completed`
- teacher submits partial -> `partially_completed`
- teacher submits not completed -> `not_completed`
- planned date passed with no update -> `update_pending`
- planned date passed and work remains incomplete -> `lagging`

This logic should be implemented once in backend service code and reused across all endpoints.

## Permission Plan

Suggested permission keys:

- `teaching_sessions.program_upload`
- `teaching_sessions.program_publish`
- `teaching_sessions.feature_enable`
- `teaching_sessions.client_setup`
- `teaching_sessions.assign_teacher`
- `teaching_sessions.read_client`
- `teaching_sessions.read_school`
- `teaching_sessions.read_own`
- `teaching_sessions.update_own`
- `teaching_sessions.analytics_client`
- `teaching_sessions.analytics_school`
- `teaching_sessions.analytics_own`

Recommended role mapping:

- `content_authorizer` -> upload, map, publish
- `super_admin` -> feature enablement
- `client_admin` -> setup, assignment, client analytics
- `school_owner` -> school read and analytics
- `teacher` -> own read, update, and self analytics

## Execution Sequence

Recommended backend build order:

1. upload metadata and parser endpoints
2. mapping preview and publish endpoints
3. client entitlement endpoints
4. live session generation endpoints
5. teacher tracker permission endpoints
6. teacher update endpoints
7. analytics endpoints

## Integration Notes

- reuse existing `clients`, `schools`, `batches`, `users`, and `programs` tables
- reuse existing auth middleware and permission loading flow
- keep the tracker module isolated enough to evolve independently
- avoid pushing business rules into controllers
