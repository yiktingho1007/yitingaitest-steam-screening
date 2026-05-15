import { resolveSteamCandidates } from "../_runtime/live-steam-data.js";
import {
  cleanString,
  jsonResponse
} from "../_shared/api-utils.js";

export function onRequestOptions() {
  return jsonResponse(204, null);
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
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
