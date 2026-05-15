import { jsonResponse } from "../_shared/api-utils.js";

export function onRequestOptions() {
  return jsonResponse(204, null);
}

export function onRequest() {
  return jsonResponse(404, {
    ok: false,
    error: "未找到该接口。"
  });
}
