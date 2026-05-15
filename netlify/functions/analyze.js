import { analyzeSteamReport } from "../../prototype/llm-analysis.js";
import {
  buildRuntimeEnv,
  jsonResponse,
  readJsonBody,
  sanitizeAnalysisResult
} from "./_shared/netlify-utils.js";

export const config = {
  path: "/api/analyze"
};

export default async function handler(request) {
  if (request.method === "OPTIONS") {
    return jsonResponse(204, null);
  }

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
    runtimeEnv: buildRuntimeEnv()
  });

  return jsonResponse(200, sanitizeAnalysisResult(result));
}
