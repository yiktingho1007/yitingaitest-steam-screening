import { buildLiveSteamReport } from "../../prototype/live-steam-data.js";
import {
  cleanString,
  jsonResponse,
  readJsonBody
} from "./_shared/netlify-utils.js";

export const config = {
  path: "/api/live-report"
};

export default async function handler(request) {
  if (request.method === "OPTIONS") {
    return jsonResponse(204, null);
  }

  try {
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
  } catch (error) {
    return jsonResponse(500, {
      ok: false,
      error: error instanceof Error ? error.message : "live-report failed"
    });
  }
}
