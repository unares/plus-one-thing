// Plus One Thing — Popup / History Page

let allItems = [];
let activeProject = "all";

document.addEventListener("DOMContentLoaded", async () => {
  // Load config for project list
  const config = await chrome.storage.sync.get({
    projects: ["personal-ai"],
  });

  // Build project filter chips
  const filterEl = document.getElementById("projectFilter");
  const allChip = createChip("all", true);
  filterEl.appendChild(allChip);
  for (const p of config.projects) {
    filterEl.appendChild(createChip(p, false));
  }

  // Load history from storage
  const all = await chrome.storage.local.get(null);
  allItems = Object.entries(all)
    .filter(([_, v]) => v && v.date && v.title)
    .map(([hash, v]) => ({ hash, ...v }))
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  renderItems();
});

function createChip(label, active) {
  const chip = document.createElement("span");
  chip.className = "project-chip" + (active ? " active" : "");
  chip.textContent = label;
  chip.addEventListener("click", () => {
    document
      .querySelectorAll(".project-chip")
      .forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    activeProject = label;
    renderItems();
  });
  return chip;
}

function renderItems() {
  const listEl = document.getElementById("list");
  const items = allItems; // project filtering would require storing project in hash metadata

  if (items.length === 0) {
    listEl.innerHTML = '<div class="empty">No clips yet. Click the +1 icon on any page to start.</div>';
    return;
  }

  listEl.innerHTML = "";
  for (const item of items) {
    const el = document.createElement("div");
    el.className = "item" + (item.deleted ? " flagged" : "");

    const typeIcon = item.type === "clip" ? "\u2702\uFE0F" : "\uD83D\uDCC4";
    const date = new Date(item.date).toLocaleString();
    const shortUrl = item.url
      ? item.url.replace(/^https?:\/\//, "").substring(0, 40)
      : "";

    el.innerHTML = `
      <div class="item-header">
        <span class="type-icon">${typeIcon}</span>
        <span class="item-title"><a href="${escapeHtml(item.url || "#")}" target="_blank">${escapeHtml(item.title)}</a></span>
      </div>
      <div class="item-meta">
        <span class="item-url" title="${escapeHtml(item.url || "")}">${escapeHtml(shortUrl)}</span>
        <span>${date}</span>
      </div>
      <div class="item-meta" style="margin-top:0.3rem">
        <div class="item-actions">
          <button class="btn-tiny delete" data-hash="${item.hash}" title="Toggle delete flag">${item.deleted ? "Restore" : "Delete"}</button>
        </div>
      </div>
    `;

    el.querySelector(".btn-tiny.delete").addEventListener("click", async (e) => {
      const hash = e.target.dataset.hash;
      const stored = await chrome.storage.local.get(hash);
      if (stored[hash]) {
        stored[hash].deleted = !stored[hash].deleted;
        await chrome.storage.local.set({ [hash]: stored[hash] });
        // Update local state and re-render
        const idx = allItems.findIndex((i) => i.hash === hash);
        if (idx !== -1) allItems[idx].deleted = stored[hash].deleted;
        renderItems();
      }
    });

    listEl.appendChild(el);
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
