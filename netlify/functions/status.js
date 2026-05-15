import { getLlmStatus, probeLlmConnection } from "../../prototype/llm-analysis.js";
import {
  buildRuntimeEnv,
  jsonResponse,
  toPublicLlmStatus
} from "./_shared/netlify-utils.js";

export const config = {
  path: "/api/status"
};

export default async function handler(request) {
  if (request.method === "OPTIONS") {
    return jsonResponse(204, null);
  }

  const url = new URL(request.url);
  const includeProbe = url.searchParams.get("probe") === "1";
  const runtimeEnv = buildRuntimeEnv();
  const llmStatus = getLlmStatus(runtimeEnv);
  const llmProbe = includeProbe ? await probeLlmConnection(runtimeEnv) : null;

  return jsonResponse(200, {
    ok: true,
    llm: toPublicLlmStatus(llmStatus, llmProbe),
    llm_probe: llmProbe,
    data_mode: "live_target_data"
  });
}
