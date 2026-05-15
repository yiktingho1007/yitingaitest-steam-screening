import { resolveSteamCandidates } from "../../prototype/live-steam-data.js";
import {
  cleanString,
  jsonResponse
} from "./_shared/netlify-utils.js";

export const config = {
  path: "/api/resolve"
};

export default async function handler(request) {
  if (request.method === "OPTIONS") {
    return jsonResponse(204, null);
  }

  const url = new URL(request.url);
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
