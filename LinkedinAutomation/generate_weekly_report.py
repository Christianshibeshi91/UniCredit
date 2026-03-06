"""Generate weekly analytics report as a new Google Sheets tab."""

import os
from datetime import datetime, timezone
from collections import Counter
from LinkedinAutomation.setup_google_sheet import get_sheets_service
from LinkedinAutomation.alert_user import alert
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))


def _get_all_rows(service, spreadsheet_id):
    result = service.spreadsheets().values().get(
        spreadsheetId=spreadsheet_id, range="Sheet1!A2:W"
    ).execute()
    return result.get("values", [])


def generate(spreadsheet_id=None):
    if not spreadsheet_id:
        spreadsheet_id = os.getenv("GOOGLE_SHEETS_SPREADSHEET_ID")

    service = get_sheets_service()
    rows = _get_all_rows(service, spreadsheet_id)

    if not rows:
        alert("Weekly Report", "No data found in sheet.", "warning")
        return {}

    # Compute metrics
    total = len(rows)
    scores = []
    grades = Counter()
    salaries = []
    skills_mentioned = Counter()
    missing_skills = Counter()
    remote_dist = Counter()
    statuses = Counter()

    for row in rows:
        # Pad row to 23 columns (A-W)
        row += [""] * (23 - len(row))  # pyre-ignore[58]

        score_str = row[7]  # Column H
        grade = row[8]      # Column I
        salary = row[4]     # Column E
        matched = row[9]    # Column J
        missing = row[10]   # Column K
        remote = row[3]     # Column D
        status = row[18]    # Column S

        if score_str:
            try:
                scores.append(int(float(score_str)))
            except ValueError:
                pass
        if grade:
            grades[grade] += 1
        if salary and "$" in salary:
            salaries.append(salary)
        if matched:
            for s in matched.split(","):
                s = s.strip()
                if s:
                    skills_mentioned[s] += 1
        if missing:
            for s in missing.split(","):
                s = s.strip()
                if s:
                    missing_skills[s] += 1
        if remote:
            remote_dist[remote] += 1
        if status:
            statuses[status] += 1

    avg_score = sum(scores) / len(scores) if scores else 0
    now = datetime.now(timezone.utc)
    week_num = now.isocalendar()[1]
    tab_name = f"Report -- W{week_num:02d} {now.year}"

    report = {
        "tab_name": tab_name,
        "generated": now.isoformat(),
        "volume": {
            "total_discovered": total,
            "scored": len(scores),
            "rejected": grades.get("D", 0) + grades.get("F", 0),
            "staged": statuses.get("Pending Review", 0),
            "submitted": statuses.get("Submitted", 0),
        },
        "scores": {
            "average": round(avg_score, 1),
            "grade_distribution": dict(grades),
            "highest": max(scores) if scores else 0,
            "lowest": min(scores) if scores else 0,
        },
        "salary_count": len(salaries),
        "top_skills": dict(skills_mentioned.most_common(10)),
        "skill_gaps": dict(missing_skills.most_common(5)),
        "remote_distribution": dict(remote_dist),
        "status_breakdown": dict(statuses),
    }

    # Write to new sheet tab
    try:
        service.spreadsheets().batchUpdate(
            spreadsheetId=spreadsheet_id,
            body={"requests": [{"addSheet": {"properties": {"title": tab_name}}}]},
        ).execute()
    except Exception:
        tab_name += "_v2"
        try:
            service.spreadsheets().batchUpdate(
                spreadsheetId=spreadsheet_id,
                body={"requests": [{"addSheet": {"properties": {"title": tab_name}}}]},
            ).execute()
        except Exception as e:
            alert("Report Error", f"Could not create tab: {e}", "error")
            return report

    # Write report data to the new tab
    report_rows = [
        ["Metric", "Value"],
        ["Report Period", tab_name],
        ["Generated", report["generated"]],
        [""],
        ["VOLUME SUMMARY"],
        ["Total Discovered", str(report["volume"]["total_discovered"])],
        ["Scored", str(report["volume"]["scored"])],
        ["Rejected (D/F)", str(report["volume"]["rejected"])],
        ["Staged (Pending)", str(report["volume"]["staged"])],
        ["Submitted", str(report["volume"]["submitted"])],
        [""],
        ["SCORE ANALYTICS"],
        ["Average Score", str(report["scores"]["average"])],
        ["Highest Score", str(report["scores"]["highest"])],
        ["Lowest Score", str(report["scores"]["lowest"])],
        ["Grade A", str(grades.get("A", 0))],
        ["Grade B", str(grades.get("B", 0))],
        ["Grade C", str(grades.get("C", 0))],
        ["Grade D", str(grades.get("D", 0))],
        ["Grade F", str(grades.get("F", 0))],
        [""],
        ["TOP 10 MATCHED SKILLS"],
    ]
    for skill, count in skills_mentioned.most_common(10):
        report_rows.append([skill, str(count)])
    report_rows.append([""])
    report_rows.append(["TOP 5 SKILL GAPS"])
    for skill, count in missing_skills.most_common(5):
        report_rows.append([skill, str(count)])
    report_rows.append([""])
    report_rows.append(["REMOTE DISTRIBUTION"])
    for mode, count in remote_dist.items():
        report_rows.append([mode, str(count)])

    service.spreadsheets().values().update(
        spreadsheetId=spreadsheet_id,
        range=f"'{tab_name}'!A1",
        valueInputOption="RAW",
        body={"values": report_rows},
    ).execute()

    alert("Weekly Report", f"Report written to tab '{tab_name}'")
    return report


if __name__ == "__main__":
    r = generate()
    import json
    print(json.dumps(r, indent=2))
