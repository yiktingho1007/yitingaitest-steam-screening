const REQUEST_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
  "Accept": "application/json, text/html;q=0.9,*/*;q=0.8"
};

const GENERIC_TAGS = new Set([
  "Singleplayer",
  "Multiplayer",
  "Indie",
  "Casual",
  "Action",
  "Adventure",
  "Strategy",
  "RPG",
  "Simulation",
  "2D",
  "3D"
]);

const REVIEW_DESC_MAP = {
  "Overwhelmingly Positive": "好评如潮",
  "Very Positive": "特别好评",
  "Mostly Positive": "多半好评",
  "Positive": "好评",
  "Mixed": "褒贬不一",
  "Mostly Negative": "多半差评",
  "Very Negative": "特别差评",
  "Overwhelmingly Negative": "差评如潮"
};

const FALLBACK_ALIAS_LOOKUP = new Map([
  ["balatro", { appid: 2379780, name: "Balatro" }],
  ["小丑牌", { appid: 2379780, name: "Balatro" }],
  ["hades", { appid: 1145360, name: "Hades" }],
  ["哈迪斯", { appid: 1145360, name: "Hades" }],
  ["黑帝斯", { appid: 1145360, name: "Hades" }],
  ["hadesii", { appid: 1145350, name: "Hades II" }],
  ["hades2", { appid: 1145350, name: "Hades II" }],
  ["哈迪斯2", { appid: 1145350, name: "Hades II" }],
  ["slaythespire", { appid: 646570, name: "Slay the Spire" }],
  ["sts", { appid: 646570, name: "Slay the Spire" }],
  ["杀戮尖塔", { appid: 646570, name: "Slay the Spire" }],
  ["schedulei", { appid: 3164500, name: "Schedule I" }],
  ["schedule1", { appid: 3164500, name: "Schedule I" }],
  ["毒枭模拟", { appid: 3164500, name: "Schedule I" }]
]);

export async function resolveSteamCandidates(query, options = {}) {
  const normalizedQuery = normalizeText(query);
  const suggestions = await fetchSearchSuggestions(query);
  const fallbackSuggestions = suggestions.length ? [] : getFallbackAliasSuggestions(query);
  const sourceSuggestions = suggestions.length ? suggestions : fallbackSuggestions;
  const limit = options.limit || 5;

  const enriched = [];
  for (const suggestion of sourceSuggestions.slice(0, limit)) {
    const report = await buildResolvedCandidateStub(query, suggestion);
    enriched.push({
      score: scoreResolvedCandidate(report, normalizedQuery),
      report
    });
  }

  return enriched
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
}

export async function buildLiveSteamReport({ query, appid, resolvedName }) {
  const startedAt = Date.now();
  const fetchedAt = new Date().toISOString();
  const targetBundle = await fetchGameBundle(appid);
  const resolvedAppId = Number(appid);
  const targetGame = buildGameFromBundle(targetBundle, fetchedAt);
  const competitorSelection = await selectCompetitors({
    targetAppId: resolvedAppId,
    targetBundle
  });
  const warnings = ["当前页面已切到真实公开数据拉取，结构化字段不再来自 mock。"];

  if (Array.isArray(competitorSelection.warnings) && competitorSelection.warnings.length) {
    warnings.push(...competitorSelection.warnings);
  }

  return {
    id: `live-${resolvedAppId}`,
    aliases: buildAliases(resolvedName || targetGame.name, resolvedAppId),
    request_context: {
      request_id: `live_${resolvedAppId}_${Date.now()}`,
      raw_query: query,
      query_type: "name",
      resolved_app_id: resolvedAppId,
      resolved_name: resolvedName || targetGame.name,
      locale: "zh-CN",
      currency: "CNY",
      generated_at: fetchedAt
    },
    source_summary: {
      official_source_count: 3,
      supplemental_source_count: 1,
      third_party_source_count: 1,
      has_partial_failure: false,
      failed_sources: []
    },
    target_game: targetGame,
    competitor_candidates: competitorSelection.candidates,
    competitor_games: competitorSelection.games,
    llm_summary: buildPlaceholderSummary(targetGame),
    debug_meta: {
      cache_hit: false,
      data_latency_ms: Date.now() - startedAt,
      llm_latency_ms: 0,
      total_latency_ms: Date.now() - startedAt,
      partial_failure: false,
      warnings: normalizeStringArray(warnings)
    }
  };
}

async function buildResolvedCandidateStub(query, suggestion) {
  const fetchedAt = new Date().toISOString();
  const appid = Number(suggestion.appid);
  const bundle = await fetchGameBundle(appid, { lightweight: true });
  const targetGame = buildGameFromBundle(bundle, fetchedAt);

  return {
    id: `live-candidate-${appid}`,
    aliases: buildAliases(suggestion.name, appid),
    request_context: {
      request_id: `resolve_${appid}`,
      raw_query: query,
      query_type: "name",
      resolved_app_id: appid,
      resolved_name: suggestion.name,
      locale: "zh-CN",
      currency: "CNY",
      generated_at: fetchedAt
    },
    source_summary: {
      official_source_count: 2,
      supplemental_source_count: 1,
      third_party_source_count: 1,
      has_partial_failure: false,
      failed_sources: []
    },
    target_game: targetGame,
    competitor_candidates: [],
    competitor_games: [],
    llm_summary: buildPlaceholderSummary(targetGame),
    debug_meta: {
      cache_hit: false,
      data_latency_ms: 0,
      llm_latency_ms: 0,
      total_latency_ms: 0,
      partial_failure: false,
      warnings: []
    }
  };
}

async function selectCompetitors({ targetAppId, targetBundle }) {
  const seed = await resolveCompetitorSeed({ targetAppId, targetBundle });
  const targetTags = seed.tags;

  if (!targetTags.length) {
    return {
      candidates: [],
      games: [],
      warnings: seed.warnings || ["当前产品缺少可用标签，暂时无法自动挑选竞品。"]
    };
  }

  const preferredAppIds = new Set(seed.preferredAppIds || []);
  const tagResults = await Promise.all(
    targetTags.slice(0, 2).map((tag) => fetchSteamSpyTag(tag))
  );

  const candidateMap = new Map();

  tagResults.forEach((payload, index) => {
    const tag = targetTags[index];
    const games = Object.values(payload || {})
      .filter(Boolean)
      .filter((item) => Number(item.appid) !== targetAppId)
      .sort((a, b) => (b.positive + b.negative) - (a.positive + a.negative))
      .slice(0, 80);

    for (const item of games) {
      const appid = Number(item.appid);
      const existing = candidateMap.get(appid) || {
        appid,
        name: item.name,
        tagHits: [],
        tagScore: 0,
        positive: Number(item.positive || 0),
        negative: Number(item.negative || 0),
        owners: item.owners || "",
        ccu: Number(item.ccu || 0)
      };

      existing.tagHits.push(tag);
      existing.tagScore += 100 - existing.tagHits.length * 10;
      candidateMap.set(appid, existing);
    }
  });

  const preliminary = [...candidateMap.values()]
    .filter((item) => item.tagHits.length > 0)
    .sort((a, b) => b.tagScore - a.tagScore)
    .slice(0, 10);

  const targetOwners = parseOwnerRange(targetBundle.spy?.owners);
  const targetPrice = normalizeSteamSpyPrice(targetBundle.spy?.price);
  const targetReviewCount = Number(targetBundle.spy?.positive || 0) + Number(targetBundle.spy?.negative || 0);
  const targetCcu = Number(targetBundle.spy?.ccu || 0);
  const targetMeta = buildBundleMeta(targetBundle);

  const detailed = await Promise.all(
    preliminary.map(async (candidate) => {
      const spy = await fetchSteamSpyAppDetails(candidate.appid);
      const evidence = buildCompetitorEvidence({
        targetTags,
        targetMeta,
        targetOwners,
        targetPrice,
        targetReviewCount,
        targetCcu,
        candidate,
        spy
      });
      const score = scoreCompetitorV2({
        candidate,
        evidence
      }) + (preferredAppIds.has(candidate.appid) ? 120 : 0);

      return {
        ...candidate,
        spy,
        evidence,
        score,
        selection_reason: buildSelectionReasonV2(evidence, preferredAppIds.has(candidate.appid), seed.referenceName)
      };
    })
  );

  const selected = detailed
    .filter((item) => item.evidence.is_comparable || preferredAppIds.has(item.appid))
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);

  const games = await Promise.all(
    selected.map(async (item) => {
      const bundle = await fetchGameBundle(item.appid, { steamSpyOverride: item.spy });
      return buildGameFromBundle(bundle, new Date().toISOString());
    })
  );

  const candidates = detailed
    .filter((item) => item.evidence.is_comparable || preferredAppIds.has(item.appid))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((item, index) => ({
      app_id: item.appid,
      name: item.name,
      total_score: Number(item.score.toFixed(1)),
      selection_reason: item.selection_reason,
      comparison_basis: item.evidence.comparison_basis,
      coordinate_role_hint: item.evidence.coordinate_role_hint,
      evidence_strength: item.evidence.evidence_strength,
      is_selected: index < 2
    }));

  return {
    candidates,
    games,
    warnings: [
      ...(seed.warnings || []),
      ...(selected.length < 2 ? ["当前自动竞品坐标证据不足，系统已过滤掉仅靠标签命中的弱候选。"] : [])
    ]
  };
}

function buildSelectionReason(targetTags, spy, targetPrice, candidatePrice, isPreferredReference = false, referenceName = "") {
  const overlap = getTopSpecificTags(spy?.tags || {})
    .filter((tag) => targetTags.includes(tag))
    .slice(0, 2);

  const parts = [];
  if (isPreferredReference) {
    parts.push(referenceName ? `同系列参考作：${referenceName}` : "同系列参考作");
  }
  if (overlap.length) {
    parts.push(`共享标签：${overlap.join(" / ")}`);
  }

  if (!parts.length) {
    parts.push("同赛道产品，适合做横向比较。");
  }

  return parts.join("；");
}

async function resolveCompetitorSeed({ targetAppId, targetBundle }) {
  const directTags = getTopSpecificTags(targetBundle.spy?.tags || {});

  if (directTags.length) {
    return {
      tags: directTags,
      preferredAppIds: [],
      referenceName: "",
      warnings: []
    };
  }

  const reference = await findReferenceBundleForCompetitors(targetAppId, targetBundle);
  const referenceTags = reference ? getTopSpecificTags(reference.bundle.spy?.tags || {}) : [];

  if (referenceTags.length) {
    return {
      tags: referenceTags,
      preferredAppIds: [reference.appid],
      referenceName: reference.name,
      warnings: [`当前产品自身缺少 SteamSpy 标签，竞品改用系列参考作《${reference.name}》的标签进行筛选。`]
    };
  }

  const fallbackGenres = getFallbackGenreTags(targetBundle);

  if (fallbackGenres.length) {
    const warnings = reference
      ? [`当前产品自身缺少 SteamSpy 标签，竞品改用《${reference.name}》与商店类型信息兜底筛选。`]
      : ["当前产品自身缺少 SteamSpy 标签，竞品改用商店类型信息兜底筛选。"];

    return {
      tags: fallbackGenres,
      preferredAppIds: reference ? [reference.appid] : [],
      referenceName: reference?.name || "",
      warnings
    };
  }

  return {
    tags: [],
    preferredAppIds: [],
    referenceName: "",
    warnings: ["当前产品缺少可用标签或类型信息，暂时无法自动挑选竞品。"]
  };
}

function scoreCompetitor({ targetTags, targetOwners, targetPrice, candidate, spy }) {
  const candidateTags = getTopSpecificTags(spy?.tags || {});
  const sharedTags = candidateTags.filter((tag) => targetTags.includes(tag)).length;
  const candidateOwners = parseOwnerRange(candidate.owners || spy?.owners);
  const candidatePrice = normalizeSteamSpyPrice(spy?.price);

  let score = candidate.tagScore;
  score += sharedTags * 35;
  score += similarityScore(targetOwners.midpoint, candidateOwners.midpoint, 25);
  score += similarityScore(targetPrice, candidatePrice, 18);
  score += Math.min(20, Math.log10((Number(spy?.positive || 0) + Number(spy?.negative || 0) + 1)) * 6);

  return score;
}

function similarityScore(baseValue, candidateValue, maxScore) {
  if (!baseValue || !candidateValue) {
    return 0;
  }

  const ratio = Math.min(baseValue, candidateValue) / Math.max(baseValue, candidateValue);
  return ratio * maxScore;
}

function similarityRatio(baseValue, candidateValue) {
  if (!baseValue || !candidateValue) {
    return 0;
  }

  return Math.min(baseValue, candidateValue) / Math.max(baseValue, candidateValue);
}

function buildCompetitorEvidence({
  targetTags,
  targetMeta,
  targetOwners,
  targetPrice,
  targetReviewCount,
  targetCcu,
  candidate,
  spy
}) {
  const candidateTags = getTopSpecificTags(spy?.tags || {});
  const sharedTags = candidateTags.filter((tag) => targetTags.includes(tag)).slice(0, 3);
  const candidateOwners = parseOwnerRange(candidate.owners || spy?.owners);
  const candidatePrice = normalizeSteamSpyPrice(spy?.price);
  const candidateReviewCount = Number(spy?.positive || 0) + Number(spy?.negative || 0);
  const candidateCcu = Number(spy?.ccu || 0);
  const candidateMeta = buildSpyMeta(spy);
  const sameSeries = hasCommonSeriesStem(candidate.name, targetMeta.name);
  const sameDeveloper = candidateMeta.developers.some((value) => targetMeta.developers.includes(value));
  const samePublisher = candidateMeta.publishers.some((value) => targetMeta.publishers.includes(value));
  const priceSimilarityRatio = similarityRatio(targetPrice, candidatePrice);
  const ownerSimilarityRatio = similarityRatio(targetOwners.midpoint, candidateOwners.midpoint);
  const reviewSimilarityRatio = similarityRatio(targetReviewCount, candidateReviewCount);
  const ccuSimilarityRatio = similarityRatio(targetCcu, candidateCcu);
  const scaleSimilarityRatio = Math.max(ownerSimilarityRatio, reviewSimilarityRatio, ccuSimilarityRatio);
  const hasRelationalEvidence = sameSeries || sameDeveloper || samePublisher;
  const hasStrongExternalEvidence =
    sharedTags.length >= 2 &&
    (priceSimilarityRatio >= 0.45 || scaleSimilarityRatio >= 0.4);
  const hasWeakOnlyTagEvidence = sharedTags.length > 0 && !hasRelationalEvidence && !hasStrongExternalEvidence;
  const isComparable = hasRelationalEvidence || hasStrongExternalEvidence;

  return {
    same_series: sameSeries,
    same_developer: sameDeveloper,
    same_publisher: samePublisher,
    shared_tags: sharedTags,
    price_similarity_ratio: Number(priceSimilarityRatio.toFixed(2)),
    owner_similarity_ratio: Number(ownerSimilarityRatio.toFixed(2)),
    review_similarity_ratio: Number(reviewSimilarityRatio.toFixed(2)),
    ccu_similarity_ratio: Number(ccuSimilarityRatio.toFixed(2)),
    scale_similarity_ratio: Number(scaleSimilarityRatio.toFixed(2)),
    is_comparable: isComparable,
    evidence_strength: isComparable ? (hasRelationalEvidence ? "strong" : "medium") : "weak",
    coordinate_role_hint: hasRelationalEvidence
      ? (sameSeries ? "系列前作/同系列基准" : "团队谱系参照")
      : (hasStrongExternalEvidence ? "同赛道外部样本" : "弱候选，不建议直接比较"),
    comparison_basis: buildComparisonBasis({
      sameSeries,
      sameDeveloper,
      samePublisher,
      sharedTags,
      priceSimilarityRatio,
      scaleSimilarityRatio,
      hasWeakOnlyTagEvidence
    })
  };
}

function buildComparisonBasis({
  sameSeries,
  sameDeveloper,
  samePublisher,
  sharedTags,
  priceSimilarityRatio,
  scaleSimilarityRatio,
  hasWeakOnlyTagEvidence
}) {
  const basis = [];

  if (sameSeries) {
    basis.push("same_series");
  }
  if (sameDeveloper) {
    basis.push("same_developer");
  }
  if (samePublisher) {
    basis.push("same_publisher");
  }
  if (sharedTags.length >= 2) {
    basis.push("multi_tag_overlap");
  }
  if (priceSimilarityRatio >= 0.45) {
    basis.push("price_band_similarity");
  }
  if (scaleSimilarityRatio >= 0.4) {
    basis.push("scale_similarity");
  }
  if (hasWeakOnlyTagEvidence) {
    basis.push("tag_only_weak_signal");
  }

  return basis;
}

function buildBundleMeta(bundle) {
  const store = bundle.store || {};
  const spy = bundle.spy || {};
  return {
    name: store.name || spy.name || "",
    developers: normalizeStringArray(store.developers?.length ? store.developers : splitCommaList(spy.developer)),
    publishers: normalizeStringArray(store.publishers?.length ? store.publishers : splitCommaList(spy.publisher))
  };
}

function buildSpyMeta(spy) {
  return {
    developers: normalizeStringArray(splitCommaList(spy?.developer)),
    publishers: normalizeStringArray(splitCommaList(spy?.publisher))
  };
}

function buildSelectionReasonV2(evidence, isPreferredReference = false, referenceName = "") {
  const parts = [];

  if (isPreferredReference) {
    parts.push(referenceName ? `同系列参考作：${referenceName}` : "同系列参考作");
  }
  if (evidence.shared_tags.length) {
    parts.push(`共享具体标签：${evidence.shared_tags.slice(0, 2).join(" / ")}`);
  }
  if (evidence.same_series) {
    parts.push("同系列或同命名干线");
  }
  if (evidence.same_developer) {
    parts.push("同开发团队");
  }
  if (evidence.same_publisher) {
    parts.push("同发行团队");
  }
  if (evidence.price_similarity_ratio >= 0.6) {
    parts.push("价格带接近");
  }
  if (evidence.scale_similarity_ratio >= 0.45) {
    parts.push("体量级别接近");
  }

  if (!parts.length) {
    parts.push("证据有限，不建议仅凭标签直接对比");
  }

  return parts.join("；");
}

function scoreCompetitorV2({ candidate, evidence }) {
  let score = candidate.tagScore * 0.3;
  score += evidence.shared_tags.length * 18;
  score += evidence.same_series ? 120 : 0;
  score += evidence.same_developer ? 75 : 0;
  score += evidence.same_publisher ? 45 : 0;
  score += evidence.price_similarity_ratio * 20;
  score += evidence.scale_similarity_ratio * 28;
  score += evidence.review_similarity_ratio * 16;
  score += evidence.ccu_similarity_ratio * 12;
  score += evidence.is_comparable ? 25 : -140;
  return score;
}

function buildGameFromBundle(bundle, fetchedAt) {
  const store = bundle.store || {};
  const reviews = bundle.reviews || {};
  const players = bundle.players || {};
  const spy = bundle.spy || {};
  const owners = parseOwnerRange(spy.owners);
  const topTags = getTopSpecificTags(spy.tags || {}).slice(0, 5);
  const priceFinal = buildPriceMetric(store, spy, fetchedAt);
  const reviewSummary = reviews.query_summary || {};
  const reviewDesc = translateReviewDesc(reviewSummary.review_score_desc);
  const developerList = normalizeStringArray(store.developers?.length ? store.developers : splitCommaList(spy.developer));
  const publisherList = normalizeStringArray(store.publishers?.length ? store.publishers : splitCommaList(spy.publisher));
  const supportedLanguages = normalizeStringArray(
    extractSupportedLanguages(store.supported_languages) || splitCommaList(spy.languages)
  );

  return {
    app_id: Number(store.steam_appid || spy.appid || 0),
    name: store.name || spy.name || "未知游戏",
    steam_url: store.steam_appid ? `https://store.steampowered.com/app/${store.steam_appid}/` : null,
    subtitle: stripHtml(store.short_description || store.detailed_description || "") || buildSubtitle(topTags, store.genres),
    price_final: priceFinal,
    review_score_desc: metric(
      reviewDesc || "暂无",
      reviewSummary.review_score_desc || "",
      "steam_reviews_api/query_summary",
      "A",
      fetchedAt
    ),
    total_reviews: metric(
      formatNumberDisplay(reviewSummary.total_reviews),
      Number(reviewSummary.total_reviews || 0),
      "steam_reviews_api/query_summary",
      "A",
      fetchedAt
    ),
    current_players: metric(
      formatNumberDisplay(players.response?.player_count),
      Number(players.response?.player_count || 0),
      "steam_web_api/ISteamUserStats/GetNumberOfCurrentPlayers",
      "A",
      fetchedAt
    ),
    release_date: metric(
      store.release_date?.date || "暂无",
      store.release_date?.date || "",
      "steam_store_appdetails",
      "B",
      fetchedAt
    ),
    owner_estimate_low: metric(
      formatOwnerDisplay(owners.low),
      owners.low,
      "SteamSpy",
      "C",
      fetchedAt
    ),
    owner_estimate_high: metric(
      formatOwnerDisplay(owners.high),
      owners.high,
      "SteamSpy",
      "C",
      fetchedAt
    ),
    owner_estimate_note: "基于 SteamSpy 拥有量区间估算，仅用于判断体量级别。",
    tags: topTags,
    developers: developerList,
    publishers: publisherList,
    supported_languages: supportedLanguages,
    primary_confidence_tier: "A",
    available_fields: [
      "price_final",
      "review_score_desc",
      "total_reviews",
      "current_players",
      "owner_estimate_low",
      "owner_estimate_high",
      "release_date"
    ],
    missing_fields: []
  };
}

function buildSubtitle(tags, genres) {
  const pieces = [];
  if (tags?.length) {
    pieces.push(tags.slice(0, 3).join(" / "));
  }
  if (Array.isArray(genres) && genres.length) {
    pieces.push(genres.map((item) => item.description).join(" / "));
  }
  return pieces.join(" · ") || "暂无产品副标题";
}

function buildPriceMetric(store, spy, fetchedAt) {
  const priceOverview = store.price_overview;

  if (store.is_free) {
    return metric("免费", 0, "steam_store_appdetails", "B", fetchedAt);
  }

  if (priceOverview?.final_formatted) {
    return metric(priceOverview.final_formatted, Number(priceOverview.final || 0) / 100, "steam_store_appdetails", "B", fetchedAt);
  }

  const spyPrice = normalizeSteamSpyPrice(spy.price);
  return metric(`¥${formatCurrencyInt(spyPrice)}`, spyPrice, "SteamSpy", "C", fetchedAt);
}

function buildPlaceholderSummary(targetGame) {
  return {
    status: "placeholder",
    positioning_summary: `${targetGame.name || "该游戏"} 的真实结构化数据已拉取，等待 LLM 生成正式结论。`,
    difference_points: [
      "真实数据拉取已完成。",
      "结论将由 LLM 基于当前结构化字段生成。",
      "如果模型请求失败，页面才会退回占位结论。"
    ],
    screening_recommendation: "等待 LLM 正式结论。",
    data_caution: "本占位摘要不会作为最终结论展示，正常情况下会被实时 LLM 输出覆盖。",
    used_fields: [],
    used_estimate_sources: [],
    model_name: "placeholder",
    generated_at: new Date().toISOString()
  };
}

async function fetchGameBundle(appid, options = {}) {
  const [store, reviews, players, spy] = await Promise.all([
    fetchStoreAppDetails(appid),
    fetchReviewSummary(appid),
    fetchCurrentPlayers(appid),
    options.steamSpyOverride ? Promise.resolve(options.steamSpyOverride) : fetchSteamSpyAppDetails(appid)
  ]);

  return {
    store,
    reviews,
    players,
    spy
  };
}

async function fetchSearchSuggestions(query) {
  const url = new URL("https://store.steampowered.com/search/suggest");
  url.searchParams.set("term", query);
  url.searchParams.set("f", "games");
  url.searchParams.set("cc", "CN");
  url.searchParams.set("l", "schinese");

  const html = await fetchText(url.toString());
  const matches = [...html.matchAll(/data-ds-appid="(\d+)".*?<div class="match_name">([\s\S]*?)<\/div>/g)];
  const seen = new Set();

  return matches
    .map((match) => ({
      appid: Number(match[1]),
      name: stripHtml(match[2])
    }))
    .filter((item) => item.appid && item.name)
    .filter((item) => {
      if (seen.has(item.appid)) {
        return false;
      }

      seen.add(item.appid);
      return true;
    });
}

async function fetchStoreAppDetails(appid) {
  const url = new URL("https://store.steampowered.com/api/appdetails");
  url.searchParams.set("appids", String(appid));
  url.searchParams.set("cc", "cn");
  url.searchParams.set("l", "schinese");

  const payload = await fetchJson(url.toString());
  return payload?.[appid]?.data || payload?.[String(appid)]?.data || {};
}

async function fetchReviewSummary(appid) {
  const url = new URL(`https://store.steampowered.com/appreviews/${appid}`);
  url.searchParams.set("json", "1");
  url.searchParams.set("language", "all");
  url.searchParams.set("purchase_type", "all");
  url.searchParams.set("num_per_page", "0");

  return fetchJson(url.toString());
}

async function fetchCurrentPlayers(appid) {
  const url = new URL("https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/");
  url.searchParams.set("appid", String(appid));
  return fetchJson(url.toString());
}

async function fetchSteamSpyAppDetails(appid) {
  const url = new URL("https://steamspy.com/api.php");
  url.searchParams.set("request", "appdetails");
  url.searchParams.set("appid", String(appid));
  return fetchJson(url.toString());
}

async function fetchSteamSpyTag(tag) {
  const url = new URL("https://steamspy.com/api.php");
  url.searchParams.set("request", "tag");
  url.searchParams.set("tag", tag);
  return fetchJson(url.toString());
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: REQUEST_HEADERS
  });

  if (!response.ok) {
    throw new Error(`Fetch failed: ${response.status} ${url}`);
  }

  return response.json();
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: REQUEST_HEADERS
  });

  if (!response.ok) {
    throw new Error(`Fetch failed: ${response.status} ${url}`);
  }

  return response.text();
}

async function findReferenceBundleForCompetitors(targetAppId, targetBundle) {
  const targetName = targetBundle.store?.name || targetBundle.spy?.name || "";
  const searchTerms = buildReferenceSearchTerms(targetName);

  for (const term of searchTerms) {
    const suggestions = await fetchSearchSuggestions(term);
    const exactNameMatch = suggestions.find((item) =>
      Number(item.appid) !== Number(targetAppId) &&
      normalizeText(item.name) === normalizeText(term)
    );

    if (exactNameMatch) {
      const bundle = await fetchGameBundle(exactNameMatch.appid);
      if (isValidReferenceBundle(bundle, targetBundle)) {
        return {
          appid: Number(exactNameMatch.appid),
          name: bundle.store?.name || bundle.spy?.name || exactNameMatch.name,
          bundle
        };
      }
    }

    for (const suggestion of suggestions.slice(0, 4)) {
      if (Number(suggestion.appid) === Number(targetAppId)) {
        continue;
      }

      const bundle = await fetchGameBundle(suggestion.appid);
      if (!isValidReferenceBundle(bundle, targetBundle)) {
        continue;
      }

      return {
        appid: Number(suggestion.appid),
        name: bundle.store?.name || bundle.spy?.name || suggestion.name,
        bundle
      };
    }
  }

  return null;
}

function buildAliases(name, appid) {
  return normalizeStringArray([name, String(appid)]);
}

function buildReferenceSearchTerms(name) {
  const raw = String(name || "").trim();
  if (!raw) {
    return [];
  }

  const terms = [raw];
  const colonPrefix = raw.split(":")[0]?.trim();
  const dashPrefix = raw.split(" - ")[0]?.trim();

  if (colonPrefix && normalizeText(colonPrefix) !== normalizeText(raw)) {
    terms.push(colonPrefix);
  }

  if (dashPrefix && normalizeText(dashPrefix) !== normalizeText(raw)) {
    terms.push(dashPrefix);
  }

  return normalizeStringArray(terms);
}

function isValidReferenceBundle(candidateBundle, targetBundle) {
  const candidateStore = candidateBundle.store || {};
  const targetStore = targetBundle.store || {};
  const candidateName = candidateStore.name || candidateBundle.spy?.name || "";
  const targetName = targetStore.name || targetBundle.spy?.name || "";

  if (String(candidateStore.type || "").toLowerCase() !== "game") {
    return false;
  }

  if (looksLikeDerivativeContent(candidateName)) {
    return false;
  }

  const candidateDevelopers = normalizeStringArray(
    candidateStore.developers?.length ? candidateStore.developers : splitCommaList(candidateBundle.spy?.developer)
  );
  const targetDevelopers = normalizeStringArray(
    targetStore.developers?.length ? targetStore.developers : splitCommaList(targetBundle.spy?.developer)
  );
  const candidatePublishers = normalizeStringArray(
    candidateStore.publishers?.length ? candidateStore.publishers : splitCommaList(candidateBundle.spy?.publisher)
  );
  const targetPublishers = normalizeStringArray(
    targetStore.publishers?.length ? targetStore.publishers : splitCommaList(targetBundle.spy?.publisher)
  );

  const sameDeveloper = candidateDevelopers.some((value) => targetDevelopers.includes(value));
  const samePublisher = candidatePublishers.some((value) => targetPublishers.includes(value));
  const sameSeriesStem = hasCommonSeriesStem(candidateName, targetName);

  return sameDeveloper || samePublisher || sameSeriesStem;
}

function looksLikeDerivativeContent(name) {
  const normalized = normalizeText(name);
  return [
    "soundtrack",
    "ost",
    "demo",
    "dlc",
    "artbook",
    "supporterpack",
    "officialsoundtrack"
  ].some((keyword) => normalized.includes(keyword));
}

function hasCommonSeriesStem(a, b) {
  const stemA = extractSeriesStem(a);
  const stemB = extractSeriesStem(b);

  if (!stemA || !stemB) {
    return false;
  }

  return normalizeText(stemA) === normalizeText(stemB);
}

function extractSeriesStem(name) {
  return String(name || "")
    .split(":")[0]
    .split(" - ")[0]
    .trim();
}

function getFallbackAliasSuggestions(query) {
  const normalizedQuery = normalizeText(query);
  const exact = FALLBACK_ALIAS_LOOKUP.get(normalizedQuery);

  if (exact) {
    return [exact];
  }

  const results = [];
  for (const [alias, target] of FALLBACK_ALIAS_LOOKUP.entries()) {
    if (alias.includes(normalizedQuery) || normalizedQuery.includes(alias)) {
      results.push(target);
    }
  }

  return dedupeSuggestions(results);
}

function dedupeSuggestions(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (seen.has(item.appid)) {
      return false;
    }

    seen.add(item.appid);
    return true;
  });
}

function getFallbackGenreTags(targetBundle) {
  const spyGenres = splitCommaList(targetBundle.spy?.genre);
  const storeGenres = Array.isArray(targetBundle.store?.genres)
    ? targetBundle.store.genres.map((item) => item?.description).filter(Boolean)
    : [];

  return normalizeStringArray([...spyGenres, ...storeGenres]).slice(0, 2);
}

function scoreResolvedCandidate(report, normalizedQuery) {
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
      score = Math.max(score, 84);
      continue;
    }

    if (normalizedQuery.includes(candidate)) {
      score = Math.max(score, 72);
      continue;
    }
  }

  return score;
}

function metric(displayValue, value, source, confidenceTier, fetchedAt) {
  return {
    value,
    display_value: displayValue || "暂无",
    is_missing: false,
    source,
    confidence_tier: confidenceTier,
    fetched_at: fetchedAt
  };
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<br\s*\/?>/gi, " / ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeStringArray(values) {
  return [...new Set((values || []).map((value) => String(value || "").trim()).filter(Boolean))];
}

function splitCommaList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function extractSupportedLanguages(value) {
  return stripHtml(value)
    .split(/[，,/]/)
    .map((item) => item.replace(/\*/g, "").trim())
    .filter(Boolean);
}

function translateReviewDesc(value) {
  return REVIEW_DESC_MAP[value] || value || "";
}

function formatNumberDisplay(value) {
  const number = Number(value || 0);
  if (!number) {
    return "暂无";
  }
  return number.toLocaleString("en-US");
}

function parseOwnerRange(value) {
  const matches = String(value || "").match(/([\d,]+)\s*\.\.\s*([\d,]+)/);
  if (!matches) {
    return { low: 0, high: 0, midpoint: 0 };
  }

  const low = Number(matches[1].replaceAll(",", ""));
  const high = Number(matches[2].replaceAll(",", ""));

  return {
    low,
    high,
    midpoint: Math.round((low + high) / 2)
  };
}

function normalizeSteamSpyPrice(value) {
  const price = Number(value || 0);
  if (!price) {
    return 0;
  }

  return Math.round(price) / 100;
}

function formatOwnerDisplay(value) {
  if (!value) {
    return "暂无";
  }

  if (value >= 10000) {
    return `${Math.round(value / 10000)} 万`;
  }

  return value.toLocaleString("en-US");
}

function formatCurrencyInt(value) {
  return Number(value || 0).toFixed(0);
}

function getTopSpecificTags(tags) {
  return Object.entries(tags || {})
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag)
    .filter((tag) => !GENERIC_TAGS.has(tag))
    .slice(0, 6);
}
