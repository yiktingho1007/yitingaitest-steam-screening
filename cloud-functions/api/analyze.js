import { analyzeSteamReport } from "../_runtime/llm-analysis.js";
import {
  jsonResponse,
  readJsonBody,
  sanitizeAnalysisResult
} from "../_shared/api-utils.js";

export function onRequestOptions() {
  return jsonResponse(204, null);
}

export async function onRequestPost(context) {
  const body = await readJsonBody(context.request);

  if (!body || typeof body.query !== "string" || typeof body.report !== "object") {
    return jsonResponse(400, {
      ok: false,
      error: "请求体必须包含 query 和 report。"
    });
  }

  const result = await analyzeSteamReport({
    query: body.query,
    report: body.report,
    runtimeEnv: context.env || {}
  });

  return jsonResponse(200, sanitizeAnalysisResult(result));
}
