import { translateSteamSearchQuery } from "../../prototype/llm-analysis.js";
import {
  buildRuntimeEnv,
  cleanString,
  jsonResponse,
  readJsonBody
} from "./_shared/netlify-utils.js";

export const config = {
  path: "/api/translate-query"
};

export default async function handler(request) {
  if (request.method === "OPTIONS") {
    return jsonResponse(204, null);
  }

  const body = await readJsonBody(request);
  const query = cleanString(body?.query);

  if (!query) {
    return jsonResponse(400, {
      ok: false,
      error: "query 不能为空。"
    });
  }

  const translation = await translateSteamSearchQuery({
    query,
    runtimeEnv: buildRuntimeEnv()
  });

  return jsonResponse(200, {
    ok: true,
    translation
  });
}
