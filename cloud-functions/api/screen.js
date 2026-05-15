import { analyzeSteamReport, discoverCompetitorsViaLlm } from "../_runtime/llm-analysis.js";
import { buildLiveSteamReport, hydrateSuggestedCompetitors } from "../_runtime/live-steam-data.js";
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

  const selectedCompetitors = (report.competitor_candidates || []).filter((item) => item.is_selected);
  if (!selectedCompetitors.length) {
    const discovery = await discoverCompetitorsViaLlm({
      query,
      report,
      runtimeEnv: context.env || {}
    });

    if (discovery.ok && discovery.suggestions.length) {
      const hydrated = await hydrateSuggestedCompetitors({
        targetAppId: appid,
        suggestions: discovery.suggestions.map((item) => item.name)
      });

      report.competitor_candidates = hydrated.candidates;
      report.competitor_games = hydrated.games;
      report.comparison_frame = {
        ...(report.comparison_frame || {}),
        llm_discovery: {
          gameplay_summary: discovery.gameplay_summary,
          comparison_hypothesis: discovery.comparison_hypothesis,
          suggestions: discovery.suggestions
        }
      };
      report.debug_meta = {
        ...(report.debug_meta || {}),
        warnings: [
          ...new Set([
            ...((report.debug_meta?.warnings) || []),
            "自动竞品不足，已触发 LLM 玩法识别与竞品提名。"
          ])
        ]
      };
    }
  }

  const result = await analyzeSteamReport({
    query,
    report,
    runtimeEnv: context.env || {}
  });

  return jsonResponse(200, sanitizeAnalysisResult(result));
}
