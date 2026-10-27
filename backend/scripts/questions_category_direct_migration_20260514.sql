-- Normalizes legacy question category values from "direction" to "direct"
-- inside public.questions.category (jsonb).

BEGIN;

CREATE OR REPLACE FUNCTION public.normalize_question_category_jsonb(input jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  result jsonb := input;
BEGIN
  IF input IS NULL THEN
    RETURN NULL;
  END IF;

  IF jsonb_typeof(input) = 'string' THEN
    IF lower(trim(both '"' from input::text)) = 'direction' THEN
      RETURN to_jsonb('direct'::text);
    END IF;
    RETURN input;
  END IF;

  IF jsonb_typeof(input) = 'array' THEN
    RETURN (
      SELECT jsonb_agg(
        CASE
          WHEN jsonb_typeof(value) = 'string' AND lower(trim(both '"' from value::text)) = 'direction'
            THEN to_jsonb('direct'::text)
          ELSE value
        END
      )
      FROM jsonb_array_elements(input) AS value
    );
  END IF;

  IF jsonb_typeof(input) = 'object' THEN
    IF jsonb_typeof(input->'label') = 'string' AND lower(trim(both '"' from (input->'label')::text)) = 'direction' THEN
      result := jsonb_set(result, '{label}', to_jsonb('direct'::text), true);
    END IF;

    IF jsonb_typeof(input->'name') = 'string' AND lower(trim(both '"' from (input->'name')::text)) = 'direction' THEN
      result := jsonb_set(result, '{name}', to_jsonb('direct'::text), true);
    END IF;

    IF jsonb_typeof(input->'value') = 'string' AND lower(trim(both '"' from (input->'value')::text)) = 'direction' THEN
      result := jsonb_set(result, '{value}', to_jsonb('direct'::text), true);
    END IF;

    IF jsonb_typeof(input->'type') = 'string' AND lower(trim(both '"' from (input->'type')::text)) = 'direction' THEN
      result := jsonb_set(result, '{type}', to_jsonb('direct'::text), true);
    END IF;

    IF jsonb_typeof(input->'tags') = 'array' THEN
      result := jsonb_set(
        result,
        '{tags}',
        (
          SELECT jsonb_agg(
            CASE
              WHEN jsonb_typeof(value) = 'string' AND lower(trim(both '"' from value::text)) = 'direction'
                THEN to_jsonb('direct'::text)
              ELSE value
            END
          )
          FROM jsonb_array_elements(input->'tags') AS value
        ),
        true
      );
    END IF;

    RETURN result;
  END IF;

  RETURN input;
END;
$$;

UPDATE public.questions
SET category = public.normalize_question_category_jsonb(category)
WHERE category IS NOT NULL
  AND (
    category::text ILIKE '%direction%'
  );

DROP FUNCTION public.normalize_question_category_jsonb(jsonb);

COMMIT;
