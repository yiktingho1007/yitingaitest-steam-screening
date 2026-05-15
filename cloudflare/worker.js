import {
  analyzeSteamReport,
  getLlmStatus,
  translateSteamSearchQuery
} from "../prototype/llm-analysis.js";
import {
  buildLiveSteamReport,
  resolveSteamCandidates
} from "../prototype/live-steam-data.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS" && url.pathname.startsWith("/api/")) {
      return jsonResponse(204, null);
    }

    if (url.pathname === "/api/status" && request.method === "GET") {
      return jsonResponse(200, {
        ok: true,
        llm: toPublicLlmStatus(getLlmStatus(env)),
        data_mode: "live_target_data"
      });
    }

    if (url.pathname === "/api/resolve" && request.method === "GET") {
      const query = cleanString(url.searchParams.get("query"));

      if (!query) {
        return jsonResponse(400, {
          ok: false,
          error: "query 不能为空。"
        });
      }

      const candidates = await resolveSteamCandidates(query, { limit: 5 });
      return jsonResponse(200, {
        ok: true,
        query,
        candidates
      });
    }

    if (url.pathname === "/api/translate-query" && request.method === "POST") {
      const body = await readJsonBody(request);
      const query = cleanString(body?.query);

      if (!query) {
        return jsonResponse(400, {
          ok: false,
          error: "query 不能为空。"
        });
      }

      const translation = await translateSteamSearchQuery({
        query,
        runtimeEnv: env
      });

      return jsonResponse(200, {
        ok: true,
        translation
      });
    }

    if (url.pathname === "/api/live-report" && request.method === "POST") {
      const body = await readJsonBody(request);
      const query = cleanString(body?.query);
      const appid = Number(body?.appid || body?.report?.request_context?.resolved_app_id || 0);
      const resolvedName = cleanString(body?.resolved_name || body?.report?.request_context?.resolved_name);

      if (!query || !appid) {
        return jsonResponse(400, {
          ok: false,
          error: "query 和 appid 都是必填项。"
        });
      }

      const report = await buildLiveSteamReport({
        query,
        appid,
        resolvedName
      });

      return jsonResponse(200, {
        ok: true,
        report
      });
    }

    if (url.pathname === "/api/screen" && request.method === "POST") {
      const body = await readJsonBody(request);
      const query = cleanString(body?.query);
      const appid = Number(body?.appid || 0);
      const resolvedName = cleanString(body?.resolved_name);

      if (!query || !appid) {
        return jsonResponse(400, {
          ok: false,
          error: "query 和 appid 都是必填项。"
        });
      }

      const report = await buildLiveSteamReport({
        query,
        appid,
        resolvedName
      });

      const result = await analyzeSteamReport({
        query,
        report,
        runtimeEnv: env
      });

      return jsonResponse(200, sanitizeAnalysisResult(result));
    }

    if (url.pathname === "/api/analyze" && request.method === "POST") {
      const body = await readJsonBody(request);

      if (!body || typeof body.query !== "string" || typeof body.report !== "object") {
        return jsonResponse(400, {
          ok: false,
          error: "请求体必须包含 query 和 report。"
        });
      }

      const result = await analyzeSteamReport({
        query: body.query,
        report: body.report,
        runtimeEnv: env
      });

      return jsonResponse(200, sanitizeAnalysisResult(result));
    }

    if (url.pathname.startsWith("/api/")) {
      return jsonResponse(404, {
        ok: false,
        error: "未找到该接口。"
      });
    }

    return env.ASSETS.fetch(request);
  }
};

function jsonResponse(status, payload) {
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

async function readJsonBody(request) {
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

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function sanitizeAnalysisResult(result) {
  return {
    ...result,
    llm: toPublicLlmStatus(result.llm)
  };
}

function toPublicLlmStatus(status) {
  return {
    configured: Boolean(status?.configured),
    model: status?.model || "unknown",
    reasoning_effort: status?.reasoning_effort || "unknown",
    channel: status?.channel || "server_proxy",
    fallback_count: Number(status?.fallback_count || 0),
    provider_labels: Array.isArray(status?.provider_labels) ? status.provider_labels : [],
    provider: status?.provider || null,
    error: status?.error || null
  };
}
