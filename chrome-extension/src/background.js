// 背景脚本：初始化 DNR 规则、注册右键菜单并监听状态变化
chrome.runtime.onInstalled.addListener(async () => {
  // 初始化两个开关：adblock 默认开，xhs 自动登录默认关
  const stored = await chrome.storage.local.get(["adblockEnabled", "xhsAutoLoginEnabled"]);
  const adblockEnabled = stored.adblockEnabled !== false;
  const xhsAutoLoginEnabled = stored.xhsAutoLoginEnabled === true;
  await chrome.storage.local.set({ adblockEnabled, xhsAutoLoginEnabled });
  try {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: adblockEnabled ? ["rules_1"] : [],
      disableRulesetIds: adblockEnabled ? [] : ["rules_1"],
    });
  } catch (e) {
    console.error("DNR init failed", e);
  }

  // 创建右键菜单（选中文本保存到看板）
  try {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: "save-selection-to-board",
        title: "保存到词汇表",
        contexts: ["selection"],
      });
    });
  } catch (e) {
    console.error("contextMenus init failed", e);
  }
});

chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== "local" || !changes.adblockEnabled) return;
  const enabled = changes.adblockEnabled.newValue !== false;
  try {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: enabled ? ["rules_1"] : [],
      disableRulesetIds: enabled ? [] : ["rules_1"],
    });
  } catch (e) {
    console.error("DNR toggle failed", e);
  }
});

// 浏览器启动时，确保右键菜单存在
chrome.runtime.onStartup.addListener(() => {
  try {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: "save-selection-to-board",
        title: "保存到词汇表",
        contexts: ["selection"],
      });
    });
  } catch (e) {}
});

// API 配置
const API_BASE_URL = "https://llm-api-xi.vercel.app";
const STORAGE_KEY_API_KEY = "api_key";

// 检测是否为"单词"与工具函数
const normalize = (s) => (s || "").trim();
const isWord = (text) => {
  const t = normalize(text);
  if (!t || /\s/.test(t)) return false;
  return /^[A-Za-z][A-Za-z\-']{0,49}$/.test(t);
};
const sameWord = (a, b) => normalize(a).toLowerCase() === normalize(b).toLowerCase();
const sendToast = async (tabId, tip) => {
  if (!tabId) return;
  // 直接注入一段显示 toast 的脚本，避免消息与注入双触发造成重复
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (text) => {
        try {
          const ensureStyles = () => {
            if (document.getElementById("xhs-toast-style")) return;
            const style = document.createElement("style");
            style.id = "xhs-toast-style";
            style.textContent = `
              @keyframes xhs-fadein { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
              @keyframes xhs-fadeout { from { opacity: 1; } to { opacity: 0; } }
              .xhs-toast-wrap { position: fixed; top: 16px; left: 50%; transform: translateX(-50%); z-index: 2147483647; display: flex; flex-direction: column; gap: 8px; align-items: center; }
              .xhs-toast { max-width: 360px; padding: 10px 12px; border-radius: 8px; color: #e5faff; background: rgba(0,0,0,0.78); backdrop-filter: saturate(150%) blur(4px); box-shadow: 0 8px 24px rgba(0,0,0,0.25); font-size: 13px; line-height: 1.4; animation: xhs-fadein 120ms ease both; }
              .xhs-toast.fadeout { animation: xhs-fadeout 160ms ease forwards; }
            `;
            document.documentElement.appendChild(style);
          };
          ensureStyles();
          let wrap = document.getElementById("xhs-toast-wrap");
          if (!wrap) {
            wrap = document.createElement("div");
            wrap.id = "xhs-toast-wrap";
            wrap.className = "xhs-toast-wrap";
            document.documentElement.appendChild(wrap);
          }
          const node = document.createElement("div");
          node.className = "xhs-toast";
          node.textContent = text || "已保存到词汇表";
          wrap.appendChild(node);
          setTimeout(() => { node.classList.add("fadeout"); }, 1100);
          setTimeout(() => { node.remove(); }, 1300);
        } catch (_) {}
      },
      args: [tip || "已保存到词汇表"],
    });
  } catch (_) {}
};

// 文本分类与句子解析
const tokenizeWords = (text) => {
  const tokens = (text.match(/[A-Za-z][A-Za-z'-]*/g) || []).map((t) => t.toLowerCase());
  return Array.from(new Set(tokens));
};
const isSentence = (text) => {
  const t = normalize(text);
  const words = tokenizeWords(t);
  return /[.!?。！？]/.test(t) || words.length >= 6;
};

// 选择一个单词（当句子中没有已保存单词时）
const pickWordFromCandidates = async (tabId, candidates) => {
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      func: (words) => {
        return new Promise((resolve) => {
          try {
            const shadowHost = document.createElement('div');
            shadowHost.style.all = 'initial';
            shadowHost.style.position = 'fixed';
            shadowHost.style.zIndex = '2147483647';
            shadowHost.style.inset = '0';
            document.documentElement.appendChild(shadowHost);
            const root = shadowHost.attachShadow({ mode: 'open' });
            const style = document.createElement('style');
            style.textContent = `
              .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.35); display: flex; align-items: flex-start; justify-content: center; padding-top: 14vh; }
              .panel { width: min(520px, calc(100% - 40px)); background: #0b0f14; color: #e5e7eb; border: 1px solid #1f2937; border-radius: 10px; box-shadow: 0 12px 36px rgba(0,0,0,0.4); font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif; }
              .body { padding: 16px; }
              .title { font-size: 16px; font-weight: 600; margin-bottom: 10px; }
              .grid { display: flex; flex-wrap: wrap; gap: 8px; }
              .btn { border: 1px solid #334155; background: #111827; color: #e5e7eb; padding: 6px 10px; border-radius: 8px; cursor: pointer; }
              .btn:hover { border-color: #475569; }
              .footer { display: flex; justify-content: flex-end; margin-top: 12px; gap: 8px; }
            `;
            root.appendChild(style);
            const overlay = document.createElement('div'); overlay.className = 'overlay';
            const panel = document.createElement('div'); panel.className = 'panel';
            const body = document.createElement('div'); body.className = 'body';
            const title = document.createElement('div'); title.className = 'title'; title.textContent = '选择一个单词来保存该例句';
            const grid = document.createElement('div'); grid.className = 'grid';
            (words || []).slice(0, 20).forEach((w) => {
              const b = document.createElement('button'); b.className = 'btn'; b.textContent = w; b.addEventListener('click', () => { cleanup(); resolve(w); }); grid.appendChild(b);
            });
            const footer = document.createElement('div'); footer.className = 'footer';
            const cancel = document.createElement('button'); cancel.className = 'btn'; cancel.textContent = '取消'; cancel.addEventListener('click', () => { cleanup(); resolve(null); });
            function onKey(e){ if(e.key==='Escape'){ cleanup(); resolve(null);} }
            function cleanup(){ window.removeEventListener('keydown', onKey, true); shadowHost.remove(); }
            window.addEventListener('keydown', onKey, true);
            footer.appendChild(cancel);
            body.appendChild(title); body.appendChild(grid); body.appendChild(footer);
            panel.appendChild(body); overlay.appendChild(panel); root.appendChild(overlay);
          } catch { resolve(null); }
        });
      },
      args: [candidates],
    });
    return result || null;
  } catch { return null; }
};

// 获取 API Key
const getApiKey = async () => {
  const { [STORAGE_KEY_API_KEY]: apiKey } = await chrome.storage.local.get(STORAGE_KEY_API_KEY);
  return apiKey || "";
};

// 根据当前标签页 URL 动态获取 API Base URL
const getApiBaseUrl = async (tabId) => {
  try {
    if (tabId) {
      const tab = await chrome.tabs.get(tabId);
      if (tab && tab.url) {
        const url = new URL(tab.url);
        // 如果当前页面是 localhost，使用本地 API
        if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
          return 'http://localhost:3000';
        }
      }
    }
  } catch (error) {
    console.warn('[getApiBaseUrl] 无法获取标签页信息，使用默认 API URL:', error);
  }
  // 默认使用生产环境
  return API_BASE_URL;
};

// 调用 API 分析单词（获取基础信息和完整分析）
const analyzeWord = async (word, tabId = null) => {
  try {
    // 根据当前标签页动态获取 API Base URL
    const apiBaseUrl = await getApiBaseUrl(tabId);
    
    // 并行调用两个接口：基础信息（音标、音频）和完整分析（词性、词根、词族、翻译、例句）
    const [analyzeResponse, enrichmentResponse] = await Promise.allSettled([
      // 获取基础信息（音标、音频）
      fetch(`${apiBaseUrl}/api/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ word }),
      }),
      // 获取完整分析（词性、词根、词族、翻译、例句）
      fetch(`${apiBaseUrl}/api/word-enrichment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ word }),
      }),
    ]);

    // 处理基础信息结果
    let analyzeData = null;
    if (analyzeResponse.status === 'fulfilled' && analyzeResponse.value.ok) {
      analyzeData = await analyzeResponse.value.json();
    } else {
      console.warn("Failed to fetch word analysis from /api/analyze");
    }

    // 处理完整分析结果
    let enrichmentData = null;
    if (enrichmentResponse.status === 'fulfilled' && enrichmentResponse.value.ok) {
      enrichmentData = await enrichmentResponse.value.json();
      console.log("[analyzeWord] 成功获取词性、词根、词族、翻译和例句");
    } else {
      console.warn("Failed to fetch word enrichment");
    }

    // 合并结果
    const mergedResult = {
      // 基础信息（来自 /api/analyze）
      phonetic: analyzeData?.phonetic,
      audioUrl: analyzeData?.audioUrl,
      // 完整分析（来自 /api/word-enrichment）
      meanings: enrichmentData?.meanings,
      root: enrichmentData?.root,
      rootMeaning: enrichmentData?.rootMeaning,
      explanation: enrichmentData?.explanation,
      relatedWords: enrichmentData?.wordFamily || [],
    };

    return mergedResult;
  } catch (error) {
    console.error("Failed to analyze word:", error);
    return null;
  }
};

// 调用 API 保存单词
const saveWordToAPI = async (apiKey, wordData, tabId = null) => {
  try {
    // 根据当前标签页动态获取 API Base URL
    const apiBaseUrl = await getApiBaseUrl(tabId);
    
    const response = await fetch(`${apiBaseUrl}/api/words`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify(wordData),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Failed to save word:", error);
    throw error;
  }
};

// 调用 API 更新单词（添加例句）
const updateWordInAPI = async (apiKey, wordId, wordData, tabId = null) => {
  try {
    // 根据当前标签页动态获取 API Base URL
    const apiBaseUrl = await getApiBaseUrl(tabId);
    
    const response = await fetch(`${apiBaseUrl}/api/words`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({ id: wordId, ...wordData }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Failed to update word:", error);
    throw error;
  }
};

// 调用 API 检查单词是否存在
const checkWordExists = async (apiKey, word, tabId = null) => {
  try {
    // 根据当前标签页动态获取 API Base URL
    const apiBaseUrl = await getApiBaseUrl(tabId);
    
    const response = await fetch(`${apiBaseUrl}/api/words?word=${encodeURIComponent(word)}`, {
      method: "GET",
      headers: {
        "X-API-Key": apiKey,
      },
    });
    
    // 404 表示单词不存在，这是正常情况
    if (response.status === 404) {
      return null; // 单词不存在
    }
    
    // 401 表示认证失败，需要处理
    if (response.status === 401) {
      console.warn(`[checkWordExists] 认证失败，请检查 API Key`);
      return null; // 认证失败时也返回 null，避免阻塞流程
    }
    
    // 其他错误
    if (!response.ok) {
      console.warn(`[checkWordExists] 请求失败: ${response.status}`);
      return null; // 其他错误，假设不存在
    }
    
    return await response.json();
  } catch (error) {
    console.error("[checkWordExists] 请求异常:", error);
    return null;
  }
};

// 通知 board 页面刷新单词列表
// 检查 URL 是否可以被脚本注入访问
const isAccessibleUrl = (url) => {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  // 这些协议/前缀的页面无法通过脚本注入访问
  const forbiddenProtocols = [
    'chrome://',
    'chrome-extension://',
    'edge://',
    'about:',
    'moz-extension://',
  ];
  return !forbiddenProtocols.some(protocol => lowerUrl.startsWith(protocol));
};

const notifyBoardRefresh = async (sourceTabId) => {
  try {
    console.log("[notifyBoardRefresh] 开始通知 board 页面刷新");
    
    // 查找所有打开的 board 页面标签
    // 支持生产环境和本地开发环境
    const boardUrlPatterns = [
      `${API_BASE_URL}/board`,           // 生产环境
      'http://localhost:3000/board',     // 本地开发环境
      'http://127.0.0.1:3000/board',     // 本地开发环境（IP 地址）
    ];
    
    const allTabs = await chrome.tabs.query({});
    const boardTabs = allTabs.filter(tab => {
      if (!tab.url) return false;
      const url = tab.url.toLowerCase();
      // 检查是否匹配任何 board URL 模式
      return boardUrlPatterns.some(pattern => url.startsWith(pattern.toLowerCase())) ||
             url.includes('/board'); // 兜底：包含 /board 路径
    });
    
    console.log("[notifyBoardRefresh] 找到的 board 标签页:", boardTabs.length, boardTabs.map(t => t.url));

    if (boardTabs.length === 0) {
      console.log("[notifyBoardRefresh] 没有找到 board 页面，跳过通知");
      return; // 如果没有打开的 board 页面，静默返回，不显示 toast
    }

    // 向所有 board 页面发送刷新消息
    // 只使用 sendMessage，content script 会转发到页面，避免重复发送
    let successCount = 0;
    for (const tab of boardTabs) {
      if (!tab.id || !tab.url) continue;
      
      // 检查 URL 是否可访问
      if (!isAccessibleUrl(tab.url)) {
        console.warn(`[notifyBoardRefresh] 跳过无法访问的标签页 ${tab.id}: ${tab.url}`);
        continue;
      }
      
      try {
        // 只使用 sendMessage，content script 会接收并转发到页面
        await chrome.tabs.sendMessage(tab.id, { type: "refresh-words" });
        console.log(`[notifyBoardRefresh] 成功通过 sendMessage 通知标签页 ${tab.id}`);
        successCount++;
      } catch (e) {
        // 如果 sendMessage 失败（content script 未加载），使用 executeScript 作为备用
        // 但只在 URL 可访问的情况下尝试
        if (isAccessibleUrl(tab.url)) {
          try {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: () => {
                // 通过 window.postMessage 发送消息，因为 content script 可能未加载
                window.postMessage({ type: "refresh-words", source: "chrome-extension" }, "*");
                console.log("[notifyBoardRefresh] 通过 postMessage 发送刷新消息（备用方案）");
              },
            });
            console.log(`[notifyBoardRefresh] 成功通过 executeScript 通知标签页 ${tab.id}（备用方案）`);
            successCount++;
          } catch (err) {
            // 静默处理错误，避免在控制台显示过多错误信息
            if (err.message && !err.message.includes("Cannot access contents")) {
              console.warn(`[notifyBoardRefresh] 通知标签页 ${tab.id} 失败:`, err.message);
            }
          }
        } else {
          console.warn(`[notifyBoardRefresh] 跳过无法访问的标签页 ${tab.id}: ${tab.url}`);
        }
      }
    }
    
    console.log(`[notifyBoardRefresh] 完成，成功通知 ${successCount}/${boardTabs.length} 个标签页`);
  } catch (error) {
    console.error("[notifyBoardRefresh] 发生错误:", error);
    // 不显示 toast，避免干扰用户
  }
};

// 核心保存逻辑（使用 API）
const handleSaveSelection = async (tabId, url, title, selectedTextRaw) => {
  const text = normalize(selectedTextRaw);
  if (!text) return;

  // 获取 API Key
  const apiKey = await getApiKey();
  if (!apiKey) {
    await sendToast(tabId, "请先设置 API Key");
    return;
  }

  if (!isSentence(text)) {
    // 单词/词组：直接保存为词条
    const normalizedWord = normalize(text).toLowerCase().slice(0, 200);
    
    // 检查单词是否已存在
    const existingWord = await checkWordExists(apiKey, normalizedWord, tabId);
    if (existingWord) {
      await sendToast(tabId, "单词已存在");
      return;
    }

    try {
      // 分析单词获取信息（传入 tabId 以动态选择 API 地址）
      const analysis = await analyzeWord(normalizedWord, tabId);
      
      // 构建单词数据
      const wordData = {
        word: normalizedWord,
        originalWord: selectedTextRaw, // 保存原始选中文本
        url: url || "",
        title: title || "",
        sentences: [],
        phonetic: analysis?.phonetic,
        audioUrl: analysis?.audioUrl,
        meanings: analysis?.meanings, // 已包含翻译和例句
        root: analysis?.root,
        rootMeaning: analysis?.rootMeaning,
        relatedWords: analysis?.relatedWords,
      };

      // 保存到 API（传入 tabId 以动态选择 API 地址）
      await saveWordToAPI(apiKey, wordData, tabId);
      await sendToast(tabId, "已保存到词汇表");
      // 通知 board 页面刷新
      await notifyBoardRefresh(tabId);
    } catch (error) {
      console.error("Failed to save word:", error);
      await sendToast(tabId, `保存失败: ${error.message}`);
    }
    return;
  }

  // 句子：尝试挂载到已存在的单词
  const tokens = tokenizeWords(text);
  let matchedWord = null;
  
  // 检查句子中的单词是否已存在
  for (const token of tokens) {
    const existing = await checkWordExists(apiKey, token, tabId);
    if (existing) {
      matchedWord = existing;
      break;
    }
  }

  if (matchedWord) {
    // 单词已存在，添加例句
    const sentences = matchedWord.sentences || [];
    const newSentence = text.slice(0, 500);
    
    // 检查例句是否已存在
    if (sentences.some((s) => normalize(s).toLowerCase() === normalize(newSentence).toLowerCase())) {
      await sendToast(tabId, "例句已存在");
      return;
    }

    // 添加例句（最多20条）
    sentences.unshift(newSentence);
    const updatedSentences = sentences.slice(0, 20);

    try {
      await updateWordInAPI(apiKey, matchedWord.id, {
        sentences: updatedSentences,
      }, tabId);
      await sendToast(tabId, `例句已添加到 ${matchedWord.word}`);
      // 通知 board 页面刷新
      await notifyBoardRefresh(tabId);
    } catch (error) {
      console.error("Failed to update word:", error);
      await sendToast(tabId, `更新失败: ${error.message}`);
    }
    return;
  }

  // 没有匹配：让用户选择一个单词
  const pick = await pickWordFromCandidates(tabId, tokens);
  if (!pick) {
    await sendToast(tabId, "已取消");
    return;
  }

  const pickedWord = normalize(pick).toLowerCase().slice(0, 200);
  
  // 检查选择的单词是否已存在
  const existingPicked = await checkWordExists(apiKey, pickedWord, tabId);
  
  if (existingPicked) {
    // 单词已存在，添加例句
    const sentences = existingPicked.sentences || [];
    const newSentence = text.slice(0, 500);
    
    if (!sentences.some((s) => normalize(s).toLowerCase() === normalize(newSentence).toLowerCase())) {
      sentences.unshift(newSentence);
      const updatedSentences = sentences.slice(0, 20);
      
      try {
        await updateWordInAPI(apiKey, existingPicked.id, {
          sentences: updatedSentences,
        }, tabId);
        await sendToast(tabId, `例句已添加到 ${existingPicked.word}`);
        // 通知 board 页面刷新
        await notifyBoardRefresh(tabId);
      } catch (error) {
        console.error("Failed to update word:", error);
        await sendToast(tabId, `更新失败: ${error.message}`);
      }
    } else {
      await sendToast(tabId, "例句已存在");
    }
  } else {
    // 创建新单词并添加例句
    try {
      const analysis = await analyzeWord(pickedWord, tabId);
      
      const wordData = {
        word: pickedWord,
        url: url || "",
        title: title || "",
        sentences: [text.slice(0, 500)],
        phonetic: analysis?.phonetic,
        audioUrl: analysis?.audioUrl,
        meanings: analysis?.meanings, // 已包含翻译和例句
        root: analysis?.root,
        rootMeaning: analysis?.rootMeaning,
        relatedWords: analysis?.relatedWords,
      };

      await saveWordToAPI(apiKey, wordData, tabId);
      await sendToast(tabId, `已保存到词汇表，并将例句关联到 ${pickedWord}`);
      // 通知 board 页面刷新
      await notifyBoardRefresh(tabId);
    } catch (error) {
      console.error("Failed to save word:", error);
      await sendToast(tabId, `保存失败: ${error.message}`);
    }
  }
};

// 右键菜单点击：写入所选文本到本地存储
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "save-selection-to-board") return;
  const selectedTextRaw = (info.selectionText || "").trim();
  if (!selectedTextRaw) return;
  try {
    await handleSaveSelection(tab?.id, info.pageUrl || (tab && tab.url) || "", (tab && tab.title) || "", selectedTextRaw);
  } catch (e) {
    console.error("Failed to save selection", e);
  }
});

// 接收内容脚本的快捷键保存
chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  if (!msg || msg.type !== "save-selection") return;
  const selectedTextRaw = (msg.text || "").trim();
  if (!selectedTextRaw) return;
  try {
    await handleSaveSelection(sender?.tab?.id, msg.url || (sender?.tab?.url) || "", msg.title || (sender?.tab?.title) || "", selectedTextRaw);
  } catch (e) {
    console.error("Failed to save selection (hotkey)", e);
  }
});

// 键盘命令（避免与浏览器缩放冲突）：Alt+S
chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command !== "save_selected_text") return;
  try {
    // 在当前或最近的普通网页标签页中获取 selection（避开扩展/内部页面）
    const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
    const isForbidden = (u) => !u || u.startsWith("chrome-extension://") || u.startsWith("chrome://") || u.startsWith("edge://") || u.startsWith("chrome-devtools://");
    let targetTab = active;
    if (!targetTab || isForbidden(targetTab.url)) {
      const candidates = await chrome.tabs.query({ lastFocusedWindow: true, url: ["http://*/*", "https://*/*", "file:///*"] });
      if (!candidates?.length) return;
      targetTab = candidates.find(t => t.active) || candidates[0];
    }
    if (!targetTab?.id) return;

    const results = await chrome.scripting.executeScript({
      target: { tabId: targetTab.id, allFrames: true },
      func: () => {
        function getSelectionFromDocument(doc) {
          try {
            let text = doc.getSelection?.().toString() || "";
            const ae = doc.activeElement;
            if (ae) {
              const tag = (ae.tagName || "").toLowerCase();
              const isInput = tag === "input" || tag === "textarea";
              if (isInput && typeof ae.selectionStart === "number" && typeof ae.selectionEnd === "number") {
                const start = Math.min(ae.selectionStart, ae.selectionEnd);
                const end = Math.max(ae.selectionStart, ae.selectionEnd);
                if (end > start) text = ae.value.slice(start, end);
              } else if (ae.isContentEditable) {
                const sel = doc.getSelection?.().toString();
                if (sel) text = sel;
              }
            }
            return (text || "").trim();
          } catch (e) {
            return "";
          }
        }
        return getSelectionFromDocument(document);
      },
    });
    const merged = (results || []).map(r => (r && r.result) || "").filter(Boolean);
    const text = Array.from(new Set(merged.join("\n").split("\n").map(s => s.trim()))).filter(Boolean).join("\n");
    if (!text) return;
    await handleSaveSelection(targetTab?.id, targetTab.url || "", targetTab.title || "", text);
  } catch (e) {
    console.error("Command save_selected_text failed", e);
  }
});


