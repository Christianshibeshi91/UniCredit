"""Advanced filtering — rule-based, regex, fuzzy match, deduplication, transforms.

Beyond basic keyword filtering:
  - Regex pattern matching per field
  - Fuzzy string matching (Levenshtein distance)
  - Date range filtering with flexible parsing
  - Numeric range on any field (auto-extracts numbers)
  - Field-level deduplication
  - Data transforms (normalize, clean, convert)
  - AI-powered semantic filtering
  - Chained filter pipelines
"""

from __future__ import annotations

import hashlib
import json
import logging
import re
from datetime import datetime
from typing import Any, Callable

log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Rule-based filters
# ---------------------------------------------------------------------------

def apply_filters(
    data: list[dict[str, Any]],
    filters: dict[str, Any],
) -> list[dict[str, Any]]:
    """Apply rule-based filters to scraped data.

    Supported filter keys:
      - must_contain: list[str] — at least one must appear in any field (OR)
      - must_contain_all: list[str] — ALL must appear across fields (AND)
      - exclude: list[str] — reject if any appears in any field
      - field_equals: dict — {field: value} exact match
      - field_contains: dict — {field: substring}
      - field_regex: dict — {field: regex_pattern}
      - field_not_empty: list[str] — reject if any listed field is empty
      - price_min / price_max: float
      - salary_min / salary_max: float
      - num_range: dict — {field: {"min": X, "max": Y}}
      - date_after / date_before: str — ISO date strings
      - date_field: str — which field contains dates (default: "date")
      - fuzzy_match: dict — {field: {"query": str, "threshold": 0.7}}
      - custom_fn: callable — arbitrary filter function(row) -> bool
      - dedup_fields: list[str] — deduplicate based on these fields
    """
    if not filters:
        return data

    result = []
    seen_hashes: set[str] = set()
    dedup_fields = filters.get("dedup_fields", [])

    for row in data:
        # Deduplication check
        if dedup_fields:
            dedup_key = "|".join(str(row.get(f, "")).strip().lower() for f in dedup_fields)
            dedup_hash = hashlib.md5(dedup_key.encode()).hexdigest()
            if dedup_hash in seen_hashes:
                continue
            seen_hashes.add(dedup_hash)

        if _passes_rules(row, filters):
            result.append(row)

    log.info("Filtered %d -> %d records", len(data), len(result))
    return result


def _passes_rules(row: dict[str, Any], filters: dict[str, Any]) -> bool:
    combined = " ".join(str(v) for v in row.values()).lower()

    # must_contain (OR)
    must = filters.get("must_contain", [])
    if must and not any(kw.lower() in combined for kw in must):
        return False

    # must_contain_all (AND)
    must_all = filters.get("must_contain_all", [])
    if must_all and not all(kw.lower() in combined for kw in must_all):
        return False

    # exclude
    exclude = filters.get("exclude", [])
    if any(kw.lower() in combined for kw in exclude):
        return False

    # field_equals
    for field, value in filters.get("field_equals", {}).items():
        if str(row.get(field, "")).lower() != str(value).lower():
            return False

    # field_contains
    for field, substr in filters.get("field_contains", {}).items():
        if substr.lower() not in str(row.get(field, "")).lower():
            return False

    # field_regex
    for field, pattern in filters.get("field_regex", {}).items():
        val = str(row.get(field, ""))
        if not re.search(pattern, val, re.IGNORECASE):
            return False

    # field_not_empty
    for field in filters.get("field_not_empty", []):
        if not str(row.get(field, "")).strip():
            return False

    # Numeric range filters (legacy)
    for num_field, min_key, max_key in [
        ("price", "price_min", "price_max"),
        ("salary", "salary_min", "salary_max"),
    ]:
        val = _extract_number(row.get(num_field, ""))
        if val is not None:
            if min_key in filters and val < filters[min_key]:
                return False
            if max_key in filters and val > filters[max_key]:
                return False

    # Generic numeric range: {field: {"min": X, "max": Y}}
    for field, range_spec in filters.get("num_range", {}).items():
        val = _extract_number(row.get(field, ""))
        if val is not None:
            if "min" in range_spec and val < range_spec["min"]:
                return False
            if "max" in range_spec and val > range_spec["max"]:
                return False

    # Date range
    date_field = filters.get("date_field", "date")
    date_val = row.get(date_field, "")
    if date_val:
        parsed_date = _parse_date(str(date_val))
        if parsed_date:
            if "date_after" in filters:
                after = _parse_date(filters["date_after"])
                if after and parsed_date < after:
                    return False
            if "date_before" in filters:
                before = _parse_date(filters["date_before"])
                if before and parsed_date > before:
                    return False

    # Fuzzy match
    for field, spec in filters.get("fuzzy_match", {}).items():
        query = spec.get("query", "")
        threshold = spec.get("threshold", 0.7)
        val = str(row.get(field, ""))
        if query and val:
            similarity = _fuzzy_ratio(query.lower(), val.lower())
            if similarity < threshold:
                return False

    # Custom function
    custom_fn = filters.get("custom_fn")
    if custom_fn and callable(custom_fn) and not custom_fn(row):
        return False

    return True


# ---------------------------------------------------------------------------
# Data transforms
# ---------------------------------------------------------------------------

def transform_data(
    data: list[dict[str, Any]],
    transforms: dict[str, Any],
) -> list[dict[str, Any]]:
    """Apply transforms to scraped data.

    Supported transforms:
      - rename: dict — {old_field: new_field}
      - strip_fields: list — fields to strip whitespace
      - lowercase_fields: list — fields to lowercase
      - uppercase_fields: list — fields to uppercase
      - remove_fields: list — fields to drop
      - add_fields: dict — {field: static_value}
      - extract_numbers: list — extract first number from field
      - split_field: dict — {field: {"separator": str, "index": int, "into": str}}
      - concat_fields: dict — {new_field: {"fields": [f1, f2], "separator": str}}
      - regex_extract: dict — {field: {"pattern": str, "group": int, "into": str}}
      - map_values: dict — {field: {old_val: new_val}}
    """
    if not transforms:
        return data

    result = []
    for row in data:
        row = dict(row)  # copy

        # Rename
        for old, new in transforms.get("rename", {}).items():
            if old in row:
                row[new] = row.pop(old)

        # Strip whitespace
        for field in transforms.get("strip_fields", []):
            if field in row:
                row[field] = str(row[field]).strip()

        # Lowercase
        for field in transforms.get("lowercase_fields", []):
            if field in row:
                row[field] = str(row[field]).lower()

        # Uppercase
        for field in transforms.get("uppercase_fields", []):
            if field in row:
                row[field] = str(row[field]).upper()

        # Remove fields
        for field in transforms.get("remove_fields", []):
            row.pop(field, None)

        # Add static fields
        for field, value in transforms.get("add_fields", {}).items():
            row[field] = value

        # Extract numbers
        for field in transforms.get("extract_numbers", []):
            if field in row:
                num = _extract_number(row[field])
                row[field] = num if num is not None else row[field]

        # Split field
        for field, spec in transforms.get("split_field", {}).items():
            if field in row:
                parts = str(row[field]).split(spec.get("separator", " "))
                idx = spec.get("index", 0)
                target = spec.get("into", field)
                row[target] = parts[idx].strip() if idx < len(parts) else ""

        # Concat fields
        for new_field, spec in transforms.get("concat_fields", {}).items():
            fields = spec.get("fields", [])
            sep = spec.get("separator", " ")
            row[new_field] = sep.join(str(row.get(f, "")) for f in fields)

        # Regex extract
        for field, spec in transforms.get("regex_extract", {}).items():
            if field in row:
                m = re.search(spec["pattern"], str(row[field]))
                target = spec.get("into", field)
                group = spec.get("group", 0)
                row[target] = m.group(group) if m else ""

        # Map values
        for field, mapping in transforms.get("map_values", {}).items():
            if field in row and str(row[field]) in mapping:
                row[field] = mapping[str(row[field])]

        result.append(row)

    return result


# ---------------------------------------------------------------------------
# AI-based filtering / reasoning
# ---------------------------------------------------------------------------

def ai_filter(
    data: list[dict[str, Any]],
    criteria: str,
    batch_size: int = 10,
) -> list[dict[str, Any]]:
    """Use Ollama to reason over data and keep only items matching criteria."""
    from web_scraper.ai import is_available, generate  # pyre-ignore[21]

    if not is_available():
        log.warning("Ollama not available — AI filtering skipped, returning all data")
        return data

    if not criteria:
        return data

    kept: list[dict[str, Any]] = []

    for i in range(0, len(data), batch_size):
        batch = data[i : i + batch_size]
        batch_json = json.dumps(batch, indent=2, ensure_ascii=False)

        prompt = f"""You are a data filtering assistant. Given the following list of items and filtering criteria, return ONLY a JSON array of the indices (0-based, relative to this batch) of items that match the criteria.

Criteria: {criteria}

Items:
{batch_json}

Return ONLY a JSON array of matching indices, e.g. [0, 2, 4]. If none match, return [].
No explanation, no markdown, no thinking — just the JSON array."""

        raw = generate(prompt, max_tokens=200)
        if not raw:
            kept.extend(batch)
            continue

        indices = _parse_indices(raw, len(batch))
        for idx in indices:
            kept.append(batch[idx])

    log.info("AI filtered %d -> %d records", len(data), len(kept))
    return kept


# ---------------------------------------------------------------------------
# Filter pipeline
# ---------------------------------------------------------------------------

class FilterPipeline:
    """Chain multiple filter/transform operations."""

    def __init__(self):
        self._steps: list[tuple[str, dict | str | Callable]] = []

    def add_filter(self, filters: dict[str, Any]) -> FilterPipeline:
        self._steps.append(("filter", filters))
        return self

    def add_transform(self, transforms: dict[str, Any]) -> FilterPipeline:
        self._steps.append(("transform", transforms))
        return self

    def add_ai_filter(self, criteria: str) -> FilterPipeline:
        self._steps.append(("ai_filter", criteria))
        return self

    def add_custom(self, fn: Callable) -> FilterPipeline:
        self._steps.append(("custom", fn))
        return self

    def run(self, data: list[dict[str, Any]]) -> list[dict[str, Any]]:
        result = data
        for step_type, spec in self._steps:
            if step_type == "filter":
                result = apply_filters(result, spec)
            elif step_type == "transform":
                result = transform_data(result, spec)
            elif step_type == "ai_filter":
                result = ai_filter(result, spec)
            elif step_type == "custom":
                result = spec(result)
        return result


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _extract_number(text: Any) -> float | None:
    if isinstance(text, (int, float)):
        return float(text)
    if not isinstance(text, str) or not text.strip():
        return None
    text = text.replace(",", "").replace("$", "").replace("€", "").replace("£", "").strip()
    m = re.search(r"(\d+(?:\.\d+)?)\s*([kKmMbB])?", text)
    if not m:
        return None
    val = float(m.group(1))
    suffix = (m.group(2) or "").lower()
    if suffix == "k":
        val *= 1_000
    elif suffix == "m":
        val *= 1_000_000
    elif suffix == "b":
        val *= 1_000_000_000
    return val


def _parse_date(text: str) -> datetime | None:
    """Try multiple date formats."""
    formats = [
        "%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%SZ",
        "%m/%d/%Y", "%m/%d/%y", "%d/%m/%Y",
        "%B %d, %Y", "%b %d, %Y",
        "%Y%m%d",
    ]
    text = text.strip()
    for fmt in formats:
        try:
            return datetime.strptime(text, fmt)
        except ValueError:
            continue
    return None


def _fuzzy_ratio(s1: str, s2: str) -> float:
    """Simple Levenshtein-based similarity ratio (0.0 - 1.0).

    Falls back to thefuzz if available, otherwise uses built-in.
    """
    try:
        from thefuzz import fuzz  # pyre-ignore[21]
        return fuzz.ratio(s1, s2) / 100.0
    except ImportError:
        pass

    # Built-in simple ratio
    if not s1 or not s2:
        return 0.0
    # Use sequence matching
    matches = 0
    len1, len2 = len(s1), len(s2)
    for i, c in enumerate(s1):
        if i < len2 and s2[i] == c:
            matches += 1
    return (2.0 * matches) / (len1 + len2)


def _parse_indices(raw: str, max_len: int) -> list[int]:
    text = raw.strip()
    # Remove thinking tags
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()

    if "```" in text:
        for part in text.split("```"):
            part = part.strip().removeprefix("json").strip()
            result = _try_parse_int_list(part, max_len)
            if result is not None:
                return result

    result = _try_parse_int_list(text, max_len)
    if result is not None:
        return result

    start = text.find("[")
    end = text.rfind("]")
    if start >= 0 and end > start:
        result = _try_parse_int_list(text[start : end + 1], max_len)
        if result is not None:
            return result

    return list(range(max_len))


def _try_parse_int_list(text: str, max_len: int) -> list[int] | None:
    try:
        data = json.loads(text)
        if isinstance(data, list):
            return [int(x) for x in data if isinstance(x, (int, float)) and 0 <= int(x) < max_len]
    except (json.JSONDecodeError, ValueError):
        pass
    return None
