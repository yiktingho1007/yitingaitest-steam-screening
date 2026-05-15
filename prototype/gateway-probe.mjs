import fs from "node:fs";
import path from "node:path";
import https from "node:https";

const envPath = path.join(process.cwd(), "prototype", ".env.local");
const envText = fs.readFileSync(envPath, "utf8");
const env = {};

for (const rawLine of envText.split(/\r?\n/)) {
  const line = rawLine.trim();
  if (!line || line.startsWith("#")) {
    continue;
  }

  const index = line.indexOf("=");
  if (index <= 0) {
    continue;
  }

  const key = line.slice(0, index).trim();
  let value = line.slice(index + 1).trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  env[key] = value;
}

const model = env.OPENAI_MODEL || "gpt-5.4-mini";
const baseUrl = normalizeBaseUrl(env.OPENAI_BASE_URL || "https://api.openai.com/v1");
const token = env.OPENAI_API_KEY;
const mode = process.argv[2] || "models";
const timeoutMs = Number(process.argv[3] || "5000");

if (!token) {
  console.log(
    JSON.stringify(
      {
        ok: false,
        error: "OPENAI_API_KEY is missing",
        mode
      },
      null,
      2
    )
  );
  process.exit(1);
}

run()
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  })
  .catch((error) => {
    console.log(
      JSON.stringify(
        {
          ok: false,
          mode,
          error: error?.message || String(error),
          code: error?.code || null,
          cause: error?.cause?.message || null,
          cause_code: error?.cause?.code || null
        },
        null,
        2
      )
    );
    process.exit(1);
  });

async function run() {
  if (mode === "chat") {
    return requestJson({
      url: `${baseUrl}/chat/completions`,
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "You are a connectivity test assistant." },
          { role: "user", content: "Reply with ok." }
        ],
        max_tokens: 5
      }),
      timeoutMs
    });
  }

  if (mode === "responses") {
    return requestJson({
      url: `${baseUrl}/responses`,
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        instructions: "You are a connectivity test assistant.",
        input: "Reply with ok.",
        text: {
          format: {
            type: "json_object"
          }
        }
      }),
      timeoutMs
    });
  }

  return requestJson({
    url: `${baseUrl}/models`,
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    },
    timeoutMs
  });
}

function requestJson({ url, method, headers, body, timeoutMs }) {
  return new Promise((resolve, reject) => {
    const request = https.request(
      url,
      {
        method,
        headers
      },
      (response) => {
        const chunks = [];

        response.on("data", (chunk) => {
          chunks.push(chunk);
        });

        response.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          resolve({
            ok: response.statusCode >= 200 && response.statusCode < 300,
            status: response.statusCode,
            mode,
            model,
            base_url: baseUrl,
            preview: text.slice(0, 800)
          });
        });
      }
    );

    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error(`timeout after ${timeoutMs}ms`));
    });

    request.on("error", (error) => {
      reject(error);
    });

    if (body) {
      request.write(body);
    }

    request.end();
  });
}

function normalizeBaseUrl(rawValue) {
  const value = String(rawValue || "").trim();
  if (!value) {
    return "https://api.openai.com/v1";
  }

  const trimmed = value.replace(/\/+$/, "");

  try {
    const parsed = new URL(trimmed);
    if (!parsed.pathname || parsed.pathname === "/") {
      return `${trimmed}/v1`;
    }
  } catch {
    return trimmed;
  }

  return trimmed;
}
