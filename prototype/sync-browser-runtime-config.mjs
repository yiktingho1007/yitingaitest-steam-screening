import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const env = loadLocalEnv();
const outputPath = path.join(__dirname, "browser-runtime-config.js");
const fallbackProviders = buildFallbackProviders(env);

const payload = {
  apiKey: env.OPENAI_API_KEY || "",
  baseUrl: normalizeBaseUrl(env.OPENAI_BASE_URL || "https://api.openai.com/v1"),
  model: env.OPENAI_MODEL || "gpt-5.4-mini",
  reasoningEffort: env.OPENAI_REASONING_EFFORT || "low",
  envSource: env.PROTOTYPE_ENV_SOURCE || null,
  fallbacks: fallbackProviders
};

const fileText = [
  "// Local prototype only. This file intentionally exposes the browser-direct LLM config to the page.",
  "// Do not use this pattern in production deployments.",
  `globalThis.BROWSER_LLM_RUNTIME_CONFIG = ${JSON.stringify(payload, null, 2)};`,
  ""
].join("\n");

writeFileSync(outputPath, fileText, "utf8");
console.log(`Wrote ${outputPath}`);

function buildFallbackProviders(env) {
  const providers = [];
  const volcengineApiKey = env.VOLCENGINE_API_KEY || env.BACKUP_OPENAI_API_KEY || "";

  if (volcengineApiKey) {
    providers.push({
      label: "volcengine_ark_backup",
      apiKey: volcengineApiKey,
      baseUrl: normalizeBaseUrl(env.VOLCENGINE_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3"),
      model: env.VOLCENGINE_MODEL || "doubao-seed-1-6-250615",
      reasoningEffort: env.VOLCENGINE_REASONING_EFFORT || "low",
      envSource: env.PROTOTYPE_ENV_SOURCE || null
    });
  }

  return providers;
}

function loadLocalEnv() {
  const envCandidates = [
    path.join(__dirname, ".env.local"),
    path.join(path.dirname(__dirname), ".env.local")
  ];
  const result = {};

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

      if (result[key] === undefined) {
        result[key] = value.replace(/\\n/g, "\n");
      }
    }

    if (!result.PROTOTYPE_ENV_SOURCE) {
      result.PROTOTYPE_ENV_SOURCE = envPath;
    }
  }

  return result;
}

function normalizeBaseUrl(rawValue) {
  const value = String(rawValue || "").trim();

  if (!value) {
    return "https://api.openai.com/v1";
  }

  const trimmed = value.replace(/\/+$/, "");

  try {
    const url = new URL(trimmed);

    if (!url.pathname || url.pathname === "/") {
      return `${trimmed}/v1`;
    }
  } catch {
    return trimmed;
  }

  return trimmed;
}
