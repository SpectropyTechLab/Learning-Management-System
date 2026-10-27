# Teacher Session Tracker Workflow

## Purpose

The Teacher Session Tracker is a program-driven execution and monitoring feature where shared academic planning assets are created once at the platform layer and then consumed by entitled clients for day-to-day teaching operations.

## Core Principle

Micro schedules and lesson planners are not client-specific uploads. They are shared program-level assets uploaded by `content_authorizer`, then reused by all entitled clients who subscribe to that program.

## Role Ownership

- `content_authorizer` owns shared planning uploads and publishing
- `super_admin` owns client feature enablement and program entitlement
- `client_admin` owns operational rollout and client-wide monitoring
- `school_owner` owns school-level monitoring
- `teacher` owns daily execution updates

## End-to-End Working Flow

### 1. Content Authorizer Flow

The `content_authorizer` uploads the planning inputs program-wise:

- Micro Schedule Excel
- Lesson Planner file (`docx`, `pdf`, or supported format)

System responsibilities:

- validate upload type and structure
- parse micro schedule rows
- parse lesson planner sessions
- normalize data for mapping
- create a mapping preview

After review, the `content_authorizer` publishes the final mapped master session template for that program.

### 2. Super Admin Flow

The `super_admin` enables the Teacher Session Tracker for specific clients.

Responsibilities:

- enable or disable the `teacher_session_tracker` feature for a client
- assign which programs the client is entitled to use

This separates platform control from client operations.

### 3. Client Admin Flow

The `client_admin` can only access tracker data for entitled programs.

Responsibilities:

- view entitled programs
- generate live teaching sessions from published program templates
- assign sessions to schools, batches, dates, slots, and teachers
- grant tracker access to teachers
- monitor teacher analytics across the client

### 4. School Owner Flow

The `school_owner` should only see school-scoped tracker data.

Responsibilities:

- monitor teacher performance for their school
- view session-level status for their school
- track completed, partial, pending, and lagging sessions

The `school_owner` should not get client-wide analytics.

### 5. Teacher Flow

The `teacher` sees only assigned teaching sessions.

Responsibilities:

- open assigned session list
- update daily progress
- submit completion status
- add completion percentage
- enter topics covered and pending topics
- add remarks and update notes
- view personal analytics only

## Analytics Scope

Analytics visibility should follow hierarchy:

- `client_admin` -> all teacher analytics in that client
- `school_owner` -> only their school analytics
- `teacher` -> only self analytics

## Status Logic

The system should support these operational statuses:

- `completed`
- `partially_completed`
- `not_completed`
- `update_pending`
- `lagging`

Suggested interpretation:

- teacher marks completed -> `completed`
- teacher marks partial -> `partially_completed`
- teacher marks not completed -> `not_completed`
- planned date passed and no update -> `update_pending`
- planned date passed and work is still incomplete -> `lagging`

## MVP Scope

Included in MVP:

- micro schedule upload
- lesson planner upload
- parsing and validation
- mapping and publish flow
- client entitlement
- live session generation
- teacher access control
- teacher daily updates
- client, school, and self analytics

Out of scope for MVP:

- advanced rescheduling engine
- detailed reporting exports
- cross-client benchmarking
- automated timetable optimization
- attendance integration
