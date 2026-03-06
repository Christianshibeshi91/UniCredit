"""Send or save weekly report summary."""

import json
import os
from datetime import datetime, timezone
from LinkedinAutomation.alert_user import alert

BASE_DIR = os.path.dirname(os.path.dirname(__file__))


def send(report_data):
    """Save report summary to .tmp/ as a text file. Email sending can be added later."""
    if not report_data:
        alert("Email Report", "No report data to send.", "warning")
        return

    now = datetime.now(timezone.utc)
    filename = f"weekly_report_{now.strftime('%Y-%m-%d')}.txt"
    out_path = os.path.join(BASE_DIR, ".tmp", filename)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)

    lines = [
        f"LinkedIn Job Automation - Weekly Report",
        f"Generated: {report_data.get('generated', now.isoformat())}",
        f"Tab: {report_data.get('tab_name', 'N/A')}",
        "",
        "VOLUME",
    ]
    vol = report_data.get("volume", {})
    for k, v in vol.items():
        lines.append(f"  {k}: {v}")

    lines.append("")
    lines.append("SCORES")
    sc = report_data.get("scores", {})
    for k, v in sc.items():
        lines.append(f"  {k}: {v}")

    lines.append("")
    lines.append("TOP SKILLS")
    for skill, count in report_data.get("top_skills", {}).items():
        lines.append(f"  {skill}: {count}")

    lines.append("")
    lines.append("SKILL GAPS")
    for skill, count in report_data.get("skill_gaps", {}).items():
        lines.append(f"  {skill}: {count}")

    lines.append("")
    lines.append("REMOTE DISTRIBUTION")
    for mode, count in report_data.get("remote_distribution", {}).items():
        lines.append(f"  {mode}: {count}")

    text = "\n".join(lines)
    with open(out_path, "w") as f:
        f.write(text)

    alert("Report Saved", f"Weekly report saved to {out_path}")
    print(text)
    return out_path


if __name__ == "__main__":
    sample = {
        "tab_name": "Report -- W09 2026",
        "generated": "2026-03-02T00:00:00Z",
        "volume": {"total_discovered": 15, "scored": 12, "rejected": 3, "staged": 5, "submitted": 2},
        "scores": {"average": 78.5, "highest": 95, "lowest": 62},
        "top_skills": {"Power Apps": 10, "Dataverse": 8},
        "skill_gaps": {"Copilot Studio": 5},
        "remote_distribution": {"Remote": 8, "Hybrid": 3, "Onsite": 1},
    }
    send(sample)
