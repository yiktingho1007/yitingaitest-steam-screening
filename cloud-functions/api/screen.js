import { analyzeSteamReport } from "../_runtime/llm-analysis.js";
import { buildLiveSteamReport } from "../_runtime/live-steam-data.js";
import {
  cleanString,
  jsonResponse,
  readJsonBody,
  sanitizeAnalysisResult
} from "../_shared/api-utils.js";

export function onRequestOptions() {
  return jsonResponse(204, null);
}

export async function onRequestPost(context) {
  const body = await readJsonBody(context.request);
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
    runtimeEnv: context.env || {}
  });

  return jsonResponse(200, sanitizeAnalysisResult(result));
}
