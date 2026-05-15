import { analyzeSteamReport, discoverCompetitorsViaLlm } from "../../prototype/llm-analysis.js";
import { buildLiveSteamReport, hydrateSuggestedCompetitors } from "../../prototype/live-steam-data.js";
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

  try {
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

    const selectedCompetitors = (report.competitor_candidates || []).filter((item) => item.is_selected);
    if (!selectedCompetitors.length) {
      const discovery = await discoverCompetitorsViaLlm({
        query,
        report,
        runtimeEnv: buildRuntimeEnv()
      });

      if (discovery.ok && discovery.suggestions.length) {
        const hydrated = await hydrateSuggestedCompetitors({
          targetAppId: appid,
          suggestions: discovery.suggestions
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
      runtimeEnv: buildRuntimeEnv()
    });

    return jsonResponse(200, sanitizeAnalysisResult(result));
  } catch (error) {
    return jsonResponse(500, {
      ok: false,
      error: error instanceof Error ? error.message : "screen failed"
    });
  }
}
