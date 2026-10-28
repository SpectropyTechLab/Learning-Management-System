SET local check_function_bodies = off;

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON SEQUENCES FROM "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON SEQUENCES FROM "authenticated";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON SEQUENCES FROM "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT EXECUTE ON FUNCTIONS TO PUBLIC;

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON FUNCTIONS FROM "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON FUNCTIONS FROM "authenticated";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON FUNCTIONS FROM "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON TABLES FROM "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON TABLES FROM "authenticated";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON TABLES FROM "service_role";

REVOKE ALL ON FUNCTION "public"."app_claims"() FROM "anon";

REVOKE ALL ON FUNCTION "public"."app_claims"() FROM "authenticated";

REVOKE ALL ON FUNCTION "public"."app_claims"() FROM "service_role";

REVOKE ALL ON FUNCTION "public"."app_client_id"() FROM "anon";

REVOKE ALL ON FUNCTION "public"."app_client_id"() FROM "authenticated";

REVOKE ALL ON FUNCTION "public"."app_client_id"() FROM "service_role";

REVOKE ALL ON FUNCTION "public"."app_role"() FROM "anon";

REVOKE ALL ON FUNCTION "public"."app_role"() FROM "authenticated";

REVOKE ALL ON FUNCTION "public"."app_role"() FROM "service_role";

REVOKE ALL ON FUNCTION "public"."app_school_id"() FROM "anon";

REVOKE ALL ON FUNCTION "public"."app_school_id"() FROM "authenticated";

REVOKE ALL ON FUNCTION "public"."app_school_id"() FROM "service_role";

REVOKE ALL ON FUNCTION "public"."app_user_id"() FROM "anon";

REVOKE ALL ON FUNCTION "public"."app_user_id"() FROM "authenticated";

REVOKE ALL ON FUNCTION "public"."app_user_id"() FROM "service_role";

REVOKE ALL ON FUNCTION "public"."client_has_content_access"(integer, integer) FROM "anon";

REVOKE ALL ON FUNCTION "public"."client_has_content_access"(integer, integer) FROM "authenticated";

REVOKE ALL ON FUNCTION "public"."client_has_content_access"(integer, integer) FROM "service_role";

REVOKE ALL ON FUNCTION "public"."log_audit"(integer, integer, character varying, character varying, character varying, jsonb, jsonb, inet, text) FROM "anon";

REVOKE ALL ON FUNCTION "public"."log_audit"(integer, integer, character varying, character varying, character varying, jsonb, jsonb, inet, text) FROM "authenticated";

REVOKE ALL ON FUNCTION "public"."log_audit"(integer, integer, character varying, character varying, character varying, jsonb, jsonb, inet, text) FROM "service_role";

REVOKE ALL ON FUNCTION "public"."update_timestamp"() FROM "anon";

REVOKE ALL ON FUNCTION "public"."update_timestamp"() FROM "authenticated";

REVOKE ALL ON FUNCTION "public"."update_timestamp"() FROM "service_role";

REVOKE ALL ON FUNCTION "public"."user_has_permission"(integer, character varying) FROM "anon";

REVOKE ALL ON FUNCTION "public"."user_has_permission"(integer, character varying) FROM "authenticated";

REVOKE ALL ON FUNCTION "public"."user_has_permission"(integer, character varying) FROM "service_role";

REVOKE ALL ON SCHEMA "public" FROM "anon";

REVOKE ALL ON SCHEMA "public" FROM "authenticated";

REVOKE ALL ON SCHEMA "public" FROM "service_role";

REVOKE ALL ON SEQUENCE "public"."audit_logs_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."audit_logs_id_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."audit_logs_id_seq" FROM "service_role";

REVOKE ALL ON SEQUENCE "public"."batch_members_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."batch_members_id_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."batch_members_id_seq" FROM "service_role";

REVOKE ALL ON SEQUENCE "public"."batches_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."batches_id_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."batches_id_seq" FROM "service_role";

REVOKE ALL ON SEQUENCE "public"."blueprint_sections_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."blueprint_sections_id_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."blueprint_sections_id_seq" FROM "service_role";

REVOKE ALL ON SEQUENCE "public"."blueprints_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."blueprints_id_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."blueprints_id_seq" FROM "service_role";

REVOKE ALL ON SEQUENCE "public"."certificates_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."certificates_id_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."certificates_id_seq" FROM "service_role";

REVOKE ALL ON SEQUENCE "public"."chapters_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."chapters_id_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."chapters_id_seq" FROM "service_role";

REVOKE ALL ON SEQUENCE "public"."client_course_title_overrides_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."client_course_title_overrides_id_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."client_course_title_overrides_id_seq" FROM "service_role";

REVOKE ALL ON SEQUENCE "public"."client_entitlements_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."client_entitlements_id_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."client_entitlements_id_seq" FROM "service_role";

REVOKE ALL ON SEQUENCE "public"."clients_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."clients_id_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."clients_id_seq" FROM "service_role";

REVOKE ALL ON SEQUENCE "public"."community_content_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."community_content_id_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."community_content_id_seq" FROM "service_role";

REVOKE ALL ON SEQUENCE "public"."comprehension_passages_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."comprehension_passages_id_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."comprehension_passages_id_seq" FROM "service_role";

REVOKE ALL ON SEQUENCE "public"."content_entitlements_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."content_entitlements_id_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."content_entitlements_id_seq" FROM "service_role";

REVOKE ALL ON SEQUENCE "public"."content_items_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."content_items_id_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."content_items_id_seq" FROM "service_role";

REVOKE ALL ON SEQUENCE "public"."content_packs_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."content_packs_id_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."content_packs_id_seq" FROM "service_role";

REVOKE ALL ON SEQUENCE "public"."course_exams_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."course_exams_id_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."course_exams_id_seq" FROM "service_role";

REVOKE ALL ON SEQUENCE "public"."course_linked_content_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."course_linked_content_id_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."course_linked_content_id_seq" FROM "service_role";

REVOKE ALL ON SEQUENCE "public"."course_school_assignments_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."course_school_assignments_id_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."course_school_assignments_id_seq" FROM "service_role";

REVOKE ALL ON SEQUENCE "public"."courses_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."courses_id_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."courses_id_seq" FROM "service_role";

REVOKE ALL ON SEQUENCE "public"."enrollments_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."enrollments_id_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."enrollments_id_seq" FROM "service_role";

REVOKE ALL ON SEQUENCE "public"."exam_attempts_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."exam_attempts_id_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."exam_attempts_id_seq" FROM "service_role";

REVOKE ALL ON SEQUENCE "public"."exam_entitlements_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."exam_entitlements_id_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."exam_entitlements_id_seq" FROM "service_role";

REVOKE ALL ON SEQUENCE "public"."exam_questions_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."exam_questions_id_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."exam_questions_id_seq" FROM "service_role";

REVOKE ALL ON SEQUENCE "public"."exam_responses_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."exam_responses_id_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."exam_responses_id_seq" FROM "service_role";

REVOKE ALL ON SEQUENCE "public"."exam_school_assignments_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."exam_school_assignments_id_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."exam_school_assignments_id_seq" FROM "service_role";

REVOKE ALL ON SEQUENCE "public"."exam_section_chapters_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."exam_section_chapters_id_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."exam_section_chapters_id_seq" FROM "service_role";

REVOKE ALL ON SEQUENCE "public"."exam_section_topics_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."exam_section_topics_id_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."exam_section_topics_id_seq" FROM "service_role";

REVOKE ALL ON SEQUENCE "public"."exam_sections_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."exam_sections_id_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."exam_sections_id_seq" FROM "service_role";

REVOKE ALL ON SEQUENCE "public"."exams_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."exams_id_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."exams_id_seq" FROM "service_role";

REVOKE ALL ON SEQUENCE "public"."grades_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."grades_id_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."grades_id_seq" FROM "service_role";

REVOKE ALL ON SEQUENCE "public"."program_lesson_planner_sessions_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."program_lesson_planner_sessions_id_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."program_lesson_planner_sessions_id_seq" FROM "service_role";

REVOKE ALL ON SEQUENCE "public"."program_lesson_planner_uploads_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."program_lesson_planner_uploads_id_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."program_lesson_planner_uploads_id_seq" FROM "service_role";

REVOKE ALL ON SEQUENCE "public"."program_micro_schedule_rows_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."program_micro_schedule_rows_id_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."program_micro_schedule_rows_id_seq" FROM "service_role";

REVOKE ALL ON SEQUENCE "public"."program_micro_schedule_uploads_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."program_micro_schedule_uploads_id_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."program_micro_schedule_uploads_id_seq" FROM "service_role";

REVOKE ALL ON SEQUENCE "public"."program_session_templates_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."program_session_templates_id_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."program_session_templates_id_seq" FROM "service_role";

REVOKE ALL ON SEQUENCE "public"."programs_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."programs_id_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."programs_id_seq" FROM "service_role";

REVOKE ALL ON SEQUENCE "public"."question_bank_entitlements_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."question_bank_entitlements_id_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."question_bank_entitlements_id_seq" FROM "service_role";

REVOKE ALL ON SEQUENCE "public"."question_bank_school_assignments_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."question_bank_school_assignments_id_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."question_bank_school_assignments_id_seq" FROM "service_role";

REVOKE ALL ON SEQUENCE "public"."question_folders_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."question_folders_id_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."question_folders_id_seq" FROM "service_role";

REVOKE ALL ON SEQUENCE "public"."questions_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."questions_id_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."questions_id_seq" FROM "service_role";

REVOKE ALL ON SEQUENCE "public"."refresh_tokens_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."refresh_tokens_id_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."refresh_tokens_id_seq" FROM "service_role";

REVOKE ALL ON SEQUENCE "public"."role_permissions_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."role_permissions_id_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."role_permissions_id_seq" FROM "service_role";

REVOKE ALL ON SEQUENCE "public"."school_memberships_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."school_memberships_id_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."school_memberships_id_seq" FROM "service_role";

REVOKE ALL ON SEQUENCE "public"."schools_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."schools_id_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."schools_id_seq" FROM "service_role";

REVOKE ALL ON SEQUENCE "public"."student_attempts_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."student_attempts_id_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."student_attempts_id_seq" FROM "service_role";

REVOKE ALL ON SEQUENCE "public"."subjects_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."subjects_id_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."subjects_id_seq" FROM "service_role";

REVOKE ALL ON SEQUENCE "public"."teacher_session_tracker_permissions_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."teacher_session_tracker_permissions_id_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."teacher_session_tracker_permissions_id_seq" FROM "service_role";

REVOKE ALL ON SEQUENCE "public"."teaching_session_updates_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."teaching_session_updates_id_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."teaching_session_updates_id_seq" FROM "service_role";

REVOKE ALL ON SEQUENCE "public"."teaching_sessions_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."teaching_sessions_id_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."teaching_sessions_id_seq" FROM "service_role";

REVOKE ALL ON SEQUENCE "public"."topics_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."topics_id_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."topics_id_seq" FROM "service_role";

REVOKE ALL ON SEQUENCE "public"."user_permissions_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."user_permissions_id_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."user_permissions_id_seq" FROM "service_role";

REVOKE ALL ON SEQUENCE "public"."users_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."users_id_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."users_id_seq" FROM "service_role";

REVOKE ALL ON TABLE "public"."audit_logs" FROM "anon";

REVOKE ALL ON TABLE "public"."audit_logs" FROM "authenticated";

REVOKE ALL ON TABLE "public"."audit_logs" FROM "service_role";

REVOKE ALL ON TABLE "public"."batch_members" FROM "anon";

REVOKE ALL ON TABLE "public"."batch_members" FROM "authenticated";

REVOKE ALL ON TABLE "public"."batch_members" FROM "service_role";

REVOKE ALL ON TABLE "public"."batches" FROM "anon";

REVOKE ALL ON TABLE "public"."batches" FROM "authenticated";

REVOKE ALL ON TABLE "public"."batches" FROM "service_role";

REVOKE ALL ON TABLE "public"."blueprint_sections" FROM "anon";

REVOKE ALL ON TABLE "public"."blueprint_sections" FROM "authenticated";

REVOKE ALL ON TABLE "public"."blueprint_sections" FROM "service_role";

REVOKE ALL ON TABLE "public"."blueprints" FROM "anon";

REVOKE ALL ON TABLE "public"."blueprints" FROM "authenticated";

REVOKE ALL ON TABLE "public"."blueprints" FROM "service_role";

REVOKE ALL ON TABLE "public"."certificates" FROM "anon";

REVOKE ALL ON TABLE "public"."certificates" FROM "authenticated";

REVOKE ALL ON TABLE "public"."certificates" FROM "service_role";

REVOKE ALL ON TABLE "public"."chapters" FROM "anon";

REVOKE ALL ON TABLE "public"."chapters" FROM "authenticated";

REVOKE ALL ON TABLE "public"."chapters" FROM "service_role";

REVOKE ALL ON TABLE "public"."client_course_title_overrides" FROM "anon";

REVOKE ALL ON TABLE "public"."client_course_title_overrides" FROM "authenticated";

REVOKE ALL ON TABLE "public"."client_course_title_overrides" FROM "service_role";

REVOKE ALL ON TABLE "public"."client_entitlements" FROM "anon";

REVOKE ALL ON TABLE "public"."client_entitlements" FROM "authenticated";

REVOKE ALL ON TABLE "public"."client_entitlements" FROM "service_role";

REVOKE ALL ON TABLE "public"."clients" FROM "anon";

REVOKE ALL ON TABLE "public"."clients" FROM "authenticated";

REVOKE ALL ON TABLE "public"."clients" FROM "service_role";

REVOKE ALL ON TABLE "public"."community_content" FROM "anon";

REVOKE ALL ON TABLE "public"."community_content" FROM "authenticated";

REVOKE ALL ON TABLE "public"."community_content" FROM "service_role";

REVOKE ALL ON TABLE "public"."comprehension_passages" FROM "anon";

REVOKE ALL ON TABLE "public"."comprehension_passages" FROM "authenticated";

REVOKE ALL ON TABLE "public"."comprehension_passages" FROM "service_role";

REVOKE ALL ON TABLE "public"."content_entitlements" FROM "anon";

REVOKE ALL ON TABLE "public"."content_entitlements" FROM "authenticated";

REVOKE ALL ON TABLE "public"."content_entitlements" FROM "service_role";

REVOKE ALL ON TABLE "public"."content_items" FROM "anon";

REVOKE ALL ON TABLE "public"."content_items" FROM "authenticated";

REVOKE ALL ON TABLE "public"."content_items" FROM "service_role";

REVOKE ALL ON TABLE "public"."content_pack_items" FROM "anon";

REVOKE ALL ON TABLE "public"."content_pack_items" FROM "authenticated";

REVOKE ALL ON TABLE "public"."content_pack_items" FROM "service_role";

REVOKE ALL ON TABLE "public"."content_pack_items_backup_20260330" FROM "anon";

REVOKE ALL ON TABLE "public"."content_pack_items_backup_20260330" FROM "authenticated";

REVOKE ALL ON TABLE "public"."content_pack_items_backup_20260330" FROM "service_role";

REVOKE ALL ON TABLE "public"."content_packs" FROM "anon";

REVOKE ALL ON TABLE "public"."content_packs" FROM "authenticated";

REVOKE ALL ON TABLE "public"."content_packs" FROM "service_role";

REVOKE ALL ON TABLE "public"."course_exams" FROM "anon";

REVOKE ALL ON TABLE "public"."course_exams" FROM "authenticated";

REVOKE ALL ON TABLE "public"."course_exams" FROM "service_role";

REVOKE ALL ON TABLE "public"."course_linked_content" FROM "anon";

REVOKE ALL ON TABLE "public"."course_linked_content" FROM "authenticated";

REVOKE ALL ON TABLE "public"."course_linked_content" FROM "service_role";

REVOKE ALL ON TABLE "public"."course_school_assignments" FROM "anon";

REVOKE ALL ON TABLE "public"."course_school_assignments" FROM "authenticated";

REVOKE ALL ON TABLE "public"."course_school_assignments" FROM "service_role";

REVOKE ALL ON TABLE "public"."courses" FROM "anon";

REVOKE ALL ON TABLE "public"."courses" FROM "authenticated";

REVOKE ALL ON TABLE "public"."courses" FROM "service_role";

REVOKE ALL ON TABLE "public"."enrollments" FROM "anon";

REVOKE ALL ON TABLE "public"."enrollments" FROM "authenticated";

REVOKE ALL ON TABLE "public"."enrollments" FROM "service_role";

REVOKE ALL ON TABLE "public"."exam_attempts" FROM "anon";

REVOKE ALL ON TABLE "public"."exam_attempts" FROM "authenticated";

REVOKE ALL ON TABLE "public"."exam_attempts" FROM "service_role";

REVOKE ALL ON TABLE "public"."exam_entitlements" FROM "anon";

REVOKE ALL ON TABLE "public"."exam_entitlements" FROM "authenticated";

REVOKE ALL ON TABLE "public"."exam_entitlements" FROM "service_role";

REVOKE ALL ON TABLE "public"."exam_questions" FROM "anon";

REVOKE ALL ON TABLE "public"."exam_questions" FROM "authenticated";

REVOKE ALL ON TABLE "public"."exam_questions" FROM "service_role";

REVOKE ALL ON TABLE "public"."exam_responses" FROM "anon";

REVOKE ALL ON TABLE "public"."exam_responses" FROM "authenticated";

REVOKE ALL ON TABLE "public"."exam_responses" FROM "service_role";

REVOKE ALL ON TABLE "public"."exam_school_assignments" FROM "anon";

REVOKE ALL ON TABLE "public"."exam_school_assignments" FROM "authenticated";

REVOKE ALL ON TABLE "public"."exam_school_assignments" FROM "service_role";

REVOKE ALL ON TABLE "public"."exam_section_chapters" FROM "anon";

REVOKE ALL ON TABLE "public"."exam_section_chapters" FROM "authenticated";

REVOKE ALL ON TABLE "public"."exam_section_chapters" FROM "service_role";

REVOKE ALL ON TABLE "public"."exam_section_topics" FROM "anon";

REVOKE ALL ON TABLE "public"."exam_section_topics" FROM "authenticated";

REVOKE ALL ON TABLE "public"."exam_section_topics" FROM "service_role";

REVOKE ALL ON TABLE "public"."exam_sections" FROM "anon";

REVOKE ALL ON TABLE "public"."exam_sections" FROM "authenticated";

REVOKE ALL ON TABLE "public"."exam_sections" FROM "service_role";

REVOKE ALL ON TABLE "public"."exams" FROM "anon";

REVOKE ALL ON TABLE "public"."exams" FROM "authenticated";

REVOKE ALL ON TABLE "public"."exams" FROM "service_role";

REVOKE ALL ON TABLE "public"."grades" FROM "anon";

REVOKE ALL ON TABLE "public"."grades" FROM "authenticated";

REVOKE ALL ON TABLE "public"."grades" FROM "service_role";

REVOKE ALL ON TABLE "public"."program_lesson_planner_sessions" FROM "anon";

REVOKE ALL ON TABLE "public"."program_lesson_planner_sessions" FROM "authenticated";

REVOKE ALL ON TABLE "public"."program_lesson_planner_sessions" FROM "service_role";

REVOKE ALL ON TABLE "public"."program_lesson_planner_uploads" FROM "anon";

REVOKE ALL ON TABLE "public"."program_lesson_planner_uploads" FROM "authenticated";

REVOKE ALL ON TABLE "public"."program_lesson_planner_uploads" FROM "service_role";

REVOKE ALL ON TABLE "public"."program_micro_schedule_rows" FROM "anon";

REVOKE ALL ON TABLE "public"."program_micro_schedule_rows" FROM "authenticated";

REVOKE ALL ON TABLE "public"."program_micro_schedule_rows" FROM "service_role";

REVOKE ALL ON TABLE "public"."program_micro_schedule_uploads" FROM "anon";

REVOKE ALL ON TABLE "public"."program_micro_schedule_uploads" FROM "authenticated";

REVOKE ALL ON TABLE "public"."program_micro_schedule_uploads" FROM "service_role";

REVOKE ALL ON TABLE "public"."program_session_templates" FROM "anon";

REVOKE ALL ON TABLE "public"."program_session_templates" FROM "authenticated";

REVOKE ALL ON TABLE "public"."program_session_templates" FROM "service_role";

REVOKE ALL ON TABLE "public"."programs" FROM "anon";

REVOKE ALL ON TABLE "public"."programs" FROM "authenticated";

REVOKE ALL ON TABLE "public"."programs" FROM "service_role";

REVOKE ALL ON TABLE "public"."question_bank_entitlements" FROM "anon";

REVOKE ALL ON TABLE "public"."question_bank_entitlements" FROM "authenticated";

REVOKE ALL ON TABLE "public"."question_bank_entitlements" FROM "service_role";

REVOKE ALL ON TABLE "public"."question_bank_school_assignments" FROM "anon";

REVOKE ALL ON TABLE "public"."question_bank_school_assignments" FROM "authenticated";

REVOKE ALL ON TABLE "public"."question_bank_school_assignments" FROM "service_role";

REVOKE ALL ON TABLE "public"."question_folders" FROM "anon";

REVOKE ALL ON TABLE "public"."question_folders" FROM "authenticated";

REVOKE ALL ON TABLE "public"."question_folders" FROM "service_role";

REVOKE ALL ON TABLE "public"."questions" FROM "anon";

REVOKE ALL ON TABLE "public"."questions" FROM "authenticated";

REVOKE ALL ON TABLE "public"."questions" FROM "service_role";

REVOKE ALL ON TABLE "public"."refresh_tokens" FROM "anon";

REVOKE ALL ON TABLE "public"."refresh_tokens" FROM "authenticated";

REVOKE ALL ON TABLE "public"."refresh_tokens" FROM "service_role";

REVOKE ALL ON TABLE "public"."role_permissions" FROM "anon";

REVOKE ALL ON TABLE "public"."role_permissions" FROM "authenticated";

REVOKE ALL ON TABLE "public"."role_permissions" FROM "service_role";

REVOKE ALL ON TABLE "public"."school_memberships" FROM "anon";

REVOKE ALL ON TABLE "public"."school_memberships" FROM "authenticated";

REVOKE ALL ON TABLE "public"."school_memberships" FROM "service_role";

REVOKE ALL ON TABLE "public"."schools" FROM "anon";

REVOKE ALL ON TABLE "public"."schools" FROM "authenticated";

REVOKE ALL ON TABLE "public"."schools" FROM "service_role";

REVOKE ALL ON TABLE "public"."student_attempts" FROM "anon";

REVOKE ALL ON TABLE "public"."student_attempts" FROM "authenticated";

REVOKE ALL ON TABLE "public"."student_attempts" FROM "service_role";

REVOKE ALL ON TABLE "public"."subjects" FROM "anon";

REVOKE ALL ON TABLE "public"."subjects" FROM "authenticated";

REVOKE ALL ON TABLE "public"."subjects" FROM "service_role";

REVOKE ALL ON TABLE "public"."teacher_session_tracker_permissions" FROM "anon";

REVOKE ALL ON TABLE "public"."teacher_session_tracker_permissions" FROM "authenticated";

REVOKE ALL ON TABLE "public"."teacher_session_tracker_permissions" FROM "service_role";

REVOKE ALL ON TABLE "public"."teaching_session_updates" FROM "anon";

REVOKE ALL ON TABLE "public"."teaching_session_updates" FROM "authenticated";

REVOKE ALL ON TABLE "public"."teaching_session_updates" FROM "service_role";

REVOKE ALL ON TABLE "public"."teaching_sessions" FROM "anon";

REVOKE ALL ON TABLE "public"."teaching_sessions" FROM "authenticated";

REVOKE ALL ON TABLE "public"."teaching_sessions" FROM "service_role";

REVOKE ALL ON TABLE "public"."topics" FROM "anon";

REVOKE ALL ON TABLE "public"."topics" FROM "authenticated";

REVOKE ALL ON TABLE "public"."topics" FROM "service_role";

REVOKE ALL ON TABLE "public"."user_permissions" FROM "anon";

REVOKE ALL ON TABLE "public"."user_permissions" FROM "authenticated";

REVOKE ALL ON TABLE "public"."user_permissions" FROM "service_role";

REVOKE ALL ON TABLE "public"."users" FROM "anon";

REVOKE ALL ON TABLE "public"."users" FROM "authenticated";

REVOKE ALL ON TABLE "public"."users" FROM "service_role";

REVOKE ALL ON TABLE "public"."client_content_access" FROM "anon";

REVOKE ALL ON TABLE "public"."client_content_access" FROM "authenticated";

REVOKE ALL ON TABLE "public"."client_content_access" FROM "service_role";

REVOKE ALL ON TABLE "public"."user_hierarchy" FROM "anon";

REVOKE ALL ON TABLE "public"."user_hierarchy" FROM "authenticated";

REVOKE ALL ON TABLE "public"."user_hierarchy" FROM "service_role";

COMMENT ON SCHEMA "public" IS NULL;

ALTER TABLE "public"."blueprints"
  DROP CONSTRAINT "blueprints_status_check";

ALTER TABLE "public"."client_entitlements"
  DROP CONSTRAINT "client_entitlements_entitlement_type_check";

ALTER TABLE "public"."content_entitlements"
  DROP CONSTRAINT "content_entitlements_status_check";

ALTER TABLE "public"."enrollments"
  DROP CONSTRAINT "enrollments_role_check";

ALTER TABLE "public"."exam_attempts"
  DROP CONSTRAINT "exam_attempts_status_check";

ALTER TABLE "public"."exam_entitlements"
  DROP CONSTRAINT "exam_entitlements_entitlement_type_check";

ALTER TABLE "public"."exam_questions"
  DROP CONSTRAINT "exam_questions_question_group_type_check";

ALTER TABLE "public"."exam_sections"
  DROP CONSTRAINT "exam_sections_completion_status_check";

ALTER TABLE "public"."exams"
  DROP CONSTRAINT "exams_status_check";

ALTER TABLE "public"."program_lesson_planner_sessions"
  DROP CONSTRAINT "program_lesson_planner_sessions_part_type_check";

ALTER TABLE "public"."program_lesson_planner_uploads"
  DROP CONSTRAINT "program_lesson_planner_uploads_source_type_check";

ALTER TABLE "public"."program_lesson_planner_uploads"
  DROP CONSTRAINT "program_lesson_planner_uploads_status_check";

ALTER TABLE "public"."program_micro_schedule_uploads"
  DROP CONSTRAINT "program_micro_schedule_uploads_status_check";

ALTER TABLE "public"."program_session_templates"
  DROP CONSTRAINT "program_session_templates_mapping_status_check";

ALTER TABLE "public"."program_session_templates"
  DROP CONSTRAINT "program_session_templates_part_type_check";

ALTER TABLE "public"."question_bank_entitlements"
  DROP CONSTRAINT "question_bank_entitlements_entitlement_type_check";

ALTER TABLE "public"."questions"
  DROP CONSTRAINT "questions_difficulty_level_check";

ALTER TABLE "public"."questions"
  DROP CONSTRAINT "questions_scoring_mode_check";

ALTER TABLE "public"."questions"
  DROP CONSTRAINT "questions_status_check";

ALTER TABLE "public"."school_memberships"
  DROP CONSTRAINT "school_memberships_role_scope_check";

ALTER TABLE "public"."school_memberships"
  DROP CONSTRAINT "school_memberships_status_check";

ALTER TABLE "public"."schools"
  DROP CONSTRAINT "schools_status_check";

ALTER TABLE "public"."student_attempts"
  DROP CONSTRAINT "student_attempts_completion_status_check";

ALTER TABLE "public"."teaching_session_updates"
  DROP CONSTRAINT "teaching_session_updates_status_submitted_check";

ALTER TABLE "public"."teaching_sessions"
  DROP CONSTRAINT "teaching_sessions_part_type_check";

ALTER TABLE "public"."teaching_sessions"
  DROP CONSTRAINT "teaching_sessions_status_check";

CREATE SEQUENCE "public"."boards_id_seq" AS integer INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1 NO CYCLE;

REVOKE ALL ON SEQUENCE "public"."boards_id_seq" FROM "anon", "authenticated", "service_role";

CREATE SEQUENCE "public"."layouts_id_seq" AS integer INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1 NO CYCLE;

REVOKE ALL ON SEQUENCE "public"."layouts_id_seq" FROM "anon", "authenticated", "service_role";

CREATE SEQUENCE "public"."resource_mappings_id_seq" AS integer INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1 NO CYCLE;

REVOKE ALL ON SEQUENCE "public"."resource_mappings_id_seq" FROM "anon", "authenticated", "service_role";

CREATE SEQUENCE "public"."resources_id_seq" AS integer INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1 NO CYCLE;

REVOKE ALL ON SEQUENCE "public"."resources_id_seq" FROM "anon", "authenticated", "service_role";

CREATE SEQUENCE "public"."screens_id_seq" AS integer INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1 NO CYCLE;

REVOKE ALL ON SEQUENCE "public"."screens_id_seq" FROM "anon", "authenticated", "service_role";

CREATE SEQUENCE "public"."sessions_id_seq" AS integer INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1 NO CYCLE;

REVOKE ALL ON SEQUENCE "public"."sessions_id_seq" FROM "anon", "authenticated", "service_role";

CREATE SEQUENCE "public"."subtopics_id_seq" AS integer INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1 NO CYCLE;

REVOKE ALL ON SEQUENCE "public"."subtopics_id_seq" FROM "anon", "authenticated", "service_role";

CREATE TABLE "public"."boards" (
  "id"          integer                  NOT NULL DEFAULT nextval('public.boards_id_seq'::regclass),
  "client_id"   integer,
  "name"        character varying(120)   NOT NULL,
  "code"        character varying(40)    NOT NULL,
  "description" text,
  "is_active"   boolean                  NOT NULL DEFAULT true,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "boards_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."boards"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."boards" FROM "anon", "authenticated", "service_role";

CREATE TABLE "public"."layouts" (
  "id"               integer                  NOT NULL DEFAULT nextval('public.layouts_id_seq'::regclass),
  "client_id"        integer,
  "name"             character varying(150)   NOT NULL,
  "description"      text,
  "layout_data_json" jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "thumbnail_url"    text,
  "is_default"       boolean                  NOT NULL DEFAULT false,
  "is_active"        boolean                  NOT NULL DEFAULT true,
  "created_by"       integer,
  "created_at"       timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"       timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "layouts_layout_data_json_check" CHECK ((jsonb_typeof(layout_data_json) = 'object'::text)),
  CONSTRAINT "layouts_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."layouts"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."layouts" FROM "anon", "authenticated", "service_role";

CREATE TABLE "public"."resource_mappings" (
  "id"                 integer                  NOT NULL DEFAULT nextval('public.resource_mappings_id_seq'::regclass),
  "resource_id"        integer                  NOT NULL,
  "screen_id"          integer                  NOT NULL,
  "element_id"         text                     NOT NULL,
  "usage_details_json" jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "created_by"         integer,
  "created_at"         timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "resource_mappings_pkey" PRIMARY KEY (id),
  CONSTRAINT "resource_mappings_resource_id_screen_id_element_id_key" UNIQUE (resource_id, screen_id, element_id),
  CONSTRAINT "resource_mappings_usage_details_json_check" CHECK ((jsonb_typeof(usage_details_json) = 'object'::text))
);

ALTER TABLE "public"."resource_mappings"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."resource_mappings" FROM "anon", "authenticated", "service_role";

CREATE TABLE "public"."resources" (
  "id"                 integer                  NOT NULL DEFAULT nextval('public.resources_id_seq'::regclass),
  "client_id"          integer,
  "name"               character varying(250)   NOT NULL,
  "description"        text,
  "resource_type"      character varying(30)    NOT NULL,
  "file_url"           text,
  "file_name"          text,
  "file_type"          character varying(100),
  "file_size"          bigint,
  "thumbnail_url"      text,
  "external_url"       text,
  "resource_data_json" jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "version"            integer                  NOT NULL DEFAULT 1,
  "is_active"          boolean                  NOT NULL DEFAULT true,
  "uploaded_by"        integer,
  "created_at"         timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"         timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "resources_pkey" PRIMARY KEY (id),
  CONSTRAINT "resources_resource_data_json_check" CHECK ((jsonb_typeof(resource_data_json) = 'object'::text)),
  CONSTRAINT "resources_resource_type_check"
    CHECK
    (((resource_type)::text = ANY ((ARRAY['image'::character varying, 'video'::character varying, 'animation'::character varying, 'simulation'::character varying,
    'external_link'::character varying, 'html'::character varying, 'zip'::character varying, 'scorm'::character varying])::text[])))
);

ALTER TABLE "public"."resources"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."resources" FROM "anon", "authenticated", "service_role";

CREATE TABLE "public"."screens" (
  "id"                        integer                  NOT NULL DEFAULT nextval('public.screens_id_seq'::regclass),
  "client_id"                 integer,
  "session_id"                integer                  NOT NULL,
  "title"                     character varying(250)   NOT NULL,
  "screen_number"             integer                  NOT NULL,
  "layout_id"                 integer,
  "screen_script_file_url"    text,
  "screen_script_file_name"   text,
  "screen_script_file_type"   character varying(100),
  "screen_script_uploaded_at" timestamp with time zone,
  "screen_script_content"     jsonb,
  "elements_json"             jsonb                    NOT NULL DEFAULT '[]'::jsonb,
  "branches_json"             jsonb                    NOT NULL DEFAULT '[]'::jsonb,
  "branch_tags_json"          jsonb                    NOT NULL DEFAULT '[]'::jsonb,
  "screen_settings_json"      jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "display_order"             integer                  NOT NULL DEFAULT 0,
  "created_by"                integer,
  "created_at"                timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"                timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "screens_branch_tags_json_check" CHECK ((jsonb_typeof(branch_tags_json) = 'array'::text)),
  CONSTRAINT "screens_branches_json_check" CHECK ((jsonb_typeof(branches_json) = 'array'::text)),
  CONSTRAINT "screens_elements_json_check" CHECK ((jsonb_typeof(elements_json) = 'array'::text)),
  CONSTRAINT "screens_pkey" PRIMARY KEY (id),
  CONSTRAINT "screens_screen_script_content_check" CHECK (((screen_script_content IS NULL) OR (jsonb_typeof(screen_script_content) = ANY (ARRAY['object'::text, 'array'::text])))),
  CONSTRAINT "screens_screen_settings_json_check" CHECK ((jsonb_typeof(screen_settings_json) = 'object'::text)),
  CONSTRAINT "screens_session_id_screen_number_key" UNIQUE (session_id, screen_number)
);

ALTER TABLE "public"."screens"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."screens" FROM "anon", "authenticated", "service_role";

CREATE TABLE "public"."sessions" (
  "id"                       integer                  NOT NULL DEFAULT nextval('public.sessions_id_seq'::regclass),
  "client_id"                integer,
  "subtopic_id"              integer                  NOT NULL,
  "title"                    character varying(250)   NOT NULL,
  "description"              text,
  "session_plan_file_url"    text,
  "session_plan_file_name"   text,
  "session_plan_file_type"   character varying(100),
  "session_plan_uploaded_at" timestamp with time zone,
  "session_plan_content"     jsonb,
  "status"                   character varying(30)    NOT NULL DEFAULT 'draft'::character varying,
  "approval_comment"         text,
  "submitted_by"             integer,
  "submitted_at"             timestamp with time zone,
  "approved_by"              integer,
  "approved_at"              timestamp with time zone,
  "published_at"             timestamp with time zone,
  "created_by"               integer,
  "created_at"               timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"               timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "sessions_pkey" PRIMARY KEY (id),
  CONSTRAINT "sessions_session_plan_content_check" CHECK (((session_plan_content IS NULL) OR (jsonb_typeof(session_plan_content) = ANY (ARRAY['object'::text, 'array'::text])))),
  CONSTRAINT "sessions_status_check"
    CHECK
    (((status)::text = ANY ((ARRAY['draft'::character varying, 'submitted'::character varying, 'approved'::character varying, 'rejected'::character varying, 'published'::character
    varying])::text[])))
);

ALTER TABLE "public"."sessions"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."sessions" FROM "anon", "authenticated", "service_role";

CREATE TABLE "public"."subtopics" (
  "id"            integer                  NOT NULL DEFAULT nextval('public.subtopics_id_seq'::regclass),
  "topic_id"      integer                  NOT NULL,
  "name"          character varying(200)   NOT NULL,
  "description"   text,
  "display_order" integer                  NOT NULL DEFAULT 0,
  "is_active"     boolean                  NOT NULL DEFAULT true,
  "created_at"    timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"    timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "subtopics_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."subtopics"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."subtopics" FROM "anon", "authenticated", "service_role";

ALTER SEQUENCE "public"."boards_id_seq" OWNED BY "public"."boards"."id";

ALTER TABLE "public"."chapters"
  ADD COLUMN "display_order" integer NOT NULL DEFAULT 0;

ALTER TABLE "public"."chapters"
  ADD COLUMN "updated_at" timestamp WITH time zone NOT NULL DEFAULT now();

ALTER TABLE "public"."grades"
  ADD COLUMN "name" character varying(120);

ALTER SEQUENCE "public"."layouts_id_seq" OWNED BY "public"."layouts"."id";

ALTER TABLE "public"."programs"
  ADD COLUMN "board_id" integer;

ALTER SEQUENCE "public"."resource_mappings_id_seq" OWNED BY "public"."resource_mappings"."id";

ALTER SEQUENCE "public"."resources_id_seq" OWNED BY "public"."resources"."id";

ALTER SEQUENCE "public"."screens_id_seq" OWNED BY "public"."screens"."id";

ALTER SEQUENCE "public"."sessions_id_seq" OWNED BY "public"."sessions"."id";

ALTER TABLE "public"."subjects"
  ADD COLUMN "updated_at" timestamp WITH time zone NOT NULL DEFAULT now();

ALTER SEQUENCE "public"."subtopics_id_seq" OWNED BY "public"."subtopics"."id";

ALTER TABLE "public"."topics"
  ADD COLUMN "description" text;

ALTER TABLE "public"."topics"
  ADD COLUMN "display_order" integer NOT NULL DEFAULT 0;

ALTER TABLE "public"."topics"
  ADD COLUMN "updated_at" timestamp WITH time zone NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.client_has_content_access (
  p_client_id  integer,
  p_content_id integer
)
  RETURNS boolean
  LANGUAGE plpgsql
  AS $function$
DECLARE
  v_has_access BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM content_entitlements ce
    LEFT JOIN content_pack_items cpi ON ce.pack_id = cpi.pack_id
    WHERE ce.client_id = p_client_id
      AND ce.status = 'active'
      AND NOW() BETWEEN ce.start_at AND ce.end_at
      AND (ce.content_id = p_content_id OR cpi.content_id = p_content_id)
  ) INTO v_has_access;

  RETURN v_has_access;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_audit (
  p_client_id    integer,
  p_actor_id     integer,
  p_action       character varying,
  p_entity_type  character varying,
  p_entity_id    character varying,
  p_before_state jsonb             DEFAULT NULL::jsonb,
  p_after_state  jsonb             DEFAULT NULL::jsonb,
  p_ip_address   inet              DEFAULT NULL::inet,
  p_user_agent   text              DEFAULT NULL::text
)
  RETURNS bigint
  LANGUAGE plpgsql
  AS $function$
DECLARE
  v_log_id BIGINT;
BEGIN
  INSERT INTO audit_logs (
    client_id, actor_id, action, entity_type, entity_id,
    before_state, after_state, ip_address, user_agent
  ) VALUES (
    p_client_id, p_actor_id, p_action, p_entity_type, p_entity_id,
    p_before_state, p_after_state, p_ip_address, p_user_agent
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.user_has_permission (
  p_user_id    integer,
  p_permission character varying
)
  RETURNS boolean
  LANGUAGE plpgsql
  AS $function$
DECLARE
  v_role VARCHAR(30);
  v_client_id INTEGER;
  v_granted BOOLEAN;
BEGIN
  -- Get user's role and client_id
  SELECT role, client_id INTO v_role, v_client_id
  FROM users WHERE id = p_user_id;

  IF v_role IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check client-specific permission first, then global default
  SELECT granted INTO v_granted
  FROM role_permissions
  WHERE role = v_role
    AND permission = p_permission
    AND (client_id = v_client_id OR client_id IS NULL)
  ORDER BY client_id NULLS LAST
  LIMIT 1;

  RETURN COALESCE(v_granted, FALSE);
END;
$function$;

ALTER TABLE "public"."blueprints"
  ADD CONSTRAINT "blueprints_status_check"
    CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying])::text[])));

ALTER TABLE "public"."boards"
  ADD CONSTRAINT "boards_client_id_fkey" FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

ALTER TABLE "public"."client_entitlements"
  ADD CONSTRAINT "client_entitlements_entitlement_type_check" CHECK (((entitlement_type)::text = ANY ((ARRAY['feature'::character varying, 'program'::character varying])::text[])));

ALTER TABLE "public"."content_entitlements"
  ADD CONSTRAINT "content_entitlements_status_check"
    CHECK
    (((status)::text = ANY ((ARRAY['pending'::character varying, 'active'::character varying, 'grace'::character varying, 'expired'::character varying, 'revoked'::character
    varying])::text[])));

ALTER TABLE "public"."enrollments"
  ADD CONSTRAINT "enrollments_role_check" CHECK (((role)::text = ANY ((ARRAY['teacher'::character varying, 'student'::character varying])::text[])));

ALTER TABLE "public"."exam_attempts"
  ADD CONSTRAINT "exam_attempts_status_check"
    CHECK (((status)::text = ANY ((ARRAY['in_progress'::character varying, 'submitted'::character varying, 'graded'::character varying])::text[])));

ALTER TABLE "public"."exam_entitlements"
  ADD CONSTRAINT "exam_entitlements_entitlement_type_check" CHECK (((entitlement_type)::text = ANY ((ARRAY['feature'::character varying, 'program'::character varying])::text[])));

ALTER TABLE "public"."exam_questions"
  ADD CONSTRAINT "exam_questions_question_group_type_check"
    CHECK
    (((question_group_type IS NULL) OR ((question_group_type)::text = ANY ((ARRAY['direction'::character varying, 'similar'::character varying, 'previous_year'::character varying,
    'reference'::character varying])::text[]))));

ALTER TABLE "public"."exam_sections"
  ADD CONSTRAINT "exam_sections_completion_status_check"
    CHECK
    (((completion_status)::text = ANY ((ARRAY['pending'::character varying, 'configured'::character varying, 'generated'::character varying, 'completed'::character
    varying])::text[])));

ALTER TABLE "public"."exams"
  ADD CONSTRAINT "exams_status_check"
    CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'published'::character varying, 'active'::character varying, 'completed'::character varying])::text[])));

ALTER TABLE "public"."layouts"
  ADD CONSTRAINT "layouts_client_id_fkey" FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

ALTER TABLE "public"."layouts"
  ADD CONSTRAINT "layouts_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."program_lesson_planner_sessions"
  ADD CONSTRAINT "program_lesson_planner_sessions_part_type_check"
    CHECK (((part_type)::text = ANY ((ARRAY['teaching'::character varying, 'board_exam'::character varying])::text[])));

ALTER TABLE "public"."program_lesson_planner_uploads"
  ADD CONSTRAINT "program_lesson_planner_uploads_source_type_check"
    CHECK (((source_type)::text = ANY ((ARRAY['docx'::character varying, 'pdf'::character varying, 'excel'::character varying])::text[])));

ALTER TABLE "public"."program_lesson_planner_uploads"
  ADD CONSTRAINT "program_lesson_planner_uploads_status_check"
    CHECK
    (((status)::text = ANY ((ARRAY['draft'::character varying, 'processed'::character varying, 'published'::character varying, 'failed'::character varying, 'archived'::character
    varying])::text[])));

ALTER TABLE "public"."program_micro_schedule_uploads"
  ADD CONSTRAINT "program_micro_schedule_uploads_status_check"
    CHECK
    (((status)::text = ANY ((ARRAY['draft'::character varying, 'processed'::character varying, 'published'::character varying, 'failed'::character varying, 'archived'::character
    varying])::text[])));

ALTER TABLE "public"."program_session_templates"
  ADD CONSTRAINT "program_session_templates_mapping_status_check"
    CHECK
    (((mapping_status)::text = ANY ((ARRAY['matched'::character varying, 'unmatched_micro'::character varying, 'unmatched_planner'::character varying, 'conflict'::character
    varying])::text[])));

ALTER TABLE "public"."program_session_templates"
  ADD CONSTRAINT "program_session_templates_part_type_check" CHECK (((part_type)::text = ANY ((ARRAY['teaching'::character varying, 'board_exam'::character varying])::text[])));

ALTER TABLE "public"."programs"
  ADD CONSTRAINT "programs_board_id_fkey" FOREIGN KEY (board_id) REFERENCES public.boards(id) ON DELETE SET NULL;

ALTER TABLE "public"."question_bank_entitlements"
  ADD CONSTRAINT "question_bank_entitlements_entitlement_type_check"
    CHECK (((entitlement_type)::text = ANY ((ARRAY['feature'::character varying, 'program'::character varying])::text[])));

ALTER TABLE "public"."questions"
  ADD CONSTRAINT "questions_difficulty_level_check"
    CHECK (((difficulty_level)::text = ANY ((ARRAY['easy'::character varying, 'medium'::character varying, 'hard'::character varying])::text[])));

ALTER TABLE "public"."questions"
  ADD CONSTRAINT "questions_scoring_mode_check"
    CHECK (((scoring_mode)::text = ANY ((ARRAY['all_or_nothing'::character varying, 'partial'::character varying, 'mixed'::character varying])::text[])));

ALTER TABLE "public"."questions"
  ADD CONSTRAINT "questions_status_check"
    CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'approved'::character varying, 'rejected'::character varying, 'archived'::character varying])::text[])));

ALTER TABLE "public"."resource_mappings"
  ADD CONSTRAINT "resource_mappings_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."resources"
  ADD CONSTRAINT "resources_client_id_fkey" FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

ALTER TABLE "public"."resource_mappings"
  ADD CONSTRAINT "resource_mappings_resource_id_fkey" FOREIGN KEY (resource_id) REFERENCES public.resources(id) ON DELETE CASCADE;

ALTER TABLE "public"."resources"
  ADD CONSTRAINT "resources_uploaded_by_fkey" FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."school_memberships"
  ADD CONSTRAINT "school_memberships_role_scope_check"
    CHECK (((role_scope)::text = ANY ((ARRAY['school_owner'::character varying, 'teacher'::character varying, 'student'::character varying, 'admin'::character varying])::text[])));

ALTER TABLE "public"."school_memberships"
  ADD CONSTRAINT "school_memberships_status_check" CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying])::text[])));

ALTER TABLE "public"."schools"
  ADD CONSTRAINT "schools_status_check" CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying])::text[])));

ALTER TABLE "public"."screens"
  ADD CONSTRAINT "screens_client_id_fkey" FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

ALTER TABLE "public"."screens"
  ADD CONSTRAINT "screens_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."screens"
  ADD CONSTRAINT "screens_layout_id_fkey" FOREIGN KEY (layout_id) REFERENCES public.layouts(id) ON DELETE SET NULL;

ALTER TABLE "public"."resource_mappings"
  ADD CONSTRAINT "resource_mappings_screen_id_fkey" FOREIGN KEY (screen_id) REFERENCES public.screens(id) ON DELETE CASCADE;

ALTER TABLE "public"."sessions"
  ADD CONSTRAINT "sessions_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."sessions"
  ADD CONSTRAINT "sessions_client_id_fkey" FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

ALTER TABLE "public"."sessions"
  ADD CONSTRAINT "sessions_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."screens"
  ADD CONSTRAINT "screens_session_id_fkey" FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;

ALTER TABLE "public"."sessions"
  ADD CONSTRAINT "sessions_submitted_by_fkey" FOREIGN KEY (submitted_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."student_attempts"
  ADD CONSTRAINT "student_attempts_completion_status_check"
    CHECK
    (((completion_status)::text = ANY ((ARRAY['not attempted'::character varying, 'incomplete'::character varying, 'completed'::character varying, 'passed'::character varying,
    'failed'::character varying])::text[])));

ALTER TABLE "public"."sessions"
  ADD CONSTRAINT "sessions_subtopic_id_fkey" FOREIGN KEY (subtopic_id) REFERENCES public.subtopics(id) ON DELETE RESTRICT;

ALTER TABLE "public"."subtopics"
  ADD CONSTRAINT "subtopics_topic_id_fkey" FOREIGN KEY (topic_id) REFERENCES public.topics(id) ON DELETE CASCADE;

ALTER TABLE "public"."teaching_session_updates"
  ADD CONSTRAINT "teaching_session_updates_status_submitted_check"
    CHECK (((status_submitted)::text = ANY ((ARRAY['completed'::character varying, 'partially_completed'::character varying, 'not_completed'::character varying])::text[])));

ALTER TABLE "public"."teaching_sessions"
  ADD CONSTRAINT "teaching_sessions_part_type_check" CHECK (((part_type)::text = ANY ((ARRAY['teaching'::character varying, 'board_exam'::character varying])::text[])));

ALTER TABLE "public"."teaching_sessions"
  ADD CONSTRAINT "teaching_sessions_status_check"
    CHECK
    (((status)::text = ANY ((ARRAY['not_started'::character varying, 'completed'::character varying, 'partially_completed'::character varying, 'not_completed'::character varying,
    'update_pending'::character varying, 'lagging'::character varying])::text[])));

CREATE INDEX idx_boards_active ON public.boards USING btree (client_id, is_active);

CREATE UNIQUE INDEX idx_boards_client_code ON public.boards USING btree (COALESCE(client_id, 0), lower((code)::text));

CREATE INDEX idx_chapters_subject_order ON public.chapters USING btree (subject_id, display_order, chapter_number);

CREATE INDEX idx_layouts_client_active ON public.layouts USING btree (client_id, is_active);

CREATE INDEX idx_programs_board ON public.programs USING btree (board_id);

CREATE INDEX idx_resource_mappings_resource ON public.resource_mappings USING btree (resource_id);

CREATE INDEX idx_resource_mappings_screen ON public.resource_mappings USING btree (screen_id);

CREATE INDEX idx_resources_client_type ON public.resources USING btree (client_id, resource_type, is_active);

CREATE INDEX idx_screens_branch_tags ON public.screens USING gin (branch_tags_json);

CREATE INDEX idx_screens_session_order ON public.screens USING btree (session_id, display_order, screen_number);

CREATE INDEX idx_sessions_client_status ON public.sessions USING btree (client_id, status);

CREATE INDEX idx_sessions_subtopic ON public.sessions USING btree (subtopic_id);

CREATE INDEX idx_subjects_grade_order ON public.subjects USING btree (grade_id, display_order, name);

CREATE INDEX idx_subtopics_topic_order ON public.subtopics USING btree (topic_id, display_order, name);

CREATE INDEX idx_topics_chapter_order ON public.topics USING btree (chapter_id, display_order, topic_number);

CREATE TRIGGER trg_boards_updated
  BEFORE UPDATE ON public.boards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_timestamp();

CREATE TRIGGER trg_layouts_updated
  BEFORE UPDATE ON public.layouts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_timestamp();

CREATE TRIGGER trg_resources_updated
  BEFORE UPDATE ON public.resources
  FOR EACH ROW
  EXECUTE FUNCTION public.update_timestamp();

CREATE TRIGGER trg_screens_updated
  BEFORE UPDATE ON public.screens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_timestamp();

CREATE TRIGGER trg_sessions_updated
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_timestamp();

CREATE TRIGGER trg_subtopics_updated
  BEFORE UPDATE ON public.subtopics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_timestamp();
