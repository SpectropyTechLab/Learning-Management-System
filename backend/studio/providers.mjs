import { StudioError } from "./contracts.mjs";

// Transport adapters never receive database access. Keys remain server-side.
const adapters = {
  openrouter: {
    key: "OPENROUTER_API_KEY",
    request: ({ model, system, input, schema, maxTokens }, key) => ({
      url: "https://openrouter.ai/api/v1/chat/completions",
      headers: {
        Authorization: `Bearer ${key}`,
        "X-Title": "Spectropy Digital Studio",
      },
      body: {
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: input },
        ],
        max_tokens: maxTokens,
        provider: { require_parameters: true, data_collection: "deny" },
        response_format: {
          type: "json_schema",
          json_schema: { name: "spectropy_studio_draft", strict: true, schema },
        },
      },
    }),
    parse: (p) => ({
      text: p.choices?.[0]?.message?.content,
      complete: p.choices?.[0]?.finish_reason === "stop",
      refused: !!p.choices?.[0]?.message?.refusal,
      usage: p.usage,
    }),
  },
  anthropic: {
    key: "ANTHROPIC_API_KEY",
    request: ({ model, system, input, schema, maxTokens }, key) => ({
      url: "https://api.anthropic.com/v1/messages",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: {
        model,
        system,
        max_tokens: maxTokens,
        messages: [{ role: "user", content: input }],
        output_config: { format: { type: "json_schema", schema } },
      },
    }),
    parse: (p) => ({
      text: p.content
        ?.filter((b) => b.type === "text")
        .map((b) => b.text)
        .join(""),
      complete: p.stop_reason === "end_turn",
      refused: p.stop_reason === "refusal",
      usage: p.usage,
    }),
  },
  gemini: {
    key: "GEMINI_API_KEY",
    request: ({ model, system, input, schema, maxTokens }, key) => ({
      url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model.replace(/^models\//, ""))}:generateContent`,
      headers: { "x-goog-api-key": key },
      body: {
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: input }] }],
        generationConfig: {
          maxOutputTokens: maxTokens,
          responseMimeType: "application/json",
          responseJsonSchema: schema,
        },
      },
    }),
    parse: (p) => ({
      text: p.candidates?.[0]?.content?.parts
        ?.filter((b) => !b.thought)
        .map((b) => b.text || "")
        .join(""),
      complete: p.candidates?.[0]?.finishReason === "STOP",
      refused:
        !!p.promptFeedback?.blockReason ||
        ["SAFETY", "RECITATION"].includes(p.candidates?.[0]?.finishReason),
      usage: p.usageMetadata,
    }),
  },
};

export function providerConfig(env = process.env) {
  const provider = env.STUDIO_AI_PROVIDER || "openrouter";
  const adapter = adapters[provider];
  if (!adapter)
    throw new StudioError(`Unsupported Studio AI provider: ${provider}`, 503);
  return { provider, adapter, key: env[adapter.key] };
}

// Providers accept different schema subsets. Keep bounds in descriptions and
// enforce the full, original schema locally after every response.
export function transportSchema(value) {
  if (Array.isArray(value)) return value.map(transportSchema);
  if (!value || typeof value !== "object") return value;
  const out = {},
    limits = [];
  for (const [key, item] of Object.entries(value)) {
    if (["minimum", "maximum", "maxLength", "maxItems"].includes(key))
      limits.push(`${key}: ${item}`);
    else out[key] = transportSchema(item);
  }
  if (limits.length) out.description = limits.join("; ");
  return out;
}

export async function complete(
  input,
  { env = process.env, fetchImpl = fetch } = {},
) {
  const { provider, adapter, key } = providerConfig(env);
  if (!key)
    throw new StudioError(
      `Configure ${adapter.key} on the backend to enable AI`,
      503,
    );
  const request = adapter.request(
    {
      ...input,
      schema: transportSchema(input.schema),
      maxTokens: Math.max(
        1024,
        Math.min(32000, Number(env.STUDIO_AI_MAX_OUTPUT_TOKENS) || 16000),
      ),
    },
    key,
  );
  let response;
  try {
    response = await fetchImpl(request.url, {
      method: "POST",
      headers: { ...request.headers, "Content-Type": "application/json" },
      body: JSON.stringify(request.body),
      signal: AbortSignal.timeout(180000),
    });
  } catch {
    throw new StudioError(
      "AI connection timed out or failed. Your saved project is unchanged.",
      502,
    );
  }
  if (!response.ok)
    throw new StudioError(
      response.status === 429
        ? "AI quota or rate limit reached. Check the API account and retry later."
        : `AI request failed (${response.status}). Check model access, credits and configuration.`,
      502,
    );
  let parsed;
  try {
    parsed = adapter.parse(await response.json());
  } catch {
    throw new StudioError("AI returned an unreadable response", 502);
  }
  if (parsed.refused)
    throw new StudioError(
      "The model declined this request. Review the input and try again.",
      422,
    );
  if (!parsed.complete)
    throw new StudioError(
      "AI output was incomplete. Try fewer sessions or slides.",
      502,
    );
  return { ...parsed, provider };
}
