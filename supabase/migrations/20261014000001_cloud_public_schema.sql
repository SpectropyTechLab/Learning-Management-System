


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."app_claims"() RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    AS $$
  select coalesce(current_setting('request.jwt.claims', true)::jsonb, '{}'::jsonb);
$$;


ALTER FUNCTION "public"."app_claims"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."app_client_id"() RETURNS integer
    LANGUAGE "sql" STABLE
    AS $$
  SELECT NULLIF((auth.jwt() ->> 'client_id'), '')::INTEGER;
$$;


ALTER FUNCTION "public"."app_client_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."app_role"() RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  SELECT COALESCE(auth.jwt() ->> 'role', '');
$$;


ALTER FUNCTION "public"."app_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."app_school_id"() RETURNS integer
    LANGUAGE "sql" STABLE
    AS $$
  select nullif(app_claims()->>'school_id','')::int;
$$;


ALTER FUNCTION "public"."app_school_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."app_user_id"() RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  select coalesce(app_claims()->>'user_id', '');
$$;


ALTER FUNCTION "public"."app_user_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."client_has_content_access"("p_client_id" integer, "p_content_id" integer) RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."client_has_content_access"("p_client_id" integer, "p_content_id" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_audit"("p_client_id" integer, "p_actor_id" integer, "p_action" character varying, "p_entity_type" character varying, "p_entity_id" character varying, "p_before_state" "jsonb" DEFAULT NULL::"jsonb", "p_after_state" "jsonb" DEFAULT NULL::"jsonb", "p_ip_address" "inet" DEFAULT NULL::"inet", "p_user_agent" "text" DEFAULT NULL::"text") RETURNS bigint
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."log_audit"("p_client_id" integer, "p_actor_id" integer, "p_action" character varying, "p_entity_type" character varying, "p_entity_id" character varying, "p_before_state" "jsonb", "p_after_state" "jsonb", "p_ip_address" "inet", "p_user_agent" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_has_permission"("p_user_id" integer, "p_permission" character varying) RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."user_has_permission"("p_user_id" integer, "p_permission" character varying) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" bigint NOT NULL,
    "client_id" integer,
    "actor_id" integer NOT NULL,
    "action" character varying(100) NOT NULL,
    "entity_type" character varying(50) NOT NULL,
    "entity_id" character varying(50) NOT NULL,
    "before_state" "jsonb",
    "after_state" "jsonb",
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."audit_logs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."audit_logs_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."audit_logs_id_seq" OWNED BY "public"."audit_logs"."id";



CREATE TABLE IF NOT EXISTS "public"."batch_members" (
    "id" integer NOT NULL,
    "batch_id" integer NOT NULL,
    "user_id" integer NOT NULL,
    "is_primary" boolean DEFAULT false,
    "joined_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."batch_members" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."batch_members_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."batch_members_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."batch_members_id_seq" OWNED BY "public"."batch_members"."id";



CREATE TABLE IF NOT EXISTS "public"."batches" (
    "id" integer NOT NULL,
    "client_id" integer NOT NULL,
    "school_id" integer NOT NULL,
    "name" character varying(255) NOT NULL,
    "code" character varying(50),
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."batches" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."batches_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."batches_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."batches_id_seq" OWNED BY "public"."batches"."id";



CREATE TABLE IF NOT EXISTS "public"."blueprint_sections" (
    "id" integer NOT NULL,
    "blueprint_id" integer NOT NULL,
    "section_name" character varying(150) NOT NULL,
    "required_question_count" integer NOT NULL,
    "display_order" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "direction_question_count" integer DEFAULT 0 NOT NULL,
    "similar_question_count" integer DEFAULT 0 NOT NULL,
    "previous_year_question_count" integer DEFAULT 0 NOT NULL,
    "reference_question_count" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "blueprint_sections_display_order_check" CHECK (("display_order" > 0)),
    CONSTRAINT "blueprint_sections_distribution_check" CHECK ((("direction_question_count" >= 0) AND ("similar_question_count" >= 0) AND ("previous_year_question_count" >= 0) AND ("reference_question_count" >= 0) AND (((("direction_question_count" + "similar_question_count") + "previous_year_question_count") + "reference_question_count") = "required_question_count"))),
    CONSTRAINT "blueprint_sections_required_question_count_check" CHECK (("required_question_count" > 0))
);


ALTER TABLE "public"."blueprint_sections" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."blueprint_sections_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."blueprint_sections_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."blueprint_sections_id_seq" OWNED BY "public"."blueprint_sections"."id";



CREATE TABLE IF NOT EXISTS "public"."blueprints" (
    "id" integer NOT NULL,
    "client_id" integer NOT NULL,
    "school_id" integer,
    "name" character varying(255) NOT NULL,
    "status" character varying(20) DEFAULT 'active'::character varying NOT NULL,
    "created_by" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "blueprints_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying])::"text"[])))
);


ALTER TABLE "public"."blueprints" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."blueprints_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."blueprints_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."blueprints_id_seq" OWNED BY "public"."blueprints"."id";



CREATE TABLE IF NOT EXISTS "public"."certificates" (
    "id" integer NOT NULL,
    "user_id" integer NOT NULL,
    "course_id" integer NOT NULL,
    "issued_at" timestamp with time zone DEFAULT "now"(),
    "certificate_url" "text"
);


ALTER TABLE "public"."certificates" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."certificates_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."certificates_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."certificates_id_seq" OWNED BY "public"."certificates"."id";



CREATE TABLE IF NOT EXISTS "public"."chapters" (
    "id" integer NOT NULL,
    "subject_id" integer NOT NULL,
    "name" character varying(200) NOT NULL,
    "chapter_number" integer NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."chapters" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."chapters_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."chapters_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."chapters_id_seq" OWNED BY "public"."chapters"."id";



CREATE TABLE IF NOT EXISTS "public"."clients" (
    "id" integer NOT NULL,
    "name" character varying(255) NOT NULL,
    "slug" character varying(100) NOT NULL,
    "timezone" character varying(50) DEFAULT 'Asia/Kolkata'::character varying,
    "settings" "jsonb" DEFAULT '{}'::"jsonb",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."clients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."content_entitlements" (
    "id" integer NOT NULL,
    "client_id" integer NOT NULL,
    "content_id" integer,
    "pack_id" integer,
    "start_at" timestamp with time zone NOT NULL,
    "end_at" timestamp with time zone NOT NULL,
    "status" character varying(20) DEFAULT 'pending'::character varying,
    "granted_by" integer NOT NULL,
    "granted_at" timestamp with time zone DEFAULT "now"(),
    "revoked_at" timestamp with time zone,
    "notes" "text",
    "course_id" integer,
    CONSTRAINT "content_entitlements_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'active'::character varying, 'grace'::character varying, 'expired'::character varying, 'revoked'::character varying])::"text"[]))),
    CONSTRAINT "content_or_pack_required" CHECK ((("content_id" IS NOT NULL) OR ("pack_id" IS NOT NULL)))
);


ALTER TABLE "public"."content_entitlements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."content_items" (
    "id" integer NOT NULL,
    "course_id" integer NOT NULL,
    "parent_id" integer,
    "item_type" character varying(20) NOT NULL,
    "title" "text" NOT NULL,
    "content_url" "text",
    "order_index" integer DEFAULT 0,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."content_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."content_pack_items" (
    "pack_id" integer NOT NULL,
    "item_id" integer NOT NULL
);


ALTER TABLE "public"."content_pack_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."courses" (
    "id" integer NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "created_by" integer,
    "published" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "client_id" integer,
    "school_id" integer,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "courses_title_check" CHECK (("length"("title") > 0))
);


ALTER TABLE "public"."courses" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."client_content_access" AS
 SELECT "ci"."id" AS "content_id",
    "ci"."title" AS "content_title",
    "ci"."item_type",
    "co"."id" AS "course_id",
    "co"."title" AS "course_title",
    "ce"."client_id",
    "c"."name" AS "client_name",
    "ce"."status" AS "entitlement_status",
    "ce"."start_at",
    "ce"."end_at",
        CASE
            WHEN ((("ce"."status")::"text" = 'active'::"text") AND (("now"() >= "ce"."start_at") AND ("now"() <= "ce"."end_at"))) THEN true
            ELSE false
        END AS "has_active_access"
   FROM (((("public"."content_items" "ci"
     JOIN "public"."courses" "co" ON (("ci"."course_id" = "co"."id")))
     LEFT JOIN "public"."content_pack_items" "cpi" ON (("ci"."id" = "cpi"."item_id")))
     LEFT JOIN "public"."content_entitlements" "ce" ON ((("ce"."content_id" = "ci"."id") OR ("ce"."pack_id" = "cpi"."pack_id"))))
     LEFT JOIN "public"."clients" "c" ON (("ce"."client_id" = "c"."id")));


ALTER VIEW "public"."client_content_access" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_course_title_overrides" (
    "id" integer NOT NULL,
    "client_id" integer NOT NULL,
    "course_id" integer NOT NULL,
    "title" "text" NOT NULL,
    "updated_by" integer,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."client_course_title_overrides" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."client_course_title_overrides_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."client_course_title_overrides_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."client_course_title_overrides_id_seq" OWNED BY "public"."client_course_title_overrides"."id";



CREATE TABLE IF NOT EXISTS "public"."client_entitlements" (
    "id" integer NOT NULL,
    "client_id" integer NOT NULL,
    "entitlement_type" character varying(20) NOT NULL,
    "feature_key" character varying(100),
    "program_id" integer,
    "enabled" boolean DEFAULT true NOT NULL,
    "assigned_by_user_id" integer NOT NULL,
    "assigned_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "client_entitlements_entitlement_type_check" CHECK ((("entitlement_type")::"text" = ANY ((ARRAY['feature'::character varying, 'program'::character varying])::"text"[]))),
    CONSTRAINT "client_entitlements_scope_check" CHECK ((((("entitlement_type")::"text" = 'feature'::"text") AND ("feature_key" IS NOT NULL) AND ("program_id" IS NULL)) OR ((("entitlement_type")::"text" = 'program'::"text") AND ("program_id" IS NOT NULL) AND ("feature_key" IS NULL))))
);


ALTER TABLE "public"."client_entitlements" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."client_entitlements_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."client_entitlements_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."client_entitlements_id_seq" OWNED BY "public"."client_entitlements"."id";



CREATE SEQUENCE IF NOT EXISTS "public"."clients_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."clients_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."clients_id_seq" OWNED BY "public"."clients"."id";



CREATE TABLE IF NOT EXISTS "public"."community_content" (
    "id" integer NOT NULL,
    "school_name" "text" NOT NULL,
    "area" "text",
    "state" "text",
    "date" "date",
    "session" "text",
    "title" "text" NOT NULL,
    "description" "text",
    "media" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_by" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."community_content" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."community_content_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."community_content_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."community_content_id_seq" OWNED BY "public"."community_content"."id";



CREATE TABLE IF NOT EXISTS "public"."comprehension_passages" (
    "id" integer NOT NULL,
    "client_id" integer,
    "school_id" integer,
    "title" "jsonb" NOT NULL,
    "passage_content" "jsonb" NOT NULL,
    "program_id" integer,
    "grade_id" integer,
    "subject_id" integer,
    "chapter_id" integer,
    "topic_id" integer,
    "legacy_question_id" integer,
    "created_by" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."comprehension_passages" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."comprehension_passages_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."comprehension_passages_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."comprehension_passages_id_seq" OWNED BY "public"."comprehension_passages"."id";



CREATE SEQUENCE IF NOT EXISTS "public"."content_entitlements_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."content_entitlements_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."content_entitlements_id_seq" OWNED BY "public"."content_entitlements"."id";



CREATE SEQUENCE IF NOT EXISTS "public"."content_items_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."content_items_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."content_items_id_seq" OWNED BY "public"."content_items"."id";



CREATE TABLE IF NOT EXISTS "public"."content_pack_items_backup_20260330" (
    "pack_id" integer NOT NULL,
    "item_id" integer NOT NULL,
    "backup_reason" "text" NOT NULL,
    "backed_up_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."content_pack_items_backup_20260330" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."content_packs" (
    "id" integer NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "created_by" integer,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."content_packs" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."content_packs_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."content_packs_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."content_packs_id_seq" OWNED BY "public"."content_packs"."id";



CREATE TABLE IF NOT EXISTS "public"."course_exams" (
    "id" integer NOT NULL,
    "course_id" integer NOT NULL,
    "exam_id" integer NOT NULL,
    "assigned_by" integer,
    "assigned_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."course_exams" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."course_exams_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."course_exams_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."course_exams_id_seq" OWNED BY "public"."course_exams"."id";



CREATE TABLE IF NOT EXISTS "public"."course_linked_content" (
    "id" integer NOT NULL,
    "course_id" integer NOT NULL,
    "content_item_id" integer NOT NULL,
    "source_pack_id" integer,
    "parent_content_id" integer NOT NULL,
    "order_index" integer DEFAULT 0 NOT NULL,
    "linked_by" integer,
    "linked_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."course_linked_content" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."course_linked_content_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."course_linked_content_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."course_linked_content_id_seq" OWNED BY "public"."course_linked_content"."id";



CREATE TABLE IF NOT EXISTS "public"."course_school_assignments" (
    "id" integer NOT NULL,
    "course_id" integer NOT NULL,
    "school_id" integer NOT NULL,
    "assigned_by" integer,
    "assigned_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."course_school_assignments" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."course_school_assignments_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."course_school_assignments_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."course_school_assignments_id_seq" OWNED BY "public"."course_school_assignments"."id";



CREATE SEQUENCE IF NOT EXISTS "public"."courses_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."courses_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."courses_id_seq" OWNED BY "public"."courses"."id";



CREATE TABLE IF NOT EXISTS "public"."enrollments" (
    "id" integer NOT NULL,
    "user_id" integer NOT NULL,
    "course_id" integer NOT NULL,
    "role" character varying(10) NOT NULL,
    "enrolled_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "enrollments_role_check" CHECK ((("role")::"text" = ANY ((ARRAY['teacher'::character varying, 'student'::character varying])::"text"[])))
);


ALTER TABLE "public"."enrollments" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."enrollments_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."enrollments_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."enrollments_id_seq" OWNED BY "public"."enrollments"."id";



CREATE TABLE IF NOT EXISTS "public"."exam_attempts" (
    "id" integer NOT NULL,
    "exam_id" integer NOT NULL,
    "student_id" integer NOT NULL,
    "attempt_number" integer DEFAULT 1 NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "submitted_at" timestamp with time zone,
    "auto_submitted" boolean DEFAULT false,
    "total_score" numeric(10,2),
    "total_correct" integer,
    "total_wrong" integer,
    "total_unattempted" integer,
    "status" character varying(20) DEFAULT 'in_progress'::character varying,
    CONSTRAINT "exam_attempts_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['in_progress'::character varying, 'submitted'::character varying, 'graded'::character varying])::"text"[])))
);


ALTER TABLE "public"."exam_attempts" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."exam_attempts_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."exam_attempts_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."exam_attempts_id_seq" OWNED BY "public"."exam_attempts"."id";



CREATE TABLE IF NOT EXISTS "public"."exam_entitlements" (
    "id" integer NOT NULL,
    "client_id" integer NOT NULL,
    "entitlement_type" character varying(20) NOT NULL,
    "feature_key" character varying(100),
    "program_id" integer,
    "enabled" boolean DEFAULT true NOT NULL,
    "assigned_by_user_id" integer NOT NULL,
    "assigned_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "exam_entitlements_entitlement_type_check" CHECK ((("entitlement_type")::"text" = ANY ((ARRAY['feature'::character varying, 'program'::character varying])::"text"[]))),
    CONSTRAINT "exam_entitlements_scope_check" CHECK ((((("entitlement_type")::"text" = 'feature'::"text") AND ("feature_key" IS NOT NULL) AND ("program_id" IS NULL)) OR ((("entitlement_type")::"text" = 'program'::"text") AND ("program_id" IS NOT NULL) AND ("feature_key" IS NULL))))
);


ALTER TABLE "public"."exam_entitlements" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."exam_entitlements_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."exam_entitlements_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."exam_entitlements_id_seq" OWNED BY "public"."exam_entitlements"."id";



CREATE TABLE IF NOT EXISTS "public"."exam_questions" (
    "id" integer NOT NULL,
    "section_id" integer NOT NULL,
    "question_id" integer NOT NULL,
    "order_index" integer NOT NULL,
    "marks_override" numeric(5,2),
    "negative_override" numeric(5,2),
    "question_group_type" character varying(30),
    "generated_from_topic_selection" boolean DEFAULT true NOT NULL,
    CONSTRAINT "exam_questions_question_group_type_check" CHECK ((("question_group_type" IS NULL) OR (("question_group_type")::"text" = ANY ((ARRAY['direction'::character varying, 'similar'::character varying, 'previous_year'::character varying, 'reference'::character varying])::"text"[]))))
);


ALTER TABLE "public"."exam_questions" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."exam_questions_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."exam_questions_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."exam_questions_id_seq" OWNED BY "public"."exam_questions"."id";



CREATE TABLE IF NOT EXISTS "public"."exam_responses" (
    "id" integer NOT NULL,
    "attempt_id" integer NOT NULL,
    "question_id" integer NOT NULL,
    "section_id" integer NOT NULL,
    "student_answer" "jsonb",
    "is_correct" boolean,
    "marks_awarded" numeric(5,2),
    "is_marked_for_review" boolean DEFAULT false,
    "is_attempted" boolean DEFAULT false,
    "answered_at" timestamp with time zone
);


ALTER TABLE "public"."exam_responses" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."exam_responses_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."exam_responses_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."exam_responses_id_seq" OWNED BY "public"."exam_responses"."id";



CREATE TABLE IF NOT EXISTS "public"."exam_school_assignments" (
    "id" integer NOT NULL,
    "exam_id" integer NOT NULL,
    "school_id" integer NOT NULL,
    "assigned_by" integer,
    "assigned_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."exam_school_assignments" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."exam_school_assignments_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."exam_school_assignments_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."exam_school_assignments_id_seq" OWNED BY "public"."exam_school_assignments"."id";



CREATE TABLE IF NOT EXISTS "public"."exam_section_chapters" (
    "id" integer NOT NULL,
    "exam_section_id" integer NOT NULL,
    "chapter_id" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."exam_section_chapters" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."exam_section_chapters_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."exam_section_chapters_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."exam_section_chapters_id_seq" OWNED BY "public"."exam_section_chapters"."id";



CREATE TABLE IF NOT EXISTS "public"."exam_section_topics" (
    "id" integer NOT NULL,
    "exam_section_id" integer NOT NULL,
    "topic_id" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."exam_section_topics" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."exam_section_topics_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."exam_section_topics_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."exam_section_topics_id_seq" OWNED BY "public"."exam_section_topics"."id";



CREATE TABLE IF NOT EXISTS "public"."exam_sections" (
    "id" integer NOT NULL,
    "exam_id" integer NOT NULL,
    "title" character varying(100) NOT NULL,
    "order_index" integer NOT NULL,
    "instructions" "text",
    "marks_per_question" numeric(5,2) DEFAULT 4,
    "negative_marks" numeric(5,2) DEFAULT 1,
    "blueprint_section_id" integer,
    "required_question_count" integer,
    "selected_subject_id" integer,
    "completion_status" character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    "syllabus_locked" boolean DEFAULT false NOT NULL,
    "direction_question_count" integer DEFAULT 0 NOT NULL,
    "similar_question_count" integer DEFAULT 0 NOT NULL,
    "previous_year_question_count" integer DEFAULT 0 NOT NULL,
    "reference_question_count" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "exam_sections_completion_status_check" CHECK ((("completion_status")::"text" = ANY ((ARRAY['pending'::character varying, 'configured'::character varying, 'generated'::character varying, 'completed'::character varying])::"text"[]))),
    CONSTRAINT "exam_sections_distribution_check" CHECK ((("direction_question_count" >= 0) AND ("similar_question_count" >= 0) AND ("previous_year_question_count" >= 0) AND ("reference_question_count" >= 0) AND (("required_question_count" IS NULL) OR (((("direction_question_count" + "similar_question_count") + "previous_year_question_count") + "reference_question_count") = "required_question_count")))),
    CONSTRAINT "exam_sections_required_question_count_check" CHECK ((("required_question_count" IS NULL) OR ("required_question_count" > 0)))
);


ALTER TABLE "public"."exam_sections" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."exam_sections_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."exam_sections_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."exam_sections_id_seq" OWNED BY "public"."exam_sections"."id";



CREATE TABLE IF NOT EXISTS "public"."exams" (
    "id" integer NOT NULL,
    "client_id" integer NOT NULL,
    "school_id" integer,
    "title" character varying(255) NOT NULL,
    "description" "text",
    "total_duration_minutes" integer NOT NULL,
    "start_datetime" timestamp with time zone NOT NULL,
    "end_datetime" timestamp with time zone NOT NULL,
    "shuffle_questions" boolean DEFAULT false,
    "shuffle_options" boolean DEFAULT false,
    "show_result_immediately" boolean DEFAULT true,
    "max_attempts" integer DEFAULT 1,
    "status" character varying(20) DEFAULT 'draft'::character varying,
    "created_by" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "show_score" boolean DEFAULT true,
    "show_pass_or_fail" boolean DEFAULT true,
    "show_solutions_to_user" boolean DEFAULT false,
    "instructions" "text",
    "program_id" integer,
    "blueprint_id" integer,
    CONSTRAINT "exams_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['draft'::character varying, 'published'::character varying, 'active'::character varying, 'completed'::character varying])::"text"[])))
);


ALTER TABLE "public"."exams" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."exams_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."exams_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."exams_id_seq" OWNED BY "public"."exams"."id";



CREATE TABLE IF NOT EXISTS "public"."grades" (
    "id" integer NOT NULL,
    "program_id" integer NOT NULL,
    "grade_number" integer NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."grades" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."grades_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."grades_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."grades_id_seq" OWNED BY "public"."grades"."id";



CREATE TABLE IF NOT EXISTS "public"."program_lesson_planner_sessions" (
    "id" bigint NOT NULL,
    "lesson_planner_upload_id" integer NOT NULL,
    "program_id" integer NOT NULL,
    "session_no" integer NOT NULL,
    "session_label" character varying(100) NOT NULL,
    "part_type" character varying(20) DEFAULT 'teaching'::character varying NOT NULL,
    "duration_minutes" integer,
    "title" "text" NOT NULL,
    "chapter_label" character varying(255),
    "topic_label" "text",
    "learning_objectives" "jsonb" DEFAULT '[]'::"jsonb",
    "materials_needed" "text",
    "worksheet_questions_covered" "text",
    "shortcuts_introduced" "text",
    "common_errors_addressed" "text",
    "homework" "text",
    "next_session_preview" "text",
    "pedagogy_note" "text",
    "minute_plan_json" "jsonb" DEFAULT '[]'::"jsonb",
    "teacher_script_text" "text",
    "raw_source_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "normalized_key" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "program_lesson_planner_sessions_duration_minutes_check" CHECK ((("duration_minutes" IS NULL) OR ("duration_minutes" > 0))),
    CONSTRAINT "program_lesson_planner_sessions_part_type_check" CHECK ((("part_type")::"text" = ANY ((ARRAY['teaching'::character varying, 'board_exam'::character varying])::"text"[]))),
    CONSTRAINT "program_lesson_planner_sessions_session_no_check" CHECK (("session_no" > 0))
);


ALTER TABLE "public"."program_lesson_planner_sessions" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."program_lesson_planner_sessions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."program_lesson_planner_sessions_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."program_lesson_planner_sessions_id_seq" OWNED BY "public"."program_lesson_planner_sessions"."id";



CREATE TABLE IF NOT EXISTS "public"."program_lesson_planner_uploads" (
    "id" integer NOT NULL,
    "program_id" integer NOT NULL,
    "uploaded_by_user_id" integer NOT NULL,
    "file_name" "text" NOT NULL,
    "file_storage_path" "text" NOT NULL,
    "source_type" character varying(20) DEFAULT 'docx'::character varying NOT NULL,
    "version_no" integer DEFAULT 1 NOT NULL,
    "status" character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "grade_id" integer,
    "subject_id" integer,
    "micro_schedule_upload_id" integer,
    "target_session_no" integer,
    CONSTRAINT "program_lesson_planner_uploads_source_type_check" CHECK ((("source_type")::"text" = ANY ((ARRAY['docx'::character varying, 'pdf'::character varying, 'excel'::character varying])::"text"[]))),
    CONSTRAINT "program_lesson_planner_uploads_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['draft'::character varying, 'processed'::character varying, 'published'::character varying, 'failed'::character varying, 'archived'::character varying])::"text"[]))),
    CONSTRAINT "program_lesson_planner_uploads_version_no_check" CHECK (("version_no" > 0))
);


ALTER TABLE "public"."program_lesson_planner_uploads" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."program_lesson_planner_uploads_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."program_lesson_planner_uploads_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."program_lesson_planner_uploads_id_seq" OWNED BY "public"."program_lesson_planner_uploads"."id";



CREATE TABLE IF NOT EXISTS "public"."program_micro_schedule_rows" (
    "id" bigint NOT NULL,
    "micro_schedule_upload_id" integer NOT NULL,
    "program_id" integer NOT NULL,
    "row_no" integer NOT NULL,
    "serial_no" integer,
    "grade_label" character varying(100) NOT NULL,
    "subject_label" character varying(150) NOT NULL,
    "session_label" character varying(100) NOT NULL,
    "session_no" integer NOT NULL,
    "chapter_label" character varying(255) NOT NULL,
    "learning_goal" "text",
    "topic_label" "text",
    "raw_row_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "normalized_key" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "planned_date" "date",
    CONSTRAINT "program_micro_schedule_rows_row_no_check" CHECK (("row_no" > 0)),
    CONSTRAINT "program_micro_schedule_rows_session_no_check" CHECK (("session_no" > 0))
);


ALTER TABLE "public"."program_micro_schedule_rows" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."program_micro_schedule_rows_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."program_micro_schedule_rows_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."program_micro_schedule_rows_id_seq" OWNED BY "public"."program_micro_schedule_rows"."id";



CREATE TABLE IF NOT EXISTS "public"."program_micro_schedule_uploads" (
    "id" integer NOT NULL,
    "program_id" integer NOT NULL,
    "uploaded_by_user_id" integer NOT NULL,
    "file_name" "text" NOT NULL,
    "file_storage_path" "text" NOT NULL,
    "version_no" integer DEFAULT 1 NOT NULL,
    "status" character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "grade_id" integer,
    "subject_id" integer,
    CONSTRAINT "program_micro_schedule_uploads_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['draft'::character varying, 'processed'::character varying, 'published'::character varying, 'failed'::character varying, 'archived'::character varying])::"text"[]))),
    CONSTRAINT "program_micro_schedule_uploads_version_no_check" CHECK (("version_no" > 0))
);


ALTER TABLE "public"."program_micro_schedule_uploads" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."program_micro_schedule_uploads_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."program_micro_schedule_uploads_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."program_micro_schedule_uploads_id_seq" OWNED BY "public"."program_micro_schedule_uploads"."id";



CREATE TABLE IF NOT EXISTS "public"."program_session_templates" (
    "id" bigint NOT NULL,
    "program_id" integer NOT NULL,
    "template_version_no" integer DEFAULT 1 NOT NULL,
    "grade_label" character varying(100) NOT NULL,
    "subject_label" character varying(150) NOT NULL,
    "session_no" integer NOT NULL,
    "session_label" character varying(100) NOT NULL,
    "chapter_label" character varying(255),
    "learning_goal" "text",
    "topic_label" "text",
    "planner_title" "text",
    "part_type" character varying(20) DEFAULT 'teaching'::character varying NOT NULL,
    "duration_minutes" integer,
    "learning_objectives" "jsonb" DEFAULT '[]'::"jsonb",
    "materials_needed" "text",
    "worksheet_questions_covered" "text",
    "shortcuts_introduced" "text",
    "common_errors_addressed" "text",
    "homework" "text",
    "next_session_preview" "text",
    "pedagogy_note" "text",
    "minute_plan_json" "jsonb" DEFAULT '[]'::"jsonb",
    "teacher_script_text" "text",
    "micro_schedule_row_id" bigint,
    "lesson_planner_session_id" bigint,
    "mapping_status" character varying(20) DEFAULT 'matched'::character varying NOT NULL,
    "issue_details" "jsonb" DEFAULT '{}'::"jsonb",
    "is_published" boolean DEFAULT false,
    "published_by_user_id" integer,
    "published_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "program_session_templates_duration_minutes_check" CHECK ((("duration_minutes" IS NULL) OR ("duration_minutes" > 0))),
    CONSTRAINT "program_session_templates_mapping_status_check" CHECK ((("mapping_status")::"text" = ANY ((ARRAY['matched'::character varying, 'unmatched_micro'::character varying, 'unmatched_planner'::character varying, 'conflict'::character varying])::"text"[]))),
    CONSTRAINT "program_session_templates_part_type_check" CHECK ((("part_type")::"text" = ANY ((ARRAY['teaching'::character varying, 'board_exam'::character varying])::"text"[]))),
    CONSTRAINT "program_session_templates_session_no_check" CHECK (("session_no" > 0)),
    CONSTRAINT "program_session_templates_template_version_no_check" CHECK (("template_version_no" > 0))
);


ALTER TABLE "public"."program_session_templates" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."program_session_templates_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."program_session_templates_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."program_session_templates_id_seq" OWNED BY "public"."program_session_templates"."id";



CREATE TABLE IF NOT EXISTS "public"."programs" (
    "id" integer NOT NULL,
    "client_id" integer,
    "name" character varying(120) NOT NULL,
    "code" character varying(40) NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "school_id" integer
);


ALTER TABLE "public"."programs" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."programs_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."programs_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."programs_id_seq" OWNED BY "public"."programs"."id";



CREATE TABLE IF NOT EXISTS "public"."question_bank_entitlements" (
    "id" integer NOT NULL,
    "client_id" integer NOT NULL,
    "entitlement_type" character varying(20) NOT NULL,
    "feature_key" character varying(100),
    "program_id" integer,
    "enabled" boolean DEFAULT true NOT NULL,
    "assigned_by_user_id" integer NOT NULL,
    "assigned_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "question_bank_entitlements_entitlement_type_check" CHECK ((("entitlement_type")::"text" = ANY ((ARRAY['feature'::character varying, 'program'::character varying])::"text"[]))),
    CONSTRAINT "question_bank_entitlements_scope_check" CHECK ((((("entitlement_type")::"text" = 'feature'::"text") AND ("feature_key" IS NOT NULL) AND ("program_id" IS NULL)) OR ((("entitlement_type")::"text" = 'program'::"text") AND ("program_id" IS NOT NULL) AND ("feature_key" IS NULL))))
);


ALTER TABLE "public"."question_bank_entitlements" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."question_bank_entitlements_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."question_bank_entitlements_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."question_bank_entitlements_id_seq" OWNED BY "public"."question_bank_entitlements"."id";



CREATE TABLE IF NOT EXISTS "public"."question_bank_school_assignments" (
    "id" integer NOT NULL,
    "program_id" integer NOT NULL,
    "school_id" integer NOT NULL,
    "assigned_by" integer,
    "assigned_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."question_bank_school_assignments" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."question_bank_school_assignments_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."question_bank_school_assignments_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."question_bank_school_assignments_id_seq" OWNED BY "public"."question_bank_school_assignments"."id";



CREATE TABLE IF NOT EXISTS "public"."question_folders" (
    "id" integer NOT NULL,
    "client_id" integer,
    "school_id" integer,
    "name" character varying(200) NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_by" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."question_folders" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."question_folders_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."question_folders_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."question_folders_id_seq" OWNED BY "public"."question_folders"."id";



CREATE TABLE IF NOT EXISTS "public"."questions" (
    "id" integer NOT NULL,
    "client_id" integer,
    "school_id" integer,
    "question_type" character varying(20) NOT NULL,
    "question_text" "jsonb" NOT NULL,
    "options" "jsonb",
    "correct_answer" "jsonb" NOT NULL,
    "solution" "jsonb",
    "solution_video_url" "text",
    "subject_id" integer,
    "chapter_id" integer,
    "topic_id" integer,
    "difficulty_level" character varying(20) DEFAULT 'medium'::character varying NOT NULL,
    "exam_tags" "text"[] DEFAULT '{}'::"text"[],
    "marks_positive" numeric(5,2) DEFAULT 4,
    "marks_negative" numeric(5,2) DEFAULT 0,
    "status" character varying(20) DEFAULT 'draft'::character varying,
    "created_by" integer NOT NULL,
    "approved_by" integer,
    "approved_at" timestamp with time zone,
    "rejection_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "folder_id" integer,
    "scoring_mode" character varying(20) DEFAULT 'all_or_nothing'::character varying NOT NULL,
    "category" "jsonb",
    "comprehension_passage_id" integer,
    CONSTRAINT "questions_difficulty_level_check" CHECK ((("difficulty_level")::"text" = ANY ((ARRAY['easy'::character varying, 'medium'::character varying, 'hard'::character varying])::"text"[]))),
    CONSTRAINT "questions_question_type_check" CHECK ((("question_type")::"text" = ANY (ARRAY[('mcq_single'::character varying)::"text", ('assertion_reasoning'::character varying)::"text", ('mcq_multiple'::character varying)::"text", ('numerical'::character varying)::"text", ('true_false'::character varying)::"text", ('short_answer'::character varying)::"text", ('match_following'::character varying)::"text", ('fill_in_blank'::character varying)::"text", ('comprehensive'::character varying)::"text"]))),
    CONSTRAINT "questions_scoring_mode_check" CHECK ((("scoring_mode")::"text" = ANY ((ARRAY['all_or_nothing'::character varying, 'partial'::character varying, 'mixed'::character varying])::"text"[]))),
    CONSTRAINT "questions_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['draft'::character varying, 'approved'::character varying, 'rejected'::character varying, 'archived'::character varying])::"text"[])))
);

ALTER TABLE ONLY "public"."questions" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."questions" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."questions_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."questions_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."questions_id_seq" OWNED BY "public"."questions"."id";



CREATE TABLE IF NOT EXISTS "public"."refresh_tokens" (
    "id" bigint NOT NULL,
    "user_id" integer NOT NULL,
    "token_hash" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone NOT NULL,
    "revoked_at" timestamp with time zone,
    "replaced_by" "text",
    "ip_address" "inet",
    "user_agent" "text"
);


ALTER TABLE "public"."refresh_tokens" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."refresh_tokens_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."refresh_tokens_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."refresh_tokens_id_seq" OWNED BY "public"."refresh_tokens"."id";



CREATE TABLE IF NOT EXISTS "public"."role_permissions" (
    "id" integer NOT NULL,
    "client_id" integer,
    "role" character varying(30) NOT NULL,
    "permission" character varying(100) NOT NULL,
    "granted" boolean DEFAULT true
);


ALTER TABLE "public"."role_permissions" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."role_permissions_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."role_permissions_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."role_permissions_id_seq" OWNED BY "public"."role_permissions"."id";



CREATE TABLE IF NOT EXISTS "public"."school_memberships" (
    "id" integer NOT NULL,
    "school_id" integer NOT NULL,
    "user_id" integer NOT NULL,
    "role_scope" character varying(30) NOT NULL,
    "is_primary" boolean DEFAULT false,
    "status" character varying(20) DEFAULT 'active'::character varying,
    "joined_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "school_memberships_role_scope_check" CHECK ((("role_scope")::"text" = ANY ((ARRAY['school_owner'::character varying, 'teacher'::character varying, 'student'::character varying, 'admin'::character varying])::"text"[]))),
    CONSTRAINT "school_memberships_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['active'::character varying, 'inactive'::character varying])::"text"[])))
);


ALTER TABLE "public"."school_memberships" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."school_memberships_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."school_memberships_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."school_memberships_id_seq" OWNED BY "public"."school_memberships"."id";



CREATE TABLE IF NOT EXISTS "public"."schools" (
    "id" integer NOT NULL,
    "client_id" integer NOT NULL,
    "school_code" character varying(50),
    "name" character varying(255) NOT NULL,
    "board" character varying(50),
    "affiliation_no" character varying(100),
    "address_line1" character varying(255),
    "city" character varying(100),
    "state" character varying(100),
    "pincode" character varying(20),
    "country" character varying(100) DEFAULT 'India'::character varying,
    "timezone" character varying(50) DEFAULT 'Asia/Kolkata'::character varying,
    "phone" character varying(50),
    "email" character varying(255),
    "principal_name" character varying(255),
    "status" character varying(20) DEFAULT 'active'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "schools_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['active'::character varying, 'inactive'::character varying])::"text"[])))
);


ALTER TABLE "public"."schools" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."schools_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."schools_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."schools_id_seq" OWNED BY "public"."schools"."id";



CREATE TABLE IF NOT EXISTS "public"."student_attempts" (
    "id" integer NOT NULL,
    "user_id" integer NOT NULL,
    "content_item_id" integer NOT NULL,
    "attempt_no" integer DEFAULT 1 NOT NULL,
    "score_raw" numeric(5,2),
    "completion_status" character varying(20),
    "suspend_data" "text",
    "total_time" interval,
    "started_at" timestamp with time zone DEFAULT "now"(),
    "finished_at" timestamp with time zone,
    CONSTRAINT "student_attempts_completion_status_check" CHECK ((("completion_status")::"text" = ANY ((ARRAY['not attempted'::character varying, 'incomplete'::character varying, 'completed'::character varying, 'passed'::character varying, 'failed'::character varying])::"text"[])))
);


ALTER TABLE "public"."student_attempts" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."student_attempts_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."student_attempts_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."student_attempts_id_seq" OWNED BY "public"."student_attempts"."id";



CREATE TABLE IF NOT EXISTS "public"."subjects" (
    "id" integer NOT NULL,
    "client_id" integer,
    "name" character varying(100) NOT NULL,
    "code" character varying(20) NOT NULL,
    "description" "text",
    "display_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "grade_id" integer
);


ALTER TABLE "public"."subjects" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."subjects_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."subjects_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."subjects_id_seq" OWNED BY "public"."subjects"."id";



CREATE TABLE IF NOT EXISTS "public"."teacher_session_tracker_permissions" (
    "id" integer NOT NULL,
    "client_id" integer NOT NULL,
    "teacher_user_id" integer NOT NULL,
    "school_id" integer,
    "batch_id" integer,
    "program_id" integer,
    "can_view_tracker" boolean DEFAULT true NOT NULL,
    "can_update_tracker" boolean DEFAULT true NOT NULL,
    "granted_by_user_id" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."teacher_session_tracker_permissions" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."teacher_session_tracker_permissions_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."teacher_session_tracker_permissions_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."teacher_session_tracker_permissions_id_seq" OWNED BY "public"."teacher_session_tracker_permissions"."id";



CREATE TABLE IF NOT EXISTS "public"."teaching_session_updates" (
    "id" bigint NOT NULL,
    "teaching_session_id" bigint NOT NULL,
    "teacher_user_id" integer NOT NULL,
    "status_submitted" character varying(20) NOT NULL,
    "completion_percentage" integer NOT NULL,
    "actual_date" "date",
    "topics_covered" "text",
    "pending_topics" "text",
    "reason_code" character varying(100),
    "remarks" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "teaching_session_updates_completion_percentage_check" CHECK ((("completion_percentage" >= 0) AND ("completion_percentage" <= 100))),
    CONSTRAINT "teaching_session_updates_status_submitted_check" CHECK ((("status_submitted")::"text" = ANY ((ARRAY['completed'::character varying, 'partially_completed'::character varying, 'not_completed'::character varying])::"text"[])))
);


ALTER TABLE "public"."teaching_session_updates" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."teaching_session_updates_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."teaching_session_updates_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."teaching_session_updates_id_seq" OWNED BY "public"."teaching_session_updates"."id";



CREATE TABLE IF NOT EXISTS "public"."teaching_sessions" (
    "id" bigint NOT NULL,
    "client_id" integer NOT NULL,
    "school_id" integer NOT NULL,
    "batch_id" integer,
    "program_id" integer NOT NULL,
    "program_session_template_id" bigint,
    "grade_label" character varying(100) NOT NULL,
    "subject_label" character varying(150) NOT NULL,
    "chapter_label" character varying(255),
    "session_no" integer NOT NULL,
    "session_label" character varying(100) NOT NULL,
    "part_type" character varying(20) DEFAULT 'teaching'::character varying NOT NULL,
    "planned_date" "date" NOT NULL,
    "period_slot" character varying(100),
    "duration_minutes" integer,
    "teacher_user_id" integer,
    "learning_goal" "text",
    "topic_label" "text",
    "planner_title" "text",
    "learning_objectives" "jsonb" DEFAULT '[]'::"jsonb",
    "materials_needed" "text",
    "worksheet_questions_covered" "text",
    "shortcuts_introduced" "text",
    "common_errors_addressed" "text",
    "homework" "text",
    "next_session_preview" "text",
    "pedagogy_note" "text",
    "minute_plan_json" "jsonb" DEFAULT '[]'::"jsonb",
    "teacher_script_text" "text",
    "status" character varying(20) DEFAULT 'not_started'::character varying NOT NULL,
    "completion_percentage" integer DEFAULT 0 NOT NULL,
    "actual_date" "date",
    "topics_covered" "text",
    "pending_topics" "text",
    "reason_code" character varying(100),
    "remarks" "text",
    "last_updated_by_user_id" integer,
    "last_updated_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "teaching_sessions_completion_percentage_check" CHECK ((("completion_percentage" >= 0) AND ("completion_percentage" <= 100))),
    CONSTRAINT "teaching_sessions_duration_minutes_check" CHECK ((("duration_minutes" IS NULL) OR ("duration_minutes" > 0))),
    CONSTRAINT "teaching_sessions_part_type_check" CHECK ((("part_type")::"text" = ANY ((ARRAY['teaching'::character varying, 'board_exam'::character varying])::"text"[]))),
    CONSTRAINT "teaching_sessions_session_no_check" CHECK (("session_no" > 0)),
    CONSTRAINT "teaching_sessions_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['not_started'::character varying, 'completed'::character varying, 'partially_completed'::character varying, 'not_completed'::character varying, 'update_pending'::character varying, 'lagging'::character varying])::"text"[])))
);


ALTER TABLE "public"."teaching_sessions" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."teaching_sessions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."teaching_sessions_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."teaching_sessions_id_seq" OWNED BY "public"."teaching_sessions"."id";



CREATE TABLE IF NOT EXISTS "public"."topics" (
    "id" integer NOT NULL,
    "chapter_id" integer NOT NULL,
    "name" character varying(200) NOT NULL,
    "topic_number" integer NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."topics" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."topics_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."topics_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."topics_id_seq" OWNED BY "public"."topics"."id";



CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" integer NOT NULL,
    "email" "extensions"."citext" NOT NULL,
    "full_name" "text" NOT NULL,
    "password_hash" "text" NOT NULL,
    "role" character varying(30) NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "last_login_at" timestamp with time zone,
    "client_id" integer,
    "user_id" character varying(100),
    CONSTRAINT "users_email_check" CHECK (("email" OPERATOR("extensions".~*) '^.+@.+\..+$'::"extensions"."citext")),
    CONSTRAINT "users_full_name_check" CHECK (("length"("full_name") > 0)),
    CONSTRAINT "users_role_check" CHECK ((("role")::"text" = ANY (ARRAY[('super_admin'::character varying)::"text", ('content_authorizer'::character varying)::"text", ('client_admin'::character varying)::"text", ('school_owner'::character varying)::"text", ('teacher'::character varying)::"text", ('student'::character varying)::"text"])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."user_hierarchy" AS
 SELECT "u"."id" AS "user_id",
    "u"."email",
    "u"."full_name",
    "u"."role",
    "u"."client_id",
    "c"."name" AS "client_name",
    "c"."slug" AS "client_slug",
    "sm"."school_id",
    "s"."name" AS "school_name",
    "s"."school_code",
    "sm"."role_scope",
    "sm"."is_primary" AS "is_primary_school"
   FROM ((("public"."users" "u"
     LEFT JOIN "public"."clients" "c" ON (("u"."client_id" = "c"."id")))
     LEFT JOIN "public"."school_memberships" "sm" ON ((("u"."id" = "sm"."user_id") AND (("sm"."status")::"text" = 'active'::"text"))))
     LEFT JOIN "public"."schools" "s" ON (("sm"."school_id" = "s"."id")));


ALTER VIEW "public"."user_hierarchy" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_permissions" (
    "id" integer NOT NULL,
    "user_id" integer NOT NULL,
    "permission" character varying(100) NOT NULL,
    "granted" boolean DEFAULT true
);


ALTER TABLE "public"."user_permissions" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."user_permissions_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."user_permissions_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."user_permissions_id_seq" OWNED BY "public"."user_permissions"."id";



CREATE SEQUENCE IF NOT EXISTS "public"."users_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."users_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."users_id_seq" OWNED BY "public"."users"."id";



ALTER TABLE ONLY "public"."audit_logs" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."audit_logs_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."batch_members" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."batch_members_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."batches" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."batches_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."blueprint_sections" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."blueprint_sections_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."blueprints" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."blueprints_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."certificates" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."certificates_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."chapters" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."chapters_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."client_course_title_overrides" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."client_course_title_overrides_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."client_entitlements" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."client_entitlements_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."clients" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."clients_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."community_content" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."community_content_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."comprehension_passages" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."comprehension_passages_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."content_entitlements" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."content_entitlements_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."content_items" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."content_items_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."content_packs" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."content_packs_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."course_exams" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."course_exams_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."course_linked_content" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."course_linked_content_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."course_school_assignments" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."course_school_assignments_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."courses" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."courses_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."enrollments" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."enrollments_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."exam_attempts" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."exam_attempts_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."exam_entitlements" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."exam_entitlements_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."exam_questions" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."exam_questions_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."exam_responses" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."exam_responses_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."exam_school_assignments" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."exam_school_assignments_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."exam_section_chapters" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."exam_section_chapters_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."exam_section_topics" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."exam_section_topics_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."exam_sections" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."exam_sections_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."exams" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."exams_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."grades" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."grades_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."program_lesson_planner_sessions" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."program_lesson_planner_sessions_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."program_lesson_planner_uploads" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."program_lesson_planner_uploads_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."program_micro_schedule_rows" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."program_micro_schedule_rows_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."program_micro_schedule_uploads" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."program_micro_schedule_uploads_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."program_session_templates" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."program_session_templates_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."programs" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."programs_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."question_bank_entitlements" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."question_bank_entitlements_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."question_bank_school_assignments" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."question_bank_school_assignments_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."question_folders" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."question_folders_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."questions" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."questions_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."refresh_tokens" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."refresh_tokens_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."role_permissions" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."role_permissions_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."school_memberships" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."school_memberships_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."schools" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."schools_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."student_attempts" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."student_attempts_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."subjects" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."subjects_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."teacher_session_tracker_permissions" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."teacher_session_tracker_permissions_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."teaching_session_updates" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."teaching_session_updates_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."teaching_sessions" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."teaching_sessions_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."topics" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."topics_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."user_permissions" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."user_permissions_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."users" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."users_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."batch_members"
    ADD CONSTRAINT "batch_members_batch_id_user_id_key" UNIQUE ("batch_id", "user_id");



ALTER TABLE ONLY "public"."batch_members"
    ADD CONSTRAINT "batch_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."batches"
    ADD CONSTRAINT "batches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."blueprint_sections"
    ADD CONSTRAINT "blueprint_sections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."blueprints"
    ADD CONSTRAINT "blueprints_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."certificates"
    ADD CONSTRAINT "certificates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."certificates"
    ADD CONSTRAINT "certificates_user_id_course_id_key" UNIQUE ("user_id", "course_id");



ALTER TABLE ONLY "public"."chapters"
    ADD CONSTRAINT "chapters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_course_title_overrides"
    ADD CONSTRAINT "client_course_title_overrides_client_id_course_id_key" UNIQUE ("client_id", "course_id");



ALTER TABLE ONLY "public"."client_course_title_overrides"
    ADD CONSTRAINT "client_course_title_overrides_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_entitlements"
    ADD CONSTRAINT "client_entitlements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."community_content"
    ADD CONSTRAINT "community_content_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."comprehension_passages"
    ADD CONSTRAINT "comprehension_passages_legacy_question_id_key" UNIQUE ("legacy_question_id");



ALTER TABLE ONLY "public"."comprehension_passages"
    ADD CONSTRAINT "comprehension_passages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."content_entitlements"
    ADD CONSTRAINT "content_entitlements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."content_items"
    ADD CONSTRAINT "content_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."content_pack_items"
    ADD CONSTRAINT "content_pack_items_pkey" PRIMARY KEY ("pack_id", "item_id");



ALTER TABLE ONLY "public"."content_packs"
    ADD CONSTRAINT "content_packs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_exams"
    ADD CONSTRAINT "course_exams_course_id_exam_id_key" UNIQUE ("course_id", "exam_id");



ALTER TABLE ONLY "public"."course_exams"
    ADD CONSTRAINT "course_exams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_linked_content"
    ADD CONSTRAINT "course_linked_content_course_id_content_item_id_key" UNIQUE ("course_id", "content_item_id");



ALTER TABLE ONLY "public"."course_linked_content"
    ADD CONSTRAINT "course_linked_content_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_school_assignments"
    ADD CONSTRAINT "course_school_assignments_course_id_school_id_key" UNIQUE ("course_id", "school_id");



ALTER TABLE ONLY "public"."course_school_assignments"
    ADD CONSTRAINT "course_school_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."enrollments"
    ADD CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."enrollments"
    ADD CONSTRAINT "enrollments_user_id_course_id_key" UNIQUE ("user_id", "course_id");



ALTER TABLE ONLY "public"."exam_attempts"
    ADD CONSTRAINT "exam_attempts_exam_id_student_id_attempt_number_key" UNIQUE ("exam_id", "student_id", "attempt_number");



ALTER TABLE ONLY "public"."exam_attempts"
    ADD CONSTRAINT "exam_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exam_entitlements"
    ADD CONSTRAINT "exam_entitlements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exam_questions"
    ADD CONSTRAINT "exam_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exam_questions"
    ADD CONSTRAINT "exam_questions_section_id_question_id_key" UNIQUE ("section_id", "question_id");



ALTER TABLE ONLY "public"."exam_responses"
    ADD CONSTRAINT "exam_responses_attempt_id_question_id_key" UNIQUE ("attempt_id", "question_id");



ALTER TABLE ONLY "public"."exam_responses"
    ADD CONSTRAINT "exam_responses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exam_school_assignments"
    ADD CONSTRAINT "exam_school_assignments_exam_id_school_id_key" UNIQUE ("exam_id", "school_id");



ALTER TABLE ONLY "public"."exam_school_assignments"
    ADD CONSTRAINT "exam_school_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exam_section_chapters"
    ADD CONSTRAINT "exam_section_chapters_exam_section_id_chapter_id_key" UNIQUE ("exam_section_id", "chapter_id");



ALTER TABLE ONLY "public"."exam_section_chapters"
    ADD CONSTRAINT "exam_section_chapters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exam_section_topics"
    ADD CONSTRAINT "exam_section_topics_exam_section_id_topic_id_key" UNIQUE ("exam_section_id", "topic_id");



ALTER TABLE ONLY "public"."exam_section_topics"
    ADD CONSTRAINT "exam_section_topics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exam_sections"
    ADD CONSTRAINT "exam_sections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exams"
    ADD CONSTRAINT "exams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."grades"
    ADD CONSTRAINT "grades_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."grades"
    ADD CONSTRAINT "grades_program_id_grade_number_key" UNIQUE ("program_id", "grade_number");



ALTER TABLE ONLY "public"."program_lesson_planner_sessions"
    ADD CONSTRAINT "program_lesson_planner_sessio_lesson_planner_upload_id_sess_key" UNIQUE ("lesson_planner_upload_id", "session_no", "part_type");



ALTER TABLE ONLY "public"."program_lesson_planner_sessions"
    ADD CONSTRAINT "program_lesson_planner_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."program_lesson_planner_uploads"
    ADD CONSTRAINT "program_lesson_planner_uploads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."program_micro_schedule_rows"
    ADD CONSTRAINT "program_micro_schedule_rows_micro_schedule_upload_id_row_no_key" UNIQUE ("micro_schedule_upload_id", "row_no");



ALTER TABLE ONLY "public"."program_micro_schedule_rows"
    ADD CONSTRAINT "program_micro_schedule_rows_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."program_micro_schedule_uploads"
    ADD CONSTRAINT "program_micro_schedule_uploads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."program_session_templates"
    ADD CONSTRAINT "program_session_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."programs"
    ADD CONSTRAINT "programs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."question_bank_entitlements"
    ADD CONSTRAINT "question_bank_entitlements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."question_bank_school_assignments"
    ADD CONSTRAINT "question_bank_school_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."question_bank_school_assignments"
    ADD CONSTRAINT "question_bank_school_assignments_program_id_school_id_key" UNIQUE ("program_id", "school_id");



ALTER TABLE ONLY "public"."question_folders"
    ADD CONSTRAINT "question_folders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_token_hash_key" UNIQUE ("token_hash");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_client_id_role_permission_key" UNIQUE ("client_id", "role", "permission");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."school_memberships"
    ADD CONSTRAINT "school_memberships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."school_memberships"
    ADD CONSTRAINT "school_memberships_school_id_user_id_key" UNIQUE ("school_id", "user_id");



ALTER TABLE ONLY "public"."schools"
    ADD CONSTRAINT "schools_client_id_school_code_key" UNIQUE ("client_id", "school_code");



ALTER TABLE ONLY "public"."schools"
    ADD CONSTRAINT "schools_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_attempts"
    ADD CONSTRAINT "student_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_attempts"
    ADD CONSTRAINT "student_attempts_user_id_content_item_id_attempt_no_key" UNIQUE ("user_id", "content_item_id", "attempt_no");



ALTER TABLE ONLY "public"."subjects"
    ADD CONSTRAINT "subjects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teacher_session_tracker_permissions"
    ADD CONSTRAINT "teacher_session_tracker_permi_client_id_teacher_user_id_sch_key" UNIQUE ("client_id", "teacher_user_id", "school_id", "batch_id", "program_id");



ALTER TABLE ONLY "public"."teacher_session_tracker_permissions"
    ADD CONSTRAINT "teacher_session_tracker_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teaching_session_updates"
    ADD CONSTRAINT "teaching_session_updates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teaching_sessions"
    ADD CONSTRAINT "teaching_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."topics"
    ADD CONSTRAINT "topics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_permissions"
    ADD CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_permissions"
    ADD CONSTRAINT "user_permissions_user_id_permission_key" UNIQUE ("user_id", "permission");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_client_user_id_unique" UNIQUE ("client_id", "user_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_audit_logs_action" ON "public"."audit_logs" USING "btree" ("action");



CREATE INDEX "idx_audit_logs_actor" ON "public"."audit_logs" USING "btree" ("actor_id");



CREATE INDEX "idx_audit_logs_client" ON "public"."audit_logs" USING "btree" ("client_id");



CREATE INDEX "idx_audit_logs_created" ON "public"."audit_logs" USING "btree" ("created_at");



CREATE INDEX "idx_audit_logs_entity" ON "public"."audit_logs" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_batch_members_batch" ON "public"."batch_members" USING "btree" ("batch_id");



CREATE INDEX "idx_batch_members_user" ON "public"."batch_members" USING "btree" ("user_id");



CREATE INDEX "idx_batches_active" ON "public"."batches" USING "btree" ("is_active");



CREATE INDEX "idx_batches_client" ON "public"."batches" USING "btree" ("client_id");



CREATE INDEX "idx_batches_school" ON "public"."batches" USING "btree" ("school_id");



CREATE INDEX "idx_blueprint_sections_blueprint" ON "public"."blueprint_sections" USING "btree" ("blueprint_id");



CREATE UNIQUE INDEX "idx_blueprint_sections_name" ON "public"."blueprint_sections" USING "btree" ("blueprint_id", "lower"(("section_name")::"text"));



CREATE UNIQUE INDEX "idx_blueprint_sections_order" ON "public"."blueprint_sections" USING "btree" ("blueprint_id", "display_order");



CREATE INDEX "idx_blueprints_client" ON "public"."blueprints" USING "btree" ("client_id");



CREATE INDEX "idx_blueprints_created_by" ON "public"."blueprints" USING "btree" ("created_by");



CREATE UNIQUE INDEX "idx_blueprints_name" ON "public"."blueprints" USING "btree" ("client_id", COALESCE("school_id", 0), "lower"(("name")::"text"));



CREATE INDEX "idx_blueprints_school" ON "public"."blueprints" USING "btree" ("school_id");



CREATE INDEX "idx_blueprints_status" ON "public"."blueprints" USING "btree" ("status");



CREATE UNIQUE INDEX "idx_chapters_number" ON "public"."chapters" USING "btree" ("subject_id", "chapter_number");



CREATE INDEX "idx_chapters_subject" ON "public"."chapters" USING "btree" ("subject_id");



CREATE INDEX "idx_client_course_title_overrides_client" ON "public"."client_course_title_overrides" USING "btree" ("client_id");



CREATE INDEX "idx_client_course_title_overrides_course" ON "public"."client_course_title_overrides" USING "btree" ("course_id");



CREATE INDEX "idx_client_entitlements_client" ON "public"."client_entitlements" USING "btree" ("client_id");



CREATE UNIQUE INDEX "idx_client_entitlements_feature_unique" ON "public"."client_entitlements" USING "btree" ("client_id", "entitlement_type", "feature_key") WHERE (("entitlement_type")::"text" = 'feature'::"text");



CREATE UNIQUE INDEX "idx_client_entitlements_program_unique" ON "public"."client_entitlements" USING "btree" ("client_id", "entitlement_type", "program_id") WHERE (("entitlement_type")::"text" = 'program'::"text");



CREATE INDEX "idx_community_content_date" ON "public"."community_content" USING "btree" ("date" DESC);



CREATE INDEX "idx_comprehension_passages_chapter" ON "public"."comprehension_passages" USING "btree" ("chapter_id");



CREATE INDEX "idx_comprehension_passages_client" ON "public"."comprehension_passages" USING "btree" ("client_id");



CREATE INDEX "idx_comprehension_passages_school" ON "public"."comprehension_passages" USING "btree" ("school_id");



CREATE INDEX "idx_comprehension_passages_subject" ON "public"."comprehension_passages" USING "btree" ("subject_id");



CREATE INDEX "idx_content_course" ON "public"."content_items" USING "btree" ("course_id");



CREATE INDEX "idx_content_entitlements_client" ON "public"."content_entitlements" USING "btree" ("client_id");



CREATE INDEX "idx_content_entitlements_course" ON "public"."content_entitlements" USING "btree" ("course_id");



CREATE INDEX "idx_content_entitlements_dates" ON "public"."content_entitlements" USING "btree" ("start_at", "end_at");



CREATE INDEX "idx_content_entitlements_status" ON "public"."content_entitlements" USING "btree" ("status");



CREATE INDEX "idx_content_pack_items_item" ON "public"."content_pack_items" USING "btree" ("item_id");



CREATE INDEX "idx_content_pack_items_pack" ON "public"."content_pack_items" USING "btree" ("pack_id");



CREATE INDEX "idx_content_parent" ON "public"."content_items" USING "btree" ("parent_id");



CREATE INDEX "idx_course_exams_course_id" ON "public"."course_exams" USING "btree" ("course_id");



CREATE INDEX "idx_course_exams_exam_id" ON "public"."course_exams" USING "btree" ("exam_id");



CREATE INDEX "idx_course_linked_content_course" ON "public"."course_linked_content" USING "btree" ("course_id");



CREATE INDEX "idx_course_linked_content_item" ON "public"."course_linked_content" USING "btree" ("content_item_id");



CREATE INDEX "idx_course_linked_content_parent_order" ON "public"."course_linked_content" USING "btree" ("course_id", "parent_content_id", "order_index");



CREATE INDEX "idx_course_school_assignments_course" ON "public"."course_school_assignments" USING "btree" ("course_id");



CREATE INDEX "idx_course_school_assignments_school" ON "public"."course_school_assignments" USING "btree" ("school_id");



CREATE INDEX "idx_courses_client" ON "public"."courses" USING "btree" ("client_id");



CREATE INDEX "idx_courses_client_id_id" ON "public"."courses" USING "btree" ("client_id", "id");



CREATE INDEX "idx_courses_school" ON "public"."courses" USING "btree" ("school_id");



CREATE INDEX "idx_enroll_course" ON "public"."enrollments" USING "btree" ("course_id");



CREATE INDEX "idx_enroll_user" ON "public"."enrollments" USING "btree" ("user_id");



CREATE INDEX "idx_enrollments_enrolled_at_course" ON "public"."enrollments" USING "btree" ("enrolled_at" DESC, "course_id");



CREATE INDEX "idx_exam_attempts_exam" ON "public"."exam_attempts" USING "btree" ("exam_id");



CREATE INDEX "idx_exam_attempts_exam_student" ON "public"."exam_attempts" USING "btree" ("exam_id", "student_id");



CREATE INDEX "idx_exam_attempts_student" ON "public"."exam_attempts" USING "btree" ("student_id");



CREATE INDEX "idx_exam_entitlements_client" ON "public"."exam_entitlements" USING "btree" ("client_id");



CREATE UNIQUE INDEX "idx_exam_entitlements_feature_unique" ON "public"."exam_entitlements" USING "btree" ("client_id", "entitlement_type", "feature_key") WHERE (("entitlement_type")::"text" = 'feature'::"text");



CREATE UNIQUE INDEX "idx_exam_entitlements_program_unique" ON "public"."exam_entitlements" USING "btree" ("client_id", "entitlement_type", "program_id") WHERE (("entitlement_type")::"text" = 'program'::"text");



CREATE INDEX "idx_exam_questions_group_type" ON "public"."exam_questions" USING "btree" ("question_group_type");



CREATE INDEX "idx_exam_questions_section" ON "public"."exam_questions" USING "btree" ("section_id");



CREATE INDEX "idx_exam_questions_section_group" ON "public"."exam_questions" USING "btree" ("section_id", "question_group_type");



CREATE INDEX "idx_exam_responses_attempt" ON "public"."exam_responses" USING "btree" ("attempt_id");



CREATE INDEX "idx_exam_school_assignments_exam" ON "public"."exam_school_assignments" USING "btree" ("exam_id");



CREATE INDEX "idx_exam_school_assignments_school" ON "public"."exam_school_assignments" USING "btree" ("school_id");



CREATE INDEX "idx_exam_section_chapters_chapter" ON "public"."exam_section_chapters" USING "btree" ("chapter_id");



CREATE INDEX "idx_exam_section_chapters_section" ON "public"."exam_section_chapters" USING "btree" ("exam_section_id");



CREATE INDEX "idx_exam_section_topics_section" ON "public"."exam_section_topics" USING "btree" ("exam_section_id");



CREATE INDEX "idx_exam_section_topics_topic" ON "public"."exam_section_topics" USING "btree" ("topic_id");



CREATE INDEX "idx_exam_sections_blueprint_section" ON "public"."exam_sections" USING "btree" ("blueprint_section_id");



CREATE INDEX "idx_exam_sections_exam" ON "public"."exam_sections" USING "btree" ("exam_id");



CREATE INDEX "idx_exam_sections_status" ON "public"."exam_sections" USING "btree" ("completion_status");



CREATE INDEX "idx_exam_sections_subject" ON "public"."exam_sections" USING "btree" ("selected_subject_id");



CREATE INDEX "idx_exams_blueprint" ON "public"."exams" USING "btree" ("blueprint_id");



CREATE INDEX "idx_exams_client" ON "public"."exams" USING "btree" ("client_id");



CREATE INDEX "idx_exams_program" ON "public"."exams" USING "btree" ("program_id");



CREATE INDEX "idx_exams_school" ON "public"."exams" USING "btree" ("school_id");



CREATE INDEX "idx_exams_scope" ON "public"."exams" USING "btree" ("client_id", "school_id", "status");



CREATE INDEX "idx_exams_status" ON "public"."exams" USING "btree" ("status");



CREATE INDEX "idx_grades_active" ON "public"."grades" USING "btree" ("is_active");



CREATE INDEX "idx_grades_program" ON "public"."grades" USING "btree" ("program_id");



CREATE INDEX "idx_program_lesson_planner_sessions_mapping" ON "public"."program_lesson_planner_sessions" USING "btree" ("program_id", "session_no", "chapter_label");



CREATE INDEX "idx_program_lesson_planner_sessions_upload" ON "public"."program_lesson_planner_sessions" USING "btree" ("lesson_planner_upload_id");



CREATE INDEX "idx_program_lesson_planner_uploads_grade" ON "public"."program_lesson_planner_uploads" USING "btree" ("grade_id");



CREATE INDEX "idx_program_lesson_planner_uploads_micro_schedule" ON "public"."program_lesson_planner_uploads" USING "btree" ("micro_schedule_upload_id");



CREATE INDEX "idx_program_lesson_planner_uploads_program" ON "public"."program_lesson_planner_uploads" USING "btree" ("program_id");



CREATE INDEX "idx_program_lesson_planner_uploads_status" ON "public"."program_lesson_planner_uploads" USING "btree" ("status");



CREATE INDEX "idx_program_lesson_planner_uploads_subject" ON "public"."program_lesson_planner_uploads" USING "btree" ("subject_id");



CREATE INDEX "idx_program_lesson_planner_uploads_target_session" ON "public"."program_lesson_planner_uploads" USING "btree" ("target_session_no");



CREATE INDEX "idx_program_micro_schedule_rows_mapping" ON "public"."program_micro_schedule_rows" USING "btree" ("program_id", "session_no", "chapter_label");



CREATE INDEX "idx_program_micro_schedule_rows_upload" ON "public"."program_micro_schedule_rows" USING "btree" ("micro_schedule_upload_id");



CREATE INDEX "idx_program_micro_schedule_uploads_grade" ON "public"."program_micro_schedule_uploads" USING "btree" ("grade_id");



CREATE INDEX "idx_program_micro_schedule_uploads_program" ON "public"."program_micro_schedule_uploads" USING "btree" ("program_id");



CREATE INDEX "idx_program_micro_schedule_uploads_status" ON "public"."program_micro_schedule_uploads" USING "btree" ("status");



CREATE INDEX "idx_program_micro_schedule_uploads_subject" ON "public"."program_micro_schedule_uploads" USING "btree" ("subject_id");



CREATE INDEX "idx_program_session_templates_mapping" ON "public"."program_session_templates" USING "btree" ("mapping_status", "is_published");



CREATE INDEX "idx_program_session_templates_program" ON "public"."program_session_templates" USING "btree" ("program_id", "template_version_no");



CREATE INDEX "idx_programs_active" ON "public"."programs" USING "btree" ("is_active");



CREATE INDEX "idx_programs_client" ON "public"."programs" USING "btree" ("client_id");



CREATE UNIQUE INDEX "idx_programs_client_code" ON "public"."programs" USING "btree" (COALESCE("client_id", 0), "lower"(("code")::"text"));



CREATE INDEX "idx_programs_school" ON "public"."programs" USING "btree" ("school_id");



CREATE INDEX "idx_question_bank_entitlements_client" ON "public"."question_bank_entitlements" USING "btree" ("client_id");



CREATE UNIQUE INDEX "idx_question_bank_entitlements_feature_unique" ON "public"."question_bank_entitlements" USING "btree" ("client_id", "entitlement_type", "feature_key") WHERE (("entitlement_type")::"text" = 'feature'::"text");



CREATE UNIQUE INDEX "idx_question_bank_entitlements_program_unique" ON "public"."question_bank_entitlements" USING "btree" ("client_id", "entitlement_type", "program_id") WHERE (("entitlement_type")::"text" = 'program'::"text");



CREATE INDEX "idx_question_bank_school_assignments_program" ON "public"."question_bank_school_assignments" USING "btree" ("program_id");



CREATE INDEX "idx_question_bank_school_assignments_school" ON "public"."question_bank_school_assignments" USING "btree" ("school_id");



CREATE INDEX "idx_question_folders_active" ON "public"."question_folders" USING "btree" ("is_active");



CREATE INDEX "idx_question_folders_client" ON "public"."question_folders" USING "btree" ("client_id");



CREATE INDEX "idx_question_folders_school" ON "public"."question_folders" USING "btree" ("school_id");



CREATE INDEX "idx_questions_chapter" ON "public"."questions" USING "btree" ("chapter_id");



CREATE INDEX "idx_questions_client" ON "public"."questions" USING "btree" ("client_id");



CREATE INDEX "idx_questions_comprehension_passage_id" ON "public"."questions" USING "btree" ("comprehension_passage_id");



CREATE INDEX "idx_questions_exam_tags" ON "public"."questions" USING "gin" ("exam_tags");



CREATE INDEX "idx_questions_folder" ON "public"."questions" USING "btree" ("folder_id");



CREATE INDEX "idx_questions_fts" ON "public"."questions" USING "gin" ("to_tsvector"('"simple"'::"regconfig", ((COALESCE(("question_text")::"text", ''::"text") || ' '::"text") || COALESCE(("options")::"text", ''::"text"))));



CREATE INDEX "idx_questions_school" ON "public"."questions" USING "btree" ("school_id");



CREATE INDEX "idx_questions_scope" ON "public"."questions" USING "btree" ("client_id", "school_id", "status");



CREATE INDEX "idx_questions_status" ON "public"."questions" USING "btree" ("status");



CREATE INDEX "idx_questions_subject" ON "public"."questions" USING "btree" ("subject_id");



CREATE INDEX "idx_questions_subject_chapter_topic_status" ON "public"."questions" USING "btree" ("subject_id", "chapter_id", "topic_id", "status");



CREATE INDEX "idx_questions_type" ON "public"."questions" USING "btree" ("question_type");



CREATE INDEX "idx_refresh_tokens_hash" ON "public"."refresh_tokens" USING "btree" ("token_hash");



CREATE INDEX "idx_refresh_tokens_user" ON "public"."refresh_tokens" USING "btree" ("user_id");



CREATE INDEX "idx_role_permissions_client" ON "public"."role_permissions" USING "btree" ("client_id");



CREATE INDEX "idx_role_permissions_role" ON "public"."role_permissions" USING "btree" ("role");



CREATE INDEX "idx_school_memberships_role" ON "public"."school_memberships" USING "btree" ("role_scope");



CREATE INDEX "idx_school_memberships_school" ON "public"."school_memberships" USING "btree" ("school_id");



CREATE INDEX "idx_school_memberships_user" ON "public"."school_memberships" USING "btree" ("user_id");



CREATE INDEX "idx_school_memberships_user_school_active" ON "public"."school_memberships" USING "btree" ("user_id", "school_id", "status");



CREATE INDEX "idx_schools_client" ON "public"."schools" USING "btree" ("client_id");



CREATE INDEX "idx_schools_status" ON "public"."schools" USING "btree" ("status");



CREATE INDEX "idx_student_attempts_content" ON "public"."student_attempts" USING "btree" ("content_item_id");



CREATE INDEX "idx_student_attempts_started_content" ON "public"."student_attempts" USING "btree" ("started_at" DESC, "content_item_id");



CREATE INDEX "idx_student_attempts_total_time_content" ON "public"."student_attempts" USING "btree" ("content_item_id") WHERE ("total_time" IS NOT NULL);



CREATE INDEX "idx_student_attempts_user" ON "public"."student_attempts" USING "btree" ("user_id");



CREATE INDEX "idx_subjects_client" ON "public"."subjects" USING "btree" ("client_id");



CREATE UNIQUE INDEX "idx_subjects_code" ON "public"."subjects" USING "btree" (COALESCE("client_id", 0), "code");



CREATE INDEX "idx_subjects_grade" ON "public"."subjects" USING "btree" ("grade_id");



CREATE INDEX "idx_teacher_tracker_permissions_client" ON "public"."teacher_session_tracker_permissions" USING "btree" ("client_id");



CREATE INDEX "idx_teacher_tracker_permissions_teacher" ON "public"."teacher_session_tracker_permissions" USING "btree" ("teacher_user_id");



CREATE INDEX "idx_teaching_session_updates_session" ON "public"."teaching_session_updates" USING "btree" ("teaching_session_id", "created_at" DESC);



CREATE INDEX "idx_teaching_session_updates_teacher" ON "public"."teaching_session_updates" USING "btree" ("teacher_user_id", "created_at" DESC);



CREATE INDEX "idx_teaching_sessions_client_date" ON "public"."teaching_sessions" USING "btree" ("client_id", "planned_date");



CREATE INDEX "idx_teaching_sessions_school_date" ON "public"."teaching_sessions" USING "btree" ("school_id", "planned_date");



CREATE INDEX "idx_teaching_sessions_status" ON "public"."teaching_sessions" USING "btree" ("status");



CREATE INDEX "idx_teaching_sessions_teacher_date" ON "public"."teaching_sessions" USING "btree" ("teacher_user_id", "planned_date");



CREATE INDEX "idx_topics_chapter" ON "public"."topics" USING "btree" ("chapter_id");



CREATE INDEX "idx_user_permissions_user" ON "public"."user_permissions" USING "btree" ("user_id");



CREATE INDEX "idx_users_client" ON "public"."users" USING "btree" ("client_id");



CREATE INDEX "idx_users_client_last_login_active" ON "public"."users" USING "btree" ("client_id", "last_login_at" DESC) WHERE ("is_active" = true);



CREATE INDEX "idx_users_client_role_created_at" ON "public"."users" USING "btree" ("client_id", "role", "created_at" DESC);



CREATE INDEX "idx_users_role" ON "public"."users" USING "btree" ("role");



CREATE UNIQUE INDEX "uq_program_lesson_planner_uploads_micro_session" ON "public"."program_lesson_planner_uploads" USING "btree" ("micro_schedule_upload_id", "target_session_no") WHERE (("micro_schedule_upload_id" IS NOT NULL) AND ("target_session_no" IS NOT NULL));



CREATE UNIQUE INDEX "uq_program_micro_schedule_uploads_scope_version" ON "public"."program_micro_schedule_uploads" USING "btree" ("program_id", "grade_id", "subject_id", "version_no") WHERE (("grade_id" IS NOT NULL) AND ("subject_id" IS NOT NULL));



CREATE OR REPLACE TRIGGER "trg_batches_updated" BEFORE UPDATE ON "public"."batches" FOR EACH ROW EXECUTE FUNCTION "public"."update_timestamp"();



CREATE OR REPLACE TRIGGER "trg_blueprint_sections_updated" BEFORE UPDATE ON "public"."blueprint_sections" FOR EACH ROW EXECUTE FUNCTION "public"."update_timestamp"();



CREATE OR REPLACE TRIGGER "trg_blueprints_updated" BEFORE UPDATE ON "public"."blueprints" FOR EACH ROW EXECUTE FUNCTION "public"."update_timestamp"();



CREATE OR REPLACE TRIGGER "trg_client_entitlements_updated" BEFORE UPDATE ON "public"."client_entitlements" FOR EACH ROW EXECUTE FUNCTION "public"."update_timestamp"();



CREATE OR REPLACE TRIGGER "trg_clients_updated" BEFORE UPDATE ON "public"."clients" FOR EACH ROW EXECUTE FUNCTION "public"."update_timestamp"();



CREATE OR REPLACE TRIGGER "trg_comprehension_passages_updated" BEFORE UPDATE ON "public"."comprehension_passages" FOR EACH ROW EXECUTE FUNCTION "public"."update_timestamp"();



CREATE OR REPLACE TRIGGER "trg_content_packs_updated" BEFORE UPDATE ON "public"."content_packs" FOR EACH ROW EXECUTE FUNCTION "public"."update_timestamp"();



CREATE OR REPLACE TRIGGER "trg_content_updated" BEFORE UPDATE ON "public"."content_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_timestamp"();



CREATE OR REPLACE TRIGGER "trg_courses_updated" BEFORE UPDATE ON "public"."courses" FOR EACH ROW EXECUTE FUNCTION "public"."update_timestamp"();



CREATE OR REPLACE TRIGGER "trg_exam_entitlements_updated" BEFORE UPDATE ON "public"."exam_entitlements" FOR EACH ROW EXECUTE FUNCTION "public"."update_timestamp"();



CREATE OR REPLACE TRIGGER "trg_grades_updated" BEFORE UPDATE ON "public"."grades" FOR EACH ROW EXECUTE FUNCTION "public"."update_timestamp"();



CREATE OR REPLACE TRIGGER "trg_program_lesson_planner_uploads_updated" BEFORE UPDATE ON "public"."program_lesson_planner_uploads" FOR EACH ROW EXECUTE FUNCTION "public"."update_timestamp"();



CREATE OR REPLACE TRIGGER "trg_program_micro_schedule_uploads_updated" BEFORE UPDATE ON "public"."program_micro_schedule_uploads" FOR EACH ROW EXECUTE FUNCTION "public"."update_timestamp"();



CREATE OR REPLACE TRIGGER "trg_program_session_templates_updated" BEFORE UPDATE ON "public"."program_session_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_timestamp"();



CREATE OR REPLACE TRIGGER "trg_programs_updated" BEFORE UPDATE ON "public"."programs" FOR EACH ROW EXECUTE FUNCTION "public"."update_timestamp"();



CREATE OR REPLACE TRIGGER "trg_question_bank_entitlements_updated" BEFORE UPDATE ON "public"."question_bank_entitlements" FOR EACH ROW EXECUTE FUNCTION "public"."update_timestamp"();



CREATE OR REPLACE TRIGGER "trg_school_memberships_updated" BEFORE UPDATE ON "public"."school_memberships" FOR EACH ROW EXECUTE FUNCTION "public"."update_timestamp"();



CREATE OR REPLACE TRIGGER "trg_schools_updated" BEFORE UPDATE ON "public"."schools" FOR EACH ROW EXECUTE FUNCTION "public"."update_timestamp"();



CREATE OR REPLACE TRIGGER "trg_teacher_session_tracker_permissions_updated" BEFORE UPDATE ON "public"."teacher_session_tracker_permissions" FOR EACH ROW EXECUTE FUNCTION "public"."update_timestamp"();



CREATE OR REPLACE TRIGGER "trg_teaching_sessions_updated" BEFORE UPDATE ON "public"."teaching_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."update_timestamp"();



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."batch_members"
    ADD CONSTRAINT "batch_members_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."batch_members"
    ADD CONSTRAINT "batch_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."batches"
    ADD CONSTRAINT "batches_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."batches"
    ADD CONSTRAINT "batches_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."blueprint_sections"
    ADD CONSTRAINT "blueprint_sections_blueprint_id_fkey" FOREIGN KEY ("blueprint_id") REFERENCES "public"."blueprints"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."blueprints"
    ADD CONSTRAINT "blueprints_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."blueprints"
    ADD CONSTRAINT "blueprints_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."blueprints"
    ADD CONSTRAINT "blueprints_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."certificates"
    ADD CONSTRAINT "certificates_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."certificates"
    ADD CONSTRAINT "certificates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chapters"
    ADD CONSTRAINT "chapters_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_course_title_overrides"
    ADD CONSTRAINT "client_course_title_overrides_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_course_title_overrides"
    ADD CONSTRAINT "client_course_title_overrides_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_course_title_overrides"
    ADD CONSTRAINT "client_course_title_overrides_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."client_entitlements"
    ADD CONSTRAINT "client_entitlements_assigned_by_user_id_fkey" FOREIGN KEY ("assigned_by_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."client_entitlements"
    ADD CONSTRAINT "client_entitlements_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_content"
    ADD CONSTRAINT "community_content_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."comprehension_passages"
    ADD CONSTRAINT "comprehension_passages_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."comprehension_passages"
    ADD CONSTRAINT "comprehension_passages_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comprehension_passages"
    ADD CONSTRAINT "comprehension_passages_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."comprehension_passages"
    ADD CONSTRAINT "comprehension_passages_grade_id_fkey" FOREIGN KEY ("grade_id") REFERENCES "public"."grades"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."comprehension_passages"
    ADD CONSTRAINT "comprehension_passages_legacy_question_id_fkey" FOREIGN KEY ("legacy_question_id") REFERENCES "public"."questions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."comprehension_passages"
    ADD CONSTRAINT "comprehension_passages_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."comprehension_passages"
    ADD CONSTRAINT "comprehension_passages_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comprehension_passages"
    ADD CONSTRAINT "comprehension_passages_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."comprehension_passages"
    ADD CONSTRAINT "comprehension_passages_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."content_entitlements"
    ADD CONSTRAINT "content_entitlements_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content_entitlements"
    ADD CONSTRAINT "content_entitlements_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "public"."content_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content_entitlements"
    ADD CONSTRAINT "content_entitlements_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content_entitlements"
    ADD CONSTRAINT "content_entitlements_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."content_entitlements"
    ADD CONSTRAINT "content_entitlements_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "public"."content_packs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content_items"
    ADD CONSTRAINT "content_items_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content_items"
    ADD CONSTRAINT "content_items_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."content_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content_pack_items"
    ADD CONSTRAINT "content_pack_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."content_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content_pack_items"
    ADD CONSTRAINT "content_pack_items_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "public"."content_packs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content_packs"
    ADD CONSTRAINT "content_packs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."course_exams"
    ADD CONSTRAINT "course_exams_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."course_exams"
    ADD CONSTRAINT "course_exams_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_exams"
    ADD CONSTRAINT "course_exams_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_linked_content"
    ADD CONSTRAINT "course_linked_content_content_item_id_fkey" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_linked_content"
    ADD CONSTRAINT "course_linked_content_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_linked_content"
    ADD CONSTRAINT "course_linked_content_linked_by_fkey" FOREIGN KEY ("linked_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."course_linked_content"
    ADD CONSTRAINT "course_linked_content_parent_content_id_fkey" FOREIGN KEY ("parent_content_id") REFERENCES "public"."content_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_linked_content"
    ADD CONSTRAINT "course_linked_content_source_pack_id_fkey" FOREIGN KEY ("source_pack_id") REFERENCES "public"."content_packs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."course_school_assignments"
    ADD CONSTRAINT "course_school_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."course_school_assignments"
    ADD CONSTRAINT "course_school_assignments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_school_assignments"
    ADD CONSTRAINT "course_school_assignments_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."enrollments"
    ADD CONSTRAINT "enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."enrollments"
    ADD CONSTRAINT "enrollments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exam_attempts"
    ADD CONSTRAINT "exam_attempts_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id");



ALTER TABLE ONLY "public"."exam_attempts"
    ADD CONSTRAINT "exam_attempts_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."exam_entitlements"
    ADD CONSTRAINT "exam_entitlements_assigned_by_user_id_fkey" FOREIGN KEY ("assigned_by_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."exam_entitlements"
    ADD CONSTRAINT "exam_entitlements_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exam_entitlements"
    ADD CONSTRAINT "exam_entitlements_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exam_questions"
    ADD CONSTRAINT "exam_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id");



ALTER TABLE ONLY "public"."exam_questions"
    ADD CONSTRAINT "exam_questions_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."exam_sections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exam_responses"
    ADD CONSTRAINT "exam_responses_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "public"."exam_attempts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exam_responses"
    ADD CONSTRAINT "exam_responses_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id");



ALTER TABLE ONLY "public"."exam_responses"
    ADD CONSTRAINT "exam_responses_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."exam_sections"("id");



ALTER TABLE ONLY "public"."exam_school_assignments"
    ADD CONSTRAINT "exam_school_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."exam_school_assignments"
    ADD CONSTRAINT "exam_school_assignments_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exam_school_assignments"
    ADD CONSTRAINT "exam_school_assignments_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exam_section_chapters"
    ADD CONSTRAINT "exam_section_chapters_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."exam_section_chapters"
    ADD CONSTRAINT "exam_section_chapters_exam_section_id_fkey" FOREIGN KEY ("exam_section_id") REFERENCES "public"."exam_sections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exam_section_topics"
    ADD CONSTRAINT "exam_section_topics_exam_section_id_fkey" FOREIGN KEY ("exam_section_id") REFERENCES "public"."exam_sections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exam_section_topics"
    ADD CONSTRAINT "exam_section_topics_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."exam_sections"
    ADD CONSTRAINT "exam_sections_blueprint_section_id_fkey" FOREIGN KEY ("blueprint_section_id") REFERENCES "public"."blueprint_sections"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."exam_sections"
    ADD CONSTRAINT "exam_sections_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exam_sections"
    ADD CONSTRAINT "exam_sections_selected_subject_id_fkey" FOREIGN KEY ("selected_subject_id") REFERENCES "public"."subjects"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."exams"
    ADD CONSTRAINT "exams_blueprint_id_fkey" FOREIGN KEY ("blueprint_id") REFERENCES "public"."blueprints"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."exams"
    ADD CONSTRAINT "exams_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exams"
    ADD CONSTRAINT "exams_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."exams"
    ADD CONSTRAINT "exams_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."exams"
    ADD CONSTRAINT "exams_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."grades"
    ADD CONSTRAINT "grades_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."program_lesson_planner_sessions"
    ADD CONSTRAINT "program_lesson_planner_sessions_lesson_planner_upload_id_fkey" FOREIGN KEY ("lesson_planner_upload_id") REFERENCES "public"."program_lesson_planner_uploads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."program_lesson_planner_uploads"
    ADD CONSTRAINT "program_lesson_planner_uploads_grade_id_fkey" FOREIGN KEY ("grade_id") REFERENCES "public"."grades"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."program_lesson_planner_uploads"
    ADD CONSTRAINT "program_lesson_planner_uploads_micro_schedule_upload_id_fkey" FOREIGN KEY ("micro_schedule_upload_id") REFERENCES "public"."program_micro_schedule_uploads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."program_lesson_planner_uploads"
    ADD CONSTRAINT "program_lesson_planner_uploads_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."program_lesson_planner_uploads"
    ADD CONSTRAINT "program_lesson_planner_uploads_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."program_micro_schedule_rows"
    ADD CONSTRAINT "program_micro_schedule_rows_micro_schedule_upload_id_fkey" FOREIGN KEY ("micro_schedule_upload_id") REFERENCES "public"."program_micro_schedule_uploads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."program_micro_schedule_uploads"
    ADD CONSTRAINT "program_micro_schedule_uploads_grade_id_fkey" FOREIGN KEY ("grade_id") REFERENCES "public"."grades"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."program_micro_schedule_uploads"
    ADD CONSTRAINT "program_micro_schedule_uploads_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."program_micro_schedule_uploads"
    ADD CONSTRAINT "program_micro_schedule_uploads_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."program_session_templates"
    ADD CONSTRAINT "program_session_templates_lesson_planner_session_id_fkey" FOREIGN KEY ("lesson_planner_session_id") REFERENCES "public"."program_lesson_planner_sessions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."program_session_templates"
    ADD CONSTRAINT "program_session_templates_micro_schedule_row_id_fkey" FOREIGN KEY ("micro_schedule_row_id") REFERENCES "public"."program_micro_schedule_rows"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."program_session_templates"
    ADD CONSTRAINT "program_session_templates_published_by_user_id_fkey" FOREIGN KEY ("published_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."programs"
    ADD CONSTRAINT "programs_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."programs"
    ADD CONSTRAINT "programs_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."question_bank_entitlements"
    ADD CONSTRAINT "question_bank_entitlements_assigned_by_user_id_fkey" FOREIGN KEY ("assigned_by_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."question_bank_entitlements"
    ADD CONSTRAINT "question_bank_entitlements_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."question_bank_entitlements"
    ADD CONSTRAINT "question_bank_entitlements_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."question_bank_school_assignments"
    ADD CONSTRAINT "question_bank_school_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."question_bank_school_assignments"
    ADD CONSTRAINT "question_bank_school_assignments_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."question_bank_school_assignments"
    ADD CONSTRAINT "question_bank_school_assignments_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."question_folders"
    ADD CONSTRAINT "question_folders_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."question_folders"
    ADD CONSTRAINT "question_folders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."question_folders"
    ADD CONSTRAINT "question_folders_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id");



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_comprehension_passage_id_fkey" FOREIGN KEY ("comprehension_passage_id") REFERENCES "public"."comprehension_passages"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "public"."question_folders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id");



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id");



ALTER TABLE ONLY "public"."refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."school_memberships"
    ADD CONSTRAINT "school_memberships_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."school_memberships"
    ADD CONSTRAINT "school_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."schools"
    ADD CONSTRAINT "schools_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_attempts"
    ADD CONSTRAINT "student_attempts_content_item_id_fkey" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_attempts"
    ADD CONSTRAINT "student_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subjects"
    ADD CONSTRAINT "subjects_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subjects"
    ADD CONSTRAINT "subjects_grade_id_fkey" FOREIGN KEY ("grade_id") REFERENCES "public"."grades"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."teacher_session_tracker_permissions"
    ADD CONSTRAINT "teacher_session_tracker_permissions_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teacher_session_tracker_permissions"
    ADD CONSTRAINT "teacher_session_tracker_permissions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teacher_session_tracker_permissions"
    ADD CONSTRAINT "teacher_session_tracker_permissions_granted_by_user_id_fkey" FOREIGN KEY ("granted_by_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."teacher_session_tracker_permissions"
    ADD CONSTRAINT "teacher_session_tracker_permissions_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teacher_session_tracker_permissions"
    ADD CONSTRAINT "teacher_session_tracker_permissions_teacher_user_id_fkey" FOREIGN KEY ("teacher_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teaching_session_updates"
    ADD CONSTRAINT "teaching_session_updates_teacher_user_id_fkey" FOREIGN KEY ("teacher_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teaching_session_updates"
    ADD CONSTRAINT "teaching_session_updates_teaching_session_id_fkey" FOREIGN KEY ("teaching_session_id") REFERENCES "public"."teaching_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teaching_sessions"
    ADD CONSTRAINT "teaching_sessions_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."teaching_sessions"
    ADD CONSTRAINT "teaching_sessions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teaching_sessions"
    ADD CONSTRAINT "teaching_sessions_last_updated_by_user_id_fkey" FOREIGN KEY ("last_updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."teaching_sessions"
    ADD CONSTRAINT "teaching_sessions_program_session_template_id_fkey" FOREIGN KEY ("program_session_template_id") REFERENCES "public"."program_session_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."teaching_sessions"
    ADD CONSTRAINT "teaching_sessions_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teaching_sessions"
    ADD CONSTRAINT "teaching_sessions_teacher_user_id_fkey" FOREIGN KEY ("teacher_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."topics"
    ADD CONSTRAINT "topics_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_permissions"
    ADD CONSTRAINT "user_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id");



ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_logs_tenant_isolation" ON "public"."audit_logs" USING ((("public"."app_role"() = 'super_admin'::"text") OR ("client_id" = "public"."app_client_id"()))) WITH CHECK ((("public"."app_role"() = 'super_admin'::"text") OR ("client_id" = "public"."app_client_id"())));



ALTER TABLE "public"."batch_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "batch_members_tenant_isolation" ON "public"."batch_members" USING ((("public"."app_role"() = 'super_admin'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."batches" "b"
  WHERE (("b"."id" = "batch_members"."batch_id") AND ("b"."client_id" = "public"."app_client_id"())))))) WITH CHECK ((("public"."app_role"() = 'super_admin'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."batches" "b"
  WHERE (("b"."id" = "batch_members"."batch_id") AND ("b"."client_id" = "public"."app_client_id"()))))));



ALTER TABLE "public"."batches" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "batches_tenant_isolation" ON "public"."batches" USING ((("public"."app_role"() = 'super_admin'::"text") OR ("client_id" = "public"."app_client_id"()))) WITH CHECK ((("public"."app_role"() = 'super_admin'::"text") OR ("client_id" = "public"."app_client_id"())));



ALTER TABLE "public"."blueprint_sections" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "blueprint_sections_tenant_isolation" ON "public"."blueprint_sections" USING ((("public"."app_role"() = 'super_admin'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."blueprints" "b"
  WHERE (("b"."id" = "blueprint_sections"."blueprint_id") AND ("b"."client_id" = "public"."app_client_id"())))))) WITH CHECK ((("public"."app_role"() = 'super_admin'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."blueprints" "b"
  WHERE (("b"."id" = "blueprint_sections"."blueprint_id") AND ("b"."client_id" = "public"."app_client_id"()))))));



ALTER TABLE "public"."blueprints" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "blueprints_tenant_isolation" ON "public"."blueprints" USING ((("public"."app_role"() = 'super_admin'::"text") OR ("client_id" = "public"."app_client_id"()))) WITH CHECK ((("public"."app_role"() = 'super_admin'::"text") OR ("client_id" = "public"."app_client_id"())));



ALTER TABLE "public"."certificates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "certificates_tenant_isolation" ON "public"."certificates" USING ((("public"."app_role"() = 'super_admin'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."courses" "c"
  WHERE (("c"."id" = "certificates"."course_id") AND ("c"."client_id" = "public"."app_client_id"())))))) WITH CHECK ((("public"."app_role"() = 'super_admin'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."courses" "c"
  WHERE (("c"."id" = "certificates"."course_id") AND ("c"."client_id" = "public"."app_client_id"()))))));



ALTER TABLE "public"."chapters" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "chapters_tenant_isolation" ON "public"."chapters" USING ((("public"."app_role"() = 'super_admin'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."subjects" "s"
  WHERE (("s"."id" = "chapters"."subject_id") AND ("s"."client_id" = "public"."app_client_id"())))))) WITH CHECK ((("public"."app_role"() = 'super_admin'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."subjects" "s"
  WHERE (("s"."id" = "chapters"."subject_id") AND ("s"."client_id" = "public"."app_client_id"()))))));



ALTER TABLE "public"."client_entitlements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "client_entitlements_tenant_isolation" ON "public"."client_entitlements" USING ((("public"."app_role"() = 'super_admin'::"text") OR ("client_id" = "public"."app_client_id"()))) WITH CHECK ((("public"."app_role"() = 'super_admin'::"text") OR ("client_id" = "public"."app_client_id"())));



ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "clients_tenant_isolation" ON "public"."clients" USING ((("public"."app_role"() = 'super_admin'::"text") OR ("id" = "public"."app_client_id"()))) WITH CHECK ((("public"."app_role"() = 'super_admin'::"text") OR ("id" = "public"."app_client_id"())));



ALTER TABLE "public"."community_content" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."content_entitlements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "content_entitlements_tenant_isolation" ON "public"."content_entitlements" USING ((("public"."app_role"() = 'super_admin'::"text") OR ("client_id" = "public"."app_client_id"()))) WITH CHECK ((("public"."app_role"() = 'super_admin'::"text") OR ("client_id" = "public"."app_client_id"())));



ALTER TABLE "public"."content_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "content_items_tenant_isolation" ON "public"."content_items" USING ((("public"."app_role"() = 'super_admin'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."courses" "c"
  WHERE (("c"."id" = "content_items"."course_id") AND ("c"."client_id" = "public"."app_client_id"())))))) WITH CHECK ((("public"."app_role"() = 'super_admin'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."courses" "c"
  WHERE (("c"."id" = "content_items"."course_id") AND ("c"."client_id" = "public"."app_client_id"()))))));



ALTER TABLE "public"."content_pack_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "content_pack_items_platform_only" ON "public"."content_pack_items" USING (("public"."app_role"() = 'super_admin'::"text")) WITH CHECK (("public"."app_role"() = 'super_admin'::"text"));



ALTER TABLE "public"."content_packs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "content_packs_platform_only" ON "public"."content_packs" USING (("public"."app_role"() = 'super_admin'::"text")) WITH CHECK (("public"."app_role"() = 'super_admin'::"text"));



ALTER TABLE "public"."courses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "courses_tenant_isolation" ON "public"."courses" USING ((("public"."app_role"() = 'super_admin'::"text") OR ("client_id" = "public"."app_client_id"()))) WITH CHECK ((("public"."app_role"() = 'super_admin'::"text") OR ("client_id" = "public"."app_client_id"())));



ALTER TABLE "public"."enrollments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "enrollments_tenant_isolation" ON "public"."enrollments" USING ((("public"."app_role"() = 'super_admin'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."courses" "c"
  WHERE (("c"."id" = "enrollments"."course_id") AND ("c"."client_id" = "public"."app_client_id"())))))) WITH CHECK ((("public"."app_role"() = 'super_admin'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."courses" "c"
  WHERE (("c"."id" = "enrollments"."course_id") AND ("c"."client_id" = "public"."app_client_id"()))))));



ALTER TABLE "public"."exam_attempts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "exam_attempts_tenant_isolation" ON "public"."exam_attempts" USING ((("public"."app_role"() = 'super_admin'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."exams" "e"
  WHERE (("e"."id" = "exam_attempts"."exam_id") AND ("e"."client_id" = "public"."app_client_id"())))))) WITH CHECK ((("public"."app_role"() = 'super_admin'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."exams" "e"
  WHERE (("e"."id" = "exam_attempts"."exam_id") AND ("e"."client_id" = "public"."app_client_id"()))))));



ALTER TABLE "public"."exam_questions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "exam_questions_tenant_isolation" ON "public"."exam_questions" USING ((("public"."app_role"() = 'super_admin'::"text") OR (EXISTS ( SELECT 1
   FROM ("public"."exam_sections" "es"
     JOIN "public"."exams" "e" ON (("es"."exam_id" = "e"."id")))
  WHERE (("es"."id" = "exam_questions"."section_id") AND ("e"."client_id" = "public"."app_client_id"())))))) WITH CHECK ((("public"."app_role"() = 'super_admin'::"text") OR (EXISTS ( SELECT 1
   FROM ("public"."exam_sections" "es"
     JOIN "public"."exams" "e" ON (("es"."exam_id" = "e"."id")))
  WHERE (("es"."id" = "exam_questions"."section_id") AND ("e"."client_id" = "public"."app_client_id"()))))));



ALTER TABLE "public"."exam_responses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "exam_responses_tenant_isolation" ON "public"."exam_responses" USING ((("public"."app_role"() = 'super_admin'::"text") OR (EXISTS ( SELECT 1
   FROM ("public"."exam_attempts" "ea"
     JOIN "public"."exams" "e" ON (("ea"."exam_id" = "e"."id")))
  WHERE (("ea"."id" = "exam_responses"."attempt_id") AND ("e"."client_id" = "public"."app_client_id"())))))) WITH CHECK ((("public"."app_role"() = 'super_admin'::"text") OR (EXISTS ( SELECT 1
   FROM ("public"."exam_attempts" "ea"
     JOIN "public"."exams" "e" ON (("ea"."exam_id" = "e"."id")))
  WHERE (("ea"."id" = "exam_responses"."attempt_id") AND ("e"."client_id" = "public"."app_client_id"()))))));



ALTER TABLE "public"."exam_section_chapters" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "exam_section_chapters_tenant_isolation" ON "public"."exam_section_chapters" USING ((("public"."app_role"() = 'super_admin'::"text") OR (EXISTS ( SELECT 1
   FROM ("public"."exam_sections" "es"
     JOIN "public"."exams" "e" ON (("es"."exam_id" = "e"."id")))
  WHERE (("es"."id" = "exam_section_chapters"."exam_section_id") AND ("e"."client_id" = "public"."app_client_id"())))))) WITH CHECK ((("public"."app_role"() = 'super_admin'::"text") OR (EXISTS ( SELECT 1
   FROM ("public"."exam_sections" "es"
     JOIN "public"."exams" "e" ON (("es"."exam_id" = "e"."id")))
  WHERE (("es"."id" = "exam_section_chapters"."exam_section_id") AND ("e"."client_id" = "public"."app_client_id"()))))));



ALTER TABLE "public"."exam_section_topics" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "exam_section_topics_tenant_isolation" ON "public"."exam_section_topics" USING ((("public"."app_role"() = 'super_admin'::"text") OR (EXISTS ( SELECT 1
   FROM ("public"."exam_sections" "es"
     JOIN "public"."exams" "e" ON (("es"."exam_id" = "e"."id")))
  WHERE (("es"."id" = "exam_section_topics"."exam_section_id") AND ("e"."client_id" = "public"."app_client_id"())))))) WITH CHECK ((("public"."app_role"() = 'super_admin'::"text") OR (EXISTS ( SELECT 1
   FROM ("public"."exam_sections" "es"
     JOIN "public"."exams" "e" ON (("es"."exam_id" = "e"."id")))
  WHERE (("es"."id" = "exam_section_topics"."exam_section_id") AND ("e"."client_id" = "public"."app_client_id"()))))));



ALTER TABLE "public"."exam_sections" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "exam_sections_tenant_isolation" ON "public"."exam_sections" USING ((("public"."app_role"() = 'super_admin'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."exams" "e"
  WHERE (("e"."id" = "exam_sections"."exam_id") AND ("e"."client_id" = "public"."app_client_id"())))))) WITH CHECK ((("public"."app_role"() = 'super_admin'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."exams" "e"
  WHERE (("e"."id" = "exam_sections"."exam_id") AND ("e"."client_id" = "public"."app_client_id"()))))));



ALTER TABLE "public"."exams" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "exams_tenant_isolation" ON "public"."exams" USING ((("public"."app_role"() = 'super_admin'::"text") OR ("client_id" = "public"."app_client_id"()))) WITH CHECK ((("public"."app_role"() = 'super_admin'::"text") OR ("client_id" = "public"."app_client_id"())));



ALTER TABLE "public"."program_lesson_planner_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "program_lesson_planner_sessions_platform_only" ON "public"."program_lesson_planner_sessions" USING (("public"."app_role"() = ANY (ARRAY['super_admin'::"text", 'content_authorizer'::"text"]))) WITH CHECK (("public"."app_role"() = ANY (ARRAY['super_admin'::"text", 'content_authorizer'::"text"])));



ALTER TABLE "public"."program_lesson_planner_uploads" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "program_lesson_planner_uploads_platform_only" ON "public"."program_lesson_planner_uploads" USING (("public"."app_role"() = ANY (ARRAY['super_admin'::"text", 'content_authorizer'::"text"]))) WITH CHECK (("public"."app_role"() = ANY (ARRAY['super_admin'::"text", 'content_authorizer'::"text"])));



ALTER TABLE "public"."program_micro_schedule_rows" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "program_micro_schedule_rows_platform_only" ON "public"."program_micro_schedule_rows" USING (("public"."app_role"() = ANY (ARRAY['super_admin'::"text", 'content_authorizer'::"text"]))) WITH CHECK (("public"."app_role"() = ANY (ARRAY['super_admin'::"text", 'content_authorizer'::"text"])));



ALTER TABLE "public"."program_micro_schedule_uploads" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "program_micro_schedule_uploads_platform_only" ON "public"."program_micro_schedule_uploads" USING (("public"."app_role"() = ANY (ARRAY['super_admin'::"text", 'content_authorizer'::"text"]))) WITH CHECK (("public"."app_role"() = ANY (ARRAY['super_admin'::"text", 'content_authorizer'::"text"])));



ALTER TABLE "public"."program_session_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "program_session_templates_platform_read_publish" ON "public"."program_session_templates" USING (("public"."app_role"() = ANY (ARRAY['super_admin'::"text", 'content_authorizer'::"text"]))) WITH CHECK (("public"."app_role"() = ANY (ARRAY['super_admin'::"text", 'content_authorizer'::"text"])));



ALTER TABLE "public"."question_folders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "question_folders_tenant_isolation" ON "public"."question_folders" USING ((("public"."app_role"() = 'super_admin'::"text") OR ("client_id" = "public"."app_client_id"()))) WITH CHECK ((("public"."app_role"() = 'super_admin'::"text") OR ("client_id" = "public"."app_client_id"())));



ALTER TABLE "public"."questions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "questions_tenant_isolation" ON "public"."questions" USING ((("public"."app_role"() = 'super_admin'::"text") OR ("client_id" = "public"."app_client_id"()))) WITH CHECK ((("public"."app_role"() = 'super_admin'::"text") OR ("client_id" = "public"."app_client_id"())));



ALTER TABLE "public"."role_permissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "role_permissions_delete" ON "public"."role_permissions" FOR DELETE USING ((("public"."app_role"() = 'super_admin'::"text") OR ("client_id" = "public"."app_client_id"())));



CREATE POLICY "role_permissions_insert" ON "public"."role_permissions" FOR INSERT WITH CHECK ((("public"."app_role"() = 'super_admin'::"text") OR ("client_id" = "public"."app_client_id"())));



CREATE POLICY "role_permissions_select" ON "public"."role_permissions" FOR SELECT USING ((("public"."app_role"() = 'super_admin'::"text") OR ("client_id" = "public"."app_client_id"()) OR ("client_id" IS NULL)));



CREATE POLICY "role_permissions_update" ON "public"."role_permissions" FOR UPDATE USING ((("public"."app_role"() = 'super_admin'::"text") OR ("client_id" = "public"."app_client_id"()))) WITH CHECK ((("public"."app_role"() = 'super_admin'::"text") OR ("client_id" = "public"."app_client_id"())));



ALTER TABLE "public"."school_memberships" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "school_memberships_tenant_isolation" ON "public"."school_memberships" USING ((("public"."app_role"() = 'super_admin'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."schools" "s"
  WHERE (("s"."id" = "school_memberships"."school_id") AND ("s"."client_id" = "public"."app_client_id"())))))) WITH CHECK ((("public"."app_role"() = 'super_admin'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."schools" "s"
  WHERE (("s"."id" = "school_memberships"."school_id") AND ("s"."client_id" = "public"."app_client_id"()))))));



ALTER TABLE "public"."schools" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "schools_tenant_isolation" ON "public"."schools" USING ((("public"."app_role"() = 'super_admin'::"text") OR ("client_id" = "public"."app_client_id"()))) WITH CHECK ((("public"."app_role"() = 'super_admin'::"text") OR ("client_id" = "public"."app_client_id"())));



ALTER TABLE "public"."student_attempts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "student_attempts_tenant_isolation" ON "public"."student_attempts" USING ((("public"."app_role"() = 'super_admin'::"text") OR (EXISTS ( SELECT 1
   FROM ("public"."content_items" "ci"
     JOIN "public"."courses" "c" ON (("ci"."course_id" = "c"."id")))
  WHERE (("ci"."id" = "student_attempts"."content_item_id") AND ("c"."client_id" = "public"."app_client_id"())))))) WITH CHECK ((("public"."app_role"() = 'super_admin'::"text") OR (EXISTS ( SELECT 1
   FROM ("public"."content_items" "ci"
     JOIN "public"."courses" "c" ON (("ci"."course_id" = "c"."id")))
  WHERE (("ci"."id" = "student_attempts"."content_item_id") AND ("c"."client_id" = "public"."app_client_id"()))))));



ALTER TABLE "public"."subjects" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "subjects_tenant_isolation" ON "public"."subjects" USING ((("public"."app_role"() = 'super_admin'::"text") OR ("client_id" = "public"."app_client_id"()))) WITH CHECK ((("public"."app_role"() = 'super_admin'::"text") OR ("client_id" = "public"."app_client_id"())));



ALTER TABLE "public"."teacher_session_tracker_permissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "teacher_session_tracker_permissions_tenant_isolation" ON "public"."teacher_session_tracker_permissions" USING ((("public"."app_role"() = 'super_admin'::"text") OR ("client_id" = "public"."app_client_id"()))) WITH CHECK ((("public"."app_role"() = 'super_admin'::"text") OR ("client_id" = "public"."app_client_id"())));



ALTER TABLE "public"."teaching_session_updates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "teaching_session_updates_tenant_isolation" ON "public"."teaching_session_updates" USING ((("public"."app_role"() = 'super_admin'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."teaching_sessions" "ts"
  WHERE (("ts"."id" = "teaching_session_updates"."teaching_session_id") AND ("ts"."client_id" = "public"."app_client_id"())))))) WITH CHECK ((("public"."app_role"() = 'super_admin'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."teaching_sessions" "ts"
  WHERE (("ts"."id" = "teaching_session_updates"."teaching_session_id") AND ("ts"."client_id" = "public"."app_client_id"()))))));



ALTER TABLE "public"."teaching_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "teaching_sessions_tenant_isolation" ON "public"."teaching_sessions" USING ((("public"."app_role"() = 'super_admin'::"text") OR ("client_id" = "public"."app_client_id"()))) WITH CHECK ((("public"."app_role"() = 'super_admin'::"text") OR ("client_id" = "public"."app_client_id"())));



ALTER TABLE "public"."topics" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "topics_tenant_isolation" ON "public"."topics" USING ((("public"."app_role"() = 'super_admin'::"text") OR (EXISTS ( SELECT 1
   FROM ("public"."chapters" "ch"
     JOIN "public"."subjects" "s" ON (("ch"."subject_id" = "s"."id")))
  WHERE (("ch"."id" = "topics"."chapter_id") AND ("s"."client_id" = "public"."app_client_id"())))))) WITH CHECK ((("public"."app_role"() = 'super_admin'::"text") OR (EXISTS ( SELECT 1
   FROM ("public"."chapters" "ch"
     JOIN "public"."subjects" "s" ON (("ch"."subject_id" = "s"."id")))
  WHERE (("ch"."id" = "topics"."chapter_id") AND ("s"."client_id" = "public"."app_client_id"()))))));



ALTER TABLE "public"."user_permissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_permissions_delete" ON "public"."user_permissions" FOR DELETE USING (("public"."app_role"() = 'super_admin'::"text"));



CREATE POLICY "user_permissions_insert" ON "public"."user_permissions" FOR INSERT WITH CHECK (("public"."app_role"() = 'super_admin'::"text"));



CREATE POLICY "user_permissions_select" ON "public"."user_permissions" FOR SELECT USING (("public"."app_role"() = 'super_admin'::"text"));



CREATE POLICY "user_permissions_update" ON "public"."user_permissions" FOR UPDATE USING (("public"."app_role"() = 'super_admin'::"text")) WITH CHECK (("public"."app_role"() = 'super_admin'::"text"));



ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_tenant_isolation" ON "public"."users" USING ((("public"."app_role"() = 'super_admin'::"text") OR ("client_id" = "public"."app_client_id"()))) WITH CHECK ((("public"."app_role"() = 'super_admin'::"text") OR ("client_id" = "public"."app_client_id"())));



REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;




