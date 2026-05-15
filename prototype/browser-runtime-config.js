// Local prototype only. This file intentionally exposes the browser-direct LLM config to the page.
// Do not use this pattern in production deployments.
globalThis.BROWSER_LLM_RUNTIME_CONFIG = {
  "apiKey": "sk-uZtiWDJYsqjpeeCzqSkVPt18pBdZ9pY2z3GEYnwjq5kyuQ1Q",
  "baseUrl": "https://ai.shukelongda.cn/v1",
  "model": "gpt-5.4-mini",
  "reasoningEffort": "low",
  "envSource": "D:\\AI测试-何奕廷-高级游戏测评与研究专家\\prototype\\.env.local",
  "fallbacks": [
    {
      "label": "volcengine_ark_backup",
      "apiKey": "gi_client_ldkytijnkbr3jca2fnoplrx6sa9xtwey6wkw3zu2y361o2yg3p700bw7",
      "baseUrl": "https://ark.cn-beijing.volces.com/api/v3",
      "model": "doubao-seed-1-6-250615",
      "reasoningEffort": "low",
      "envSource": "D:\\AI测试-何奕廷-高级游戏测评与研究专家\\prototype\\.env.local"
    }
  ]
};
