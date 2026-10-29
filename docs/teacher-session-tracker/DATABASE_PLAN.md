# Teacher Session Tracker Database Plan

## Overview

The MVP uses a 9-table design that balances clarity with reduced complexity.

Logical layers:

1. Program planning uploads
2. Program session templates
3. Client entitlements
4. Teaching execution and updates

## Final 9 Tables

### 1. `program_micro_schedule_uploads`

Purpose:

- stores each uploaded micro schedule file for a program

Why needed:

- keeps file metadata, upload history, versioning, and processing state

Typical fields:

- `id`
- `program_id`
- `uploaded_by_user_id`
- `file_name`
- `file_storage_path`
- `version_no`
- `status`
- `notes`
- `created_at`
- `updated_at`

### 2. `program_micro_schedule_rows`

Purpose:

- stores parsed row-by-row micro schedule data

Why needed:

- one uploaded file contains many usable mapping rows

Typical fields:

- `id`
- `micro_schedule_upload_id`
- `program_id`
- `row_no`
- `serial_no`
- `grade_label`
- `subject_label`
- `session_label`
- `session_no`
- `chapter_label`
- `learning_goal`
- `topic_label`
- `raw_row_json`
- `normalized_key`
- `created_at`

### 3. `program_lesson_planner_uploads`

Purpose:

- stores each uploaded lesson planner file for a program

Why needed:

- keeps file metadata, source type, versioning, and processing state

Typical fields:

- `id`
- `program_id`
- `uploaded_by_user_id`
- `file_name`
- `file_storage_path`
- `source_type`
- `version_no`
- `status`
- `notes`
- `created_at`
- `updated_at`

### 4. `program_lesson_planner_sessions`

Purpose:

- stores parsed session-wise planner content

Why needed:

- the planner contains structured teaching content per session, not just file metadata

Typical fields:

- `id`
- `lesson_planner_upload_id`
- `program_id`
- `session_no`
- `session_label`
- `part_type`
- `duration_minutes`
- `title`
- `chapter_label`
- `topic_label`
- `learning_objectives`
- `materials_needed`
- `worksheet_questions_covered`
- `shortcuts_introduced`
- `common_errors_addressed`
- `homework`
- `next_session_preview`
- `pedagogy_note`
- `minute_plan_json`
- `teacher_script_text`
- `raw_source_json`
- `normalized_key`
- `created_at`

### 5. `program_session_templates`

Purpose:

- stores the final mapped master session plan for a program

Why needed:

- acts as the reusable publishable template layer consumed by clients

This table also stores mapping result state in the 9-table version.

Typical fields:

- `id`
- `program_id`
- `template_version_no`
- `grade_label`
- `subject_label`
- `session_no`
- `session_label`
- `chapter_label`
- `learning_goal`
- `topic_label`
- `planner_title`
- `part_type`
- `duration_minutes`
- `learning_objectives`
- `materials_needed`
- `worksheet_questions_covered`
- `shortcuts_introduced`
- `common_errors_addressed`
- `homework`
- `next_session_preview`
- `pedagogy_note`
- `minute_plan_json`
- `teacher_script_text`
- `micro_schedule_row_id`
- `lesson_planner_session_id`
- `mapping_status`
- `issue_details`
- `is_published`
- `published_by_user_id`
- `published_at`
- `created_at`
- `updated_at`

Suggested `mapping_status` values:

- `matched`
- `unmatched_micro`
- `unmatched_planner`
- `conflict`

### 6. `client_entitlements`

Purpose:

- stores both feature enablement and program access for clients

Why needed:

- merges feature-level and program-level entitlement control into one table

Typical fields:

- `id`
- `client_id`
- `entitlement_type`
- `feature_key`
- `program_id`
- `enabled`
- `assigned_by_user_id`
- `assigned_at`
- `created_at`
- `updated_at`

Suggested `entitlement_type` values:

- `feature`
- `program`

### 7. `teaching_sessions`

Purpose:

- stores live client/school/batch/teacher teaching sessions

Why needed:

- converts shared templates into real operational sessions

Typical fields:

- `id`
- `client_id`
- `school_id`
- `batch_id`
- `program_id`
- `program_session_template_id`
- `grade_label`
- `subject_label`
- `chapter_label`
- `session_no`
- `session_label`
- `part_type`
- `planned_date`
- `period_slot`
- `duration_minutes`
- `teacher_user_id`
- `learning_goal`
- `topic_label`
- `planner_title`
- `learning_objectives`
- `materials_needed`
- `worksheet_questions_covered`
- `shortcuts_introduced`
- `common_errors_addressed`
- `homework`
- `next_session_preview`
- `pedagogy_note`
- `minute_plan_json`
- `teacher_script_text`
- `status`
- `completion_percentage`
- `actual_date`
- `topics_covered`
- `pending_topics`
- `reason_code`
- `remarks`
- `last_updated_by_user_id`
- `last_updated_at`
- `created_at`
- `updated_at`

Suggested `status` values:

- `not_started`
- `completed`
- `partially_completed`
- `not_completed`
- `update_pending`
- `lagging`

### 8. `teaching_session_updates`

Purpose:

- stores teacher update history for each live session

Why needed:

- keeps a full audit trail while `teaching_sessions` stores latest state

Typical fields:

- `id`
- `teaching_session_id`
- `teacher_user_id`
- `status_submitted`
- `completion_percentage`
- `actual_date`
- `topics_covered`
- `pending_topics`
- `reason_code`
- `remarks`
- `created_at`

### 9. `teacher_session_tracker_permissions`

Purpose:

- stores which teachers can access and update the tracker

Why needed:

- allows `client_admin` to control tracker access independently from basic account access

Typical fields:

- `id`
- `client_id`
- `teacher_user_id`
- `school_id`
- `batch_id`
- `program_id`
- `can_view_tracker`
- `can_update_tracker`
- `granted_by_user_id`
- `created_at`
- `updated_at`

## Relationship Plan

- one `program_micro_schedule_uploads` -> many `program_micro_schedule_rows`
- one `program_lesson_planner_uploads` -> many `program_lesson_planner_sessions`
- many parsed records -> many `program_session_templates`
- one client -> many `client_entitlements`
- one `program_session_templates` row -> many `teaching_sessions`
- one `teaching_sessions` row -> many `teaching_session_updates`

Existing tables to reuse:

- `programs`
- `clients`
- `schools`
- `batches`
- `users`

## Mapping Logic

Recommended mapping key:

- `program_id`
- `grade_label`
- `subject_label`
- `session_no`
- optionally `chapter_label`

Do not map primarily by topic text because planner text is more detailed and may vary.

## Publish Logic

Flow:

1. upload micro schedule
2. parse micro rows
3. upload lesson planner
4. parse planner sessions
5. run mapping
6. store results in `program_session_templates`
7. publish only `matched` rows

## Entitlement Logic

`client_entitlements` should hold:

- tracker feature enablement
- program access entitlements

Clients must have both:

- tracker feature enabled
- program entitlement active

before live sessions are generated.

## Analytics Scope

Analytics can be derived directly from `teaching_sessions`:

- `client_admin` -> filter by `client_id`
- `school_owner` -> filter by `school_id`
- `teacher` -> filter by `teacher_user_id`

No separate analytics table is required for MVP.
