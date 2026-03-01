// Plus One Thing — Service Worker (MV3 Background)
// Orchestrates: icon click, context menus, dedup, Obsidian API, badge feedback

// ── All listeners MUST be registered at top level (MV3 requirement) ──

chrome.action.onClicked.addListener(handleIconClick);
chrome.contextMenus.onClicked.addListener(handleContextMenuClick);
chrome.runtime.onInstalled.addListener(handleInstall);

// ── Installation: create context menus, prune old hashes ──

function handleInstall() {
  chrome.contextMenus.create({
    id: "clip-page",
    title: "Plus One \u2014 Clip Full Page",
    contexts: ["page"],
  });
  chrome.contextMenus.create({
    id: "clip-selection",
    title: "Plus One \u2014 Clip Selection",
    contexts: ["selection"],
  });
  chrome.contextMenus.create({
    id: "clip-selection-custom",
    title: "Plus One \u2014 Clip Selection (Custom)",
    contexts: ["selection"],
  });
  chrome.contextMenus.create({
    id: "view-history",
    title: "View History",
    contexts: ["action"],
  });
  pruneOldHashes();
}

// ── Icon click: 1-click save ──

async function handleIconClick(tab) {
  const config = await getConfig();
  if (!config.apiKey) {
    chrome.runtime.openOptionsPage();
    return;
  }
  try {
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: "extract",
      type: "page",
    });
    await processAndSave(response, "page", config, tab.id);
  } catch (err) {
    console.error("Plus One Thing:", err);
    showBadge("ERR", "#ef4444", tab.id);
  }
}

// ── Context menu click ──

async function handleContextMenuClick(info, tab) {
  const config = await getConfig();
  if (!config.apiKey) {
    chrome.runtime.openOptionsPage();
    return;
  }

  switch (info.menuItemId) {
    case "clip-page":
      try {
        const response = await chrome.tabs.sendMessage(tab.id, {
          action: "extract",
          type: "page",
        });
        await processAndSave(response, "page", config, tab.id);
      } catch (err) {
        console.error("Plus One Thing clip-page:", err);
        showBadge("ERR", "#ef4444", tab.id);
      }
      break;

    case "clip-selection":
      try {
        const response = await chrome.tabs.sendMessage(tab.id, {
          action: "extract",
          type: "selection",
          selectionText: info.selectionText || "",
        });
        await processAndSave(response, "clip", config, tab.id);
      } catch (err) {
        console.error("Plus One Thing clip-selection:", err);
        showBadge("ERR", "#ef4444", tab.id);
      }
      break;

    case "clip-selection-custom":
      try {
        const response = await chrome.tabs.sendMessage(tab.id, {
          action: "extract",
          type: "selection",
          selectionText: info.selectionText || "",
        });
        await processAndSave(response, "clip", config, tab.id);
        // Open history tab so user can edit metadata
        chrome.tabs.create({ url: chrome.runtime.getURL("popup.html") });
      } catch (err) {
        console.error("Plus One Thing clip-custom:", err);
        showBadge("ERR", "#ef4444", tab.id);
      }
      break;

    case "view-history":
      chrome.tabs.create({ url: chrome.runtime.getURL("popup.html") });
      break;
  }
}

// ── Core: process extraction result, dedup, save ──

async function processAndSave(response, type, config, tabId) {
  if (!response || !response.markdown) {
    showBadge("ERR", "#ef4444", tabId);
    return;
  }

  const hash = await sha256(response.title + response.rawFirst500);
  const isDuplicate = await checkDuplicate(hash);

  if (isDuplicate) {
    showBadge("DUP", "#f59e0b", tabId);
    return;
  }

  const block = buildBlock(response, type, config);
  await appendToObsidian(block, config);
  await storeHash(hash, {
    title: response.title,
    url: response.url,
    type: type,
  });
  showBadge("\u2713", "#10b981", tabId);
}

// ── Obsidian REST API ──

async function appendToObsidian(markdownBlock, config) {
  const today = new Date().toISOString().slice(0, 10);
  const notePath = `${config.dailyFolder}/${today}.md`;
  const url = `${config.baseUrl}/vault/${encodeURIComponent(notePath)}`;

  // Try PATCH with Create-Target-If-Missing
  const patchRes = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "text/markdown",
      Operation: "append",
      "Target-Type": "heading",
      Target: "Context Blocks",
      "Create-Target-If-Missing": "true",
    },
    body: markdownBlock,
  });

  if (patchRes.ok) return;

  // Fallback: note doesn't exist (404) → create with PUT
  if (patchRes.status === 404) {
    const fullContent = `# ${today}\n\n## Context Blocks\n\n${markdownBlock}`;
    const putRes = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "text/markdown",
      },
      body: fullContent,
    });
    if (!putRes.ok) {
      throw new Error(`PUT failed: ${putRes.status} ${putRes.statusText}`);
    }
    return;
  }

  throw new Error(`PATCH failed: ${patchRes.status} ${patchRes.statusText}`);
}

// ── Frontmatter block builder ──

function buildBlock(data, type, config) {
  const now = new Date().toISOString();
  const project = config.defaultProject || "personal-ai";
  const title = escapeYaml(data.title || "Untitled");

  return (
    `---\n` +
    `title: "${title}"\n` +
    `url: "${data.url}"\n` +
    `date: "${now}"\n` +
    `attention-of: "all"\n` +
    `projects:\n` +
    `  - "${project}"\n` +
    `importance: false\n` +
    `labels:\n` +
    `  - "web"\n` +
    `comment: ""\n` +
    `type: "${type}"\n` +
    `delete-flag: false\n` +
    `---\n\n` +
    data.markdown +
    `\n\n---\n\n`
  );
}

function escapeYaml(str) {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, " ");
}

// ── Dedup: SHA-256 via SubtleCrypto ──

async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function checkDuplicate(hash) {
  const result = await chrome.storage.local.get(hash);
  return !!result[hash];
}

async function storeHash(hash, { title, url, type }) {
  await chrome.storage.local.set({
    [hash]: { title, url, date: new Date().toISOString(), type },
  });
}

async function pruneOldHashes() {
  const all = await chrome.storage.local.get(null);
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const stale = [];
  for (const [key, val] of Object.entries(all)) {
    if (val && val.date && new Date(val.date).getTime() < cutoff) {
      stale.push(key);
    }
  }
  if (stale.length) await chrome.storage.local.remove(stale);
}

// ── Badge feedback ──

function showBadge(text, color, tabId) {
  const opts = tabId ? { text, tabId } : { text };
  chrome.action.setBadgeText(opts);
  chrome.action.setBadgeBackgroundColor({
    color,
    ...(tabId ? { tabId } : {}),
  });
  setTimeout(() => {
    chrome.action.setBadgeText(tabId ? { text: "", tabId } : { text: "" });
  }, 2000);
}

// ── Config ──

async function getConfig() {
  const defaults = {
    baseUrl: "http://127.0.0.1:27124",
    apiKey: "",
    dailyFolder: "Daily",
    projects: ["personal-ai"],
    defaultProject: "personal-ai",
  };
  return await chrome.storage.sync.get(defaults);
}
