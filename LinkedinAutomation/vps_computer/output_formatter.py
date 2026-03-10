"""Output Formatter - Formats results for human and machine consumption."""

import json
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class OutputFormatter:
    """Formats research results into human-readable and machine-readable formats."""

    def format_json(self, query: str, results: list[dict],
                    summary: str = "", metadata: dict = None) -> dict:
        """Format results as structured JSON."""
        output = {
            "query": query,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "summary": summary,
            "result_count": len(results),
            "results": [self._clean_result(r) for r in results],
        }
        if metadata:
            output["metadata"] = metadata
        return output

    def _clean_result(self, result: dict) -> dict:
        """Clean a result dict for JSON output."""
        clean = {}
        keep_fields = [
            "title", "url", "summary", "snippet", "relevance_score",
            "company", "salary", "location", "price", "author",
            "publication_date", "key_insights", "type",
        ]
        for field in keep_fields:
            if field in result and result[field]:
                clean[field] = result[field]

        # Include any structured data
        if "structured" in result:
            clean["structured_data"] = result["structured"]

        return clean

    def format_human(self, query: str, results: list[dict],
                     summary: str = "") -> str:
        """Format results as human-readable text."""
        lines = []
        lines.append(f"Research Results: {query}")
        lines.append("=" * 60)

        if summary:
            lines.append("")
            lines.append("Summary:")
            lines.append(summary)
            lines.append("")

        lines.append(f"Found {len(results)} results:")
        lines.append("-" * 40)

        for i, r in enumerate(results, 1):
            lines.append(f"\n{i}. {r.get('title', 'Untitled')}")
            if r.get("url"):
                lines.append(f"   URL: {r['url']}")
            if r.get("summary") or r.get("snippet"):
                text = r.get("summary") or r.get("snippet")
                lines.append(f"   {text[:300]}")
            if r.get("salary"):
                lines.append(f"   Salary: {r['salary']}")
            if r.get("company"):
                lines.append(f"   Company: {r['company']}")
            if r.get("price"):
                lines.append(f"   Price: {r['price']}")
            if r.get("relevance_score"):
                lines.append(f"   Relevance: {r['relevance_score']}/10")

        lines.append("")
        lines.append(f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}")
        return "\n".join(lines)

    def format_markdown(self, query: str, results: list[dict],
                        summary: str = "") -> str:
        """Format results as Markdown."""
        lines = []
        lines.append(f"# Research: {query}\n")

        if summary:
            lines.append(f"## Summary\n{summary}\n")

        lines.append(f"## Results ({len(results)} found)\n")

        for i, r in enumerate(results, 1):
            title = r.get("title", "Untitled")
            url = r.get("url", "")
            lines.append(f"### {i}. [{title}]({url})\n")

            if r.get("summary") or r.get("snippet"):
                lines.append(f"{r.get('summary') or r.get('snippet')}\n")

            details = []
            for field in ["company", "salary", "location", "price", "author"]:
                if r.get(field):
                    details.append(f"- **{field.title()}**: {r[field]}")
            if details:
                lines.append("\n".join(details) + "\n")

        return "\n".join(lines)
