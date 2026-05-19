export const DEFAULT_OPENROUTER_MODEL = "google/gemini-3.1-flash-lite";

interface CallJsonOptions<T> {
  schemaName: string;
  jsonSchema: unknown;
  system: string;
  user: string;
  validate: (payload: unknown) => { success: boolean; data?: T; errors: string[] };
}

export async function callOpenRouterJson<T>(options: CallJsonOptions<T>): Promise<{
  ok: boolean;
  value?: T;
  error?: string;
  model: string;
}> {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  const baseUrl = Deno.env.get("OPENROUTER_BASE_URL") || "https://openrouter.ai/api/v1";
  const model = Deno.env.get("OPENROUTER_MODEL") || DEFAULT_OPENROUTER_MODEL;
  if (!apiKey) return { ok: false, error: "OPENROUTER_API_KEY is not configured", model };

  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: openRouterHeaders(apiKey),
      body: JSON.stringify({
        model,
        temperature: 0.35,
        messages: [
          { role: "system", content: options.system },
          {
            role: "user",
            content:
              attempt === 0
                ? options.user
                : `${options.user}\n\nPrevious output failed validation: ${lastError}. Return corrected JSON only.`
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: options.schemaName,
            strict: true,
            schema: options.jsonSchema
          }
        }
      })
    });

    if (!response.ok) {
      lastError = `OpenRouter ${response.status}: ${await response.text()}`;
      continue;
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    const parsed = parseJsonContent(content);
    if (!parsed.ok) {
      lastError = parsed.error;
      continue;
    }

    const validation = options.validate(parsed.value);
    if (validation.success && validation.data) {
      return { ok: true, value: validation.data, model };
    }
    lastError = validation.errors.join("; ");
  }

  return { ok: false, error: lastError || "OpenRouter output failed validation", model };
}

function openRouterHeaders(apiKey: string): HeadersInit {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  };
  const siteUrl = Deno.env.get("OPENROUTER_SITE_URL");
  const appName = Deno.env.get("OPENROUTER_APP_NAME");
  if (siteUrl) headers["HTTP-Referer"] = siteUrl;
  if (appName) headers["X-Title"] = appName;
  return headers;
}

function parseJsonContent(content: unknown): { ok: true; value: unknown } | { ok: false; error: string } {
  if (typeof content === "object" && content !== null) return { ok: true, value: content };
  if (typeof content !== "string") return { ok: false, error: "message content was not a string" };
  try {
    return { ok: true, value: JSON.parse(content) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "invalid JSON" };
  }
}
