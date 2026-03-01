// Plus One Thing — Options Page

const DEFAULTS = {
  baseUrl: "http://127.0.0.1:27124",
  apiKey: "",
  dailyFolder: "Daily",
  projects: ["personal-ai"],
  defaultProject: "personal-ai",
};

document.addEventListener("DOMContentLoaded", loadOptions);
document.getElementById("save").addEventListener("click", saveOptions);
document.getElementById("test").addEventListener("click", testConnection);

async function loadOptions() {
  const config = await chrome.storage.sync.get(DEFAULTS);
  // Parse host and port from baseUrl
  try {
    const url = new URL(config.baseUrl);
    document.getElementById("host").value =
      url.protocol + "//" + url.hostname;
    document.getElementById("port").value = url.port || "27124";
  } catch (_e) {
    document.getElementById("host").value = "http://127.0.0.1";
    document.getElementById("port").value = "27124";
  }
  document.getElementById("apiKey").value = config.apiKey;
  document.getElementById("dailyFolder").value = config.dailyFolder;
  document.getElementById("projects").value = config.projects.join(", ");
  document.getElementById("defaultProject").value = config.defaultProject;
}

async function saveOptions() {
  const host = document.getElementById("host").value.trim();
  const port = document.getElementById("port").value.trim();
  const apiKey = document.getElementById("apiKey").value.trim();
  const dailyFolder = document.getElementById("dailyFolder").value.trim();
  const projectsRaw = document.getElementById("projects").value;
  const defaultProject = document.getElementById("defaultProject").value.trim();

  const projects = projectsRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const baseUrl = `${host}:${port}`;

  await chrome.storage.sync.set({
    baseUrl,
    apiKey,
    dailyFolder,
    projects,
    defaultProject,
  });

  showStatus("Settings saved.", "success");
}

async function testConnection() {
  const host = document.getElementById("host").value.trim();
  const port = document.getElementById("port").value.trim();
  const apiKey = document.getElementById("apiKey").value.trim();
  const baseUrl = `${host}:${port}`;

  if (!apiKey) {
    showStatus("API key is required.", "error");
    return;
  }

  try {
    const res = await fetch(`${baseUrl}/`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (res.ok) {
      showStatus("Connected to Obsidian REST API.", "success");
    } else {
      showStatus(`Connection failed: ${res.status} ${res.statusText}`, "error");
    }
  } catch (err) {
    showStatus(`Connection failed: ${err.message}`, "error");
  }
}

function showStatus(msg, type) {
  const el = document.getElementById("status");
  el.textContent = msg;
  el.className = type;
  setTimeout(() => {
    el.className = "";
  }, 4000);
}
