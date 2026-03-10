"""Content cleaning — boilerplate removal, text normalization, markdown conversion.

Superior to Firecrawl's content extraction:
  - Removes nav, footer, sidebar, ads, cookie banners
  - Converts clean HTML to structured markdown
  - Normalizes whitespace, encoding, and special characters
  - Extracts main content area intelligently
"""

from __future__ import annotations

import re
import logging
from typing import Any

log = logging.getLogger(__name__)

try:
    from bs4 import BeautifulSoup, Comment, Tag  # pyre-ignore[21]
except ImportError:
    BeautifulSoup = None  # type: ignore[assignment,misc]
    Comment = None
    Tag = None

# Tags that are always boilerplate
_REMOVE_TAGS = {
    "script", "style", "noscript", "iframe", "svg", "canvas",
    "video", "audio", "source", "track", "map", "area",
}

# Tags/classes/IDs that indicate boilerplate sections
_BOILERPLATE_SELECTORS = [
    "nav", "footer", "header",
    "[role='navigation']", "[role='banner']", "[role='contentinfo']",
    ".nav", ".navbar", ".footer", ".header", ".sidebar",
    ".cookie-banner", ".cookie-consent", ".gdpr",
    ".ad", ".ads", ".advertisement", ".sponsor",
    ".popup", ".modal", ".overlay",
    "#nav", "#footer", "#header", "#sidebar",
    "#cookie-banner", "#cookie-consent",
    ".social-share", ".share-buttons",
    ".breadcrumb", ".breadcrumbs",
    ".newsletter", ".subscribe",
    ".comments", "#comments",
    "[aria-hidden='true']",
]

# Selectors for main content (in order of specificity)
_CONTENT_SELECTORS = [
    "main", "article", "[role='main']",
    "#content", "#main-content", "#main",
    ".content", ".main-content", ".article-content",
    ".post-content", ".entry-content", ".page-content",
    ".product-detail", ".product-info",
    ".job-detail", ".job-description",
    ".listing-detail",
]


def clean_html(html: str, remove_boilerplate: bool = True) -> str:
    """Remove boilerplate elements and return cleaned HTML."""
    if BeautifulSoup is None:
        log.warning("BeautifulSoup not installed — returning raw HTML")
        return html

    soup = BeautifulSoup(html, "lxml")

    # Remove unwanted tags entirely
    for tag_name in _REMOVE_TAGS:
        for tag in soup.find_all(tag_name):
            tag.decompose()

    # Remove HTML comments
    for comment in soup.find_all(string=lambda t: isinstance(t, Comment)):
        comment.extract()

    # Remove hidden elements
    for el in soup.find_all(style=re.compile(r"display:\s*none|visibility:\s*hidden")):
        el.decompose()

    if remove_boilerplate:
        for sel in _BOILERPLATE_SELECTORS:
            for el in soup.select(sel):
                el.decompose()

    return str(soup)


def extract_main_content(html: str) -> str:
    """Extract just the main content area from HTML."""
    if BeautifulSoup is None:
        return html

    soup = BeautifulSoup(html, "lxml")

    # Try content selectors in order
    for sel in _CONTENT_SELECTORS:
        main = soup.select_one(sel)
        if main and len(main.get_text(strip=True)) > 100:
            return str(main)

    # Fallback: find the div with the most text content
    best_el = None
    best_len = 0
    for div in soup.find_all(["div", "section"]):
        text_len = len(div.get_text(strip=True))
        # Penalize elements that are too shallow (likely wrappers)
        direct_text = sum(
            len(child.string or "") for child in div.children
            if isinstance(child, str) or (hasattr(child, "string") and child.string)
        )
        # Prefer elements with substantial direct text children
        if text_len > best_len and text_len > 200:
            best_len = text_len
            best_el = div

    if best_el:
        return str(best_el)

    # Last resort: return body
    body = soup.find("body")
    return str(body) if body else str(soup)


def html_to_text(html: str, clean: bool = True) -> str:
    """Convert HTML to clean, normalized text."""
    if clean:
        html = clean_html(html)

    if BeautifulSoup is None:
        # Fallback regex stripping
        text = re.sub(r"<[^>]+>", " ", html)
        text = re.sub(r"\s+", " ", text).strip()
        return text

    soup = BeautifulSoup(html, "lxml")
    text = soup.get_text(separator="\n", strip=True)

    # Normalize whitespace
    lines = []
    for line in text.split("\n"):
        line = line.strip()
        if line:
            lines.append(line)

    # Collapse runs of empty lines
    result = []
    prev_empty = False
    for line in lines:
        if not line:
            if not prev_empty:
                result.append("")
            prev_empty = True
        else:
            result.append(line)
            prev_empty = False

    return "\n".join(result)


def html_to_markdown(html: str, clean: bool = True) -> str:
    """Convert HTML to structured Markdown.

    Handles: headings, paragraphs, lists, links, images, tables, bold, italic, code.
    """
    if clean:
        html = clean_html(html)

    if BeautifulSoup is None:
        return html_to_text(html, clean=False)

    soup = BeautifulSoup(html, "lxml")
    return _node_to_markdown(soup).strip()


def _node_to_markdown(node) -> str:
    """Recursively convert a BeautifulSoup node to Markdown."""
    if isinstance(node, str):
        return node.strip()

    if not hasattr(node, "name"):
        return str(node).strip()

    tag = node.name

    if tag is None:
        # NavigableString or similar
        parts = []
        for child in node.children:
            parts.append(_node_to_markdown(child))
        return " ".join(p for p in parts if p)

    # Skip removed tags
    if tag in _REMOVE_TAGS:
        return ""

    # Get children's markdown
    children_md = []
    for child in node.children:
        md = _node_to_markdown(child)
        if md:
            children_md.append(md)
    inner = " ".join(children_md)

    # Headings
    if tag in ("h1", "h2", "h3", "h4", "h5", "h6"):
        level = int(tag[1])
        return f"\n\n{'#' * level} {inner}\n\n"

    # Paragraphs
    if tag == "p":
        return f"\n\n{inner}\n\n"

    # Line breaks
    if tag == "br":
        return "\n"

    # Bold
    if tag in ("strong", "b"):
        return f"**{inner}**"

    # Italic
    if tag in ("em", "i"):
        return f"*{inner}*"

    # Code
    if tag == "code":
        return f"`{inner}`"

    # Pre/code blocks
    if tag == "pre":
        code = node.get_text()
        return f"\n```\n{code}\n```\n"

    # Links
    if tag == "a":
        href = node.get("href", "")
        if href and not href.startswith(("#", "javascript:")):
            return f"[{inner}]({href})"
        return inner

    # Images
    if tag == "img":
        alt = node.get("alt", "")
        src = node.get("src", "")
        return f"![{alt}]({src})" if src else ""

    # Unordered lists
    if tag == "ul":
        items = []
        for li in node.find_all("li", recursive=False):
            items.append(f"- {_node_to_markdown(li)}")
        return "\n" + "\n".join(items) + "\n"

    # Ordered lists
    if tag == "ol":
        items = []
        for i, li in enumerate(node.find_all("li", recursive=False), 1):
            items.append(f"{i}. {_node_to_markdown(li)}")
        return "\n" + "\n".join(items) + "\n"

    # Tables
    if tag == "table":
        return _table_to_markdown(node)

    # Block elements
    if tag in ("div", "section", "article", "main", "aside", "blockquote"):
        prefix = "> " if tag == "blockquote" else ""
        content = inner
        if prefix:
            content = "\n".join(f"{prefix}{line}" for line in content.split("\n"))
        return f"\n{content}\n"

    # Horizontal rule
    if tag == "hr":
        return "\n---\n"

    return inner


def _table_to_markdown(table) -> str:
    """Convert an HTML table to Markdown table."""
    rows = []
    for tr in table.find_all("tr"):
        cells = []
        for td in tr.find_all(["td", "th"]):
            cells.append(td.get_text(strip=True).replace("|", "\\|"))
        if cells:
            rows.append(cells)

    if not rows:
        return ""

    # Normalize column count
    max_cols = max(len(r) for r in rows)
    for r in rows:
        while len(r) < max_cols:
            r.append("")

    lines = []
    lines.append("| " + " | ".join(rows[0]) + " |")
    lines.append("| " + " | ".join("---" for _ in rows[0]) + " |")
    for row in rows[1:]:
        lines.append("| " + " | ".join(row) + " |")

    return "\n" + "\n".join(lines) + "\n"


# ---------------------------------------------------------------------------
# Metadata extraction
# ---------------------------------------------------------------------------

def extract_metadata(html: str) -> dict[str, str]:
    """Extract page metadata: title, description, og tags, JSON-LD."""
    if BeautifulSoup is None:
        return {}

    soup = BeautifulSoup(html, "lxml")
    meta: dict[str, str] = {}

    # Title
    title_tag = soup.find("title")
    if title_tag:
        meta["title"] = title_tag.get_text(strip=True)

    # Meta description
    desc = soup.find("meta", attrs={"name": "description"})
    if desc and desc.get("content"):
        meta["description"] = desc["content"]

    # Open Graph tags
    for og in soup.find_all("meta", property=re.compile(r"^og:")):
        prop = og.get("property", "").replace("og:", "og_")
        content = og.get("content", "")
        if prop and content:
            meta[prop] = content

    # Twitter cards
    for tw in soup.find_all("meta", attrs={"name": re.compile(r"^twitter:")}):
        name = tw.get("name", "").replace("twitter:", "twitter_")
        content = tw.get("content", "")
        if name and content:
            meta[name] = content

    # Canonical URL
    canonical = soup.find("link", rel="canonical")
    if canonical and canonical.get("href"):
        meta["canonical_url"] = canonical["href"]

    # JSON-LD structured data
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            import json
            ld = json.loads(script.string or "")
            if isinstance(ld, dict):
                meta["jsonld_type"] = ld.get("@type", "")
                if "name" in ld:
                    meta["jsonld_name"] = ld["name"]
                if "description" in ld:
                    meta["jsonld_description"] = ld["description"]
        except Exception:
            pass

    return meta
