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
  const gameplayProfile = buildGameplayProfile(targetBundle);
  const competitorSelection = await selectCompetitors({
    targetAppId: resolvedAppId,
    targetBundle,
    gameplayProfile
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
    gameplay_profile: gameplayProfile,
    comparison_frame: competitorSelection.comparisonFrame,
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
  const gameplayProfile = buildGameplayProfile(bundle);

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
    gameplay_profile: gameplayProfile,
    comparison_frame: null,
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

async function selectCompetitors({ targetAppId, targetBundle, gameplayProfile }) {
  const seed = await resolveCompetitorSeed({ targetAppId, targetBundle });
  const targetTags = seed.tags;

  return selectCompetitorsByFrame({
    targetAppId,
    targetBundle,
    gameplayProfile,
    seed,
    targetTags
  });

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

export async function hydrateSuggestedCompetitors({ targetAppId, suggestions = [] }) {
  const normalizedSuggestions = (Array.isArray(suggestions) ? suggestions : [])
    .map((item) => {
      if (typeof item === "string") {
        return {
          name: cleanString(item),
          why: "",
          role: ""
        };
      }

      return {
        name: cleanString(item?.name),
        why: cleanString(item?.why),
        role: cleanString(item?.role)
      };
    })
    .filter((item) => item.name)
    .slice(0, 2);
  const selected = [];
  const seen = new Set([Number(targetAppId)]);

  for (const suggestion of normalizedSuggestions) {
    const candidates = await fetchSearchSuggestions(suggestion.name);
    const exactMatch = candidates.find((item) => normalizeText(item.name) === normalizeText(suggestion.name));
    const selectedCandidate = exactMatch || candidates.find((item) => !seen.has(Number(item.appid)));

    if (!selectedCandidate) {
      continue;
    }

    const numericAppId = Number(selectedCandidate.appid);
    if (!numericAppId || seen.has(numericAppId)) {
      continue;
    }

    seen.add(numericAppId);
    selected.push({
      appid: numericAppId,
      name: selectedCandidate.name,
      why: suggestion.why,
      role: suggestion.role
    });

    if (selected.length >= 2) {
      break;
    }
  }

  const games = await Promise.all(
    selected.map(async (item) => {
      const bundle = await fetchGameBundle(item.appid);
      return buildGameFromBundle(bundle, new Date().toISOString());
    })
  );

  return {
    candidates: selected.map((item, index) => ({
      app_id: item.appid,
      name: item.name,
      total_score: 75 - index * 5,
      selection_reason: item.why || "它和目标产品共享同一类核心玩法循环，适合拿来做同赛道比较。",
      comparison_basis: ["llm_gameplay_discovery"],
      coordinate_role_hint: item.role || "同赛道外部样本",
      evidence_strength: "medium",
      role_matches: [item.role || "同赛道外部样本"],
      is_selected: true
    })),
    games
  };
}

async function selectCompetitorsByFrame({ targetAppId, targetBundle, gameplayProfile, seed, targetTags }) {
  const targetOwners = parseOwnerRange(targetBundle.spy?.owners);
  const targetPrice = normalizeSteamSpyPrice(targetBundle.spy?.price);
  const targetReviewCount = Number(targetBundle.spy?.positive || 0) + Number(targetBundle.spy?.negative || 0);
  const targetCcu = Number(targetBundle.spy?.ccu || 0);
  const targetMeta = buildBundleMeta(targetBundle);
  const targetSignals = getAllBundleSignals(targetBundle);
  const effectiveGameplayProfile = gameplayProfile || buildGameplayProfile(targetBundle);
  const trackReferenceBundles = await findTrackReferenceBundlesForCompetitors(targetAppId, targetBundle);
  const gameplayReferenceBundles = await findGameplayReferenceBundlesForCompetitors(targetAppId, targetBundle, effectiveGameplayProfile);
  const referenceBundles = mergeReferenceBundles(trackReferenceBundles, gameplayReferenceBundles);
  const comparisonFrame = buildComparisonFrame({
    targetBundle,
    targetTags,
    targetOwners,
    targetPrice,
    targetReviewCount,
    targetCcu,
    targetMeta,
    targetSignals,
    gameplayProfile: effectiveGameplayProfile,
    seed,
    trackReferenceBundles: referenceBundles
  });

  if (!targetTags.length && !referenceBundles.length) {
    return {
      comparisonFrame,
      candidates: [],
      games: [],
      warnings: seed.warnings || ["当前产品缺少可用标签，暂时无法自动挑选竞品。"]
    };
  }

  const preferredAppIds = new Set(seed.preferredAppIds || []);
  const tagResults = targetTags.length
    ? await Promise.all(targetTags.slice(0, 2).map((tag) => fetchSteamSpyTag(tag)))
    : [];

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
        ccu: Number(item.ccu || 0),
        trackReference: false
      };

      existing.tagHits.push(tag);
      existing.tagScore += 100 - existing.tagHits.length * 10;
      candidateMap.set(appid, existing);
    }
  });

  for (const reference of referenceBundles) {
    const existing = candidateMap.get(reference.appid) || {
      appid: reference.appid,
      name: reference.name,
      tagHits: [],
      tagScore: 0,
      positive: Number(reference.bundle.spy?.positive || 0),
      negative: Number(reference.bundle.spy?.negative || 0),
      owners: reference.bundle.spy?.owners || "",
      ccu: Number(reference.bundle.spy?.ccu || 0),
      trackReference: true
    };

    existing.tagScore += 65;
    existing.trackReference = true;
    candidateMap.set(reference.appid, existing);
  }

  const preliminary = [...candidateMap.values()]
    .filter((item) => item.tagHits.length > 0 || item.trackReference)
    .sort((a, b) => b.tagScore - a.tagScore)
    .slice(0, 18);

  const detailed = await Promise.all(
    preliminary.map(async (candidate) => {
      const knownReference = referenceBundles.find((item) => item.appid === candidate.appid);
      const spy = knownReference?.bundle?.spy || await fetchSteamSpyAppDetails(candidate.appid);
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
      evidence.role_matches = getRoleMatches({
        comparisonFrame,
        sameSeries: evidence.same_series,
        sameDeveloper: evidence.same_developer,
        samePublisher: evidence.same_publisher,
        sharedTags: evidence.shared_tags,
        priceSimilarityRatio: evidence.price_similarity_ratio,
        scaleSimilarityRatio: evidence.scale_similarity_ratio,
        candidateName: candidate.name,
        candidateTags: getTopSpecificTags(spy?.tags || {})
      });
      if (evidence.role_matches.length) {
        evidence.coordinate_role_hint = evidence.role_matches[0];
      }
      const score = scoreCompetitorV2({
        candidate,
        evidence
      }) + (preferredAppIds.has(candidate.appid) ? 120 : 0) + (candidate.trackReference ? 45 : 0);

      return {
        ...candidate,
        spy,
        evidence,
        score,
        selection_reason: buildSelectionReasonV2(evidence, preferredAppIds.has(candidate.appid), seed.referenceName)
      };
    })
  );

  const selected = selectCompetitorsForFrame({
    detailed,
    comparisonFrame,
    preferredAppIds
  });

  const games = await Promise.all(
    selected.map(async (item) => {
      const knownReference = referenceBundles.find((reference) => reference.appid === item.appid);
      const bundle = knownReference?.bundle || await fetchGameBundle(item.appid, { steamSpyOverride: item.spy });
      return buildGameFromBundle(bundle, new Date().toISOString());
    })
  );

  const selectedIds = new Set(selected.map((item) => item.appid));
  const candidates = detailed
    .filter((item) => item.evidence.is_comparable || preferredAppIds.has(item.appid) || item.trackReference)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((item) => ({
      app_id: item.appid,
      name: item.name,
      total_score: Number(item.score.toFixed(1)),
      selection_reason: item.selection_reason,
      comparison_basis: item.evidence.comparison_basis,
      coordinate_role_hint: item.evidence.coordinate_role_hint,
      evidence_strength: item.evidence.evidence_strength,
      role_matches: item.evidence.role_matches || [],
      is_selected: selectedIds.has(item.appid)
    }));

  return {
    comparisonFrame: hydrateComparisonFrame({
      comparisonFrame,
      selected
    }),
    candidates,
    games,
    warnings: [
      ...(seed.warnings || []),
      ...(selected.length < 2 ? ["当前自动竞品坐标证据不足，系统已优先按坐标角色筛样，本轮缺少足够强的参照物。"] : [])
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
      referenceType: "direct_tags",
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
      referenceType: "series",
      warnings: [`当前产品自身缺少 SteamSpy 标签，竞品改用系列参考作《${reference.name}》的标签进行筛选。`]
    };
  }

  const trackReference = await findTrackReferenceBundleForCompetitors(targetAppId, targetBundle);
  const trackReferenceTags = trackReference ? getTopSpecificTags(trackReference.bundle.spy?.tags || {}) : [];

  if (trackReferenceTags.length) {
    return {
      tags: trackReferenceTags,
      preferredAppIds: [trackReference.appid],
      referenceName: trackReference.name,
      referenceType: "track_reference",
      warnings: [`当前产品缺少足够具体的直连标签，竞品改用玩法赛道参考作《${trackReference.name}》建立比较坐标。`]
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
      referenceType: reference ? "reference_series" : "fallback_genre",
      warnings
    };
  }

  return {
    tags: [],
    preferredAppIds: [],
    referenceName: "",
    referenceType: "none",
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

function buildComparisonFrame({
  targetTags,
  targetOwners,
  targetPrice,
  targetReviewCount,
  targetCcu,
  targetMeta,
  targetSignals,
  gameplayProfile,
  seed,
  trackReferenceBundles
}) {
  const roles = [];
  const frameTypes = [];
  const signalText = targetSignals.join(" ").toLowerCase();
  const hasFranchiseSeed = seed.referenceName && (seed.referenceType === "series" || seed.referenceType === "reference_series");
  const hasTrackSignal =
    targetTags.length >= 2 ||
    /party|co-?op|cooking|deckbuild|roguelike|survival|souls|extraction|city builder|factory|automation|visual novel|dating sim/.test(signalText) ||
    trackReferenceBundles.length > 0;
  const hasLineageSignal = Boolean(targetMeta.developers.length || targetMeta.publishers.length);
  const hasScaleSignal = Boolean(targetOwners.midpoint || targetPrice || targetReviewCount || targetCcu);

  if (hasFranchiseSeed) {
    frameTypes.push("franchise");
    roles.push({
      key: "franchise_anchor",
      label: "系列基准",
      required: true,
      selection_rule: "优先选择同系列、同命名干线或明确承接前作认知的样本。",
      summary_hint: "回答这款产品相对前作是延续、放大还是偏移。"
    });
  }

  if (hasTrackSignal) {
    frameTypes.push("track");
    roles.push({
      key: "track_anchor",
      label: "玩法赛道参照",
      required: true,
      selection_rule: "选择玩家会自然联想到的玩法赛道样本，要求有多信号重合，而不是单标签重合。",
      summary_hint: "回答它放进同类玩法赛道后，大概站在什么位置。"
    });
  }

  if (hasLineageSignal) {
    frameTypes.push("lineage");
    roles.push({
      key: "lineage_anchor",
      label: "团队谱系参照",
      required: false,
      selection_rule: "如果同开发或同发行成立，可作为创作延续性参照。",
      summary_hint: "回答团队过去的产品经验是否会影响这次预期。"
    });
  }

  if (hasScaleSignal) {
    frameTypes.push("scale");
    roles.push({
      key: "scale_peer",
      label: "同体量平行样本",
      required: false,
      selection_rule: "优先选择价格带、评论量级或拥有量级接近的样本。",
      summary_hint: "回答它在相近商业体量样本里处于什么档位。"
    });
  }

  return {
    version: "comparison_frame_v2",
    active_frame_types: uniqueStrings(frameTypes),
    frame_summary_hint: buildFrameSummaryHint(roles),
    frame_axes_hint: buildFrameAxesHint(roles),
    gameplay_profile: gameplayProfile || null,
    roles,
    seed_reference_name: seed.referenceName || "",
    seed_reference_type: seed.referenceType || "",
    track_reference_names: trackReferenceBundles.map((item) => item.name),
    evidence_sources: uniqueStrings([
      targetTags.length ? "steamspy_tag_cluster" : "",
      trackReferenceBundles.length ? "store_signal_track_reference" : "",
      hasLineageSignal ? "team_lineage_signal" : "",
      hasScaleSignal ? "scale_metrics_signal" : ""
    ])
  };
}

function buildFrameSummaryHint(roles) {
  if (!roles.length) {
    return "当前没有稳定坐标系，只能做基础描述。";
  }

  return `先按 ${roles.map((role) => role.label).join(" / ")} 建坐标，再决定哪些产品值得放进比较。`;
}

function buildFrameAxesHint(roles) {
  const hints = [];

  for (const role of roles) {
    if (role.key === "franchise_anchor") {
      hints.push("续作相对前作放大量");
    } else if (role.key === "track_anchor") {
      hints.push("放入玩法赛道后的相对位置");
    } else if (role.key === "lineage_anchor") {
      hints.push("团队谱系延续与偏移");
    } else if (role.key === "scale_peer") {
      hints.push("同体量样本中的商业级别");
    }
  }

  return uniqueStrings(hints).slice(0, 4);
}

function getRoleMatches({
  comparisonFrame,
  sameSeries,
  sameDeveloper,
  samePublisher,
  sharedTags,
  priceSimilarityRatio,
  scaleSimilarityRatio,
  candidateName,
  candidateTags
}) {
  if (!comparisonFrame?.roles?.length) {
    return [];
  }

  const candidateText = `${candidateName || ""} ${candidateTags.join(" ")}`.toLowerCase();
  const matches = [];

  for (const role of comparisonFrame.roles) {
    if (role.key === "franchise_anchor" && sameSeries) {
      matches.push("系列前作/同系列基准");
    }
    if (role.key === "lineage_anchor" && (sameDeveloper || samePublisher)) {
      matches.push("团队谱系参照");
    }
    if (role.key === "track_anchor" && (
      sharedTags.length >= 2 ||
      comparisonFrame.track_reference_names.some((name) => candidateText.includes(String(name || "").toLowerCase()))
    )) {
      matches.push("同赛道外部样本");
    }
    if (role.key === "scale_peer" && (priceSimilarityRatio >= 0.55 || scaleSimilarityRatio >= 0.5)) {
      matches.push("同体量平行样本");
    }
  }

  return uniqueStrings(matches);
}

function selectCompetitorsForFrame({ detailed, comparisonFrame, preferredAppIds }) {
  const selected = [];
  const usedIds = new Set();
  const pool = detailed
    .filter((item) => item.evidence.is_comparable || preferredAppIds.has(item.appid) || item.trackReference)
    .sort((a, b) => b.score - a.score);

  for (const role of comparisonFrame.roles || []) {
    const bestMatch = pool
      .filter((item) => !usedIds.has(item.appid))
      .filter((item) => matchesRole(item, role.key, preferredAppIds))
      .sort((a, b) => scoreCandidateForRole(b, role.key, preferredAppIds) - scoreCandidateForRole(a, role.key, preferredAppIds))[0];

    if (bestMatch) {
      selected.push(bestMatch);
      usedIds.add(bestMatch.appid);
    }
  }

  for (const item of pool) {
    if (selected.length >= 2) {
      break;
    }
    if (usedIds.has(item.appid)) {
      continue;
    }
    selected.push(item);
    usedIds.add(item.appid);
  }

  return selected.slice(0, 2);
}

function matchesRole(item, roleKey, preferredAppIds) {
  if (roleKey === "franchise_anchor") {
    return item.evidence.same_series || preferredAppIds.has(item.appid);
  }
  if (roleKey === "lineage_anchor") {
    return item.evidence.same_developer || item.evidence.same_publisher;
  }
  if (roleKey === "track_anchor") {
    return (item.evidence.role_matches || []).includes("同赛道外部样本");
  }
  if (roleKey === "scale_peer") {
    return item.evidence.price_similarity_ratio >= 0.55 || item.evidence.scale_similarity_ratio >= 0.5;
  }
  return false;
}

function scoreCandidateForRole(item, roleKey, preferredAppIds) {
  if (roleKey === "franchise_anchor") {
    return item.score + (item.evidence.same_series ? 120 : 0) + (preferredAppIds.has(item.appid) ? 80 : 0);
  }
  if (roleKey === "lineage_anchor") {
    return item.score + (item.evidence.same_developer ? 70 : 0) + (item.evidence.same_publisher ? 35 : 0);
  }
  if (roleKey === "track_anchor") {
    return item.score + item.evidence.shared_tags.length * 20 + item.evidence.scale_similarity_ratio * 18;
  }
  if (roleKey === "scale_peer") {
    return item.score + item.evidence.scale_similarity_ratio * 45 + item.evidence.price_similarity_ratio * 30;
  }
  return item.score;
}

function hydrateComparisonFrame({ comparisonFrame, selected }) {
  if (!comparisonFrame) {
    return null;
  }

  return {
    ...comparisonFrame,
    selected_role_samples: (comparisonFrame.roles || []).map((role) => {
      const matched = selected.find((item) => matchesRole(item, role.key, new Set()));
      return {
        role_key: role.key,
        role_label: role.label,
        selected_app_id: matched?.appid || null,
        selected_name: matched?.name || null
      };
    }),
    selected_count: selected.length
  };
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
  const lightweight = Boolean(options.lightweight);
  const [store, reviews, players, spy] = await Promise.all([
    fetchStoreAppDetails(appid),
    lightweight ? Promise.resolve({}) : fetchReviewSummary(appid),
    lightweight ? Promise.resolve({ response: { player_count: 0 } }) : fetchCurrentPlayers(appid),
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

async function findTrackReferenceBundleForCompetitors(targetAppId, targetBundle) {
  const trackTerms = buildTrackReferenceSearchTerms(targetBundle);

  for (const term of trackTerms) {
    const suggestions = await fetchSearchSuggestions(term);

    for (const suggestion of suggestions.slice(0, 5)) {
      if (Number(suggestion.appid) === Number(targetAppId)) {
        continue;
      }

      const bundle = await fetchGameBundle(suggestion.appid);
      if (!isValidTrackReferenceBundle(bundle, targetBundle, term)) {
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

async function findTrackReferenceBundlesForCompetitors(targetAppId, targetBundle) {
  const trackTerms = buildTrackReferenceSearchTerms(targetBundle);
  const bundles = [];
  const seen = new Set();

  for (const term of trackTerms) {
    const suggestions = await fetchSearchSuggestions(term);

    for (const suggestion of suggestions.slice(0, 3)) {
      if (Number(suggestion.appid) === Number(targetAppId) || seen.has(Number(suggestion.appid))) {
        continue;
      }

      const bundle = await fetchGameBundle(suggestion.appid, { lightweight: true });
      if (!isValidTrackReferenceBundle(bundle, targetBundle, term)) {
        continue;
      }

      seen.add(Number(suggestion.appid));
      bundles.push({
        appid: Number(suggestion.appid),
        name: bundle.store?.name || bundle.spy?.name || suggestion.name,
        bundle
      });

      if (bundles.length >= 2) {
        return bundles;
      }
    }
  }

  return bundles;
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

function buildTrackReferenceSearchTerms(targetBundle) {
  const tags = getAllBundleSignals(targetBundle);
  const hasPartyCoopSignal =
    tags.some((value) => /party|co-?op|coop|local co-?op|shared\/split screen|multiplayer/i.test(value)) &&
    tags.some((value) => /funny|comedy|family|casual|cooking|chaotic|arcade/i.test(value));

  const hasCookingSignal = tags.some((value) => /cooking|kitchen|restaurant|food/i.test(value));

  if (hasPartyCoopSignal && hasCookingSignal) {
    return ["Overcooked", "Overcooked 2", "PlateUp!"];
  }

  if (hasPartyCoopSignal) {
    return ["Overcooked 2", "Moving Out", "PlateUp!"];
  }

  return [];
}

function isValidTrackReferenceBundle(candidateBundle, targetBundle, trackTerm = "") {
  const candidateStore = candidateBundle.store || {};

  if (String(candidateStore.type || "").toLowerCase() !== "game") {
    return false;
  }

  const candidateSignals = getAllBundleSignals(candidateBundle);
  const targetSignals = getAllBundleSignals(targetBundle);
  const normalizedTrackTerm = normalizeText(trackTerm);
  const candidateName = normalizeText(candidateStore.name || candidateBundle.spy?.name || "");

  if (normalizedTrackTerm && !candidateName.includes(normalizedTrackTerm)) {
    return false;
  }

  const partyCoopMatch =
    candidateSignals.some((value) => /party|co-?op|coop|local co-?op|shared\/split screen|multiplayer/i.test(value)) &&
    targetSignals.some((value) => /party|co-?op|coop|local co-?op|shared\/split screen|multiplayer/i.test(value));

  return partyCoopMatch;
}

function getAllBundleSignals(bundle) {
  const store = bundle.store || {};
  const spy = bundle.spy || {};
  const storeGenres = Array.isArray(store.genres) ? store.genres.map((item) => item?.description) : [];
  const storeCategories = Array.isArray(store.categories) ? store.categories.map((item) => item?.description) : [];
  const topTags = Object.keys(spy.tags || {});

  return normalizeStringArray([
    ...storeGenres,
    ...storeCategories,
    ...topTags,
    ...splitCommaList(spy.genre),
    ...splitCommaList(spy.languages),
    store.short_description || ""
  ]);
}

function buildGameplayProfile(bundle) {
  const store = bundle.store || {};
  const signals = getAllBundleSignals(bundle);
  const signalText = signals.join(" ").toLowerCase();
  const summaryText = stripHtml(store.short_description || store.detailed_description || "");

  const playModes = [];
  const activityLoops = [];
  const scenarioKeywords = [];

  if (/singleplayer|single-player/.test(signalText)) {
    playModes.push("singleplayer");
  }
  if (/multiplayer|online co-?op|local co-?op|shared\/split screen|coop|co-op/.test(signalText)) {
    playModes.push("multiplayer_coop");
  }
  if (/party|family|chaotic|funny|comedy/.test(signalText)) {
    playModes.push("party");
  }
  if (/simulation|simulator|management|tycoon|building/.test(signalText)) {
    activityLoops.push("management_sim");
  }
  if (/cooking|kitchen|restaurant|food/.test(signalText)) {
    activityLoops.push("cooking_coordination");
    scenarioKeywords.push("cooking");
  }
  if (/shop|store|supermarket|mall|retail/.test(signalText)) {
    activityLoops.push("store_management");
    scenarioKeywords.push("store");
  }
  if (/automation|factory|crafting|survival/.test(signalText)) {
    activityLoops.push("system_driven_progression");
  }
  if (/roguelike|roguelite|deckbuilder|card battler/.test(signalText)) {
    activityLoops.push("run_based_builds");
  }
  if (/stealth|shooter|fps|tactical/.test(signalText)) {
    activityLoops.push("combat_execution");
  }

  const referenceQueries = buildGameplayReferenceSearchTerms({
    title: store.name || bundle.spy?.name || "",
    signalText,
    summaryText,
    playModes,
    activityLoops,
    scenarioKeywords
  });

  return {
    short_summary: summaryText || buildSubtitle(getTopSpecificTags(bundle.spy?.tags || {}).slice(0, 5), store.genres),
    play_modes: uniqueStrings(playModes),
    activity_loops: uniqueStrings(activityLoops),
    scenario_keywords: uniqueStrings(scenarioKeywords),
    reference_queries: referenceQueries
  };
}

function buildGameplayReferenceSearchTerms({ title, signalText, summaryText, playModes, activityLoops, scenarioKeywords }) {
  const terms = [];
  const lowerTitle = String(title || "").toLowerCase();

  if (playModes.includes("party") && activityLoops.includes("cooking_coordination")) {
    terms.push("Overcooked 2", "PlateUp!", "Moving Out");
  }
  if (activityLoops.includes("store_management")) {
    terms.push("Supermarket Simulator", "Shop Titans", "Gas Station Simulator");
  }
  if (activityLoops.includes("management_sim") && /director|boss|manager|management|tycoon/.test(`${lowerTitle} ${summaryText.toLowerCase()}`)) {
    terms.push("Game Dev Tycoon", "Big Ambitions", "Startup Company");
  }
  if (playModes.includes("party") && activityLoops.includes("management_sim")) {
    terms.push("Tools Up!", "Moving Out", "PlateUp!");
  }
  if (activityLoops.includes("run_based_builds")) {
    terms.push("Balatro", "Slay the Spire", "Hades");
  }
  if (activityLoops.includes("combat_execution") && /tactical|breach|raid/.test(signalText)) {
    terms.push("Ready or Not", "Rainbow Six Siege", "Door Kickers 2");
  }

  if (!terms.length) {
    if (scenarioKeywords.includes("cooking")) {
      terms.push("Overcooked 2", "PlateUp!");
    } else if (scenarioKeywords.includes("store")) {
      terms.push("Supermarket Simulator", "Gas Station Simulator");
    }
  }

  return uniqueStrings(terms).slice(0, 4);
}

async function findGameplayReferenceBundlesForCompetitors(targetAppId, targetBundle, gameplayProfile) {
  const terms = gameplayProfile?.reference_queries || [];
  const bundles = [];
  const seen = new Set();

  for (const term of terms) {
    const suggestions = await fetchSearchSuggestions(term);

    for (const suggestion of suggestions.slice(0, 3)) {
      const numericAppId = Number(suggestion.appid);
      if (numericAppId === Number(targetAppId) || seen.has(numericAppId)) {
        continue;
      }

      const bundle = await fetchGameBundle(numericAppId, { lightweight: true });
      if (!isValidGameplayReferenceBundle(bundle, targetBundle, gameplayProfile, term)) {
        continue;
      }

      seen.add(numericAppId);
      bundles.push({
        appid: numericAppId,
        name: bundle.store?.name || bundle.spy?.name || suggestion.name,
        bundle
      });

      if (bundles.length >= 3) {
        return bundles;
      }
    }
  }

  return bundles;
}

function isValidGameplayReferenceBundle(candidateBundle, targetBundle, gameplayProfile, referenceTerm = "") {
  const candidateSignals = getAllBundleSignals(candidateBundle).join(" ").toLowerCase();
  const targetSignals = getAllBundleSignals(targetBundle).join(" ").toLowerCase();
  const termText = normalizeText(referenceTerm);
  const candidateName = normalizeText(candidateBundle.store?.name || candidateBundle.spy?.name || "");

  if (termText && !candidateName.includes(termText)) {
    return false;
  }

  const sharedModes = (gameplayProfile?.play_modes || []).filter((mode) => {
    if (mode === "party") {
      return /party|family|chaotic|funny|comedy/.test(candidateSignals);
    }
    if (mode === "multiplayer_coop") {
      return /multiplayer|co-?op|shared\/split screen/.test(candidateSignals);
    }
    if (mode === "singleplayer") {
      return /singleplayer|single-player/.test(candidateSignals);
    }
    return false;
  });

  const sharedLoops = (gameplayProfile?.activity_loops || []).filter((loop) => {
    if (loop === "cooking_coordination") {
      return /cooking|kitchen|restaurant|food/.test(candidateSignals);
    }
    if (loop === "store_management") {
      return /shop|store|supermarket|mall|retail/.test(candidateSignals);
    }
    if (loop === "management_sim") {
      return /simulation|simulator|management|tycoon|building/.test(candidateSignals);
    }
    if (loop === "run_based_builds") {
      return /roguelike|roguelite|deckbuilder|card battler/.test(candidateSignals);
    }
    if (loop === "combat_execution") {
      return /stealth|shooter|fps|tactical/.test(candidateSignals);
    }
    return false;
  });

  return sharedModes.length > 0 || sharedLoops.length > 0 || candidateSignals === targetSignals;
}

function mergeReferenceBundles(...groups) {
  const merged = [];
  const seen = new Set();

  for (const group of groups) {
    for (const item of group || []) {
      if (!item?.appid || seen.has(item.appid)) {
        continue;
      }
      seen.add(item.appid);
      merged.push(item);
    }
  }

  return merged;
}

function uniqueStrings(values) {
  return [...new Set((values || []).filter(Boolean))];
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
