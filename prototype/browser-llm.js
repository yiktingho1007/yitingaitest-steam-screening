(function attachBrowserLlm(globalObject) {
  const DEFAULT_BASE_URL = "https://api.openai.com/v1";

  async function loadRuntimeConfig(origin) {
    const embeddedConfig = normalizeEmbeddedConfig(globalObject.BROWSER_LLM_RUNTIME_CONFIG);

    if (embeddedConfig) {
      return {
        llm: summarizeConfigChain(embeddedConfig),
        config: embeddedConfig
      };
    }

    if (!origin) {
      throw new Error("当前没有可用的本地原型地址。");
    }

    const response = await fetch(`${origin}/api/browser-config`, {
      headers: {
        "Accept": "application/json"
      }
    });

    const payload = await response.json();

    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || "浏览器直连配置加载失败。");
    }

    const config = {
      apiKey: payload.config?.api_key || "",
      baseUrl: normalizeBaseUrl(payload.config?.base_url || DEFAULT_BASE_URL),
      model: payload.config?.model || "gpt-5.4-mini",
      reasoningEffort: payload.config?.reasoning_effort || "low",
      envSource: payload.config?.env_source || null,
      fallbacks: normalizeFallbackConfigs(payload.config?.fallbacks)
    };

    return {
      llm: summarizeConfigChain(config),
      config
    };
  }

  function normalizeEmbeddedConfig(rawConfig) {
    if (!rawConfig || typeof rawConfig !== "object") {
      return null;
    }

    return {
      apiKey: cleanString(rawConfig.apiKey || rawConfig.api_key),
      baseUrl: normalizeBaseUrl(rawConfig.baseUrl || rawConfig.base_url || DEFAULT_BASE_URL),
      model: cleanString(rawConfig.model) || "gpt-5.4-mini",
      reasoningEffort: cleanString(rawConfig.reasoningEffort || rawConfig.reasoning_effort) || "low",
      envSource: cleanString(rawConfig.envSource || rawConfig.env_source) || null,
      fallbacks: normalizeFallbackConfigs(rawConfig.fallbacks)
    };
  }

  function normalizeFallbackConfigs(rawFallbacks) {
    if (!Array.isArray(rawFallbacks)) {
      return [];
    }

    return rawFallbacks
      .map((item, index) => normalizeProviderConfig(item, `fallback_${index + 1}`))
      .filter((item) => item.apiKey);
  }

  function normalizeProviderConfig(rawConfig, fallbackLabel = "fallback") {
    return {
      label: cleanString(rawConfig?.label) || fallbackLabel,
      apiKey: cleanString(rawConfig?.apiKey || rawConfig?.api_key),
      baseUrl: normalizeBaseUrl(rawConfig?.baseUrl || rawConfig?.base_url || DEFAULT_BASE_URL),
      model: cleanString(rawConfig?.model) || "gpt-5.4-mini",
      reasoningEffort: cleanString(rawConfig?.reasoningEffort || rawConfig?.reasoning_effort) || "low",
      envSource: cleanString(rawConfig?.envSource || rawConfig?.env_source) || null
    };
  }

  function summarizeConfigChain(config) {
    const providers = buildProviderChain(config);
    const primaryProvider = providers[0] || buildStatusFromConfig(config);

    return {
      configured: providers.length > 0,
      model: primaryProvider.model,
      reasoning_effort: primaryProvider.reasoning_effort,
      base_url: primaryProvider.base_url,
      env_source: primaryProvider.env_source,
      channel: "browser_direct",
      fallback_count: Math.max(0, providers.length - 1),
      provider_labels: providers.map((provider) => provider.label)
    };
  }

  async function analyzeSteamReportDirect({ query, report, config }) {
    assertValidReport(report);

    const providers = buildProviderChain(config);
    const status = providers[0] || buildStatusFromConfig(config);
    const startedAt = Date.now();
    let liveResult = null;
    let llmError = null;
    let llmLatencyMs = 0;

    if (providers.length) {
      const llmStartedAt = Date.now();
      const providerErrors = [];

      try {
        for (const provider of providers) {
          try {
            liveResult = await requestLiveSummary({
              query,
              report,
              status: provider,
              apiKey: provider.apiKey
            });
            break;
          } catch (error) {
            providerErrors.push(`${provider.label}: ${normalizeErrorMessage(error)}`);
          }
        }
      } finally {
        llmLatencyMs = Date.now() - llmStartedAt;
      }

      if (!liveResult && providerErrors.length) {
        llmError = providerErrors.join(" | ");
      }
    }

    const analysisMode = liveResult ? "live" : "mock_fallback";
    const nextReport = buildOutputReport({
      report,
      query,
        liveSummary: liveResult?.summary || null,
        liveProvider: liveResult?.provider || null,
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
        configured: providers.length > 0,
        model: status.model,
        reasoning_effort: status.reasoning_effort,
        base_url: status.base_url,
        env_source: status.env_source,
        channel: status.channel,
        provider: liveResult?.provider || "mock",
        error: llmError,
        fallback_count: Math.max(0, providers.length - 1),
        provider_labels: providers.map((provider) => provider.label)
      },
      report: nextReport
    };
  }

  async function translateSteamSearchQueryDirect({ query, config }) {
    const providers = buildProviderChain(config);
    const status = providers[0] || buildStatusFromConfig(config);

    if (!providers.length) {
      throw new Error("当前没有可用的浏览器直连 API Key，无法触发英文翻译重试。");
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
      JSON.stringify({ raw_query: query }, null, 2)
    ].join("\n");

    const providerErrors = [];

    for (const provider of providers) {
      try {
        return await requestTranslationViaResponsesApi({ developerPrompt, userPrompt, status: provider, apiKey: provider.apiKey, query });
      } catch (error) {
        if (!shouldFallbackToChatCompletions(error)) {
          providerErrors.push(`${provider.label}: ${normalizeErrorMessage(error)}`);
          continue;
        }

        try {
          return await requestTranslationViaChatCompletions({ developerPrompt, userPrompt, status: provider, apiKey: provider.apiKey, query });
        } catch (chatError) {
          providerErrors.push(`${provider.label}: ${normalizeErrorMessage(chatError)}`);
        }
      }
    }

    throw new Error(providerErrors.join(" | ") || "娴忚鍣ㄧ洿杩?LLM 缈昏瘧閲嶈瘯澶辫触銆?");
  }

  function buildStatusFromConfig(config) {
    return {
      label: cleanString(config?.label) || "primary_browser_gateway",
      apiKey: cleanString(config?.apiKey),
      configured: Boolean(config?.apiKey),
      model: config?.model || "gpt-5.4-mini",
      reasoning_effort: config?.reasoningEffort || "low",
      base_url: normalizeBaseUrl(config?.baseUrl || DEFAULT_BASE_URL),
      env_source: config?.envSource || null,
      channel: "browser_direct"
    };
  }

  function buildProviderChain(config) {
    const providers = [];
    const primary = buildStatusFromConfig(config);

    if (primary.configured) {
      providers.push(primary);
    }

    for (const fallback of config?.fallbacks || []) {
      const provider = buildStatusFromConfig(fallback);
      if (provider.configured) {
        providers.push(provider);
      }
    }

    return providers;
  }

  async function requestLiveSummary({ query, report, status, apiKey }) {
    const developerPrompt = [
      "你是莉莉丝预研团队的 Steam 产品初筛助手。",
      "你只能使用我提供的结构化数据，不允许补充未提供的销量、收入、留存、愿望单或趋势事实。",
      "如果引用第三方估算字段，必须明确写出来源，并说明它是估算，不是官方确认数据。",
      "如果字段缺失，直接写“暂无可靠公开数据”，不要猜测。",
      "请用简体中文输出一个 JSON 对象。",
      "JSON 必须只包含以下键：positioning_summary、difference_points、screening_recommendation、data_caution、used_fields、used_estimate_sources。"
    ].join("\n");

    const userPrompt = [
      "下面是当前分析请求的结构化 JSON 数据。",
      "请基于这些数据，输出适合研究员快速筛选的结论。",
      "difference_points 必须是 3 条短句数组。",
      "used_fields 只填写你实际引用过的字段名。",
      "used_estimate_sources 只填写你实际引用过的第三方估算来源，没有则返回空数组。",
      "",
      JSON.stringify(buildPromptPayload(query, report), null, 2)
    ].join("\n");

    try {
      return await requestViaResponsesApi({ developerPrompt, userPrompt, status, apiKey });
    } catch (error) {
      if (!shouldFallbackToChatCompletions(error)) {
        throw error;
      }

      return await requestViaChatCompletions({ developerPrompt, userPrompt, status, apiKey });
    }
  }

  async function requestViaResponsesApi({ developerPrompt, userPrompt, status, apiKey }) {
    const { payload } = await sendJsonRequest(`${status.base_url}/responses`, {
      method: "POST",
      headers: buildRequestHeaders(apiKey),
      body: JSON.stringify({
        model: status.model,
        reasoning: { effort: status.reasoning_effort },
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
      throw new Error("模型返回成功，但没有可解析的文本结果。");
    }

    return {
      provider: "browser_responses",
      summary: normalizeLiveSummary(parseJsonText(outputText), status.model)
    };
  }

  async function requestViaChatCompletions({ developerPrompt, userPrompt, status, apiKey }) {
    const { payload } = await sendJsonRequest(`${status.base_url}/chat/completions`, {
      method: "POST",
      headers: buildRequestHeaders(apiKey),
      body: JSON.stringify({
        model: status.model,
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
      throw new Error("兼容聊天接口返回成功，但没有可解析的文本结果。");
    }

    return {
      provider: "browser_chat_completions",
      summary: normalizeLiveSummary(parseJsonText(outputText), status.model)
    };
  }

  async function requestTranslationViaResponsesApi({ developerPrompt, userPrompt, status, apiKey, query }) {
    const { payload } = await sendJsonRequest(`${status.base_url}/responses`, {
      method: "POST",
      headers: buildRequestHeaders(apiKey),
      body: JSON.stringify({
        model: status.model,
        reasoning: { effort: status.reasoning_effort },
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
      throw new Error("模型返回成功，但没有可解析的翻译结果。");
    }

    return {
      provider: "browser_responses",
      ...normalizeTranslatedQuery(parseJsonText(outputText), query)
    };
  }

  async function requestTranslationViaChatCompletions({ developerPrompt, userPrompt, status, apiKey, query }) {
    const { payload } = await sendJsonRequest(`${status.base_url}/chat/completions`, {
      method: "POST",
      headers: buildRequestHeaders(apiKey),
      body: JSON.stringify({
        model: status.model,
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
      throw new Error("兼容聊天接口返回成功，但没有可解析的翻译结果。");
    }

    return {
      provider: "browser_chat_completions",
      ...normalizeTranslatedQuery(parseJsonText(outputText), query)
    };
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
      competitor_candidates: Array.isArray(report.competitor_candidates)
        ? report.competitor_candidates
            .filter((candidate) => candidate.is_selected)
            .map((candidate) => ({
              name: candidate.name,
              total_score: candidate.total_score,
              selection_reason: candidate.selection_reason
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

  async function requestLiveSummary({ query, report, status, apiKey }) {
    const developerPrompt = [
      "你是莉莉丝预研团队的 Steam 产品初筛助手。",
      "你只能使用我提供的结构化数据，不允许补充未提供的销量、收入、留存、愿望单或趋势事实。",
      "如果引用第三方估算字段，必须明确写出来源，并说明它是估算，不是官方确认数据。",
      "如果字段缺失，直接写“暂无可靠公开数据”，不要猜测。",
      "这次最重要的任务不是泛泛总结，而是做竞品参照物的精准分析。",
      "你必须明确回答：为什么应该拿这两款竞品作为参照物，它们和目标产品的可比性具体在哪里。",
      "不要只写“共享标签，所以适合比较”这种空话；每个竞品至少要写出两个具体的可比维度。",
      "可比维度优先从这些信息里挑：共享标签、是否同系列或同开发团队、价格带、发售阶段、评论量级、当前在线、第三方拥有量估算、受众预期。",
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
      "why_compare 不要复述系统给出的 selection_reason，而是要把 selection_reason 当成线索，再结合实际字段把可比性讲具体。",
      "如果系统给出的竞品里有同系列参照和外部赛道样本，comparison_frame_summary 必须把这两种参照角色区分开写。",
      "used_fields 只填写你实际引用过的字段名。",
      "used_estimate_sources 只填写你实际引用过的第三方估算来源，没有则返回空数组。",
      "",
      JSON.stringify(buildPromptPayload(query, report), null, 2)
    ].join("\n");

    try {
      return await requestViaResponsesApi({ developerPrompt, userPrompt, status, apiKey });
    } catch (error) {
      if (!shouldFallbackToChatCompletions(error)) {
        throw error;
      }

      return await requestViaChatCompletions({ developerPrompt, userPrompt, status, apiKey });
    }
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
      existingWarnings.push("当前没有可用的浏览器直连 API Key，本次结果继续使用 mock LLM 总结。");
    } else if (llmError) {
      existingWarnings.push(`本次浏览器直连 LLM 请求失败，已回退到 mock 总结：${llmError}`);
    } else {
      existingWarnings.push(`本次 LLM 总结由网页直接请求模型网关生成，通道：${liveProvider}。`);
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
      llm_model: status.model,
      analyzed_at: now,
      prompt_version: "steam_screening_v1",
      delivery_mode: status.channel
    };

    if (llmError) {
      nextReport.runtime_meta.fallback_reason = llmError;
    }

    return nextReport;
  }

  function appendFallbackCaution(originalCaution, llmError, hadKey) {
    const base = cleanString(originalCaution) || "当前结论基于 mock 分析摘要，仅用于原型验证。";

    if (!hadKey) {
      return `${base} 当前浏览器侧还没有可用的模型密钥，因此没有触发实时 LLM 总结。`;
    }

    if (llmError) {
      return `${base} 本次网页直连 LLM 请求失败，页面已自动回退到 mock 总结。`;
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

    if (!Array.isArray(content)) {
      return "";
    }

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

  function normalizeBaseUrl(rawValue) {
    const value = cleanString(rawValue);

    if (!value) {
      return DEFAULT_BASE_URL;
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

  globalObject.BrowserLLM = {
    loadRuntimeConfig,
    analyzeSteamReportDirect,
    translateSteamSearchQueryDirect
  };
})(globalThis);
