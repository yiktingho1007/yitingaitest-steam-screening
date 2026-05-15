import { buildLiveSteamReport } from "../_runtime/live-steam-data.js";
import {
  cleanString,
  jsonResponse,
  readJsonBody
} from "../_shared/api-utils.js";

export function onRequestOptions() {
  return jsonResponse(204, null);
}

export async function onRequestPost(context) {
  const body = await readJsonBody(context.request);
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
