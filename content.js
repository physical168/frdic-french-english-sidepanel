(() => {
  if (window.__frdicEnglishDictionaryInstalled) return;
  window.__frdicEnglishDictionaryInstalled = true;

  let currentWord = null;
  let currentRoute = location.hash;
  let timer = null;

  function visible(element) {
    if (!element || !element.isConnected) return false;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
  }

  function cleanWord(value) {
    const word = (value || "").replace(/\s+/g, " ").trim();
    if (!word || word.length > 80) return null;
    if (!/^[\p{L}\p{M}'’\-\s]+$/u.test(word)) return null;
    return word;
  }

  function findWord() {
    if (!location.hash.startsWith("#/exam")) return null;

    for (const element of document.querySelectorAll(".card-question")) {
      if (visible(element)) {
        const word = cleanWord(element.textContent);
        if (word) return word;
      }
    }

    // 答题卡隐藏后，法语助手仍在中间的词典 iframe 地址里保留当前词。
    for (const frame of document.querySelectorAll("iframe.explain-frame")) {
      if (!visible(frame)) continue;
      try {
        const url = new URL(frame.getAttribute("src") || "", location.href);
        if (!/(^|\.)frdic\.com$/i.test(url.hostname)) continue;
        if (url.pathname.toLowerCase() !== "/dicts/minidictsearch2") continue;
        const word = cleanWord(url.searchParams.get("word"));
        if (word) return word;
      } catch (_error) {
        // 正在切换卡片时，iframe 地址可能暂时为空。
      }
    }

    // 兼容法语助手在显示答案后把单词移入右侧词典的布局。
    const candidates = [...document.querySelectorAll("h1, h2, .word-title, .word-head")]
      .filter(visible)
      .filter(element => {
        const rect = element.getBoundingClientRect();
        return rect.top < 260 && rect.left > window.innerWidth * 0.35;
      });
    for (const element of candidates) {
      const word = cleanWord(element.textContent);
      if (word) return word;
    }
    return null;
  }

  function scan() {
    timer = null;
    const word = findWord();
    if (word === currentWord) return;
    currentWord = word;
    chrome.runtime.sendMessage({ type: "FRDIC_WORD_CHANGED", word }).catch(() => {});
  }

  function scheduleScan() {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(scan, 120);
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "FRDIC_GET_WORD") {
      sendResponse({ word: findWord() });
    }
  });

  const observer = new MutationObserver(scheduleScan);
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["src"]
  });

  window.addEventListener("hashchange", scheduleScan);
  setInterval(() => {
    if (location.hash !== currentRoute) {
      currentRoute = location.hash;
    }
    scan();
  }, 750);
  scan();
})();
