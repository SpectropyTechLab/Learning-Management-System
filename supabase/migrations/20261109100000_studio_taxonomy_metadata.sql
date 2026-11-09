-- Structured optional Topic/Screen metadata used by Studio authoring and Branching.
CREATE TABLE IF NOT EXISTS public.studio_taxonomy_terms (
  id BIGSERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES public.clients(id) ON DELETE CASCADE,
  taxonomy_type VARCHAR(30) NOT NULL
    CHECK (taxonomy_type IN ('pedagogy', 'bloom', 'target_exam')),
  code VARCHAR(100) NOT NULL CHECK (code = LOWER(BTRIM(code)) AND code <> ''),
  label VARCHAR(160) NOT NULL CHECK (BTRIM(label) <> ''),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_studio_taxonomy_scope_type_code
  ON public.studio_taxonomy_terms (COALESCE(client_id, 0), taxonomy_type, code);
CREATE INDEX IF NOT EXISTS idx_studio_taxonomy_type_active
  ON public.studio_taxonomy_terms (taxonomy_type, is_active, label);

CREATE TABLE IF NOT EXISTS public.topic_taxonomy_terms (
  topic_id INTEGER NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  term_id BIGINT NOT NULL REFERENCES public.studio_taxonomy_terms(id) ON DELETE RESTRICT,
  source VARCHAR(30) NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'session_plan', 'migration')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (topic_id, term_id)
);

CREATE TABLE IF NOT EXISTS public.screen_taxonomy_terms (
  screen_id INTEGER NOT NULL REFERENCES public.screens(id) ON DELETE CASCADE,
  term_id BIGINT NOT NULL REFERENCES public.studio_taxonomy_terms(id) ON DELETE RESTRICT,
  source VARCHAR(30) NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'session_plan', 'migration')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (screen_id, term_id)
);

CREATE INDEX IF NOT EXISTS idx_topic_taxonomy_term_topic
  ON public.topic_taxonomy_terms(term_id, topic_id);
CREATE INDEX IF NOT EXISTS idx_screen_taxonomy_term_screen
  ON public.screen_taxonomy_terms(term_id, screen_id);

INSERT INTO public.studio_taxonomy_terms (client_id, taxonomy_type, code, label)
VALUES
  (NULL, 'bloom', 'remember', 'Remember'),
  (NULL, 'bloom', 'understand', 'Understand'),
  (NULL, 'bloom', 'apply', 'Apply'),
  (NULL, 'bloom', 'analyze', 'Analyze'),
  (NULL, 'bloom', 'evaluate', 'Evaluate'),
  (NULL, 'bloom', 'create', 'Create')
ON CONFLICT DO NOTHING;

ALTER TABLE public.studio_taxonomy_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_taxonomy_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screen_taxonomy_terms ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.studio_taxonomy_terms, public.topic_taxonomy_terms,
  public.screen_taxonomy_terms FROM anon, authenticated, service_role;
REVOKE ALL ON SEQUENCE public.studio_taxonomy_terms_id_seq FROM anon, authenticated, service_role;

