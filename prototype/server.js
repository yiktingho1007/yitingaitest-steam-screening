import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  analyzeSteamReport,
  getLlmStatus,
  translateSteamSearchQuery
} from "./llm-analysis.js";
import { buildLiveSteamReport, resolveSteamCandidates } from "./live-steam-data.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
loadLocalEnv();

const port = Number(process.env.PORT || 4173);
const publicFiles = new Set([
  "/",
  "/index.html",
  "/styles.css",
  "/app.js",
  "/mock-data.js"
]);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".png": "image/png"
};

export const server = createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);

    if (requestUrl.pathname.startsWith("/api/") && req.method === "OPTIONS") {
      sendJson(res, 204, null);
      return;
    }

    if (requestUrl.pathname === "/api/status" && req.method === "GET") {
      sendJson(res, 200, {
        ok: true,
        llm: toPublicLlmStatus(getLlmStatus()),
        data_mode: "live_target_data"
      });
      return;
    }

    if (requestUrl.pathname === "/api/resolve" && req.method === "GET") {
      const query = String(requestUrl.searchParams.get("query") || "").trim();

      if (!query) {
        sendJson(res, 400, {
          ok: false,
          error: "query 不能为空。"
        });
        return;
      }

      const candidates = await resolveSteamCandidates(query, { limit: 5 });
      sendJson(res, 200, {
        ok: true,
        query,
        candidates
      });
      return;
    }

    if (requestUrl.pathname === "/api/translate-query" && req.method === "POST") {
      try {
        const body = await readJsonBody(req);
        const query = String(body?.query || "").trim();

        if (!query) {
          sendJson(res, 400, {
            ok: false,
            error: "query 不能为空。"
          });
          return;
        }

        const translation = await translateSteamSearchQuery({ query });
        sendJson(res, 200, {
          ok: true,
          translation
        });
      } catch (error) {
        sendJson(res, 500, {
          ok: false,
          error: error instanceof Error ? error.message : "翻译接口执行失败。"
        });
      }
      return;
    }

    if (requestUrl.pathname === "/api/live-report" && req.method === "POST") {
      const body = await readJsonBody(req);
      const query = String(body?.query || "").trim();
      const appid = Number(body?.appid || body?.report?.request_context?.resolved_app_id || 0);
      const resolvedName = String(body?.resolved_name || body?.report?.request_context?.resolved_name || "").trim();

      if (!query || !appid) {
        sendJson(res, 400, {
          ok: false,
          error: "query 和 appid 都是必填项。"
        });
        return;
      }

      const report = await buildLiveSteamReport({
        query,
        appid,
        resolvedName
      });

      sendJson(res, 200, {
        ok: true,
        report
      });
      return;
    }

    if (requestUrl.pathname === "/api/screen" && req.method === "POST") {
      try {
        const body = await readJsonBody(req);
        const query = String(body?.query || "").trim();
        const appid = Number(body?.appid || 0);
        const resolvedName = String(body?.resolved_name || "").trim();

        if (!query || !appid) {
          sendJson(res, 400, {
            ok: false,
            error: "query 和 appid 都是必填项。"
          });
          return;
        }

        const report = await buildLiveSteamReport({
          query,
          appid,
          resolvedName
        });

        const result = await analyzeSteamReport({
          query,
          report
        });

        sendJson(res, 200, sanitizeAnalysisResult(result));
      } catch (error) {
        sendJson(res, 500, {
          ok: false,
          error: error instanceof Error ? error.message : "一体化初筛接口执行失败。"
        });
      }
      return;
    }

    if (requestUrl.pathname === "/api/analyze" && req.method === "POST") {
      try {
        const body = await readJsonBody(req);

        if (!body || typeof body.query !== "string" || typeof body.report !== "object") {
          sendJson(res, 400, {
            ok: false,
            error: "请求体必须包含 query 和 report。"
          });
          return;
        }

        const result = await analyzeSteamReport({
          query: body.query,
          report: body.report
        });

        sendJson(res, 200, sanitizeAnalysisResult(result));
      } catch (error) {
        const message = error instanceof Error ? error.message : "分析接口执行失败。";
        const statusCode =
          message === "请求体不是合法 JSON。" || message.includes("缺少")
            ? 400
            : 500;

        sendJson(res, statusCode, {
          ok: false,
          error: message
        });
      }
      return;
    }

    if (requestUrl.pathname.startsWith("/api/")) {
      sendJson(res, 404, {
        ok: false,
        error: "未找到该接口。"
      });
      return;
    }

    if (!publicFiles.has(requestUrl.pathname)) {
      res.writeHead(404, {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store"
      });
      res.end("Not Found");
      return;
    }

    const filePath = path.join(__dirname, requestUrl.pathname === "/" ? "index.html" : requestUrl.pathname.slice(1));
    const file = await readFile(filePath);
    const ext = path.extname(filePath);

    res.writeHead(200, {
      "Content-Type": mimeTypes[ext] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    res.end(file);
  } catch {
    res.writeHead(404, {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store"
    });
    res.end("Not Found");
  }
}).listen(port, () => {
  console.log(`Steam screening prototype is running at http://127.0.0.1:${port}`);
});

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept"
  });
  res.end(payload === null ? "" : JSON.stringify(payload));
}

async function readJsonBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const rawBody = Buffer.concat(chunks).toString("utf8").trim();

  if (!rawBody) {
    return null;
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    throw new Error("请求体不是合法 JSON。");
  }
}

function loadLocalEnv() {
  const envCandidates = [
    path.join(__dirname, ".env.local"),
    path.join(path.dirname(__dirname), ".env.local")
  ];

  for (const envPath of envCandidates) {
    if (!existsSync(envPath)) {
      continue;
    }

    const content = readFileSync(envPath, "utf8");
    const lines = content.split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex <= 0) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      let value = trimmed.slice(separatorIndex + 1).trim();

      if (
        (value.startsWith("\"") && value.endsWith("\"")) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (process.env[key] === undefined) {
        process.env[key] = value.replace(/\\n/g, "\n");
      }
    }

    if (!process.env.PROTOTYPE_ENV_SOURCE) {
      process.env.PROTOTYPE_ENV_SOURCE = envPath;
    }
  }
}

function sanitizeAnalysisResult(result) {
  return {
    ...result,
    llm: toPublicLlmStatus(result.llm)
  };
}

function toPublicLlmStatus(status) {
  return {
    configured: Boolean(status?.configured),
    model: status?.model || "unknown",
    reasoning_effort: status?.reasoning_effort || "unknown",
    channel: status?.channel || "server_proxy",
    fallback_count: Number(status?.fallback_count || 0),
    provider_labels: Array.isArray(status?.provider_labels) ? status.provider_labels : [],
    provider: status?.provider || null,
    error: status?.error || null
  };
}
