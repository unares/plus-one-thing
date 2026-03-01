# Plus One Thing

Chrome extension that clips web pages and text selections to your Obsidian daily notes with one click.

## What it does

- **1-click icon**: Extracts the current page using Readability.js, converts to clean Markdown via Turndown.js, and appends a Context Block to today's daily note
- **Right-click selection**: Clips selected text as a Markdown block
- **Smart dedup**: Detects duplicate clips via SHA-256 hash of title + first 500 characters
- **History**: View your last 5 clips, toggle delete flags
- **Clean output**: 8 regex-based junk removers strip navigation, ads, footers, cookie banners, sidebars, social buttons, scripts, and HTML comments

## Setup

### 1. Obsidian Local REST API Plugin

Install the [Local REST API](https://github.com/coddingtonbear/obsidian-local-rest-api) plugin in Obsidian:

1. Open Obsidian Settings > Community Plugins > Browse
2. Search "Local REST API" and install it
3. Enable the plugin
4. Note the API key from the plugin settings
5. Set the port to **27124** (default)
6. For local/Docker use: enable **Non-encrypted (HTTP)** mode in plugin settings

### 2. Docker Setup (Optional)

If running Obsidian in Docker, ensure the container:
- Binds to `0.0.0.0` (not just localhost)
- Exposes port **27124**
- Has the Local REST API plugin installed and configured

```yaml
# docker-compose.yml example
services:
  obsidian:
    image: your-obsidian-image
    ports:
      - "27124:27124"
    volumes:
      - ./vault:/vault
```

### 3. Load the Extension

1. Open `chrome://extensions/`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `plus-one-thing/` directory
5. Click the extension icon > right-click > **Options**
6. Enter your API key and click **Test Connection**
7. Click **Save**

## Usage

### Clip a full page
Click the **+1** icon in the toolbar. A green checkmark badge confirms the clip was saved.

### Clip selected text
1. Select text on any page
2. Right-click > **Plus One — Clip Selection**

### View history
Right-click the **+1** icon > **View History**

### Duplicate detection
If you clip a page you've already clipped, an orange **DUP** badge appears instead of saving.

## Daily Note Format

Clips are appended under `## Context Blocks` in your daily note (`Daily/YYYY-MM-DD.md`):

```yaml
---
title: "Article Title"
url: "https://example.com/article"
date: "2026-03-01T14:30:00Z"
attention-of: "all"
projects:
  - "personal-ai"
importance: false
labels:
  - "web"
comment: ""
type: "page"
delete-flag: false
---

[cleaned markdown content]

---
```

## Configuration

Open the extension options page to configure:

| Setting | Default | Description |
|---------|---------|-------------|
| Host | `http://127.0.0.1` | Obsidian REST API host |
| Port | `27124` | Obsidian REST API port |
| API Key | (empty) | From Obsidian plugin settings |
| Daily Folder | `Daily` | Path to daily notes folder |
| Projects | `personal-ai` | Comma-separated project list |
| Default Project | `personal-ai` | Default project for new clips |

## Content Cleaning

See [context-loader.md](context-loader.md) for full documentation of all 8 cleaning rules and their regex patterns.

## Files

```
manifest.json         MV3 manifest
service-worker.js     Background orchestration
content-script.js     Page extraction + cleaning
popup.html/js         History UI
options.html/js       Settings page
lib/readability.js    Mozilla Readability (bundled)
lib/turndown.js       Turndown HTML-to-Markdown (bundled)
icons/                +1 icons (16/48/128px)
context-loader.md     Cleaning rules documentation
```

## License

MIT
