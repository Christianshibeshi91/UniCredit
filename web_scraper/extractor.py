"""Data extraction — multi-strategy with AI adaptation.

Strategies (applied in order until data is found):
  1. CSS/XPath selectors (fastest, most precise)
  2. Container-aware extraction (finds repeating item containers)
  3. AI selector recovery (asks LLM to fix broken selectors)
  4. AI text extraction (LLM reads visible text and returns structured data)
  5. Metadata/JSON-LD extraction (structured data already in page)

Superior to Firecrawl:
  - Container detection automatically finds item boundaries
  - Schema validation ensures output consistency
  - Multi-pass extraction combines results from different strategies
  - Attribute extraction (href, src, data-*) not just text
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any
from urllib.parse import urljoin

try:
    from bs4 import BeautifulSoup  # pyre-ignore[21]
except ImportError:
    BeautifulSoup = None  # type: ignore[assignment,misc]

log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# 1. Selector-based extraction (CSS + XPath)
# ---------------------------------------------------------------------------

async def extract_with_selectors(
    page,
    selectors: dict[str, str],
    base_url: str = "",
) -> list[dict[str, str]]:
    """Extract data using CSS/XPath selectors with attribute support.

    Selector format:
      - "h2.title" — extracts inner text
      - "a.link@href" — extracts href attribute
      - "img.photo@src" — extracts src attribute
      - "div.item@data-id" — extracts data-id attribute
      - "//xpath/expr" — XPath selector (text only)
    """
    if not selectors:
        return []

    field_elements: dict[str, list[str]] = {}

    for field_name, sel_raw in selectors.items():
        # Parse attribute extraction: "selector@attr"
        attr = None
        sel = sel_raw
        if "@" in sel and not sel.startswith("//"):
            parts = sel.rsplit("@", 1)
            sel = parts[0]
            attr = parts[1]

        try:
            if sel.startswith("//"):
                elements = await page.query_selector_all(f"xpath={sel}")
            else:
                elements = await page.query_selector_all(sel)
        except Exception as e:
            log.warning("Selector failed (%s): %s", sel, e)
            field_elements[field_name] = []
            continue

        values = []
        for el in elements:
            if attr:
                val = await el.get_attribute(attr) or ""
                # Resolve relative URLs for href/src
                if attr in ("href", "src", "action") and val and base_url:
                    val = urljoin(base_url, val)
            else:
                val = (await el.inner_text()).strip()
            values.append(val)

        field_elements[field_name] = values

    # Zip by index
    if not field_elements:
        return []

    max_len = max(len(v) for v in field_elements.values())
    results = []
    for i in range(max_len):
        row: dict[str, str] = {}
        for field_name, vals in field_elements.items():
            row[field_name] = vals[i] if i < len(vals) else ""
        if any(row.values()):
            results.append(row)

    return results


# ---------------------------------------------------------------------------
# 2. Container-aware extraction
# ---------------------------------------------------------------------------

async def extract_from_containers(
    page,
    container_selector: str,
    field_selectors: dict[str, str],
    base_url: str = "",
) -> list[dict[str, str]]:
    """Extract data from repeating container elements.

    Each container (e.g., ".product-card") contains the fields.
    This is more robust than flat selector matching because it
    correctly pairs fields within each container.

    Example:
        extract_from_containers(page,
            container_selector=".job-card",
            field_selectors={
                "title": "h3.title",
                "company": "span.company",
                "link": "a.apply@href",
            }
        )
    """
    try:
        containers = await page.query_selector_all(container_selector)
    except Exception as e:
        log.warning("Container selector failed (%s): %s", container_selector, e)
        return []

    results = []
    for container in containers:
        row: dict[str, str] = {}
        for field_name, sel_raw in field_selectors.items():
            attr = None
            sel = sel_raw
            if "@" in sel and not sel.startswith("//"):
                parts = sel.rsplit("@", 1)
                sel = parts[0]
                attr = parts[1]

            try:
                el = await container.query_selector(sel)
                if el:
                    if attr:
                        val = await el.get_attribute(attr) or ""
                        if attr in ("href", "src") and val and base_url:
                            val = urljoin(base_url, val)
                    else:
                        val = (await el.inner_text()).strip()
                    row[field_name] = val
                else:
                    row[field_name] = ""
            except Exception:
                row[field_name] = ""

        if any(row.values()):
            results.append(row)

    return results


# ---------------------------------------------------------------------------
# 3. Auto-detect containers
# ---------------------------------------------------------------------------

async def auto_detect_containers(page, min_items: int = 3) -> list[dict]:
    """Automatically detect repeating item containers on a page.

    Returns list of {selector, count, sample_text} for detected patterns.
    """
    detect_js = """
    () => {
        const candidates = {};
        // Find all elements and group by tag+class combo
        document.querySelectorAll('*').forEach(el => {
            if (!el.className || typeof el.className !== 'string') return;
            const classes = el.className.trim().split(/\\s+/).filter(c => c.length > 0);
            if (classes.length === 0) return;

            const tag = el.tagName.toLowerCase();
            // Use first meaningful class
            const key = tag + '.' + classes[0];
            if (!candidates[key]) candidates[key] = {selector: key, count: 0, texts: []};
            candidates[key].count++;
            if (candidates[key].texts.length < 3) {
                const text = el.innerText?.substring(0, 100) || '';
                if (text.trim()) candidates[key].texts.push(text.trim());
            }
        });

        return Object.values(candidates)
            .filter(c => c.count >= """ + str(min_items) + """)
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)
            .map(c => ({selector: c.selector, count: c.count, sample_text: c.texts[0] || ''}));
    }
    """
    try:
        return await page.evaluate(detect_js)
    except Exception as e:
        log.warning("Auto-detect containers failed: %s", e)
        return []


# ---------------------------------------------------------------------------
# 4. BeautifulSoup extraction (for raw HTML)
# ---------------------------------------------------------------------------

def extract_with_soup(
    html: str,
    selectors: dict[str, str],
    base_url: str = "",
) -> list[dict[str, str]]:
    """Extract data from raw HTML using BeautifulSoup CSS selectors."""
    if BeautifulSoup is None:
        log.warning("BeautifulSoup not installed")
        return []

    soup = BeautifulSoup(html, "lxml")
    if not selectors:
        return []

    field_elements: dict[str, list[str]] = {}
    for field_name, sel_raw in selectors.items():
        attr = None
        sel = sel_raw
        if "@" in sel and not sel.startswith("//"):
            parts = sel.rsplit("@", 1)
            sel = parts[0]
            attr = parts[1]

        if sel.startswith("//"):
            log.warning("XPath not supported in soup mode: %s", sel)
            field_elements[field_name] = []
            continue

        elements = soup.select(sel)
        values = []
        for el in elements:
            if attr:
                val = el.get(attr, "") or ""
                if attr in ("href", "src") and val and base_url:
                    val = urljoin(base_url, val)
            else:
                val = el.get_text(strip=True)
            values.append(val)
        field_elements[field_name] = values

    max_len = max(len(v) for v in field_elements.values()) if field_elements else 0
    results = []
    for i in range(max_len):
        row = {}
        for field_name, vals in field_elements.items():
            row[field_name] = vals[i] if i < len(vals) else ""
        if any(row.values()):
            results.append(row)
    return results


def extract_from_soup_containers(
    html: str,
    container_selector: str,
    field_selectors: dict[str, str],
    base_url: str = "",
) -> list[dict[str, str]]:
    """Container-aware extraction from raw HTML."""
    if BeautifulSoup is None:
        return []

    soup = BeautifulSoup(html, "lxml")
    containers = soup.select(container_selector)
    results = []

    for container in containers:
        row: dict[str, str] = {}
        for field_name, sel_raw in field_selectors.items():
            attr = None
            sel = sel_raw
            if "@" in sel and not sel.startswith("//"):
                parts = sel.rsplit("@", 1)
                sel = parts[0]
                attr = parts[1]

            el = container.select_one(sel)
            if el:
                if attr:
                    val = el.get(attr, "") or ""
                    if attr in ("href", "src") and val and base_url:
                        val = urljoin(base_url, val)
                else:
                    val = el.get_text(strip=True)
                row[field_name] = val
            else:
                row[field_name] = ""

        if any(row.values()):
            results.append(row)

    return results


# ---------------------------------------------------------------------------
# 5. JSON-LD / Microdata extraction
# ---------------------------------------------------------------------------

def extract_structured_data(html: str) -> list[dict[str, Any]]:
    """Extract JSON-LD and microdata structured data from HTML."""
    results = []

    # JSON-LD
    for match in re.finditer(r'<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>', html, re.DOTALL):
        try:
            data = json.loads(match.group(1))
            if isinstance(data, list):
                results.extend(data)
            elif isinstance(data, dict):
                # Handle @graph containers
                if "@graph" in data:
                    results.extend(data["@graph"])
                else:
                    results.append(data)
        except (json.JSONDecodeError, ValueError):
            pass

    return results


# ---------------------------------------------------------------------------
# 6. AI-based extraction (Ollama fallback)
# ---------------------------------------------------------------------------

def _build_extraction_prompt(
    page_text: str,
    target_fields: list[str],
    extraction_prompt: str = "",
) -> str:
    max_chars = 8000
    if len(page_text) > max_chars:
        page_text = page_text[:max_chars] + "\n... [truncated]"

    fields_str = ", ".join(f'"{f}"' for f in target_fields)

    prompt = f"""You are a precise data extraction assistant. Extract ALL structured data items from this web page.

Target fields: [{fields_str}]
"""
    if extraction_prompt:
        prompt += f"\nAdditional instructions: {extraction_prompt}\n"

    prompt += f"""
Rules:
1. Return a JSON array of objects, each containing the target fields.
2. Extract EVERY item you can find, not just the first few.
3. If a field value is not found, use an empty string.
4. Clean up values: remove extra whitespace, normalize formatting.
5. Return ONLY valid JSON — no markdown, no explanation, no thinking.

--- PAGE TEXT ---
{page_text}
--- END ---

JSON:"""
    return prompt


async def extract_with_ai(
    page,
    target_fields: list[str],
    extraction_prompt: str = "",
) -> list[dict[str, str]]:
    """Use Ollama to extract structured data from visible text."""
    from web_scraper.ai import is_available, generate  # pyre-ignore[21]

    if not is_available():
        log.warning("Ollama not available — AI extraction skipped")
        return []

    try:
        page_text = await page.inner_text("body")
    except Exception:
        page_text = await page.content()

    prompt = _build_extraction_prompt(page_text, target_fields, extraction_prompt)
    raw = generate(prompt, max_tokens=4000)
    if not raw:
        return []

    return _parse_ai_response(raw)


def extract_with_ai_from_html(
    html: str,
    target_fields: list[str],
    extraction_prompt: str = "",
) -> list[dict[str, str]]:
    """AI extraction from raw HTML string (sync version)."""
    from web_scraper.ai import is_available, generate  # pyre-ignore[21]

    if not is_available():
        return []

    if BeautifulSoup is not None:
        soup = BeautifulSoup(html, "lxml")
        page_text = soup.get_text(separator="\n", strip=True)
    else:
        page_text = re.sub(r"<[^>]+>", " ", html)
        page_text = re.sub(r"\s+", " ", page_text).strip()

    prompt = _build_extraction_prompt(page_text, target_fields, extraction_prompt)
    raw = generate(prompt, max_tokens=4000)
    if not raw:
        return []

    return _parse_ai_response(raw)


# ---------------------------------------------------------------------------
# 7. AI-based selector recovery
# ---------------------------------------------------------------------------

async def recover_selectors_with_ai(
    page,
    target_fields: list[str],
    old_selectors: dict[str, str],
) -> dict[str, str]:
    """Ask AI to suggest new CSS selectors when old ones break."""
    from web_scraper.ai import is_available, generate  # pyre-ignore[21]

    if not is_available():
        return {}

    try:
        html = await page.content()
    except Exception:
        return {}

    if len(html) > 10000:
        html = html[:10000] + "\n<!-- truncated -->"

    fields_str = json.dumps(target_fields)
    old_str = json.dumps(old_selectors)

    prompt = f"""You are a web scraping expert. The following CSS selectors no longer work on this page:
{old_str}

I need new CSS selectors for these fields: {fields_str}

Rules:
1. Analyze the HTML structure carefully.
2. Prefer selectors using class names and tag names (most stable).
3. Use @attr suffix for attributes: "a.link@href" extracts the href.
4. Return ONLY a JSON object mapping field names to CSS selectors.

HTML (truncated):
{html}

JSON:"""

    raw = generate(prompt, max_tokens=500)
    if not raw:
        return {}

    parsed = _parse_ai_response(raw)
    if parsed and isinstance(parsed[0], dict):
        return parsed[0]
    return {}


# ---------------------------------------------------------------------------
# 8. Schema validation
# ---------------------------------------------------------------------------

def validate_schema(
    data: list[dict[str, Any]],
    required_fields: list[str] | None = None,
    field_types: dict[str, type] | None = None,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Validate extracted data against a schema.

    Returns (valid_rows, invalid_rows).
    """
    if not required_fields and not field_types:
        return data, []

    valid = []
    invalid = []

    for row in data:
        is_valid = True

        # Check required fields
        if required_fields:
            for f in required_fields:
                if not row.get(f):
                    is_valid = False
                    break

        # Check field types
        if is_valid and field_types:
            for f, expected_type in field_types.items():
                val = row.get(f)
                if val is not None and not isinstance(val, expected_type):
                    # Try coercion
                    try:
                        row[f] = expected_type(val)
                    except (ValueError, TypeError):
                        is_valid = False
                        break

        if is_valid:
            valid.append(row)
        else:
            invalid.append(row)

    if invalid:
        log.info("Schema validation: %d valid, %d invalid", len(valid), len(invalid))

    return valid, invalid


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

def _parse_ai_response(raw: str) -> list[dict[str, str]]:
    """Parse JSON from AI response, handling common formatting issues."""
    text = raw.strip()

    # Remove thinking tags (qwen3 models)
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()

    # Strip markdown code fences
    if "```" in text:
        parts = text.split("```")
        for part in parts:
            part = part.strip()
            if part.startswith("json"):
                part = part[4:].strip()
            parsed = _try_parse_json(part)
            if parsed is not None:
                return _ensure_list(parsed)

    parsed = _try_parse_json(text)
    if parsed is not None:
        return _ensure_list(parsed)

    # Find JSON in text
    for start_char, end_char in [("[", "]"), ("{", "}")]:
        start = text.find(start_char)
        end = text.rfind(end_char)
        if start >= 0 and end > start:
            parsed = _try_parse_json(text[start : end + 1])
            if parsed is not None:
                return _ensure_list(parsed)

    log.warning("AI extraction returned unparseable response")
    return []


def _try_parse_json(text: str) -> Any | None:
    try:
        return json.loads(text)
    except (json.JSONDecodeError, ValueError):
        return None


def _ensure_list(data: Any) -> list[dict[str, str]]:
    if isinstance(data, list):
        return [d for d in data if isinstance(d, dict)]
    if isinstance(data, dict):
        return [data]
    return []
