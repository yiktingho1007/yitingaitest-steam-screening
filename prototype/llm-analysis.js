export function getLlmStatus(runtimeEnv = process.env) {
  const providers = getConfiguredProviders(runtimeEnv);
  const primary = providers[0];

  return {
    configured: providers.length > 0,
    model: primary?.model || getPrimaryConfiguredModel(runtimeEnv),
    reasoning_effort: primary?.reasoning_effort || getPrimaryConfiguredReasoningEffort(runtimeEnv),
    base_url: primary?.base_url || getPrimaryConfiguredBaseUrl(runtimeEnv),
    env_source: primary?.env_source || getEnvValue(runtimeEnv, "PROTOTYPE_ENV_SOURCE") || null,
    channel: "server_proxy",
    fallback_count: Math.max(0, providers.length - 1),
    provider_labels: providers.map((provider) => provider.label)
  };
}

export async function probeLlmConnection(runtimeEnv = process.env) {
  const providers = getConfiguredProviders(runtimeEnv);

  if (!providers.length) {
    return {
      configured: false,
      reachable: false,
      provider: null,
      model: null,
      error: "No LLM provider configured."
    };
  }

  const providerErrors = [];

  for (const provider of providers) {
    try {
      const response = await fetch(`${provider.base_url}/models`, {
        method: "GET",
        headers: buildRequestHeaders(provider.api_key)
      });
      const payload = await safeParseJson(response);

      if (!response.ok) {
        throw new ApiRequestError(
          extractApiError(payload, response.status),
          response.status,
          payload,
          `${provider.base_url}/models`
        );
      }

      return {
        configured: true,
        reachable: true,
        provider: provider.label,
        model: provider.model,
        error: null
      };
    } catch (error) {
      providerErrors.push(`${provider.label}: ${normalizeErrorMessage(error)}`);
    }
  }

  return {
    configured: true,
    reachable: false,
    provider: providers[0]?.label || null,
    model: providers[0]?.model || null,
    error: providerErrors.join(" | ") || "Failed to reach configured LLM provider."
  };
}

export async function analyzeSteamReport({ query, report, runtimeEnv = process.env }) {
  assertValidReport(report);

  const status = getLlmStatus(runtimeEnv);
  const providers = getConfiguredProviders(runtimeEnv);
  const startedAt = Date.now();
  let liveResult = null;
  let llmError = null;
  let llmLatencyMs = 0;

  if (providers.length) {
    const llmStartedAt = Date.now();

    try {
      liveResult = await requestLiveSummary({ query, report, providers });
    } catch (error) {
      llmError = normalizeErrorMessage(error);
    } finally {
      llmLatencyMs = Date.now() - llmStartedAt;
    }
  }

  const analysisMode = liveResult ? "live" : "mock_fallback";
  const nextReport = buildOutputReport({
    report,
    query,
    liveSummary: liveResult?.summary || null,
    liveProvider: liveResult?.provider || null,
    liveModel: liveResult?.model || null,
    status,
    llmError,
    llmLatencyMs,
    analysisMode,
    totalStartedAt: startedAt
  });

  return {
    ok: true,
    analysis_mode: analysisMode,
    llm: {
      ...status,
      provider: liveResult?.provider || "mock",
      error: llmError
    },
    report: nextReport
  };
}

export async function translateSteamSearchQuery({ query, runtimeEnv = process.env }) {
  const rawQuery = cleanString(query);

  if (!rawQuery) {
    return {
      raw_query: "",
      translated_query: "",
      confidence: "empty",
      notes: "空输入不触发英文翻译重试。"
    };
  }

  const providers = getConfiguredProviders(runtimeEnv);
  if (!providers.length) {
    return {
      raw_query: rawQuery,
      translated_query: "",
      confidence: "disabled",
      notes: "当前未配置服务端模型网关，无法触发英文翻译重试。"
    };
  }

  const developerPrompt = [
    "你是一个 Steam 游戏名检索助手。",
    "你的任务是在用户输入没有直接命中时，把中文或本地化游戏名转换成最适合 Steam 搜索建议接口重试的英文游戏名。",
    "请只返回一个 JSON 对象。",
    "JSON 只能包含 translated_query、confidence、notes 这三个键。",
    "translated_query 必须是单个英文游戏名，不要附加解释，不要返回多个候选。",
    "如果完全无法判断，就把 translated_query 返回为空字符串。"
  ].join("\n");

  const userPrompt = [
    "请把下面这个游戏名改写成适合 Steam 英文检索的名字。",
    "如果它本来就是英文名，可以原样返回。",
    "不要输出任何 JSON 之外的内容。",
    "",
    JSON.stringify({ raw_query: rawQuery }, null, 2)
  ].join("\n");

  const providerErrors = [];

  for (const provider of providers) {
    try {
      const result = await requestTranslationViaProvider({
        developerPrompt,
        userPrompt,
        provider,
        rawQuery
      });

      return result;
    } catch (error) {
      providerErrors.push(`${provider.label}: ${normalizeErrorMessage(error)}`);
    }
  }

  return {
    raw_query: rawQuery,
    translated_query: "",
    confidence: "failed",
    notes: providerErrors.join(" | ") || "英文翻译重试失败。"
  };
}

async function requestLiveSummary({ query, report, providers }) {
  if (typeof fetch !== "function") {
    throw new Error("当前 Node 运行环境不支持 fetch，无法调用模型接口。");
  }

  const developerPrompt = [
    "你是莉莉丝预研团队的 Steam 产品初筛助手。",
    "你只能使用我提供的结构化数据，不允许补充未提供的销量、收入、留存、心愿单或趋势事实。",
    "如果引用第三方估算字段，必须明确写出来源，并说明它是估算，不是官方确认数据。",
    "如果字段缺失，直接写“暂无可靠公开数据”，不要猜测。",
    "这次最重要的任务不是泛泛总结，而是做竞品参照物的精准分析。",
    "先判断系统给出的竞品是否真的具备可比性，再输出结论；如果证据不足，可以明确指出当前坐标系不成立。",
    "你必须明确回答：为什么应该拿这两款竞品作为参照物，它们和目标产品的可比性具体在哪里。",
    "不要只写“共享标签，所以适合比较”这种空话；单一标签重合不能单独构成竞品结论，每个竞品至少要写出两个具体的可比维度。",
    "可比维度优先从这些信息里挑：是否同系列、是否同开发/发行团队、多标签重合、价格带、发售阶段、评论量级、当前在线、第三方拥有量估算。",
    "如果 comparison_basis 里出现 tag_only_weak_signal，说明这是弱证据候选，你应明确降权甚至否定它，而不是硬解释成合理竞品。",
    "如果某个竞品是系列前作或同系列参照，必须点明它为什么能回答“续作相对前作是否放大”的问题。",
    "如果某个竞品不是同系列，而是同赛道外部样本，必须点明它为什么能回答“放到更广的品类坐标里，这款产品站在什么位置”的问题。",
    "comparison_frame_summary 必须写成 2 到 3 句，明确说明这款游戏应该放在什么坐标系里看，而且要点名当前这两款竞品各自承担什么参照角色。",
    "comparison_axes 必须给出 3 条真正有判断意义的比较轴，不要写空泛词组。优先写成类似“续作相对前作放大量”“放到赛道头部后的相对位置”这种问题导向短语。",
    "competitor_rationales 必须逐个解释每个入选竞品为什么值得比较，以及它在这组坐标系里代表什么。",
    "why_compare 必须具体，至少包含两个事实支点，且尽量引用评论量、在线或拥有量估算等量化信息。",
    "coordinate_role 必须给出这个竞品在本次比较中的角色，例如：系列前作基准、同赛道头部样本、同体量平行样本、边界样本。",
    "请用简体中文输出一个 JSON 对象。",
    "JSON 必须只包含以下键：positioning_summary、difference_points、screening_recommendation、data_caution、comparison_frame_summary、comparison_axes、competitor_rationales、used_fields、used_estimate_sources。"
  ].join("\n");

  const userPrompt = [
    "下面是当前分析请求的结构化 JSON 数据。",
    "请基于这些数据，输出适合研究员快速筛选的结论。",
    "difference_points 必须是 3 条短句数组。",
    "comparison_axes 必须是 3 条短语数组，每条不超过 16 个字。",
    "competitor_rationales 必须与当前入选竞品一一对应。",
    "competitor_rationales 里的每个对象只包含 competitor_app_id、competitor_name、why_compare、coordinate_role 四个键。",
    "why_compare 不要复述系统给出的 selection_reason，而是要把 selection_reason、comparison_basis、coordinate_role_hint 当成线索，再结合实际字段把可比性讲具体。",
    "如果系统给出的竞品里有同系列参照和外部赛道样本，comparison_frame_summary 必须把这两种参照角色区分开写。",
    "used_fields 只填写你实际引用过的字段名。",
    "used_estimate_sources 只填写你实际引用过的第三方估算来源，没有则返回空数组。",
    "",
    JSON.stringify(buildPromptPayload(query, report), null, 2)
  ].join("\n");

  const providerErrors = [];

  for (const provider of providers) {
    try {
      const summary = await requestSummaryViaProvider({
        developerPrompt,
        userPrompt,
        provider
      });

      return {
        provider: summary.provider,
        model: provider.model,
        summary: summary.summary
      };
    } catch (error) {
      providerErrors.push(`${provider.label}: ${normalizeErrorMessage(error)}`);
    }
  }

  throw new Error(providerErrors.join(" | ") || "服务端 LLM 分析失败。");
}

async function requestSummaryViaProvider({ developerPrompt, userPrompt, provider }) {
  try {
    const responseSummary = await requestViaResponsesApi({
      developerPrompt,
      userPrompt,
      provider,
      mode: "analysis"
    });

    return {
      provider: `${provider.label}:responses`,
      summary: normalizeLiveSummary(parseJsonText(responseSummary), provider.model)
    };
  } catch (error) {
    if (!shouldFallbackToChatCompletions(error)) {
      throw error;
    }
  }

  const chatSummary = await requestViaChatCompletions({
    developerPrompt,
    userPrompt,
    provider,
    mode: "analysis"
  });

  return {
    provider: `${provider.label}:chat_completions`,
    summary: normalizeLiveSummary(parseJsonText(chatSummary), provider.model)
  };
}

async function requestTranslationViaProvider({ developerPrompt, userPrompt, provider, rawQuery }) {
  try {
    const translatedText = await requestViaResponsesApi({
      developerPrompt,
      userPrompt,
      provider,
      mode: "translation"
    });

    return normalizeTranslatedQuery(parseJsonText(translatedText), rawQuery);
  } catch (error) {
    if (!shouldFallbackToChatCompletions(error)) {
      throw error;
    }
  }

  const translatedText = await requestViaChatCompletions({
    developerPrompt,
    userPrompt,
    provider,
    mode: "translation"
  });

  return normalizeTranslatedQuery(parseJsonText(translatedText), rawQuery);
}

async function requestViaResponsesApi({ developerPrompt, userPrompt, provider, mode }) {
  const { payload } = await sendJsonRequest(`${provider.base_url}/responses`, {
    method: "POST",
    headers: buildRequestHeaders(provider.api_key),
    body: JSON.stringify({
      model: provider.model,
      reasoning: { effort: provider.reasoning_effort },
      instructions: developerPrompt,
      input: userPrompt,
      text: {
        format: {
          type: "json_object"
        }
      }
    })
  });

  const outputText = extractResponsesOutputText(payload);
  if (!outputText) {
    throw new Error(mode === "translation"
      ? "模型返回成功，但没有可解析的翻译结果。"
      : "模型返回成功，但没有可解析的文本结果。");
  }

  return outputText;
}

async function requestViaChatCompletions({ developerPrompt, userPrompt, provider, mode }) {
  const { payload } = await sendJsonRequest(`${provider.base_url}/chat/completions`, {
    method: "POST",
    headers: buildRequestHeaders(provider.api_key),
    body: JSON.stringify({
      model: provider.model,
      messages: [
        { role: "system", content: developerPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: {
        type: "json_object"
      }
    })
  });

  const outputText = extractChatCompletionsOutputText(payload);
  if (!outputText) {
    throw new Error(mode === "translation"
      ? "兼容聊天接口返回成功，但没有可解析的翻译结果。"
      : "兼容聊天接口返回成功，但没有可解析的文本结果。");
  }

  return outputText;
}

function buildPromptPayload(query, report) {
  return {
    request_context: {
      raw_query: query,
      resolved_name: report.request_context?.resolved_name,
      resolved_app_id: report.request_context?.resolved_app_id
    },
    source_rules: {
      tiers: {
        A: "Steam 官方公开且文档明确的数据，可作为主判断依据。",
        B: "高可信补充数据，可用于说明和校验。",
        C: "第三方估算数据，可进入结论，但必须显式标注来源和估算属性。"
      },
      output_rules: [
        "不允许编造未提供的数据。",
        "不允许把第三方估算写成官方事实。",
        "尽量做短句、可执行、偏判断支持的表达。"
      ]
    },
    target_game: pickPromptGame(report.target_game),
    competitor_games: Array.isArray(report.competitor_games)
      ? report.competitor_games.map((game) => pickPromptGame(game))
      : [],
    comparison_frame: report.comparison_frame || null,
    competitor_candidates: Array.isArray(report.competitor_candidates)
      ? report.competitor_candidates
          .filter((candidate) => candidate.is_selected)
          .map((candidate) => ({
            app_id: candidate.app_id || null,
            name: candidate.name,
            total_score: candidate.total_score,
            selection_reason: candidate.selection_reason,
            comparison_basis: candidate.comparison_basis || [],
            coordinate_role_hint: candidate.coordinate_role_hint || "",
            evidence_strength: candidate.evidence_strength || "unknown",
            role_matches: candidate.role_matches || []
          }))
      : [],
    source_summary: report.source_summary || {},
    debug_meta: {
      warnings: report.debug_meta?.warnings || []
    }
  };
}

function pickPromptGame(game) {
  if (!game || typeof game !== "object") {
    return {};
  }

  return {
    app_id: game.app_id,
    name: game.name,
    subtitle: game.subtitle,
    tags: game.tags || [],
    developers: game.developers || [],
    publishers: game.publishers || [],
    supported_languages: game.supported_languages || [],
    price_final: pickMetric(game.price_final),
    release_date: pickMetric(game.release_date),
    review_score_desc: pickMetric(game.review_score_desc),
    total_reviews: pickMetric(game.total_reviews),
    current_players: pickMetric(game.current_players),
    owner_estimate_low: pickMetric(game.owner_estimate_low),
    owner_estimate_high: pickMetric(game.owner_estimate_high),
    owner_estimate_note: game.owner_estimate_note || null,
    available_fields: game.available_fields || [],
    missing_fields: game.missing_fields || []
  };
}

function pickMetric(metric) {
  if (!metric || typeof metric !== "object") {
    return null;
  }

  return {
    display_value: metric.display_value,
    value: metric.value,
    source: metric.source,
    confidence_tier: metric.confidence_tier,
    fetched_at: metric.fetched_at,
    is_missing: metric.is_missing
  };
}

function normalizeLiveSummary(parsed, modelName) {
  const positioningSummary = cleanString(parsed.positioning_summary);
  const screeningRecommendation = cleanString(parsed.screening_recommendation);
  const dataCaution = cleanString(parsed.data_caution);
  const differencePoints = Array.isArray(parsed.difference_points)
    ? parsed.difference_points.map(cleanString).filter(Boolean)
    : [];

  if (!positioningSummary) {
    throw new Error("模型结果缺少 positioning_summary。");
  }

  if (!screeningRecommendation) {
    throw new Error("模型结果缺少 screening_recommendation。");
  }

  if (!dataCaution) {
    throw new Error("模型结果缺少 data_caution。");
  }

  if (differencePoints.length < 3) {
    throw new Error("模型结果缺少足够的 difference_points。");
  }

  return {
    status: "success",
    positioning_summary: positioningSummary,
    difference_points: differencePoints.slice(0, 3),
    screening_recommendation: screeningRecommendation,
    data_caution: dataCaution,
    comparison_frame_summary: cleanString(parsed.comparison_frame_summary),
    comparison_axes: normalizeStringArray(parsed.comparison_axes).slice(0, 3),
    competitor_rationales: normalizeCompetitorRationales(parsed.competitor_rationales),
    used_fields: normalizeStringArray(parsed.used_fields),
    used_estimate_sources: normalizeStringArray(parsed.used_estimate_sources),
    model_name: modelName,
    generated_at: new Date().toISOString()
  };
}

function normalizeTranslatedQuery(parsed, rawQuery) {
  return {
    raw_query: cleanString(rawQuery),
    translated_query: cleanString(parsed.translated_query),
    confidence: cleanString(parsed.confidence) || "unknown",
    notes: cleanString(parsed.notes)
  };
}

function normalizeCompetitorRationales(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => ({
      competitor_app_id: Number(item?.competitor_app_id || 0) || null,
      competitor_name: cleanString(item?.competitor_name),
      why_compare: cleanString(item?.why_compare),
      coordinate_role: cleanString(item?.coordinate_role)
    }))
    .filter((item) => item.competitor_name && item.why_compare);
}

function buildOutputReport({
  report,
  query,
  liveSummary,
  liveProvider,
  liveModel,
  status,
  llmError,
  llmLatencyMs,
  analysisMode,
  totalStartedAt
}) {
  const nextReport = structuredClone(report);
  const now = new Date().toISOString();
  const totalLatencyMs = Math.max(Date.now() - totalStartedAt, llmLatencyMs);
  const existingWarnings = Array.isArray(nextReport.debug_meta?.warnings)
    ? [...nextReport.debug_meta.warnings]
    : [];

  if (analysisMode === "live") {
    nextReport.llm_summary = liveSummary;
  } else {
    nextReport.llm_summary = {
      ...nextReport.llm_summary,
      status: "fallback",
      model_name: status.configured ? status.model : "mock-fallback",
      generated_at: now,
      data_caution: appendFallbackCaution(nextReport.llm_summary?.data_caution, llmError, status.configured)
    };
  }

  if (!status.configured) {
    existingWarnings.push("当前未检测到服务端模型密钥，本次结果使用 mock LLM 总结。");
  } else if (llmError) {
    existingWarnings.push(`本次模型请求失败，已回退到 mock 总结：${llmError}`);
  } else {
    existingWarnings.push(`本次 LLM 总结由 ${liveProvider} 通道实时生成。`);
  }

  nextReport.request_context = {
    ...nextReport.request_context,
    raw_query: query
  };

  nextReport.debug_meta = {
    ...nextReport.debug_meta,
    llm_latency_ms: llmLatencyMs,
    total_latency_ms: Math.max(nextReport.debug_meta?.data_latency_ms || 0, totalLatencyMs),
    partial_failure: Boolean(llmError) || Boolean(nextReport.debug_meta?.partial_failure),
    warnings: uniqueStrings(existingWarnings)
  };

  nextReport.runtime_meta = {
    analysis_mode: analysisMode,
    llm_provider: analysisMode === "live" ? liveProvider : "mock",
    llm_configured: status.configured,
    llm_model: liveModel || status.model,
    analyzed_at: now,
    prompt_version: "steam_screening_server_v3"
  };

  if (llmError) {
    nextReport.runtime_meta.fallback_reason = llmError;
  }

  return nextReport;
}

function appendFallbackCaution(originalCaution, llmError, hadKey) {
  const base = cleanString(originalCaution) || "当前结果基于 mock 分析摘要，仅用于原型验证。";

  if (!hadKey) {
    return `${base} 当前尚未配置服务端模型密钥，因此没有触发实时 LLM 总结。`;
  }

  if (llmError) {
    return `${base} 本次实时 LLM 请求失败，页面已自动回退到 mock 总结。`;
  }

  return base;
}

async function sendJsonRequest(url, init) {
  let response;

  try {
    response = await fetch(url, init);
  } catch (error) {
    throw new Error(`请求模型网关失败：${normalizeErrorMessage(error)}`);
  }

  const payload = await safeParseJson(response);

  if (!response.ok) {
    throw new ApiRequestError(extractApiError(payload, response.status), response.status, payload, url);
  }

  return { response, payload };
}

async function safeParseJson(response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { raw_text: text };
  }
}

function shouldFallbackToChatCompletions(error) {
  if (!(error instanceof ApiRequestError)) {
    return false;
  }

  if (error.statusCode === 401 || error.statusCode === 403) {
    return false;
  }

  const haystack = [
    error.message,
    error.url,
    JSON.stringify(error.payload || {})
  ].join(" ").toLowerCase();

  return (
    [404, 405, 415, 422, 501].includes(error.statusCode) ||
    haystack.includes("/responses") ||
    haystack.includes("responses api") ||
    haystack.includes("unsupported") ||
    haystack.includes("not found") ||
    haystack.includes("unknown endpoint") ||
    haystack.includes("unrecognized request")
  );
}

function buildRequestHeaders(apiKey) {
  return {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  };
}

function extractApiError(payload, statusCode) {
  if (typeof payload?.error === "string" && payload.error.trim()) {
    return payload.error.trim();
  }

  if (typeof payload?.error?.message === "string" && payload.error.message.trim()) {
    return payload.error.message.trim();
  }

  if (typeof payload?.message === "string" && payload.message.trim()) {
    return payload.message.trim();
  }

  if (typeof payload?.raw_text === "string" && payload.raw_text.trim()) {
    return payload.raw_text.trim();
  }

  return `模型接口返回 ${statusCode}。`;
}

function extractResponsesOutputText(payload) {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  if (!Array.isArray(payload?.output)) {
    return "";
  }

  const parts = [];

  for (const item of payload.output) {
    if (item?.type !== "message" || !Array.isArray(item.content)) {
      continue;
    }

    for (const content of item.content) {
      if (typeof content?.text === "string" && content.text.trim()) {
        parts.push(content.text.trim());
      }
    }
  }

  return parts.join("\n").trim();
}

function extractChatCompletionsOutputText(payload) {
  const content = payload?.choices?.[0]?.message?.content;

  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        if (typeof item?.text === "string") {
          return item.text;
        }

        return "";
      })
      .join("\n")
      .trim();
  }

  return "";
}

function parseJsonText(text) {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("模型返回的 JSON 无法解析。");
  }
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return uniqueStrings(value.map(cleanString).filter(Boolean));
}

function uniqueStrings(values) {
  return [...new Set(values)];
}

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeErrorMessage(error) {
  const detail = collectErrorDetails(error);

  if (detail) {
    return detail;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "未知错误";
}

function collectErrorDetails(error) {
  const parts = [];
  const seen = new Set();

  pushErrorPart(parts, seen, error?.code);
  pushErrorPart(parts, seen, error?.message);

  if (error?.cause && typeof error.cause === "object") {
    pushErrorPart(parts, seen, error.cause.code);
    pushErrorPart(parts, seen, error.cause.message);
    pushErrorPart(parts, seen, error.cause.errno);
  }

  if (Array.isArray(error?.errors)) {
    for (const nestedError of error.errors) {
      pushErrorPart(parts, seen, nestedError?.code);
      pushErrorPart(parts, seen, nestedError?.message);
    }
  }

  return parts.join(" | ");
}

function pushErrorPart(parts, seen, value) {
  const text = cleanString(String(value ?? ""));

  if (!text || seen.has(text)) {
    return;
  }

  seen.add(text);
  parts.push(text);
}

function getConfiguredProviders(runtimeEnv = process.env) {
  const providers = [];
  const envSource = getEnvValue(runtimeEnv, "PROTOTYPE_ENV_SOURCE") || null;

  if (getEnvValue(runtimeEnv, "OPENAI_API_KEY")) {
    providers.push({
      label: "primary_server_gateway",
      api_key: getEnvValue(runtimeEnv, "OPENAI_API_KEY"),
      base_url: getPrimaryConfiguredBaseUrl(runtimeEnv),
      model: getPrimaryConfiguredModel(runtimeEnv),
      reasoning_effort: getPrimaryConfiguredReasoningEffort(runtimeEnv),
      env_source: envSource
    });
  }

  const backupApiKey =
    getEnvValue(runtimeEnv, "VOLCENGINE_API_KEY") ||
    getEnvValue(runtimeEnv, "BACKUP_OPENAI_API_KEY") ||
    "";
  if (backupApiKey) {
    providers.push({
      label: "backup_server_gateway",
      api_key: backupApiKey,
      base_url: normalizeBaseUrl(
        getEnvValue(runtimeEnv, "VOLCENGINE_BASE_URL") ||
        getEnvValue(runtimeEnv, "BACKUP_OPENAI_BASE_URL") ||
        "https://ark.cn-beijing.volces.com/api/v3"
      ),
      model: getEnvValue(runtimeEnv, "VOLCENGINE_MODEL") || getEnvValue(runtimeEnv, "BACKUP_OPENAI_MODEL") || "doubao-seed-1-6-250615",
      reasoning_effort: getEnvValue(runtimeEnv, "VOLCENGINE_REASONING_EFFORT") || getEnvValue(runtimeEnv, "BACKUP_OPENAI_REASONING_EFFORT") || "low",
      env_source: envSource
    });
  }

  return providers;
}

function getPrimaryConfiguredModel(runtimeEnv = process.env) {
  return getEnvValue(runtimeEnv, "OPENAI_MODEL") || "gpt-5.4-mini";
}

function getPrimaryConfiguredReasoningEffort(runtimeEnv = process.env) {
  return getEnvValue(runtimeEnv, "OPENAI_REASONING_EFFORT") || "low";
}

function getPrimaryConfiguredBaseUrl(runtimeEnv = process.env) {
  return normalizeBaseUrl(getEnvValue(runtimeEnv, "OPENAI_BASE_URL") || "https://api.openai.com/v1");
}

function getEnvValue(runtimeEnv, key) {
  if (!runtimeEnv || typeof runtimeEnv !== "object") {
    return "";
  }

  const value = runtimeEnv[key];
  return typeof value === "string" ? value : "";
}

function normalizeBaseUrl(rawValue) {
  const value = cleanString(rawValue);

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

function assertValidReport(report) {
  if (!report || typeof report !== "object") {
    throw new Error("分析请求缺少 report。");
  }

  if (!report.target_game || !report.llm_summary) {
    throw new Error("report 结构不完整，缺少目标产品或 LLM 摘要。");
  }
}

class ApiRequestError extends Error {
  constructor(message, statusCode, payload, url) {
    super(message);
    this.name = "ApiRequestError";
    this.statusCode = statusCode;
    this.payload = payload;
    this.url = url;
  }
}
