const MOCK_REPORTS = globalThis.MOCK_REPORTS || [];
const LOCAL_BACKEND_ORIGIN = "http://127.0.0.1:4173";
const PROTOTYPE_ORIGIN = window.location.protocol === "file:" ? LOCAL_BACKEND_ORIGIN : window.location.origin;

const LOADING_STEPS = [
  {
    title: "理解输入内容",
    copy: "系统正在理解你的游戏名输入，并尝试容忍模糊名称。"
  },
  {
    title: "锁定目标产品",
    copy: "系统正在确认目标 Steam 产品，并整理目标产品的结构化数据。"
  },
  {
    title: "准备竞品对比",
    copy: "系统正在为目标产品挑选两款最适合横向比较的竞品。"
  },
  {
    title: "请求 LLM 结论",
    copy: "结构化数据已备好，正在请求模型生成初筛摘要。"
  }
];

const COMPARISON_ROWS = [
  { label: "当前售价", key: "price_final" },
  { label: "发售时间", key: "release_date" },
  { label: "Steam 评价", key: "review_score_desc" },
  { label: "总评论量", key: "total_reviews" },
  { label: "当前在线", key: "current_players" },
  { label: "拥有量估算", key: "estimate_range" }
];

const state = {
  screen: "search",
  currentQuery: "",
  translatedQuery: "",
  currentReportId: null,
  resolutionMode: "direct",
  candidateMatches: [],
  loadingStepIndex: -1,
  timers: [],
  llmStatus: null
};

function describeRequestError(error) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "unknown";
}

const searchScreenEl = document.querySelector("#search-screen");
const candidateScreenEl = document.querySelector("#candidate-screen");
const loadingScreenEl = document.querySelector("#loading-screen");
const resultScreenEl = document.querySelector("#result-screen");
const errorScreenEl = document.querySelector("#error-screen");
const formEl = document.querySelector("#query-form");
const queryInputEl = document.querySelector("#query-input");
const analyzeButtonEl = document.querySelector("#analyze-button");
const searchFeedbackEl = document.querySelector("#search-feedback");
const quickCasesEl = document.querySelector("#quick-cases");
const connectionPillEl = document.querySelector("#connection-pill");
const candidateQueryEl = document.querySelector("#candidate-query");
const candidateOptionsEl = document.querySelector("#candidate-options");
const candidateBackButtonEl = document.querySelector("#candidate-back-button");
const loadingCopyEl = document.querySelector("#loading-copy");
const loadingStepsEl = document.querySelector("#loading-steps");
const backButtonEl = document.querySelector("#back-button");
const errorBackButtonEl = document.querySelector("#error-back-button");
const resultTitleEl = document.querySelector("#result-title");
const resultSubtitleEl = document.querySelector("#result-subtitle");
const resultMappingNoteEl = document.querySelector("#result-mapping-note");
const resultTagsEl = document.querySelector("#result-tags");
const heroReviewEl = document.querySelector("#hero-review");
const heroReviewMetaEl = document.querySelector("#hero-review-meta");
const heroPlayersEl = document.querySelector("#hero-players");
const heroPlayersMetaEl = document.querySelector("#hero-players-meta");
const heroEstimateEl = document.querySelector("#hero-estimate");
const heroEstimateMetaEl = document.querySelector("#hero-estimate-meta");
const llmStatusChipEl = document.querySelector("#llm-status-chip");
const resultModePillEl = document.querySelector("#result-mode-pill");
const positioningSummaryEl = document.querySelector("#positioning-summary");
const screeningRecommendationEl = document.querySelector("#screening-recommendation");
const differencePointsEl = document.querySelector("#difference-points");
const dataCautionEl = document.querySelector("#data-caution");
const comparisonFrameTitleEl = document.querySelector("#comparison-frame-title");
const comparisonFrameSummaryEl = document.querySelector("#comparison-frame-summary");
const comparisonAxesEl = document.querySelector("#comparison-axes");
const compareCardsEl = document.querySelector("#compare-cards");
const comparisonTableEl = document.querySelector("#comparison-table");
const sourceSummaryEl = document.querySelector("#source-summary");
const debugMetaEl = document.querySelector("#debug-meta");
const rawDataViewerEl = document.querySelector("#raw-data-viewer");
const errorMessageEl = document.querySelector("#error-message");

initialize();

function initialize() {
  renderQuickCases();
  formEl.addEventListener("submit", handleSearch);
  backButtonEl.addEventListener("click", goBackToSearch);
  candidateBackButtonEl.addEventListener("click", goBackToSearch);
  errorBackButtonEl.addEventListener("click", goBackToSearch);
  hydrateConnectionStatus();
  queryInputEl.focus();
}

async function hydrateConnectionStatus() {
  try {
    const response = await fetch(`${PROTOTYPE_ORIGIN}/api/status`, {
      headers: {
        "Accept": "application/json"
      }
    });
    const payload = await response.json();

    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || "无法检测服务端 LLM 状态。");
    }

    state.llmStatus = payload.llm;
    renderConnectionStatus();
  } catch (error) {
    state.llmStatus = {
      configured: false,
      model: "unknown",
      reasoning_effort: "unknown",
      env_source: null,
      unavailable: true,
      failure_reason: describeRequestError(error)
    };
    renderConnectionStatus();
  }
}

function renderConnectionStatus() {
  if (!state.llmStatus) {
    connectionPillEl.textContent = "正在检查 LLM 连接状态...";
    return;
  }

  if (state.llmStatus.unavailable) {
    if (window.location.protocol === "file:") {
      connectionPillEl.textContent = `当前是文件直开模式，请先启动本地服务：${LOCAL_BACKEND_ORIGIN}`;
      setSearchFeedback(`你现在是直接打开 HTML 文件。请先启动本地服务，然后直接访问 ${LOCAL_BACKEND_ORIGIN}，或保持当前页面并重试。`, true);
      return;
    }

    connectionPillEl.textContent = "后端暂不可用";
    setSearchFeedback(`当前页面没能连到本地分析服务。请确认原型服务正在运行。${state.llmStatus.failure_reason ? ` (${state.llmStatus.failure_reason})` : ""}`, true);
    return;
  }

  if (state.llmStatus.configured) {
    connectionPillEl.textContent = state.llmStatus.fallback_count
      ? `服务端 LLM · ${state.llmStatus.model} + ${state.llmStatus.fallback_count} 个备用`
      : `服务端 LLM · ${state.llmStatus.model}`;
    return;
  }

  connectionPillEl.textContent = "未找到服务端模型密钥 · 当前会回退到 mock 总结";
}

async function handleSearch(event) {
  event.preventDefault();
  const query = queryInputEl.value.trim();

  if (!query) {
    setSearchFeedback("请输入一个游戏名字。", true);
    return;
  }

  setSearchFeedback("正在识别对应的 Steam 游戏并拉取公开数据…", false);

  try {
    const { matches, translatedQuery } = await resolveCandidatesWithTranslationFallback(query);

    if (!matches.length) {
      if (translatedQuery) {
        setSearchFeedback(`没有直接识别到结果；已尝试英文名“${translatedQuery}”重试，但仍未命中可用的 Steam 游戏。`, true);
      } else {
        setSearchFeedback("没有识别到可用的 Steam 游戏结果，请换个名字再试一次。", true);
      }
      return;
    }

    if (matches.length === 1) {
      startAnalysis(query, matches[0].report, {
        feedback: translatedQuery
          ? `首轮未直接命中，已通过英文名“${translatedQuery}”识别到：${matches[0].report.request_context.resolved_name}`
          : `已识别到：${matches[0].report.request_context.resolved_name}`,
        resolutionMode: translatedQuery ? "translated" : "direct",
        translatedQuery
      });
      return;
    }

    showCandidateSelection(query, matches, { translatedQuery });
  } catch (error) {
    setSearchFeedback(error instanceof Error ? error.message : "实时识别失败，请稍后重试。", true);
  }
}

function renderQuickCases() {
  quickCasesEl.innerHTML = "";

  for (const report of MOCK_REPORTS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "quick-case";
    button.textContent = report.request_context.raw_query;
    button.addEventListener("click", () => {
      queryInputEl.value = report.request_context.raw_query;
      startAnalysis(report.request_context.raw_query, report, {
        feedback: `已选择样例：${report.request_context.resolved_name}`,
        resolutionMode: "quick_case"
      });
    });
    quickCasesEl.appendChild(button);
  }
}

function showCandidateSelection(query, matches, options = {}) {
  clearTimers();
  state.currentQuery = query;
  state.translatedQuery = cleanString(options.translatedQuery);
  state.candidateMatches = matches;
  candidateQueryEl.textContent = state.translatedQuery
    ? `“${query}”没有直接命中；已改用英文名“${state.translatedQuery}”找到以下候选，请先选定一款：`
    : `“${query}”可能对应以下游戏，请先选定一款：`;

  candidateOptionsEl.innerHTML = matches
    .map(
      ({ report, score }) => `
        <article class="candidate-option">
          <div class="candidate-option-copy">
            <span class="candidate-score">匹配度 ${score}</span>
            <h3>${escapeHtml(report.request_context.resolved_name)}</h3>
            <p>${escapeHtml(report.target_game.subtitle || "暂无副标题")}</p>
            <div class="tag-list">
              ${(report.target_game.tags || [])
                .slice(0, 4)
                .map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`)
                .join("")}
            </div>
          </div>
          <div class="candidate-option-meta">
            <p>Steam 评价：${escapeHtml(report.target_game.review_score_desc?.display_value || "暂无")}</p>
            <p>当前在线：${escapeHtml(report.target_game.current_players?.display_value || "暂无")}</p>
            <button
              type="button"
              class="candidate-pick-button"
              data-report-id="${escapeHtml(report.id)}"
            >
              选择这款
            </button>
          </div>
        </article>
      `
    )
    .join("");

  const pickButtons = candidateOptionsEl.querySelectorAll(".candidate-pick-button");
  for (const button of pickButtons) {
    button.addEventListener("click", () => {
      const reportId = button.getAttribute("data-report-id");
      const selected = state.candidateMatches.find((item) => item.report.id === reportId)?.report;

      if (!selected) {
        showErrorScreen("候选产品选择失败，请返回搜索后重试。");
        return;
      }

      startAnalysis(state.currentQuery, selected, {
        feedback: state.translatedQuery
          ? `已通过英文名“${state.translatedQuery}”选定分析对象：${selected.request_context.resolved_name}`
          : `已选定分析对象：${selected.request_context.resolved_name}`,
        resolutionMode: "candidate",
        translatedQuery: state.translatedQuery
      });
    });
  }

  setSearchFeedback(
    state.translatedQuery
      ? `系统已用英文名“${state.translatedQuery}”找到多个候选，请先确认。`
      : `系统为“${query}”找到了多个候选，请先确认。`,
    false
  );
  setScreen("candidate");
}

async function startAnalysis(query, report, options = {}) {
  clearTimers();
  state.currentQuery = query;
  state.translatedQuery = cleanString(options.translatedQuery);
  state.currentReportId = report.id;
  state.resolutionMode = options.resolutionMode || "direct";
  state.loadingStepIndex = -1;
  state.candidateMatches = [];

  const feedback =
    options.feedback || `已识别到最接近的样例：${report.request_context.resolved_name}`;

  setSearchFeedback(feedback, false);
  setActiveQuickCase(report.request_context.raw_query);
  setScreen("loading");
  loadingCopyEl.textContent = `正在围绕“${report.request_context.resolved_name}”整理结构化数据并生成初筛结论。`;
  scheduleLoadingFlow();

  try {
    const [payload] = await Promise.all([
      requestAnalysis(query, report),
      wait(1700)
    ]);

    clearTimers();
    state.loadingStepIndex = LOADING_STEPS.length - 1;
    renderLoadingSteps();

    const finalReport = payload.report || report;
    renderResult(finalReport, payload);
    setScreen("result");
  } catch (error) {
    clearTimers();
    showErrorScreen(error instanceof Error ? error.message : "分析请求失败，请稍后重试。");
  }
}

function scheduleLoadingFlow() {
  state.loadingStepIndex = 0;
  renderLoadingSteps();

  LOADING_STEPS.slice(1).forEach((_, index) => {
    const timer = window.setTimeout(() => {
      state.loadingStepIndex = index + 1;
      renderLoadingSteps();
    }, 420 + index * 420);
    state.timers.push(timer);
  });
}

function renderLoadingSteps() {
  loadingStepsEl.innerHTML = LOADING_STEPS.map((step, index) => {
    const className =
      index < state.loadingStepIndex
        ? "loading-step done"
        : index === state.loadingStepIndex
          ? "loading-step active"
          : "loading-step";

    return `
      <div class="${className}">
        <span class="step-title">${escapeHtml(step.title)}</span>
        <span class="step-copy">${escapeHtml(step.copy)}</span>
      </div>
    `;
  }).join("");
}

async function requestAnalysis(query, report) {
  if (!state.llmStatus) {
    await hydrateConnectionStatus();
  }

  if (state.llmStatus?.unavailable) {
    if (window.location.protocol === "file:") {
      throw new Error(`当前页面是文件直开模式，但本地服务未连通。请先启动服务，然后访问 ${LOCAL_BACKEND_ORIGIN}。`);
    }

    throw new Error("当前页面无法连接分析后端，请确认本地原型服务正在运行。");
  }

  const screenResponse = await fetch(`${PROTOTYPE_ORIGIN}/api/screen`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify({
      query,
      appid: report.request_context?.resolved_app_id,
      resolved_name: report.request_context?.resolved_name
    })
  });

  const payload = await screenResponse.json();

  if (!screenResponse.ok || !payload.ok) {
    throw new Error(payload.error || "实时初筛失败，请稍后重试。");
  }

  state.llmStatus = payload.llm || state.llmStatus;
  return payload;
}

async function resolveLiveCandidates(query) {
  const url = new URL(`${PROTOTYPE_ORIGIN}/api/resolve`);
  url.searchParams.set("query", query);

  const response = await fetch(url.toString(), {
    headers: {
      "Accept": "application/json"
    }
  });

  const payload = await response.json();

  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || "实时识别失败，请稍后重试。");
  }

  return Array.isArray(payload.candidates) ? payload.candidates : [];
}

async function resolveCandidatesWithTranslationFallback(query) {
  const directMatches = await resolveLiveCandidates(query);

  if (directMatches.length) {
    return {
      matches: directMatches,
      translatedQuery: ""
    };
  }

  const translatedQuery = await translateQueryForRetry(query);

  if (!translatedQuery) {
    return {
      matches: [],
      translatedQuery: ""
    };
  }

  setSearchFeedback(`没有直接命中结果，正在用英文名“${translatedQuery}”再查一轮…`, false);

  return {
    matches: await resolveLiveCandidates(translatedQuery),
    translatedQuery
  };
}

async function translateQueryForRetry(query) {
  if (!shouldRetryWithLlmTranslation(query)) {
    return "";
  }

  if (!state.llmStatus) {
    await hydrateConnectionStatus();
  }

  if (!state.llmStatus?.configured) {
    return "";
  }

  setSearchFeedback("没有直接命中结果，正在尝试翻译英文名再查一轮…", false);

  try {
    const response = await fetch(`${PROTOTYPE_ORIGIN}/api/translate-query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        query
      })
    });
    const payload = await response.json();

    if (!response.ok || !payload.ok) {
      return "";
    }

    const translatedQuery = cleanString(payload.translation?.translated_query);

    if (!translatedQuery) {
      return "";
    }

    if (normalizeText(translatedQuery) === normalizeText(query)) {
      return "";
    }

    return translatedQuery;
  } catch (error) {
    console.warn("LLM translation retry failed", error);
    return "";
  }
}

function renderResult(report, payload) {
  const targetGame = report.target_game;
  const llmSummary = report.llm_summary;
  const runtimeMeta = report.runtime_meta || {};

  resultTitleEl.textContent = targetGame.name || "未知游戏";
  resultSubtitleEl.textContent = targetGame.subtitle || "暂无产品副标题";
  resultMappingNoteEl.textContent = buildMappingNote(report.request_context?.resolved_name || "未知");
  resultTagsEl.innerHTML = (targetGame.tags || [])
    .map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`)
    .join("");

  heroReviewEl.textContent = targetGame.review_score_desc?.display_value || "暂无";
  heroReviewMetaEl.textContent = `${targetGame.total_reviews?.display_value || "暂无评论"} · ${targetGame.review_score_desc?.source || "未知来源"}`;
  heroPlayersEl.textContent = targetGame.current_players?.display_value || "暂无";
  heroPlayersMetaEl.textContent = `来源：${targetGame.current_players?.source || "未知来源"}`;
  heroEstimateEl.textContent = buildEstimateRange(targetGame);
  heroEstimateMetaEl.textContent = targetGame.owner_estimate_note || "第三方拥有量估算信号";

  llmStatusChipEl.textContent = runtimeMeta.analysis_mode === "live" ? "实时生成" : "回退结果";
  resultModePillEl.textContent = runtimeMeta.analysis_mode === "live"
    ? `LLM：${runtimeMeta.llm_provider || "live"} · ${runtimeMeta.llm_model || payload.llm?.model || "未知模型"}`
    : "LLM：Mock 回退";

  positioningSummaryEl.textContent = llmSummary.positioning_summary || "暂无结论";
  screeningRecommendationEl.textContent = llmSummary.screening_recommendation || "暂无建议";
  dataCautionEl.textContent = llmSummary.data_caution || "暂无数据边界提示";

  comparisonFrameTitleEl.textContent = "这款游戏应该放在什么坐标系里看";
  comparisonFrameSummaryEl.textContent = buildComparisonFrameSummary(report);
  comparisonAxesEl.innerHTML = buildComparisonAxes(report)
    .map((axis) => `<span class="axis-pill">${escapeHtml(axis)}</span>`)
    .join("");

  differencePointsEl.innerHTML = (llmSummary.difference_points || [])
    .map(
      (point, index) => `
        <article class="difference-card">
          <strong>差异点 ${index + 1}</strong>
          <p>${escapeHtml(point)}</p>
        </article>
      `
    )
    .join("");

  renderCompareCards(report);
  renderComparisonTable(report);
  renderSourceSummary(report);
  renderDebugMeta(report);
  rawDataViewerEl.textContent = JSON.stringify(report, null, 2);
}

function renderCompareCards(report) {
  const products = [
    {
      role: "目标产品",
      reason: "来自研究员输入，是本次初筛的主分析对象。",
      coordinateRole: buildTargetCoordinateRole(report),
      game: report.target_game,
      isTarget: true
    },
    ...(report.competitor_games || []).map((game) => ({
      role: "竞品",
      reason: competitorReason(report, game),
      coordinateRole: competitorCoordinateRole(report, game),
      game,
      isTarget: false
    }))
  ];

  compareCardsEl.innerHTML = products
    .map(
      ({ role, reason, coordinateRole, game, isTarget }) => `
        <article class="compare-card ${isTarget ? "target" : ""}">
          <span class="compare-role">${escapeHtml(role)}</span>
          <h4>${escapeHtml(game.name || "未知游戏")}</h4>
          <p>${escapeHtml(reason)}</p>
            <div class="compare-role-note">
              <strong>${escapeHtml(isTarget ? "在这组坐标里" : "它在这组坐标里代表")}</strong>
              <p>${escapeHtml(coordinateRole)}</p>
            </div>
            <div class="compare-card-metrics">
            ${compareMetric("评价", game.review_score_desc?.display_value)}
            ${compareMetric("评论量", game.total_reviews?.display_value)}
            ${compareMetric("当前在线", game.current_players?.display_value)}
            ${compareMetric("拥有量估算", buildEstimateRange(game))}
          </div>
        </article>
      `
    )
    .join("");
}

function renderComparisonTable(report) {
  const products = [report.target_game, ...(report.competitor_games || [])];
  const rows = COMPARISON_ROWS.map(({ label, key }) => {
    const cells = products
      .map((product) => `<td>${renderTableCell(product, key)}</td>`)
      .join("");
    return `<tr><td>${escapeHtml(label)}</td>${cells}</tr>`;
  }).join("");

  comparisonTableEl.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>字段</th>
          ${products.map((product) => `<th>${escapeHtml(product.name || "未知游戏")}</th>`).join("")}
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderSourceSummary(report) {
  const estimateSources = (report.llm_summary.used_estimate_sources || []).join(" / ") || "未使用";

  sourceSummaryEl.innerHTML = `
    <article class="source-card">
      <div class="chip-row">
        <span class="chip tier-a">A 级官方主数据</span>
      </div>
      <h4>${report.source_summary?.official_source_count || 0} 个来源被命中</h4>
      <p>用于当前在线、评论表现等核心判断，是结果页的主要事实基础。</p>
    </article>
    <article class="source-card">
      <div class="chip-row">
        <span class="chip tier-b">B 级补充数据</span>
      </div>
      <h4>${report.source_summary?.supplemental_source_count || 0} 个来源被命中</h4>
      <p>用于补充价格、发售时间和标签语义，帮助研究员快速建立产品认知。</p>
    </article>
    <article class="source-card">
      <div class="chip-row">
        <span class="chip tier-c">C 级第三方拥有量估算</span>
      </div>
      <h4>${escapeHtml(estimateSources)}</h4>
      <p>可以进入主结论，但必须显式标注来源和估算属性，不能伪装成官方确认数据。</p>
    </article>
  `;
}

function renderDebugMeta(report) {
  const systemHint = buildSystemHint(report);
  const warnings = Array.isArray(report.debug_meta?.warnings) ? report.debug_meta.warnings : [];
  const warningList = warnings.length
    ? warnings.map((warning) => `<p>${escapeHtml(warning)}</p>`).join("")
    : "<p>暂无额外警告。</p>";

  debugMetaEl.innerHTML = `
    <article class="debug-card">
      <h4>请求与识别</h4>
      <p>输入：${escapeHtml(state.currentQuery)}</p>
      <p>命中产品：${escapeHtml(report.request_context?.resolved_name || "未知")} / AppID ${escapeHtml(report.request_context?.resolved_app_id || "未知")}</p>
      <p>Request ID：${escapeHtml(report.request_context?.request_id || "未知")}</p>
    </article>
    <article class="debug-card">
      <h4>运行表现</h4>
      <p>数据层耗时：${report.debug_meta?.data_latency_ms || 0} ms</p>
      <p>LLM 耗时：${report.debug_meta?.llm_latency_ms || 0} ms</p>
      <p>总耗时：${report.debug_meta?.total_latency_ms || 0} ms</p>
      <p>分析模式：${escapeHtml(report.runtime_meta?.analysis_mode || "unknown")}</p>
    </article>
    <article class="debug-card">
      <h4>备注</h4>
      ${warningList}
      ${systemHint ? `<p>${escapeHtml(systemHint)}</p>` : ""}
    </article>
  `;
}

function goBackToSearch() {
  clearTimers();
  state.candidateMatches = [];
  state.translatedQuery = "";
  setScreen("search");
  queryInputEl.focus();
  queryInputEl.select();
}

function setScreen(screen) {
  state.screen = screen;
  searchScreenEl.classList.toggle("hidden", screen !== "search");
  candidateScreenEl.classList.toggle("hidden", screen !== "candidate");
  loadingScreenEl.classList.toggle("hidden", screen !== "loading");
  resultScreenEl.classList.toggle("hidden", screen !== "result");
  errorScreenEl.classList.toggle("hidden", screen !== "error");
  analyzeButtonEl.disabled = screen === "loading";
}

function setSearchFeedback(message, isError) {
  searchFeedbackEl.textContent = message;
  searchFeedbackEl.classList.toggle("error", Boolean(isError));
}

function setActiveQuickCase(label) {
  const buttons = quickCasesEl.children || [];
  for (const button of buttons) {
    button.classList.toggle("active", button.textContent === label);
  }
}

function findCandidateReports(query) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) {
    return [];
  }

  const scoredMatches = MOCK_REPORTS
    .map((report) => ({
      report,
      score: scoreReport(report, normalizedQuery)
    }))
    .filter((item) => item.score >= 48)
    .sort((a, b) => b.score - a.score);

  if (!scoredMatches.length) {
    return [];
  }

  const strongestScore = scoredMatches[0].score;
  const threshold = Math.max(48, strongestScore - 18);
  return scoredMatches.filter((item) => item.score >= threshold).slice(0, 4);
}

function scoreReport(report, normalizedQuery) {
  const values = [
    report.request_context.raw_query,
    report.request_context.resolved_name,
    ...(report.aliases || []),
    ...(report.target_game.tags || [])
  ];

  let score = 0;

  for (const value of values) {
    const candidate = normalizeText(value);
    if (!candidate) {
      continue;
    }

    if (candidate === normalizedQuery) {
      score = Math.max(score, 100);
      continue;
    }

    if (candidate.includes(normalizedQuery)) {
      score = Math.max(score, 82);
      continue;
    }

    if (normalizedQuery.includes(candidate)) {
      score = Math.max(score, 70);
      continue;
    }

    if (sharedTokenCount(candidate, normalizedQuery) > 0) {
      score = Math.max(score, 52);
    }
  }

  return score;
}

function sharedTokenCount(a, b) {
  const aTokens = tokenize(a);
  const bTokens = tokenize(b);
  return aTokens.filter((token) => bTokens.includes(token)).length;
}

function tokenize(value) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean);
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function shouldRetryWithLlmTranslation(query) {
  return /[\u3400-\u9FFF\uF900-\uFAFF]/u.test(String(query || ""));
}

function pickFallbackReport(query) {
  const normalizedQuery = normalizeText(query);

  if (
    normalizedQuery.includes("slay") ||
    normalizedQuery.includes("spire") ||
    normalizedQuery.includes("杀戮") ||
    normalizedQuery.includes("尖塔")
  ) {
    return findReportById("slay-the-spire");
  }

  if (normalizedQuery.includes("card") || normalizedQuery.includes("deck")) {
    return findReportById("balatro");
  }

  if (normalizedQuery.includes("hades") || normalizedQuery.includes("rogue")) {
    return findReportById("hades-ii");
  }

  if (normalizedQuery.includes("sim") || normalizedQuery.includes("schedule")) {
    return findReportById("schedule-i");
  }

  return MOCK_REPORTS[0];
}

function findReportById(id) {
  return MOCK_REPORTS.find((report) => report.id === id) || MOCK_REPORTS[0];
}

function buildMappingNote(resolvedName) {
  if (state.resolutionMode === "fallback") {
    return `你的输入：${state.currentQuery} · 当前是 mock 映射样例：${resolvedName}`;
  }

  if (state.resolutionMode === "candidate") {
    if (state.translatedQuery) {
      return `你的输入：${state.currentQuery} · 已通过英文名“${state.translatedQuery}”选定分析对象：${resolvedName}`;
    }

    return `你的输入：${state.currentQuery} · 你已选定分析对象：${resolvedName}`;
  }

  if (state.resolutionMode === "quick_case") {
    return `你的输入：${state.currentQuery} · 当前来自快速体验样例：${resolvedName}`;
  }

  if (state.resolutionMode === "translated") {
    return `你的输入：${state.currentQuery} · 首轮无结果，已通过英文名“${state.translatedQuery}”识别为：${resolvedName}`;
  }

  return `你的输入：${state.currentQuery} · 已识别为：${resolvedName}`;
}

function competitorReasonLegacy(report, appId) {
  return (
    report.competitor_candidates?.find((candidate) => candidate.app_id === appId)?.selection_reason ||
    "这是一个和目标产品相近的比较对象。"
  );
}

function competitorReason(report, gameOrAppId) {
  const llmRationale = resolveCompetitorRationale(report, gameOrAppId);
  if (llmRationale?.why_compare) {
    return llmRationale.why_compare;
  }

  const appId = typeof gameOrAppId === "object" ? gameOrAppId?.app_id : gameOrAppId;
  const selectionReason =
    report.competitor_candidates?.find((candidate) => candidate.app_id === appId)?.selection_reason || "";

  if (selectionReason) {
    return `${selectionReason}，所以它适合拿来判断这款产品在同赛道里的位置。`;
  }

  return "这是一个和目标产品相近的比较对象，适合拿来帮助判断赛道位置。";
}

function competitorCoordinateRole(report, game) {
  const llmRationale = resolveCompetitorRationale(report, game);
  if (llmRationale?.coordinate_role) {
    return llmRationale.coordinate_role;
  }

  const reviewSignal = game.review_score_desc?.display_value || "暂无口碑信息";
  const playerSignal = game.current_players?.display_value || "暂无在线信息";
  return `它补足了这个品类在口碑与关注度上的参照点：当前看到的信号是 ${reviewSignal}，当前在线 ${playerSignal}。`;
}

function buildComparisonFrameSummary(report) {
  const llmSummary = report.llm_summary || {};
  if (llmSummary.comparison_frame_summary) {
    return llmSummary.comparison_frame_summary;
  }

  const target = report.target_game || {};
  const tags = (target.tags || []).slice(0, 3);
  const review = target.review_score_desc?.display_value || "暂无口碑";
  const estimate = buildEstimateRange(target);
  const release = target.release_date?.display_value || "暂无发售信息";
  const competitorNames = (report.competitor_games || [])
    .map((game) => game.name)
    .filter(Boolean)
    .join("、");
  const tagPart = tags.length ? `${tags.join(" / ")} 赛道` : "相近玩法赛道";
  const competitorPart = competitorNames ? `，并与 ${competitorNames} 放在同一组横向参照里` : "";

  return `这款产品更适合放在 ${tagPart}、相近体量和相近市场预期的坐标系里看${competitorPart}。当前公开信号显示它的口碑是 ${review}，第三方拥有量估算约为 ${estimate}，发售阶段以 ${release} 为准。`;
}

function buildComparisonAxes(report) {
  const llmAxes = normalizeStringList(report.llm_summary?.comparison_axes);
  if (llmAxes.length) {
    return llmAxes.slice(0, 3);
  }

  const axes = [];
  if ((report.target_game?.tags || []).length) {
    axes.push("玩法赛道与核心标签");
  }
  if (report.target_game?.owner_estimate_low?.value || report.target_game?.current_players?.value) {
    axes.push("体量级别与市场关注");
  }
  if (report.target_game?.review_score_desc?.display_value || report.target_game?.total_reviews?.value) {
    axes.push("口碑表现与评论密度");
  }
  if (report.target_game?.release_date?.display_value) {
    axes.push("发售阶段与预期位置");
  }

  return axes.slice(0, 3);
}

function buildTargetCoordinateRole(report) {
  const target = report.target_game || {};
  const tags = (target.tags || []).slice(0, 2).join(" / ") || "相近玩法";
  const estimate = buildEstimateRange(target);
  return `它是本次需要判断的中心对象，重点要看它在 ${tags} 这条线上，和相近体量产品相比究竟偏强、偏弱还是只是预期更高。当前第三方拥有量估算约为 ${estimate}。`;
}

function resolveCompetitorRationale(report, gameOrAppId) {
  const appId = typeof gameOrAppId === "object" ? gameOrAppId?.app_id : gameOrAppId;
  const gameName = typeof gameOrAppId === "object"
    ? gameOrAppId?.name
    : report.competitor_games?.find((game) => game.app_id === appId)?.name;
  const rationales = Array.isArray(report.llm_summary?.competitor_rationales)
    ? report.llm_summary.competitor_rationales
    : [];

  return (
    rationales.find((item) => Number(item.competitor_app_id) === Number(appId)) ||
    rationales.find((item) => normalizeText(item.competitor_name) === normalizeText(gameName)) ||
    null
  );
}

function normalizeStringList(values) {
  return [...new Set((values || []).map((value) => cleanString(value)).filter(Boolean))];
}

function buildEstimateRange(game) {
  const low = game.owner_estimate_low?.display_value;
  const high = game.owner_estimate_high?.display_value;

  if (!low || !high) {
    return "暂无";
  }

  return `${low} - ${high}`;
}

function renderTableCell(product, key) {
  if (key === "estimate_range") {
    return `
      <div>${escapeHtml(buildEstimateRange(product))}</div>
      <div class="metric-meta">第三方拥有量估算</div>
    `;
  }

  const metric = product[key];
  if (!metric) {
    return '<div class="metric-meta">—</div>';
  }

  return `
    <div>${escapeHtml(metric.display_value)}</div>
    <div class="metric-meta">${escapeHtml(metric.source)} · ${escapeHtml(metric.confidence_tier)} 级</div>
  `;
}

function compareMetric(label, value) {
  return `
    <div class="compare-metric">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value || "—")}</strong>
    </div>
  `;
}

function clearTimers() {
  for (const timer of state.timers) {
    window.clearTimeout(timer);
  }
  state.timers = [];
}

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function showErrorScreen(message) {
  errorMessageEl.textContent = message;
  setScreen("error");
}

function wait(ms) {
  return new Promise((resolve) => {
    const timer = window.setTimeout(resolve, ms);
    state.timers.push(timer);
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildSystemHint(report) {
  const fallbackReason = report?.runtime_meta?.fallback_reason || "";

  if (!fallbackReason.includes("EACCES")) {
    return "";
  }

  return "\u5f53\u524d\u56de\u9000\u66f4\u50cf\u662f\u672c\u5730\u5e38\u9a7b\u540e\u7aef\u7684\u5916\u7f51\u8bbf\u95ee\u53d7\u9650\uff0c\u4e0d\u662f LLM key \u6216\u7f51\u5173\u672c\u8eab\u4e0d\u53ef\u7528\u3002\u53ef\u4ee5\u4f7f\u7528 prototype/start-live-prototype.cmd \u5728\u672c\u5730\u666e\u901a\u73af\u5883\u91cc\u542f\u52a8 live \u7248\u540e\u7aef\u3002";
}
