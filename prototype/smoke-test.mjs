import fs from "node:fs";
import vm from "node:vm";

const baseUrl = "http://127.0.0.1:4173";
let server = null;

try {
  server = await ensureServer();

  const homepageResponse = await fetch(baseUrl);
  const homepageText = await homepageResponse.text();

  const runtimeConfigResponse = await fetch(`${baseUrl}/browser-runtime-config.js`);
  const runtimeConfigText = await runtimeConfigResponse.text();
  const resolveResponse = await fetch(`${baseUrl}/api/resolve?query=Balatro`);
  const resolvePayload = await resolveResponse.json();
  const multiResolveResponse = await fetch(`${baseUrl}/api/resolve?query=Hades`);
  const multiResolvePayload = await multiResolveResponse.json();
  const untranslatedResolveResponse = await fetch(`${baseUrl}/api/resolve?query=${encodeURIComponent("环世界")}`);
  const untranslatedResolvePayload = await untranslatedResolveResponse.json();
  const liveReportResponse = await fetch(`${baseUrl}/api/live-report`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      query: "Balatro",
      appid: 2379780,
      resolved_name: "Balatro"
    })
  });
  const liveReportPayload = await liveReportResponse.json();
  const silksongLiveReportResponse = await fetch(`${baseUrl}/api/live-report`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      query: "Silksong",
      appid: 1030300,
      resolved_name: "Hollow Knight: Silksong"
    })
  });
  const silksongLiveReportPayload = await silksongLiveReportResponse.json();

  const runtime = loadBrowserRuntime();
  const firstReport = liveReportPayload.report;
  const translationPayload = await runtime.browserLlm.translateSteamSearchQueryDirect({
    query: "环世界",
    config: runtime.browserConfig
  });
  const translatedResolveResponse = translationPayload.translated_query
    ? await fetch(`${baseUrl}/api/resolve?query=${encodeURIComponent(translationPayload.translated_query)}`)
    : null;
  const translatedResolvePayload = translatedResolveResponse ? await translatedResolveResponse.json() : null;
  const analyzePayload = await runtime.browserLlm.analyzeSteamReportDirect({
    query: "Balatro",
    report: firstReport,
    config: runtime.browserConfig
  });

  console.log(JSON.stringify({
    homepage: {
      ok: homepageResponse.ok,
      hasDirectModeCopy: homepageText.includes("真实 LLM 请求"),
      hasAnalyzeButton: homepageText.includes("开始分析")
    },
    runtimeConfig: {
      ok: runtimeConfigResponse.ok,
      hasGlobalConfig: runtimeConfigText.includes("BROWSER_LLM_RUNTIME_CONFIG"),
      configured: Boolean(runtime.browserConfig.apiKey),
      model: runtime.browserConfig.model
    },
    resolve: {
      ok: resolveResponse.ok,
      candidateCount: Array.isArray(resolvePayload.candidates) ? resolvePayload.candidates.length : 0,
      firstCandidate: resolvePayload.candidates?.[0]?.report?.request_context?.resolved_name || null
    },
    multiResolve: {
      ok: multiResolveResponse.ok,
      candidateCount: Array.isArray(multiResolvePayload.candidates) ? multiResolvePayload.candidates.length : 0,
      topCandidates: Array.isArray(multiResolvePayload.candidates)
        ? multiResolvePayload.candidates
            .slice(0, 3)
            .map((item) => item?.report?.request_context?.resolved_name || null)
        : []
    },
    translationRetry: {
      rawQuery: "环世界",
      untranslatedCandidateCount: Array.isArray(untranslatedResolvePayload.candidates) ? untranslatedResolvePayload.candidates.length : 0,
      translatedQuery: translationPayload.translated_query,
      provider: translationPayload.provider,
      translatedCandidateCount: Array.isArray(translatedResolvePayload?.candidates) ? translatedResolvePayload.candidates.length : 0,
      translatedFirstCandidate: translatedResolvePayload?.candidates?.[0]?.report?.request_context?.resolved_name || null
    },
    liveReport: {
      ok: liveReportResponse.ok,
      title: liveReportPayload.report?.target_game?.name || null,
      competitorCount: Array.isArray(liveReportPayload.report?.competitor_games) ? liveReportPayload.report.competitor_games.length : 0
    },
    silksongLiveReport: {
      ok: silksongLiveReportResponse.ok,
      title: silksongLiveReportPayload.report?.target_game?.name || null,
      competitorCount: Array.isArray(silksongLiveReportPayload.report?.competitor_games)
        ? silksongLiveReportPayload.report.competitor_games.length
        : 0,
      topCompetitors: Array.isArray(silksongLiveReportPayload.report?.competitor_games)
        ? silksongLiveReportPayload.report.competitor_games.slice(0, 2).map((item) => item?.name || null)
        : [],
      warnings: silksongLiveReportPayload.report?.debug_meta?.warnings || []
    },
    analyze: {
      ok: analyzePayload.ok,
      analysisMode: analyzePayload.analysis_mode,
      llmConfigured: analyzePayload.llm?.configured,
      runtimeMode: analyzePayload.report?.runtime_meta?.analysis_mode,
      llmStatus: analyzePayload.report?.llm_summary?.status,
      title: analyzePayload.report?.target_game?.name
    }
  }, null, 2));
} finally {
  if (server?.close) {
    server.close();
  }
}

async function ensureServer() {
  if (await isServerReachable()) {
    return null;
  }

  const serverModule = await import("./server.js");
  return serverModule.server;
}

async function isServerReachable() {
  try {
    const response = await fetch(baseUrl);
    return response.ok;
  } catch {
    return false;
  }
}

function loadBrowserRuntime() {
  const context = vm.createContext({
    fetch,
    structuredClone,
    URL,
    console,
    setTimeout,
    clearTimeout
  });
  context.globalThis = context;

  const runtimeConfigSource = fs.readFileSync(new URL("./browser-runtime-config.js", import.meta.url), "utf8");
  const mockSource = fs.readFileSync(new URL("./mock-data.js", import.meta.url), "utf8");
  const llmSource = fs.readFileSync(new URL("./browser-llm.js", import.meta.url), "utf8");

  vm.runInContext(runtimeConfigSource, context);
  vm.runInContext(mockSource, context);
  vm.runInContext(llmSource, context);

  return {
    browserConfig: context.BROWSER_LLM_RUNTIME_CONFIG,
    mockReports: context.MOCK_REPORTS || [],
    browserLlm: context.BrowserLLM
  };
}
