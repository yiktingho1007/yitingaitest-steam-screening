import { getLlmStatus, probeLlmConnection } from "../_runtime/llm-analysis.js";
import { jsonResponse, toPublicLlmStatus } from "../_shared/api-utils.js";

export function onRequestOptions() {
  return jsonResponse(204, null);
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const includeProbe = url.searchParams.get("probe") === "1";
  const llmStatus = getLlmStatus(context.env || {});
  const llmProbe = includeProbe ? await probeLlmConnection(context.env || {}) : null;

  return jsonResponse(200, {
    ok: true,
    llm: toPublicLlmStatus(llmStatus, llmProbe),
    llm_probe: llmProbe,
    data_mode: "live_target_data"
  });
}
