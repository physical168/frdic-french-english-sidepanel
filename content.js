(() => {
  if (window.__frdicEnglishDictionaryInstalled) return;
  window.__frdicEnglishDictionaryInstalled = true;

  let currentWord = null;
  let timer = null;
  let poller = null;
  let observer = null;
  let active = true;

  function stop() {
    if (!active) return;
    active = false;
    if (timer !== null) clearTimeout(timer);
    if (poller !== null) clearInterval(poller);
    observer?.disconnect();
    window.removeEventListener("hashchange", scheduleScan);
    window.__frdicEnglishDictionaryInstalled = false;
  }

  function visible(element) {
    if (!element || !element.isConnected) return false;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
  }

  function cleanWord(value) {
    const word = (value || "").replace(/\s+/g, " ").trim();
    if (!word || word.length > 80) return null;
    if (!/^[\p{Script=Latin}\p{M}'’\-\s]+$/u.test(word)) return null;
    return word;
  }

  function findWord() {
    for (const element of document.querySelectorAll(".card-question")) {
      if (visible(element)) {
        const word = cleanWord(element.textContent);
        if (word) return word;
      }
    }

    // The newer study UI uses a large word in the card without .card-question.
    // Look for isolated Latin text with headline-sized type in the study area.
    const candidates = [];
    for (const element of document.querySelectorAll("h1, h2, h3, div, span, p, strong")) {
      if (element.closest("nav, button, [role='button'], [aria-hidden='true']")) continue;
      const word = cleanWord(element.textContent);
      if (!word || !visible(element)) continue;
      if ([...element.children].some(child => cleanWord(child.textContent) === word)) continue;
      const rect = element.getBoundingClientRect();
      if (rect.top < 35 || rect.top > window.innerHeight * 0.72 || rect.left >= window.innerWidth * 0.98) continue;
      const fontSize = parseFloat(getComputedStyle(element).fontSize);
      if (fontSize < 28) continue;
      const inCard = rect.left < window.innerWidth * 0.68 && rect.top > 100;
      const inDictionaryHeader = rect.left >= window.innerWidth * 0.35 && rect.top < 260;
      if (!inCard && !inDictionaryHeader) continue;
      candidates.push({ word, score: fontSize + (inCard ? 20 : 0) + (element.matches("h1, h2") ? 4 : 0) });
    }
    candidates.sort((a, b) => b.score - a.score);
    if (candidates.length) return candidates[0].word;

    // Some layouts keep the current word only in the built-in dictionary URL.
    for (const frame of document.querySelectorAll("iframe")) {
      if (!visible(frame)) continue;
      try {
        const url = new URL(frame.getAttribute("src") || "", location.href);
        if (!/(^|\.)frdic\.com$/i.test(url.hostname)) continue;
        if (!/\/dicts\/mini.*search/i.test(url.pathname)) continue;
        const word = cleanWord(url.searchParams.get("word"));
        if (word) return word;
      } catch (_error) {
        // The iframe URL may be empty while the card changes.
      }
    }
    return null;
  }

  function scan() {
    if (!active) return;
    timer = null;
    const word = findWord();
    if (word === currentWord) return;
    currentWord = word;
    try {
      const request = chrome.runtime.sendMessage({ type: "FRDIC_WORD_CHANGED", word });
      request?.catch(error => {
        if (/Extension context invalidated/i.test(error?.message || "")) stop();
      });
    } catch (_error) {
      // An unpacked extension can be reloaded while this old script remains in the page.
      stop();
    }
  }

  function scheduleScan() {
    if (!active) return;
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(scan, 120);
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "FRDIC_GET_WORD") {
      sendResponse({ word: findWord() });
    }
  });

  observer = new MutationObserver(scheduleScan);
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["src"]
  });

  window.addEventListener("hashchange", scheduleScan);
  poller = setInterval(scan, 750);
  scan();
})();
