// Popup：Switch 控制去广告与 XHS 自动登录，并打开看板
document.addEventListener("DOMContentLoaded", async () => {
  const openBoardBtn = document.getElementById("openBoard");
  const switchAdblock = document.getElementById("switchAdblock");
  const switchXhs = document.getElementById("switchXhs");
  const themeSelect = document.getElementById("themeSelect");
  const apiKeyInput = document.getElementById("apiKeyInput");
  const saveApiKeyBtn = document.getElementById("saveApiKeyBtn");
  
  // API Key 管理
  const STORAGE_KEY_API_KEY = "api_key";
  
  // 初始化 API Key
  {
    const { [STORAGE_KEY_API_KEY]: apiKey } = await chrome.storage.local.get(STORAGE_KEY_API_KEY);
    if (apiKeyInput && apiKey) {
      apiKeyInput.value = apiKey;
    }
  }
  
  // 保存 API Key
  if (saveApiKeyBtn && apiKeyInput) {
    saveApiKeyBtn.addEventListener("click", async () => {
      const apiKey = apiKeyInput.value.trim();
      if (apiKey) {
        await chrome.storage.local.set({ [STORAGE_KEY_API_KEY]: apiKey });
        saveApiKeyBtn.textContent = "已保存";
        saveApiKeyBtn.classList.add("bg-green-500", "hover:bg-green-600");
        saveApiKeyBtn.classList.remove("bg-cyan-500", "hover:bg-cyan-600");
        setTimeout(() => {
          saveApiKeyBtn.textContent = "保存";
          saveApiKeyBtn.classList.remove("bg-green-500", "hover:bg-green-600");
          saveApiKeyBtn.classList.add("bg-cyan-500", "hover:bg-cyan-600");
        }, 2000);
      }
    });
    
    // 支持 Enter 键保存
    apiKeyInput.addEventListener("keypress", async (e) => {
      if (e.key === "Enter") {
        saveApiKeyBtn.click();
      }
    });
  }

  // 初始化 Switch 状态
  {
    const { adblockEnabled } = await chrome.storage.local.get("adblockEnabled");
    const enabled = adblockEnabled !== false;
    if (switchAdblock) switchAdblock.checked = enabled;
  }
  {
    const { xhsAutoLoginEnabled } = await chrome.storage.local.get("xhsAutoLoginEnabled");
    if (switchXhs) switchXhs.checked = xhsAutoLoginEnabled === true;
  }

  // 去广告开关：更新存储 + 即时更新当前标签页样式
  if (switchAdblock) {
    switchAdblock.addEventListener("change", async () => {
      const enabled = !!switchAdblock.checked;
      await chrome.storage.local.set({ adblockEnabled: enabled });
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.id) {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (isEnabled) => {
              document.documentElement.classList.toggle("adblock-enabled", isEnabled);
            },
            args: [enabled],
          });
        }
      } catch (e) {}
    });
  }

  // XHS 自动登录开关：仅更新存储，内容脚本监听后触发
  if (switchXhs) {
    switchXhs.addEventListener("change", async () => {
      const enabled = !!switchXhs.checked;
      await chrome.storage.local.set({ xhsAutoLoginEnabled: enabled });
    });
  }

  // 打开词汇表（默认使用 Vercel 部署地址，可在 manifest.json 中配置）
  if (openBoardBtn) {
    openBoardBtn.addEventListener("click", async () => {
      try {
        // 默认使用 Vercel 部署地址
        // 如需修改，可以在 manifest.json 的 host_permissions 中添加自定义域名
        const boardUrl = "https://llm-api-xi.vercel.app/board";
        await chrome.tabs.create({ url: boardUrl });
      } catch (e) {
        console.error("Failed to open board:", e);
      }
    });
  }

  // 初始化主题并监听切换
  const applyTheme = (value) => {
    const cls = `theme-${value}`;
    document.documentElement.classList.remove("theme-cyan", "theme-purple", "theme-pink", "theme-green", "theme-slate");
    document.documentElement.classList.add(cls);
  };
  {
    const { themePreset } = await chrome.storage.local.get("themePreset");
    const value = themePreset || "cyan"; // 默认电光青蓝
    if (themeSelect) themeSelect.value = value;
    applyTheme(value);
  }
  if (themeSelect) {
    themeSelect.addEventListener("change", async () => {
      const value = themeSelect.value;
      await chrome.storage.local.set({ themePreset: value });
      applyTheme(value);
    });
  }
});


