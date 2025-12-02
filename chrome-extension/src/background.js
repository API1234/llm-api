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

// 调用 API 分析单词
const analyzeWord = async (word) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ word }),
    });
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Failed to analyze word:", error);
    return null;
  }
};

// 调用 API 保存单词
const saveWordToAPI = async (apiKey, wordData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/words`, {
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
const updateWordInAPI = async (apiKey, wordId, wordData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/words`, {
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
const checkWordExists = async (apiKey, word) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/words?word=${encodeURIComponent(word)}`, {
      method: "GET",
      headers: {
        "X-API-Key": apiKey,
      },
    });
    if (response.status === 404) {
      return null; // 单词不存在
    }
    if (!response.ok) {
      return null; // 其他错误，假设不存在
    }
    return await response.json();
  } catch (error) {
    console.error("Failed to check word:", error);
    return null;
  }
};

// 通知 board 页面刷新单词列表
const notifyBoardRefresh = async () => {
  try {
    // 查找所有打开的 board 页面标签
    const boardUrl = `${API_BASE_URL}/board`;
    const tabs = await chrome.tabs.query({ url: `${boardUrl}*` });
    
    // 向所有 board 页面发送刷新消息
    for (const tab of tabs) {
      if (tab.id) {
        try {
          await chrome.tabs.sendMessage(tab.id, { type: "refresh-words" });
        } catch (e) {
          // 如果标签页没有加载 content script，尝试注入脚本
          try {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: () => {
                // 通过 window.postMessage 发送消息，因为 content script 可能未加载
                window.postMessage({ type: "refresh-words", source: "chrome-extension" }, "*");
              },
            });
          } catch (err) {
            console.log("Failed to notify board page:", err);
          }
        }
      }
    }
  } catch (error) {
    console.error("Failed to notify board refresh:", error);
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
    const existingWord = await checkWordExists(apiKey, normalizedWord);
    if (existingWord) {
      await sendToast(tabId, "单词已存在");
      return;
    }

    try {
      // 分析单词获取信息
      const analysis = await analyzeWord(normalizedWord);
      
      // 构建单词数据
      const wordData = {
        word: normalizedWord,
        url: url || "",
        title: title || "",
        sentences: [],
        phonetic: analysis?.phonetic,
        audioUrl: analysis?.audioUrl,
        meanings: analysis?.meanings,
        root: analysis?.root,
        relatedWords: analysis?.relatedWords,
      };

      // 保存到 API
      await saveWordToAPI(apiKey, wordData);
      await sendToast(tabId, "已保存到词汇表");
      // 通知 board 页面刷新
      await notifyBoardRefresh();
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
    const existing = await checkWordExists(apiKey, token);
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
      });
      await sendToast(tabId, `例句已添加到 ${matchedWord.word}`);
      // 通知 board 页面刷新
      await notifyBoardRefresh();
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
  const existingPicked = await checkWordExists(apiKey, pickedWord);
  
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
        });
        await sendToast(tabId, `例句已添加到 ${existingPicked.word}`);
        // 通知 board 页面刷新
        await notifyBoardRefresh();
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
      const analysis = await analyzeWord(pickedWord);
      
      const wordData = {
        word: pickedWord,
        url: url || "",
        title: title || "",
        sentences: [text.slice(0, 500)],
        phonetic: analysis?.phonetic,
        audioUrl: analysis?.audioUrl,
        meanings: analysis?.meanings,
        root: analysis?.root,
        relatedWords: analysis?.relatedWords,
      };

      await saveWordToAPI(apiKey, wordData);
      await sendToast(tabId, `已保存到词汇表，并将例句关联到 ${pickedWord}`);
      // 通知 board 页面刷新
      await notifyBoardRefresh();
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


