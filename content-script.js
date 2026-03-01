// Plus One Thing — Content Script
// Runs in page context with DOM access. Readability + Turndown loaded before this.

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === "extract") {
    try {
      const result =
        message.type === "selection"
          ? extractSelection(message.selectionText)
          : extractPage();
      sendResponse(result);
    } catch (err) {
      console.error("Plus One Thing extraction error:", err);
      sendResponse({
        title: document.title,
        url: window.location.href,
        markdown: `> Extraction failed: ${err.message}`,
        rawFirst500: "",
      });
    }
  }
  return true; // keep channel open for async
});

// ── Full page extraction ──

function extractPage() {
  // Clone DOM so Readability doesn't mutate the live page
  const docClone = document.cloneNode(true);

  // Pre-clean: remove junk DOM elements before Readability
  preCleanDOM(docClone);

  let article;
  try {
    const reader = new Readability(docClone);
    article = reader.parse();
  } catch (_e) {
    // Readability failed (SPA, malformed DOM, etc.)
  }

  if (!article || !article.content) {
    article = {
      title: document.title,
      content: document.body.innerHTML,
    };
  }

  const markdown = htmlToCleanMarkdown(article.content);
  const rawFirst500 = markdown.replace(/\s+/g, " ").substring(0, 500);

  return {
    title: article.title || document.title,
    url: window.location.href,
    markdown,
    rawFirst500,
  };
}

// ── Selection extraction ──

function extractSelection(fallbackText) {
  const selection = window.getSelection();
  let html = "";
  let text = "";

  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const container = document.createElement("div");
    container.appendChild(range.cloneContents());
    html = container.innerHTML;
    text = selection.toString();
  }

  let markdown;
  if (html && html.trim()) {
    markdown = htmlToCleanMarkdown(html);
  } else {
    markdown = fallbackText || text || "";
  }

  const rawFirst500 = markdown.replace(/\s+/g, " ").substring(0, 500);

  return {
    title: document.title,
    url: window.location.href,
    markdown,
    rawFirst500,
  };
}

// ── HTML → Markdown conversion ──

function htmlToCleanMarkdown(html) {
  const turndown = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
    emDelimiter: "*",
  });

  let markdown = turndown.turndown(html);
  markdown = postCleanMarkdown(markdown);

  // Truncate at 50KB
  if (markdown.length > 50000) {
    markdown =
      markdown.substring(0, 50000) + "\n\n[... truncated at 50KB ...]";
  }

  return markdown;
}

// ── Pre-cleaning: remove junk DOM elements (8 categories) ──
// Each rule is documented in context-loader.md

function preCleanDOM(doc) {
  const selectorsToRemove = [
    // 1. Navigation elements
    "nav",
    '[role="navigation"]',
    ".navbar",
    ".nav-menu",
    ".site-nav",
    ".main-navigation",
    // 2. Advertisement blocks
    ".ad",
    ".ads",
    ".advertisement",
    ".ad-container",
    '[class*="sponsor"]',
    "ins.adsbygoogle",
    '[id*="google_ads"]',
    // 3. Footer content
    "footer",
    '[role="contentinfo"]',
    ".site-footer",
    ".footer-widgets",
    // 4. Script/style tags (belt-and-suspenders — Readability also removes these)
    "script",
    "style",
    "noscript",
    "link[rel='stylesheet']",
    // 5. (HTML comments handled separately below)
    // 6. Sidebar content
    "aside",
    '[role="complementary"]',
    ".sidebar",
    '[class*="sidebar"]',
    ".widget-area",
    // 7. Cookie banners / consent dialogs
    '[class*="cookie"]',
    '[class*="consent"]',
    '[id*="cookie"]',
    '[class*="gdpr"]',
    ".cc-banner",
    ".cc-window",
    '[id*="consent"]',
    // 8. Social sharing buttons / widgets
    '[class*="share"]',
    '[class*="social"]',
    ".sharing-buttons",
    '[class*="follow-us"]',
    ".social-icons",
  ];

  for (const selector of selectorsToRemove) {
    try {
      doc.querySelectorAll(selector).forEach((el) => el.remove());
    } catch (_e) {
      // Invalid selector on some DOMs, skip
    }
  }

  // 5. Remove HTML comments
  removeHTMLComments(doc);
}

function removeHTMLComments(node) {
  const walker = document.createTreeWalker(
    node,
    NodeFilter.SHOW_COMMENT,
    null
  );
  const comments = [];
  while (walker.nextNode()) {
    comments.push(walker.currentNode);
  }
  for (const c of comments) {
    if (c.parentNode) c.parentNode.removeChild(c);
  }
}

// ── Post-cleaning: regex passes on markdown text (7 rules) ──

function postCleanMarkdown(md) {
  const rules = [
    // 1. Collapse 3+ blank lines → 2
    [/\n{3,}/g, "\n\n"],
    // 2. Remove common leftover navigation text
    [/^\s*(Menu|Skip to content|Toggle navigation|Search\.\.\.)\s*$/gm, ""],
    // 3. Remove leftover social/share text
    [/^\s*(Share on|Tweet|Pin it|Share this|Follow us)\s*$/gim, ""],
    // 4. Remove cookie consent leftover text
    [/^\s*(Accept cookies?|We use cookies?|Cookie policy)\s*.*$/gim, ""],
    // 5. Remove lines that are just bare URLs (often leftover nav)
    [/^\s*https?:\/\/\S+\s*$/gm, ""],
    // 6. Collapse duplicate horizontal rules
    [/(---\n){2,}/g, "---\n"],
    // 7. Trim leading/trailing whitespace
    [/^\s+|\s+$/g, ""],
  ];

  for (const [pattern, replacement] of rules) {
    md = md.replace(pattern, replacement);
  }

  return md;
}
