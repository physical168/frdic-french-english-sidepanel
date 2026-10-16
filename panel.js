const wordElement = document.getElementById("word");
const pronunciationElement = document.getElementById("pronunciation");
const statusElement = document.getElementById("status");
const definitionsElement = document.getElementById("definitions");
const sourceElement = document.getElementById("source");
const modeElement = document.getElementById("mode");
const manualInput = document.getElementById("manual-word");

const cache = new Map();
const partNames = new Set([
  "Noun", "Verb", "Adjective", "Adverb", "Pronoun", "Preposition",
  "Conjunction", "Interjection", "Determiner", "Article", "Numeral",
  "Proper noun", "Participle", "Phrase", "Proverb"
]);
let activeTabId = null;
let currentWord = null;
let requestNumber = 0;

function cleanWord(value) {
  const word = (value || "").replace(/\s+/g, " ").trim();
  return word && word.length <= 80 && /^[\p{L}\p{M}'’\-\s]+$/u.test(word) ? word : null;
}

function sourceUrl(word) {
  return `https://en.wiktionary.org/wiki/${encodeURIComponent(word)}#French`;
}

function sectionTitle(section) {
  return section.querySelector(":scope > h3, :scope > h4, :scope > h5")?.textContent.trim() || "";
}

function definitionText(listItem) {
  const copy = listItem.cloneNode(true);
  copy.querySelectorAll("ol, ul, dl, table, figure, .citation, .quotations").forEach(item => item.remove());
  return copy.textContent.replace(/\s+/g, " ").trim().slice(0, 350);
}

function parseEntry(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const frenchHeading = [...doc.querySelectorAll("h2")]
    .find(heading => heading.textContent.trim() === "French");
  const frenchSection = frenchHeading?.closest("section");
  if (!frenchSection) return null;

  const groups = [];
  let pronunciation = null;
  let lemma = null;
  for (const heading of frenchSection.querySelectorAll("h3, h4, h5")) {
    const section = heading.closest("section");
    if (!section || !frenchSection.contains(section)) continue;
    const title = sectionTitle(section);
    if (title !== heading.textContent.trim()) continue;

    if (title === "Pronunciation" && !pronunciation) {
      const match = section.textContent.match(/\/[^/\n]{2,80}\//);
      if (match) pronunciation = match[0];
    }
    if (!partNames.has(title)) continue;

    const list = section.querySelector(":scope > ol");
    if (!list) continue;
    const definitions = [...list.children]
      .filter(item => item.tagName === "LI")
      .map(item => {
        const text = definitionText(item);
        if (!lemma && /(?:participle|inflection|plural|singular|feminine|masculine|form) of\b/i.test(text)) {
          const links = [...item.querySelectorAll('a[href$="#French"]')];
          const lastLink = links.at(-1);
          const candidate = lastLink?.textContent.trim();
          if (cleanWord(candidate)) lemma = candidate;
        }
        return text;
      })
      .filter(Boolean)
      .slice(0, 5);
    if (definitions.length) groups.push({ part: title, definitions });
    if (groups.length >= 5) break;
  }
  const allDefinitions = groups.flatMap(group => group.definitions);
  const formOnly = allDefinitions.length > 0 && allDefinitions.every(text =>
    /(?:participle|inflection|plural|singular|feminine|masculine|form) of\b/i.test(text)
  );
  return { pronunciation, groups, lemma: formOnly ? lemma : null };
}

async function lookup(word, followForms = true) {
  const key = word.toLocaleLowerCase("fr");
  if (cache.has(key)) return cache.get(key);
  const url = `https://en.wiktionary.org/w/rest.php/v1/page/${encodeURIComponent(word)}/html`;
  const response = await fetch(url, { headers: { Accept: "text/html" } });
  if (response.status === 404) {
    cache.set(key, null);
    return null;
  }
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const entry = parseEntry(await response.text());
  if (followForms && entry?.lemma && entry.lemma.toLocaleLowerCase("fr") !== key) {
    try {
      entry.base = { word: entry.lemma, entry: await lookup(entry.lemma, false) };
    } catch (_error) {
      // 原形不可用时仍显示当前词条与原形名称。
    }
  }
  cache.set(key, entry);
  return entry;
}

function renderEntry(entry) {
  definitionsElement.replaceChildren();
  if (!entry?.groups.length) {
    statusElement.hidden = false;
    statusElement.textContent = "英文维基词典没有找到这个词的法语英文释义。可打开原词条查看其他词形。";
    pronunciationElement.hidden = true;
    return;
  }
  statusElement.hidden = true;
  pronunciationElement.hidden = !entry.pronunciation;
  pronunciationElement.textContent = entry.pronunciation || "";

  function addGroup(group, label = group.part) {
    const part = document.createElement("section");
    part.className = "part";
    const heading = document.createElement("h3");
    heading.textContent = label;
    const list = document.createElement("ol");
    for (const definition of group.definitions) {
      const item = document.createElement("li");
      item.textContent = definition;
      list.append(item);
    }
    part.append(heading, list);
    definitionsElement.append(part);
  }
  for (const group of entry.groups) addGroup(group);
  if (entry.base?.entry?.groups.length) {
    for (const group of entry.base.entry.groups) {
      addGroup(group, `原形 ${entry.base.word} · ${group.part}`);
    }
  }
}

async function showWord(value, mode = "自动识别") {
  const word = cleanWord(value);
  if (!word) {
    currentWord = null;
    requestNumber++;
    wordElement.textContent = "等待单词…";
    modeElement.textContent = "自动识别";
    sourceElement.hidden = true;
    pronunciationElement.hidden = true;
    definitionsElement.replaceChildren();
    statusElement.hidden = false;
    statusElement.textContent = "打开法语助手的背词页面即可开始。";
    return;
  }
  if (word === currentWord && mode === modeElement.textContent) return;
  currentWord = word;
  const thisRequest = ++requestNumber;
  modeElement.textContent = mode;
  wordElement.textContent = word;
  sourceElement.href = sourceUrl(word);
  sourceElement.hidden = false;
  pronunciationElement.hidden = true;
  definitionsElement.replaceChildren();
  statusElement.hidden = false;
  statusElement.textContent = "正在查找英文释义…";

  try {
    const entry = await lookup(word);
    if (thisRequest === requestNumber) renderEntry(entry);
  } catch (_error) {
    if (thisRequest !== requestNumber) return;
    statusElement.textContent = "词典暂时无法连接。请检查网络后重新查询。";
  }
}

async function syncActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  activeTabId = tab?.id ?? null;
  if (activeTabId === null) return showWord(null);
  try {
    const response = await chrome.tabs.sendMessage(activeTabId, { type: "FRDIC_GET_WORD" });
    await showWord(response?.word ?? null);
  } catch (_error) {
    await showWord(null);
  }
}

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type === "FRDIC_WORD_CHANGED" && sender.tab?.id === activeTabId) {
    showWord(message.word);
  }
});

chrome.tabs.onActivated.addListener(syncActiveTab);
chrome.windows.onFocusChanged.addListener(syncActiveTab);
document.getElementById("lookup-form").addEventListener("submit", event => {
  event.preventDefault();
  const word = cleanWord(manualInput.value);
  if (!word) {
    manualInput.setCustomValidity("请输入法语单词或短语");
    manualInput.reportValidity();
    return;
  }
  manualInput.setCustomValidity("");
  showWord(word, "手动查询");
});
manualInput.addEventListener("input", () => manualInput.setCustomValidity(""));
syncActiveTab();
