# Plus One Thing — Context Loader

This file documents all content cleaning rules applied when clipping pages.
Place a modified copy of this file in your Obsidian vault root or Daily folder
for hot-reloading custom rules (v0.2 feature).

## Pre-Cleaning Rules (DOM Selectors)

Applied before Readability.js processes the page. These remove DOM elements
that would otherwise pollute the extracted article content.

### 1. Navigation Elements
**Selectors:** `nav`, `[role="navigation"]`, `.navbar`, `.nav-menu`, `.site-nav`, `.main-navigation`
**Purpose:** Remove site navigation menus, breadcrumbs, and nav bars that aren't part of the article content.

### 2. Advertisement Blocks
**Selectors:** `.ad`, `.ads`, `.advertisement`, `.ad-container`, `[class*="sponsor"]`, `ins.adsbygoogle`, `[id*="google_ads"]`
**Purpose:** Remove ad containers, sponsored content blocks, and Google AdSense elements.

### 3. Footer Content
**Selectors:** `footer`, `[role="contentinfo"]`, `.site-footer`, `.footer-widgets`
**Purpose:** Remove site footers containing copyright notices, site links, and footer widgets.

### 4. Script/Style Tags
**Selectors:** `script`, `style`, `noscript`, `link[rel='stylesheet']`
**Purpose:** Belt-and-suspenders removal of executable code and stylesheets. Readability also removes these, but pre-cleaning catches edge cases.

### 5. HTML Comments
**Method:** TreeWalker with `NodeFilter.SHOW_COMMENT`
**Purpose:** Remove HTML comments (`<!-- ... -->`) which may contain conditional content, developer notes, or tracking markers.

### 6. Sidebar Content
**Selectors:** `aside`, `[role="complementary"]`, `.sidebar`, `[class*="sidebar"]`, `.widget-area`
**Purpose:** Remove sidebar widgets, related articles, tag clouds, and other supplementary content.

### 7. Cookie Banners / Consent Dialogs
**Selectors:** `[class*="cookie"]`, `[class*="consent"]`, `[id*="cookie"]`, `[class*="gdpr"]`, `.cc-banner`, `.cc-window`, `[id*="consent"]`
**Purpose:** Remove GDPR/cookie consent banners and privacy notice overlays.

### 8. Social Sharing Buttons
**Selectors:** `[class*="share"]`, `[class*="social"]`, `.sharing-buttons`, `[class*="follow-us"]`, `.social-icons`
**Purpose:** Remove social media sharing widgets, follow buttons, and social proof elements.

## Post-Cleaning Rules (Markdown Regex)

Applied after Turndown.js HTML-to-Markdown conversion. These clean up artifacts
that survive the HTML-to-Markdown pipeline.

### 1. Excessive Blank Lines
**Pattern:** `\n{3,}` → `\n\n`
**Purpose:** Collapse runs of 3+ blank lines to a maximum of 2, improving readability.

### 2. Navigation Text Artifacts
**Pattern:** `^\s*(Menu|Skip to content|Toggle navigation|Search\.\.\.)\s*$`
**Purpose:** Remove standalone lines containing common navigation labels that survived extraction.

### 3. Social/Share Text
**Pattern:** `^\s*(Share on|Tweet|Pin it|Share this|Follow us)\s*$`
**Purpose:** Remove standalone social sharing call-to-action text.

### 4. Cookie Consent Text
**Pattern:** `^\s*(Accept cookies?|We use cookies?|Cookie policy)\s*.*$`
**Purpose:** Remove leftover cookie/consent text that wasn't caught by DOM pre-cleaning.

### 5. Bare URL Lines
**Pattern:** `^\s*https?:\/\/\S+\s*$`
**Purpose:** Remove lines consisting of only a URL, typically leftover navigation links or tracking pixels.

### 6. Duplicate Horizontal Rules
**Pattern:** `(---\n){2,}` → `---\n`
**Purpose:** Collapse multiple consecutive horizontal rules into one.

### 7. Whitespace Trim
**Pattern:** `^\s+|\s+$`
**Purpose:** Remove leading and trailing whitespace from the entire document.
