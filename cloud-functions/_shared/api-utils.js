export function jsonResponse(status, payload) {
  return new Response(payload === null ? "" : JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Accept"
    }
  });
}

export async function readJsonBody(request) {
  const text = (await request.text()).trim();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("请求体不是合法 JSON。");
  }
}

export function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function sanitizeAnalysisResult(result) {
  return {
    ...result,
    llm: toPublicLlmStatus(result.llm)
  };
}

export function toPublicLlmStatus(status, probe = null) {
  return {
    configured: Boolean(status?.configured),
    model: status?.model || "unknown",
    reasoning_effort: status?.reasoning_effort || "unknown",
    channel: status?.channel || "server_proxy",
    fallback_count: Number(status?.fallback_count || 0),
    provider_labels: Array.isArray(status?.provider_labels) ? status.provider_labels : [],
    provider: status?.provider || null,
    error: status?.error || probe?.error || null,
    reachable: probe ? Boolean(probe.reachable) : null
  };
}

export function methodNotAllowed() {
  return jsonResponse(405, {
    ok: false,
    error: "Method Not Allowed"
  });
}
