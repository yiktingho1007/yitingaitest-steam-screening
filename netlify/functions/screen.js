import { analyzeSteamReport } from "../../prototype/llm-analysis.js";
import { buildLiveSteamReport } from "../../prototype/live-steam-data.js";
import {
  buildRuntimeEnv,
  cleanString,
  jsonResponse,
  readJsonBody,
  sanitizeAnalysisResult
} from "./_shared/netlify-utils.js";

export const config = {
  path: "/api/screen"
};

export default async function handler(request) {
  if (request.method === "OPTIONS") {
    return jsonResponse(204, null);
  }

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
    runtimeEnv: buildRuntimeEnv()
  });

  return jsonResponse(200, sanitizeAnalysisResult(result));
}
