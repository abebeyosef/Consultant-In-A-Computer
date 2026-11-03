import OpenAI from "openai";
import { z } from "zod";

/**
 * Server-side Meta Model API client (OpenAI-compatible).
 * Never import this from client components: it reads the API key.
 */

export type ModelConfig = {
  apiKey: string | undefined;
  baseURL: string;
  model: string;
  mockForced: boolean;
};

export function getModelConfig(): ModelConfig {
  return {
    apiKey: process.env.MODEL_API_KEY?.trim() || undefined,
    baseURL: process.env.MODEL_BASE_URL?.trim() || "https://api.meta.ai/v1",
    model: process.env.MODEL_ID?.trim() || "muse-spark-1.1",
    mockForced: process.env.MOCK_MODE === "1",
  };
}

export function isMockMode(cfg = getModelConfig()): boolean {
  return cfg.mockForced || !cfg.apiKey;
}

/** Runtime override set when the live model has failed repeatedly (circuit breaker). */
const breaker = { failures: 0, openUntil: 0 };
export function liveAvailable(): boolean {
  return !isMockMode() && Date.now() >= breaker.openUntil;
}
function recordFailure() {
  breaker.failures += 1;
  if (breaker.failures >= 3) {
    breaker.openUntil = Date.now() + 60_000; // back off from live for a minute
    breaker.failures = 0;
  }
}
function recordSuccess() {
  breaker.failures = 0;
}

let cached: OpenAI | null = null;
function getClient(cfg: ModelConfig): OpenAI {
  if (!cached) {
    cached = new OpenAI({ apiKey: cfg.apiKey, baseURL: cfg.baseURL, maxRetries: 0 });
  }
  return cached;
}

export type CallResult<T> =
  | { ok: true; data: T; latencyMs: number; usage?: { prompt?: number; completion?: number } }
  | { ok: false; error: string; latencyMs: number };

export function stripFences(text: string): string {
  let t = text.trim();
  const fence = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fence) t = fence[1];
  // If there's prose around the JSON, take the outermost object.
  if (!t.startsWith("{")) {
    const start = t.indexOf("{");
    const end = t.lastIndexOf("}");
    if (start >= 0 && end > start) t = t.slice(start, end + 1);
  }
  return t;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type CallOpts<S extends z.ZodTypeAny> = {
  label: string;
  system: string;
  user: string;
  schema: S;
  effort: "low" | "medium";
  timeoutMs: number;
};

/**
 * Ask the model for JSON matching `schema`.
 * 1st attempt: json_schema response_format + reasoning_effort.
 * On HTTP 400: retry once without them, asking for "JSON only".
 * On 429/5xx/timeout: one retry after 2s.
 */
export async function callModelJSON<S extends z.ZodTypeAny>(
  opts: CallOpts<S>,
): Promise<CallResult<z.infer<S>>> {
  const cfg = getModelConfig();
  const started = Date.now();
  if (isMockMode(cfg)) return { ok: false, error: "mock mode", latencyMs: 0 };
  const client = getClient(cfg);

  let jsonSchema: Record<string, unknown> | null = null;
  try {
    jsonSchema = z.toJSONSchema(opts.schema) as Record<string, unknown>;
    delete jsonSchema.$schema;
  } catch {
    jsonSchema = null;
  }

  let structured = jsonSchema !== null;
  let transientRetried = false;
  let lastError = "unknown";

  for (let attempt = 0; attempt < 3; attempt++) {
    const t0 = Date.now();
    try {
      const body: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
        model: cfg.model,
        messages: [
          {
            role: "system",
            content: structured ? opts.system : `${opts.system}\n\nReply with JSON only. No prose, no code fences.`,
          },
          { role: "user", content: opts.user },
        ],
      };
      if (structured && jsonSchema) {
        body.response_format = {
          type: "json_schema",
          json_schema: { name: opts.label.replace(/[^a-zA-Z0-9_-]/g, "_"), schema: jsonSchema, strict: false },
        };
        body.reasoning_effort = opts.effort;
      }
      const res = await client.chat.completions.create(body, { timeout: opts.timeoutMs });
      const text = res.choices?.[0]?.message?.content ?? "";
      const parsedJson = JSON.parse(stripFences(text));
      const parsed = opts.schema.safeParse(parsedJson);
      const latencyMs = Date.now() - t0;
      if (!parsed.success) {
        lastError = `schema mismatch: ${parsed.error.message.slice(0, 200)}`;
        console.warn(`[model] ${opts.label} invalid JSON shape (${latencyMs}ms): ${lastError}`);
        if (structured) {
          structured = false; // try the plain-JSON path once
          continue;
        }
        break;
      }
      console.info(
        `[model] ${opts.label} ok ${latencyMs}ms tokens=${res.usage?.prompt_tokens ?? "?"}/${res.usage?.completion_tokens ?? "?"}`,
      );
      recordSuccess();
      return {
        ok: true,
        data: parsed.data,
        latencyMs: Date.now() - started,
        usage: { prompt: res.usage?.prompt_tokens, completion: res.usage?.completion_tokens },
      };
    } catch (err) {
      const latencyMs = Date.now() - t0;
      const status = err instanceof OpenAI.APIError ? err.status : undefined;
      lastError = err instanceof Error ? `${status ?? ""} ${err.message}`.trim() : String(err);
      console.warn(`[model] ${opts.label} failed ${latencyMs}ms status=${status ?? "-"}: ${lastError.slice(0, 200)}`);
      if (status === 400 && structured) {
        structured = false;
        continue;
      }
      if (err instanceof SyntaxError && structured) {
        structured = false;
        continue;
      }
      const transient =
        status === 429 || (status !== undefined && status >= 500) || status === undefined;
      if (transient && !transientRetried && !(err instanceof SyntaxError)) {
        transientRetried = true;
        await sleep(2000);
        continue;
      }
      break;
    }
  }
  recordFailure();
  return { ok: false, error: lastError, latencyMs: Date.now() - started };
}

/** Plain text call used by the smoke test. */
export async function callModelText(prompt: string, timeoutMs = 20_000): Promise<CallResult<string>> {
  const cfg = getModelConfig();
  const t0 = Date.now();
  if (isMockMode(cfg)) return { ok: false, error: "mock mode", latencyMs: 0 };
  try {
    const res = await getClient(cfg).chat.completions.create(
      { model: cfg.model, messages: [{ role: "user", content: prompt }] },
      { timeout: timeoutMs },
    );
    return { ok: true, data: res.choices?.[0]?.message?.content ?? "", latencyMs: Date.now() - t0 };
  } catch (err) {
    const status = err instanceof OpenAI.APIError ? err.status : undefined;
    return {
      ok: false,
      error: `${status ?? ""} ${err instanceof Error ? err.message : String(err)}`.trim(),
      latencyMs: Date.now() - t0,
    };
  }
}
