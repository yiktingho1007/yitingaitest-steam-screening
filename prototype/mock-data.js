globalThis.MOCK_REPORTS = [
  {
    id: "balatro",
    aliases: ["balatro", "小丑牌", "2379780"],
    request_context: {
      request_id: "mock_balatro_001",
      raw_query: "Balatro",
      query_type: "name",
      resolved_app_id: 2379780,
      resolved_name: "Balatro",
      locale: "zh-CN",
      currency: "CNY",
      generated_at: "2026-05-14T14:10:00+08:00"
    },
    source_summary: {
      official_source_count: 3,
      supplemental_source_count: 2,
      third_party_source_count: 1,
      has_partial_failure: false,
      failed_sources: []
    },
    target_game: {
      app_id: 2379780,
      name: "Balatro",
      steam_url: "https://store.steampowered.com/app/2379780/Balatro/",
      subtitle: "规则极简，但重复游玩驱动力极强的卡牌 Roguelike",
      price_final: metric("¥54", 54, "steam_store_supplement", "B"),
      review_score_desc: metric("好评如潮", "好评如潮", "steam_reviews_api/query_summary", "A"),
      total_reviews: metric("117,000+", 117000, "steam_reviews_api/query_summary", "A"),
      current_players: metric("21,400", 21400, "steam_web_api/ISteamUserStats/GetNumberOfCurrentPlayers", "A"),
      release_date: metric("2024-02-20", "2024-02-20", "steam_store_supplement", "B"),
      owner_estimate_low: metric("100 万", 1000000, "SteamSpy", "C"),
      owner_estimate_high: metric("200 万", 2000000, "SteamSpy", "C"),
      owner_estimate_note: "基于 SteamSpy 区间估算，仅用于判断体量级别。",
      tags: ["卡牌构筑", "Roguelike", "独立", "高复玩性", "单机"],
      developers: ["LocalThunk"],
      publishers: ["Playstack"],
      supported_languages: ["简体中文", "英语", "日语"],
      primary_confidence_tier: "A",
      available_fields: ["price_final", "review_score_desc", "total_reviews", "current_players", "owner_estimate_low", "owner_estimate_high"],
      missing_fields: []
    },
    competitor_candidates: [
      {
        app_id: 646570,
        name: "Slay the Spire",
        total_score: 91.2,
        selection_reason: "卡牌构筑机制直接相近，评论量和长期内容心智也接近。",
        is_selected: true
      },
      {
        app_id: 2212330,
        name: "Dungeons & Degenerate Gamblers",
        total_score: 84.7,
        selection_reason: "核心题材接近，但市场验证强度明显弱一档。",
        is_selected: true
      },
      {
        app_id: 1385380,
        name: "Luck be a Landlord",
        total_score: 78.9,
        selection_reason: "同样依赖规则驱动与短局反复体验，但题材包装差异更大。",
        is_selected: false
      }
    ],
    competitor_games: [
      {
        app_id: 646570,
        name: "Slay the Spire",
        price_final: metric("¥80", 80, "steam_store_supplement", "B"),
        release_date: metric("2019-01-24", "2019-01-24", "steam_store_supplement", "B"),
        review_score_desc: metric("好评如潮", "好评如潮", "steam_reviews_api/query_summary", "A"),
        total_reviews: metric("150,000+", 150000, "steam_reviews_api/query_summary", "A"),
        current_players: metric("14,900", 14900, "steam_web_api/ISteamUserStats/GetNumberOfCurrentPlayers", "A"),
        owner_estimate_low: metric("300 万", 3000000, "SteamSpy", "C"),
        owner_estimate_high: metric("500 万", 5000000, "SteamSpy", "C")
      },
      {
        app_id: 2212330,
        name: "Dungeons & Degenerate Gamblers",
        price_final: metric("¥52", 52, "steam_store_supplement", "B"),
        release_date: metric("2024-08-08", "2024-08-08", "steam_store_supplement", "B"),
        review_score_desc: metric("特别好评", "特别好评", "steam_reviews_api/query_summary", "A"),
        total_reviews: metric("8,600+", 8600, "steam_reviews_api/query_summary", "A"),
        current_players: metric("1,100", 1100, "steam_web_api/ISteamUserStats/GetNumberOfCurrentPlayers", "A"),
        owner_estimate_low: metric("10 万", 100000, "SteamSpy", "C"),
        owner_estimate_high: metric("20 万", 200000, "SteamSpy", "C")
      }
    ],
    llm_summary: {
      status: "success",
      positioning_summary: "Balatro 的强项不在题材新颖，而在于把低理解门槛和极强重复游玩循环压缩到了非常短的单局体验里。",
      difference_points: [
        "相较 Slay the Spire，它牺牲了更复杂的长线构筑深度，换来了更快的上手速度和更高的局内反馈密度。",
        "相较 Dungeons & Degenerate Gamblers，它在可读性、传播性和规则纯度上更完整，因而更容易形成爆发式口碑。",
        "基于 SteamSpy 的拥有量区间估算，它已经明显越过“小众机制产品”的体量门槛。"
      ],
      screening_recommendation: "建议进入深度研究，重点拆解它如何用极少规则元素形成高强度复玩循环。",
      data_caution: "结论同时使用了 Steam 官方公开数据和 SteamSpy 第三方估算数据，估算部分仅用于方向性判断。",
      used_fields: ["review_score_desc", "total_reviews", "current_players", "owner_estimate_low", "owner_estimate_high"],
      used_estimate_sources: ["SteamSpy"],
      model_name: "mock-gpt-5",
      generated_at: "2026-05-14T14:10:01+08:00"
    },
    debug_meta: {
      cache_hit: true,
      data_latency_ms: 920,
      llm_latency_ms: 640,
      total_latency_ms: 1560,
      partial_failure: false,
      warnings: ["当前为 mock 数据演示，数值仅用于页面结构验证。"]
    }
  },
  {
    id: "hades-ii",
    aliases: ["hades ii", "hades2", "哈迪斯2", "1145350"],
    request_context: {
      request_id: "mock_hades2_001",
      raw_query: "Hades II",
      query_type: "name",
      resolved_app_id: 1145350,
      resolved_name: "Hades II",
      locale: "zh-CN",
      currency: "CNY",
      generated_at: "2026-05-14T14:11:00+08:00"
    },
    source_summary: {
      official_source_count: 3,
      supplemental_source_count: 2,
      third_party_source_count: 1,
      has_partial_failure: false,
      failed_sources: []
    },
    target_game: {
      app_id: 1145350,
      name: "Hades II",
      steam_url: "https://store.steampowered.com/app/1145350/Hades_II/",
      subtitle: "成熟 IP 驱动下的动作 Roguelike 抢先体验产品",
      price_final: metric("¥108", 108, "steam_store_supplement", "B"),
      review_score_desc: metric("特别好评", "特别好评", "steam_reviews_api/query_summary", "A"),
      total_reviews: metric("60,000+", 60000, "steam_reviews_api/query_summary", "A"),
      current_players: metric("17,800", 17800, "steam_web_api/ISteamUserStats/GetNumberOfCurrentPlayers", "A"),
      release_date: metric("2024-05-07", "2024-05-07", "steam_store_supplement", "B"),
      owner_estimate_low: metric("100 万", 1000000, "SteamSpy", "C"),
      owner_estimate_high: metric("200 万", 2000000, "SteamSpy", "C"),
      owner_estimate_note: "基于 SteamSpy 区间估算，仅用于判断市场覆盖面。",
      tags: ["动作 Roguelike", "神话题材", "女性主角", "抢先体验", "高演出"],
      developers: ["Supergiant Games"],
      publishers: ["Supergiant Games"],
      supported_languages: ["简体中文", "英语", "法语", "韩语"],
      primary_confidence_tier: "A",
      available_fields: ["price_final", "review_score_desc", "total_reviews", "current_players", "owner_estimate_low", "owner_estimate_high"],
      missing_fields: []
    },
    competitor_candidates: [
      {
        app_id: 1145360,
        name: "Hades",
        total_score: 95.8,
        selection_reason: "同系列、同玩法原型，是最直接的纵向对比对象。",
        is_selected: true
      },
      {
        app_id: 632360,
        name: "Risk of Rain 2",
        total_score: 81.6,
        selection_reason: "同为高复玩动作 Roguelike，但多人属性和节奏结构不同。",
        is_selected: true
      },
      {
        app_id: 274170,
        name: "Darkest Dungeon",
        total_score: 73.5,
        selection_reason: "长期策略深度接近，但核心战斗体验差异较大。",
        is_selected: false
      }
    ],
    competitor_games: [
      {
        app_id: 1145360,
        name: "Hades",
        price_final: metric("¥92", 92, "steam_store_supplement", "B"),
        release_date: metric("2020-09-17", "2020-09-17", "steam_store_supplement", "B"),
        review_score_desc: metric("好评如潮", "好评如潮", "steam_reviews_api/query_summary", "A"),
        total_reviews: metric("260,000+", 260000, "steam_reviews_api/query_summary", "A"),
        current_players: metric("8,400", 8400, "steam_web_api/ISteamUserStats/GetNumberOfCurrentPlayers", "A"),
        owner_estimate_low: metric("500 万", 5000000, "SteamSpy", "C"),
        owner_estimate_high: metric("1000 万", 10000000, "SteamSpy", "C")
      },
      {
        app_id: 632360,
        name: "Risk of Rain 2",
        price_final: metric("¥80", 80, "steam_store_supplement", "B"),
        release_date: metric("2020-08-11", "2020-08-11", "steam_store_supplement", "B"),
        review_score_desc: metric("特别好评", "特别好评", "steam_reviews_api/query_summary", "A"),
        total_reviews: metric("200,000+", 200000, "steam_reviews_api/query_summary", "A"),
        current_players: metric("13,200", 13200, "steam_web_api/ISteamUserStats/GetNumberOfCurrentPlayers", "A"),
        owner_estimate_low: metric("400 万", 4000000, "SteamSpy", "C"),
        owner_estimate_high: metric("800 万", 8000000, "SteamSpy", "C")
      }
    ],
    llm_summary: {
      status: "success",
      positioning_summary: "Hades II 更像是“高确定性的内容续作”，价值点在于延续成熟循环并扩充角色、叙事和长线内容，而不是重新定义品类。",
      difference_points: [
        "相较 Hades，本作的主要变量是内容厚度、角色系统扩展和中长期版本运营潜力。",
        "相较 Risk of Rain 2，它的单人沉浸感和叙事承载更强，但多人传播性与社交驱动弱一些。",
        "基于 SteamSpy 区间估算，它已经进入大体量 Roguelike 讨论范围，但长期上限仍取决于 EA 阶段的版本节奏。"
      ],
      screening_recommendation: "建议继续深挖，重点关注其 EA 阶段内容扩展节奏是否能持续放大 IP 红利。",
      data_caution: "本页包含第三方估算信号，请避免把拥有量区间直接视为官方确认销量。",
      used_fields: ["review_score_desc", "total_reviews", "current_players", "owner_estimate_low", "owner_estimate_high"],
      used_estimate_sources: ["SteamSpy"],
      model_name: "mock-gpt-5",
      generated_at: "2026-05-14T14:11:01+08:00"
    },
    debug_meta: {
      cache_hit: true,
      data_latency_ms: 1010,
      llm_latency_ms: 690,
      total_latency_ms: 1700,
      partial_failure: false,
      warnings: ["当前为 mock 数据演示，数值仅用于页面结构验证。"]
    }
  },
  {
    id: "schedule-i",
    aliases: ["schedule i", "schedule1", "s1", "毒枭模拟", "3164500"],
    request_context: {
      request_id: "mock_schedule1_001",
      raw_query: "Schedule I",
      query_type: "name",
      resolved_app_id: 3164500,
      resolved_name: "Schedule I",
      locale: "zh-CN",
      currency: "CNY",
      generated_at: "2026-05-14T14:12:00+08:00"
    },
    source_summary: {
      official_source_count: 3,
      supplemental_source_count: 2,
      third_party_source_count: 1,
      has_partial_failure: true,
      failed_sources: ["steam_store_supplement/localized_short_description"]
    },
    target_game: {
      app_id: 3164500,
      name: "Schedule I",
      steam_url: "https://store.steampowered.com/app/3164500/Schedule_I/",
      subtitle: "靠题材抓眼和主播传播迅速放大的高波动模拟产品",
      price_final: metric("¥76", 76, "steam_store_supplement", "B"),
      review_score_desc: metric("特别好评", "特别好评", "steam_reviews_api/query_summary", "A"),
      total_reviews: metric("48,000+", 48000, "steam_reviews_api/query_summary", "A"),
      current_players: metric("39,500", 39500, "steam_web_api/ISteamUserStats/GetNumberOfCurrentPlayers", "A"),
      release_date: metric("2025-03-25", "2025-03-25", "steam_store_supplement", "B"),
      owner_estimate_low: metric("50 万", 500000, "SteamSpy", "C"),
      owner_estimate_high: metric("100 万", 1000000, "SteamSpy", "C"),
      owner_estimate_note: "基于 SteamSpy 区间估算，波动可能较大。",
      tags: ["模拟", "合作", "开放式成长", "主播传播", "题材驱动"],
      developers: ["TVGS"],
      publishers: ["TVGS"],
      supported_languages: ["英语"],
      primary_confidence_tier: "A",
      available_fields: ["price_final", "review_score_desc", "total_reviews", "current_players", "owner_estimate_low", "owner_estimate_high"],
      missing_fields: ["short_description"]
    },
    competitor_candidates: [
      {
        app_id: 1222670,
        name: "Drug Dealer Simulator 2",
        total_score: 88.4,
        selection_reason: "题材和经营驱动最接近，是直接心智竞品。",
        is_selected: true
      },
      {
        app_id: 671860,
        name: "Supermarket Simulator",
        total_score: 77.2,
        selection_reason: "同属主播传播拉升的轻经营爆款，但题材刺激性更弱。",
        is_selected: true
      },
      {
        app_id: 1599600,
        name: "Contraband Police",
        total_score: 71.1,
        selection_reason: "同样依赖题材点击率，但循环结构差异更大。",
        is_selected: false
      }
    ],
    competitor_games: [
      {
        app_id: 1222670,
        name: "Drug Dealer Simulator 2",
        price_final: metric("¥99", 99, "steam_store_supplement", "B"),
        release_date: metric("2024-06-20", "2024-06-20", "steam_store_supplement", "B"),
        review_score_desc: metric("特别好评", "特别好评", "steam_reviews_api/query_summary", "A"),
        total_reviews: metric("17,000+", 17000, "steam_reviews_api/query_summary", "A"),
        current_players: metric("2,400", 2400, "steam_web_api/ISteamUserStats/GetNumberOfCurrentPlayers", "A"),
        owner_estimate_low: metric("20 万", 200000, "SteamSpy", "C"),
        owner_estimate_high: metric("50 万", 500000, "SteamSpy", "C")
      },
      {
        app_id: 671860,
        name: "Supermarket Simulator",
        price_final: metric("¥58", 58, "steam_store_supplement", "B"),
        release_date: metric("2024-02-21", "2024-02-21", "steam_store_supplement", "B"),
        review_score_desc: metric("特别好评", "特别好评", "steam_reviews_api/query_summary", "A"),
        total_reviews: metric("65,000+", 65000, "steam_reviews_api/query_summary", "A"),
        current_players: metric("18,600", 18600, "steam_web_api/ISteamUserStats/GetNumberOfCurrentPlayers", "A"),
        owner_estimate_low: metric("100 万", 1000000, "SteamSpy", "C"),
        owner_estimate_high: metric("200 万", 2000000, "SteamSpy", "C")
      }
    ],
    llm_summary: {
      status: "success",
      positioning_summary: "Schedule I 的增长更像“题材抓眼 + 主播扩散 + 轻度经营循环”的复合爆发，而不是靠复杂系统深度站稳。",
      difference_points: [
        "相较 Drug Dealer Simulator 2，它的点击率和传播性更高，但系统厚度与长期内容深度可能更脆弱。",
        "相较 Supermarket Simulator，它的题材冲击力更强，因此更容易在短期内拉高关注峰值。",
        "基于 SteamSpy 估算和当前在线表现，它具备明显的短期爆发力，但是否沉淀为长尾产品仍需谨慎观察。"
      ],
      screening_recommendation: "建议进入深度研究，但重点要放在“爆发后留存”而不是只看短期热度。",
      data_caution: "本页存在一处补充字段缺失，同时引用了第三方估算数据，适合做方向判断，不适合做精确测算。",
      used_fields: ["review_score_desc", "total_reviews", "current_players", "owner_estimate_low", "owner_estimate_high"],
      used_estimate_sources: ["SteamSpy"],
      model_name: "mock-gpt-5",
      generated_at: "2026-05-14T14:12:02+08:00"
    },
    debug_meta: {
      cache_hit: false,
      data_latency_ms: 1160,
      llm_latency_ms: 720,
      total_latency_ms: 1880,
      partial_failure: true,
      warnings: ["当前为 mock 数据演示，数值仅用于页面结构验证。", "一处补充字段被故意设置为缺失，用于测试页面降级表现。"]
    }
  }
  ,
  {
    id: "slay-the-spire",
    aliases: ["slay the spire", "sts", "杀戮尖塔", "646570"],
    request_context: {
      request_id: "mock_sts_001",
      raw_query: "Slay the Spire",
      query_type: "name",
      resolved_app_id: 646570,
      resolved_name: "Slay the Spire",
      locale: "zh-CN",
      currency: "CNY",
      generated_at: "2026-05-14T14:14:00+08:00"
    },
    source_summary: {
      official_source_count: 3,
      supplemental_source_count: 2,
      third_party_source_count: 1,
      has_partial_failure: false,
      failed_sources: []
    },
    target_game: {
      app_id: 646570,
      name: "Slay the Spire",
      steam_url: "https://store.steampowered.com/app/646570/Slay_the_Spire/",
      subtitle: "把卡牌构筑、Roguelike 重开循环和长期内容深度做成行业范式的成熟标杆",
      price_final: metric("¥80", 80, "steam_store_supplement", "B"),
      review_score_desc: metric("好评如潮", "好评如潮", "steam_reviews_api/query_summary", "A"),
      total_reviews: metric("150,000+", 150000, "steam_reviews_api/query_summary", "A"),
      current_players: metric("14,900", 14900, "steam_web_api/ISteamUserStats/GetNumberOfCurrentPlayers", "A"),
      release_date: metric("2019-01-24", "2019-01-24", "steam_store_supplement", "B"),
      owner_estimate_low: metric("300 万", 3000000, "SteamSpy", "C"),
      owner_estimate_high: metric("500 万", 5000000, "SteamSpy", "C"),
      owner_estimate_note: "基于 SteamSpy 区间估算，用于判断成熟卡牌构筑产品的体量级别。",
      tags: ["卡牌构筑", "Roguelike", "单机", "高策略深度", "回合制"],
      developers: ["Mega Crit Games"],
      publishers: ["Mega Crit Games"],
      supported_languages: ["简体中文", "英语", "日语", "韩语"],
      primary_confidence_tier: "A",
      available_fields: ["price_final", "review_score_desc", "total_reviews", "current_players", "owner_estimate_low", "owner_estimate_high"],
      missing_fields: []
    },
    competitor_candidates: [
      {
        app_id: 2379780,
        name: "Balatro",
        total_score: 94.4,
        selection_reason: "同属卡牌构筑赛道，但 Balatro 更偏规则压缩与高反馈节奏，适合做代际差异对比。",
        is_selected: true
      },
      {
        app_id: 1102190,
        name: "Monster Train",
        total_score: 86.7,
        selection_reason: "同样是成熟卡牌构筑产品，但更强调多线防守和派系叠加策略。",
        is_selected: true
      },
      {
        app_id: 1385380,
        name: "Luck be a Landlord",
        total_score: 74.2,
        selection_reason: "同属规则驱动的重复游玩产品，但题材包装和长期内容厚度差异更大。",
        is_selected: false
      }
    ],
    competitor_games: [
      {
        app_id: 2379780,
        name: "Balatro",
        price_final: metric("¥54", 54, "steam_store_supplement", "B"),
        release_date: metric("2024-02-20", "2024-02-20", "steam_store_supplement", "B"),
        review_score_desc: metric("好评如潮", "好评如潮", "steam_reviews_api/query_summary", "A"),
        total_reviews: metric("117,000+", 117000, "steam_reviews_api/query_summary", "A"),
        current_players: metric("21,400", 21400, "steam_web_api/ISteamUserStats/GetNumberOfCurrentPlayers", "A"),
        owner_estimate_low: metric("100 万", 1000000, "SteamSpy", "C"),
        owner_estimate_high: metric("200 万", 2000000, "SteamSpy", "C")
      },
      {
        app_id: 1102190,
        name: "Monster Train",
        price_final: metric("¥82", 82, "steam_store_supplement", "B"),
        release_date: metric("2020-05-21", "2020-05-21", "steam_store_supplement", "B"),
        review_score_desc: metric("特别好评", "特别好评", "steam_reviews_api/query_summary", "A"),
        total_reviews: metric("18,000+", 18000, "steam_reviews_api/query_summary", "A"),
        current_players: metric("2,300", 2300, "steam_web_api/ISteamUserStats/GetNumberOfCurrentPlayers", "A"),
        owner_estimate_low: metric("50 万", 500000, "SteamSpy", "C"),
        owner_estimate_high: metric("100 万", 1000000, "SteamSpy", "C")
      }
    ],
    llm_summary: {
      status: "success",
      positioning_summary: "Slay the Spire 是卡牌构筑 Roguelike 的成熟范式产品，研究价值更多在于理解它如何把长线构筑深度做成可持续复玩循环。",
      difference_points: [
        "相较 Balatro，它的局内反馈没有那么高频，但构筑深度和长期内容厚度更强。",
        "相较 Monster Train，它的规则表达更克制，门槛更低，更容易成为品类通用参照系。",
        "基于 SteamSpy 拥有量区间估算，它已是大体量成熟产品，适合作为赛道基准样本。"
      ],
      screening_recommendation: "建议进入重点研究池，尤其适合拆解卡牌构筑赛道里“长期深度”和“规则可读性”的平衡方式。",
      data_caution: "当前结论同时使用了 Steam 官方公开数据和 SteamSpy 第三方估算，请将估算部分视为方向性参考。",
      used_fields: ["review_score_desc", "total_reviews", "current_players", "owner_estimate_low", "owner_estimate_high"],
      used_estimate_sources: ["SteamSpy"],
      model_name: "mock-gpt-5",
      generated_at: "2026-05-14T14:14:02+08:00"
    },
    debug_meta: {
      cache_hit: true,
      data_latency_ms: 940,
      llm_latency_ms: 630,
      total_latency_ms: 1570,
      partial_failure: false,
      warnings: ["当前为 mock 数据演示，数值仅用于页面结构验证。"]
    }
  },
  {
    id: "hades",
    aliases: ["hades", "黑帝斯", "哈迪斯", "1145360"],
    request_context: {
      request_id: "mock_hades_001",
      raw_query: "Hades",
      query_type: "name",
      resolved_app_id: 1145360,
      resolved_name: "Hades",
      locale: "zh-CN",
      currency: "CNY",
      generated_at: "2026-05-14T14:13:00+08:00"
    },
    source_summary: {
      official_source_count: 3,
      supplemental_source_count: 2,
      third_party_source_count: 1,
      has_partial_failure: false,
      failed_sources: []
    },
    target_game: {
      app_id: 1145360,
      name: "Hades",
      steam_url: "https://store.steampowered.com/app/1145360/Hades/",
      subtitle: "把动作爽感、叙事反馈和 Roguelike 循环打磨到高度平衡的成熟标杆产品",
      price_final: metric("¥92", 92, "steam_store_supplement", "B"),
      review_score_desc: metric("好评如潮", "好评如潮", "steam_reviews_api/query_summary", "A"),
      total_reviews: metric("260,000+", 260000, "steam_reviews_api/query_summary", "A"),
      current_players: metric("8,400", 8400, "steam_web_api/ISteamUserStats/GetNumberOfCurrentPlayers", "A"),
      release_date: metric("2020-09-17", "2020-09-17", "steam_store_supplement", "B"),
      owner_estimate_low: metric("500 万", 5000000, "SteamSpy", "C"),
      owner_estimate_high: metric("1000 万", 10000000, "SteamSpy", "C"),
      owner_estimate_note: "基于 SteamSpy 区间估算，用于判断其成熟产品体量。",
      tags: ["动作 Roguelike", "神话题材", "单人", "高完成度", "叙事驱动"],
      developers: ["Supergiant Games"],
      publishers: ["Supergiant Games"],
      supported_languages: ["简体中文", "英语", "法语", "日语"],
      primary_confidence_tier: "A",
      available_fields: ["price_final", "review_score_desc", "total_reviews", "current_players", "owner_estimate_low", "owner_estimate_high"],
      missing_fields: []
    },
    competitor_candidates: [
      {
        app_id: 1145350,
        name: "Hades II",
        total_score: 94.8,
        selection_reason: "同系列直接续作，是最自然的纵向对比对象。",
        is_selected: true
      },
      {
        app_id: 632360,
        name: "Risk of Rain 2",
        total_score: 83.5,
        selection_reason: "同属高复玩动作 Roguelike，但多人驱动和传播方式不同。",
        is_selected: true
      },
      {
        app_id: 588650,
        name: "Dead Cells",
        total_score: 78.1,
        selection_reason: "同样强调动作手感与重复游玩，但叙事承载弱于 Hades。",
        is_selected: false
      }
    ],
    competitor_games: [
      {
        app_id: 1145350,
        name: "Hades II",
        price_final: metric("¥108", 108, "steam_store_supplement", "B"),
        release_date: metric("2024-05-07", "2024-05-07", "steam_store_supplement", "B"),
        review_score_desc: metric("特别好评", "特别好评", "steam_reviews_api/query_summary", "A"),
        total_reviews: metric("60,000+", 60000, "steam_reviews_api/query_summary", "A"),
        current_players: metric("17,800", 17800, "steam_web_api/ISteamUserStats/GetNumberOfCurrentPlayers", "A"),
        owner_estimate_low: metric("100 万", 1000000, "SteamSpy", "C"),
        owner_estimate_high: metric("200 万", 2000000, "SteamSpy", "C")
      },
      {
        app_id: 632360,
        name: "Risk of Rain 2",
        price_final: metric("¥80", 80, "steam_store_supplement", "B"),
        release_date: metric("2020-08-11", "2020-08-11", "steam_store_supplement", "B"),
        review_score_desc: metric("特别好评", "特别好评", "steam_reviews_api/query_summary", "A"),
        total_reviews: metric("200,000+", 200000, "steam_reviews_api/query_summary", "A"),
        current_players: metric("13,200", 13200, "steam_web_api/ISteamUserStats/GetNumberOfCurrentPlayers", "A"),
        owner_estimate_low: metric("400 万", 4000000, "SteamSpy", "C"),
        owner_estimate_high: metric("800 万", 8000000, "SteamSpy", "C")
      }
    ],
    llm_summary: {
      status: "success",
      positioning_summary: "Hades 是动作 Roguelike 中极少数同时把动作反馈、叙事推进和长期复玩做得都很完整的成熟标杆。",
      difference_points: [
        "相较 Hades II，它的优势是完整度和成品感更强，研究价值更偏向成熟循环拆解。",
        "相较 Risk of Rain 2，它在单人沉浸与角色叙事承载上更强，但社交传播属性较弱。",
        "基于 SteamSpy 拥有量区间估算，它已经属于大体量成熟独立产品，不适合再按小众 Roguelike 看待。"
      ],
      screening_recommendation: "建议继续深挖，重点研究它如何把叙事反馈嵌进高频死亡循环，而不破坏动作节奏。",
      data_caution: "当前结论同时引用了 Steam 官方公开数据和 SteamSpy 第三方估算，请将估算部分视为方向性参考。",
      used_fields: ["review_score_desc", "total_reviews", "current_players", "owner_estimate_low", "owner_estimate_high"],
      used_estimate_sources: ["SteamSpy"],
      model_name: "mock-gpt-5",
      generated_at: "2026-05-14T14:13:02+08:00"
    },
    debug_meta: {
      cache_hit: true,
      data_latency_ms: 980,
      llm_latency_ms: 650,
      total_latency_ms: 1630,
      partial_failure: false,
      warnings: ["当前为 mock 数据演示，数值仅用于页面结构验证。"]
    }
  }
];

function metric(displayValue, value, source, confidenceTier) {
  return {
    value,
    display_value: displayValue,
    is_missing: false,
    source,
    confidence_tier: confidenceTier,
    fetched_at: "2026-05-14T14:00:00+08:00"
  };
}
