import { translateSteamSearchQuery } from "../_runtime/llm-analysis.js";
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

  if (!query) {
    return jsonResponse(400, {
      ok: false,
      error: "query 不能为空。"
    });
  }

  const translation = await translateSteamSearchQuery({
    query,
    runtimeEnv: context.env || {}
  });

  return jsonResponse(200, {
    ok: true,
    translation
  });
}
