"""Generate professional, ATS-friendly PDF resumes and cover letters."""

import os
import re
from typing import Any, Dict, List, TypedDict

from fpdf import FPDF  # pyre-ignore[21]


def _sanitize_latin1(text: str) -> str:
    """Replace non-Latin-1 characters with safe ASCII equivalents."""
    # Common Unicode replacements
    replacements = {
        '\u2018': "'", '\u2019': "'",  # smart quotes
        '\u201c': '"', '\u201d': '"',
        '\u2013': '-', '\u2014': '-',  # em/en dash
        '\u2026': '...', '\u2022': chr(183),  # ellipsis, bullet
        '\u00a0': ' ',  # non-breaking space
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    # Strip any remaining non-Latin-1 chars
    return text.encode('latin-1', errors='replace').decode('latin-1')

BASE_DIR = os.path.dirname(os.path.dirname(__file__))

# Colors
NAVY = (30, 55, 90)
DARK_GRAY = (50, 50, 50)
MED_GRAY = (100, 100, 100)
LIGHT_LINE = (180, 200, 220)


class ExperienceEntry(TypedDict):
    company: str
    title: str
    duration: str
    bullets: List[str]


class ResumeData(TypedDict):
    name: str
    title: str
    contact: str
    summary: str
    skills: str
    experience: List[ExperienceEntry]
    certifications: List[str]
    education: str


class ResumePDF(FPDF):
    """ATS-friendly resume PDF with clean professional formatting."""

    def __init__(self) -> None:
        super().__init__(format="letter")  # pyre-ignore[6]
        self.set_auto_page_break(auto=True, margin=20)
        self._load_fonts()

    def _load_fonts(self) -> None:
        """Use built-in Helvetica (ATS-safe, similar to Calibri)."""
        self.set_font("Helvetica", size=10)

    def _draw_line(self) -> None:
        """Thin horizontal rule."""
        self.set_draw_color(*LIGHT_LINE)
        self.set_line_width(0.4)
        y = self.get_y()
        self.line(20, y, self.w - 20, y)
        self.ln(3)

    def _section_header(self, text: str) -> None:
        """Section header: NAVY, uppercase, with line underneath."""
        self.ln(3)
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(*NAVY)
        self.cell(0, 7, text.upper(), new_x="LMARGIN", new_y="NEXT")
        self._draw_line()
        self.set_text_color(*DARK_GRAY)
        self.set_font("Helvetica", size=10)


def _parse_resume_text(text: str) -> ResumeData:
    """Parse the plain-text resume into structured sections."""
    lines = text.strip().split("\n")

    name = ""
    title = ""
    contact = ""
    summary = ""
    skills = ""
    experience: List[ExperienceEntry] = []
    certifications: List[str] = []
    education = ""

    current_section = "header"
    current_exp: ExperienceEntry | None = None
    header_lines: List[str] = []

    for line in lines:
        stripped = line.strip()

        # Detect section headers
        upper = stripped.upper()
        if upper == "PROFESSIONAL SUMMARY":
            current_section = "summary"
            continue
        elif upper in ("CORE COMPETENCIES", "CORE SKILLS", "SKILLS"):
            current_section = "skills"
            continue
        elif upper == "PROFESSIONAL EXPERIENCE":
            current_section = "experience"
            continue
        elif upper == "CERTIFICATIONS":
            current_section = "certifications"
            continue
        elif upper == "EDUCATION":
            current_section = "education"
            continue

        # Parse by section
        if current_section == "header":
            if stripped:
                header_lines.append(stripped)
        elif current_section == "summary":
            if stripped:
                summary += (" " + stripped) if summary else stripped  # pyre-ignore[58]
        elif current_section == "skills":
            if stripped:
                # Use double-space separator to preserve category lines
                skills += ("  " + stripped) if skills else stripped  # pyre-ignore[58]
        elif current_section == "experience":
            if not stripped:
                continue
            # Check if it's a company line (contains |)
            if "|" in stripped and not stripped.startswith(" "):
                if current_exp:
                    experience.append(current_exp)  # pyre-ignore[6]
                parts = [p.strip() for p in stripped.split("|")]
                current_exp = {  # pyre-ignore[9]
                    "company": parts[0] if len(parts) > 0 else "",
                    "title": parts[1] if len(parts) > 1 else "",
                    "duration": parts[2] if len(parts) > 2 else "",
                    "bullets": [],
                }
            elif current_exp:
                current_exp["bullets"].append(stripped)  # pyre-ignore[29]
        elif current_section == "certifications":
            if stripped:
                certifications.append(stripped)
        elif current_section == "education":
            if stripped:
                education += (" " + stripped) if education else stripped  # pyre-ignore[58]

    if current_exp:
        experience.append(current_exp)  # pyre-ignore[6]

    # Parse header lines
    if len(header_lines) >= 1:
        name = header_lines[0]
    if len(header_lines) >= 2:
        title = header_lines[1]
    if len(header_lines) >= 3:
        contact = header_lines[2]

    return {
        "name": name,
        "title": title,
        "contact": contact,
        "summary": summary,
        "skills": skills,
        "experience": experience,
        "certifications": certifications,
        "education": education,
    }


def generate_resume_pdf(text: str, output_path: str) -> str:
    """Convert plain-text resume to a professional PDF."""
    text = _sanitize_latin1(text)
    data = _parse_resume_text(text)
    pdf = ResumePDF()
    pdf.add_page()
    pdf.set_margins(20, 15, 20)

    # === Name ===
    pdf.set_font("Helvetica", "B", 22)
    pdf.set_text_color(*NAVY)
    pdf.cell(0, 10, data["name"], align="C", new_x="LMARGIN", new_y="NEXT")

    # === Title ===
    pdf.set_font("Helvetica", size=12)
    pdf.set_text_color(*MED_GRAY)
    pdf.cell(0, 6, data["title"], align="C", new_x="LMARGIN", new_y="NEXT")

    # === Contact ===
    if data["contact"]:
        pdf.set_font("Helvetica", size=9)
        pdf.set_text_color(*MED_GRAY)
        pdf.cell(0, 5, data["contact"], align="C", new_x="LMARGIN", new_y="NEXT")

    pdf.ln(2)
    pdf._draw_line()

    # === Professional Summary ===
    if data["summary"]:
        pdf._section_header("Professional Summary")
        pdf.set_font("Helvetica", size=10)
        pdf.set_text_color(*DARK_GRAY)
        pdf.multi_cell(0, 5, data["summary"])

    # === Core Competencies ===
    if data["skills"]:
        pdf._section_header("Core Competencies")
        pdf.set_text_color(*DARK_GRAY)

        # Check if skills use "Category: items" format
        skill_lines = [s.strip() for s in data["skills"].split("  ") if s.strip()]
        has_categories = any(":" in line for line in skill_lines)

        if has_categories:
            # Two-column table: bold category label | items
            label_col_w = 42  # fixed width for category labels
            items_col_w = pdf.w - 40 - label_col_w  # remaining width

            for line in skill_lines:
                if ":" in line:
                    cat, items = line.split(":", 1)
                    y_before = pdf.get_y()
                    # Category label (bold, left column)
                    pdf.set_font("Helvetica", "B", 9)
                    pdf.set_x(20)
                    pdf.cell(label_col_w, 5, cat.strip())
                    # Items (regular, right column with wrapping)
                    pdf.set_font("Helvetica", size=9)
                    pdf.set_x(20 + label_col_w)
                    pdf.multi_cell(items_col_w, 5, items.strip(), align="L")
                    pdf.ln(1)
                else:
                    pdf.set_font("Helvetica", size=9)
                    pdf.multi_cell(0, 5, line, align="L")
                    pdf.ln(1)
        else:
            # Flat comma-separated list in 3 columns
            skill_list = [s.strip() for s in data["skills"].split(",") if s.strip()]
            col_width = (pdf.w - 40) / 3
            pdf.set_font("Helvetica", size=9)
            for i, skill in enumerate(skill_list):
                col = i % 3
                if col == 0 and i > 0:
                    pdf.ln(5)
                x = 20 + col * col_width
                pdf.set_x(x)
                pdf.cell(col_width, 5, skill.strip())
        pdf.ln(3)

    # === Professional Experience ===
    if data["experience"]:
        pdf._section_header("Professional Experience")

        for exp in data["experience"]:
            # Company | Title | Duration
            pdf.set_font("Helvetica", "B", 10)
            pdf.set_text_color(*NAVY)
            company_title = f"{exp['company']}  |  {exp['title']}"
            pdf.cell(0, 6, company_title, new_x="LMARGIN", new_y="NEXT")

            pdf.set_font("Helvetica", "I", 9)
            pdf.set_text_color(*MED_GRAY)
            pdf.cell(0, 4, exp["duration"], new_x="LMARGIN", new_y="NEXT")
            pdf.ln(1)

            # Bullets
            pdf.set_font("Helvetica", size=9.5)
            pdf.set_text_color(*DARK_GRAY)
            for bullet in exp["bullets"]:
                # Strip leading "- " to avoid double bullet (· -)
                b_text = bullet.strip()
                if b_text.startswith("- "):
                    b_text = b_text[2:]  # pyre-ignore[29]
                pdf.set_x(25)
                pdf.cell(4, 5, chr(183))  # bullet character
                pdf.multi_cell(0, 5, " " + b_text)

            pdf.ln(2)

    # === Certifications ===
    if data["certifications"]:
        pdf._section_header("Certifications")
        pdf.set_font("Helvetica", size=9.5)
        pdf.set_text_color(*DARK_GRAY)
        for cert in data["certifications"]:
            c_text = cert.strip()
            if c_text.startswith("- "):
                c_text = c_text[2:]  # pyre-ignore[29]
            pdf.set_x(25)
            pdf.cell(4, 5, chr(183))
            pdf.cell(0, 5, " " + c_text, new_x="LMARGIN", new_y="NEXT")

    # === Education ===
    if data["education"]:
        pdf._section_header("Education")
        pdf.set_font("Helvetica", size=10)
        pdf.set_text_color(*DARK_GRAY)
        pdf.cell(0, 6, data["education"].strip(), new_x="LMARGIN", new_y="NEXT")

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    pdf.output(output_path)
    return output_path


def generate_cover_letter_pdf(text: str, output_path: str, job_title: str = "", company: str = "") -> str:
    """Convert plain-text cover letter to a professional PDF."""
    from datetime import date as _date

    text = _sanitize_latin1(text)
    pdf = FPDF(format="letter")  # pyre-ignore[6]
    pdf.set_auto_page_break(auto=True, margin=25)
    pdf.add_page()
    pdf.set_margins(25, 20, 25)

    # Parse paragraphs
    paragraphs = [p.strip() for p in text.strip().split("\n\n") if p.strip()]

    # Check if last paragraph is the signoff
    signoff_lines: List[str] = []
    body_paragraphs: List[str] = []
    for p in paragraphs:
        if p.strip().startswith("Sincerely"):
            signoff_lines = p.strip().split("\n")
        else:
            body_paragraphs.append(p)

    # === Body paragraphs (text already starts with "Dear Hiring Manager,") ===
    pdf.set_font("Helvetica", size=11)
    pdf.set_text_color(*DARK_GRAY)
    pdf.ln(5)

    for i, para in enumerate(body_paragraphs):
        clean = " ".join(para.split())
        pdf.multi_cell(0, 6, clean)
        pdf.ln(4)

    # === Sign-off ===
    pdf.ln(4)
    if signoff_lines:
        for line in signoff_lines:
            pdf.set_font("Helvetica", size=11)
            pdf.set_text_color(*DARK_GRAY)
            pdf.cell(0, 6, line.strip(), new_x="LMARGIN", new_y="NEXT")
    else:
        pdf.cell(0, 6, "Sincerely,", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 6, "Christian Shibeshi", new_x="LMARGIN", new_y="NEXT")

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    pdf.output(output_path)
    return output_path


if __name__ == "__main__":
    # Test with a sample resume
    sample_resume = os.path.join(BASE_DIR, ".tmp", "resume_gemma-test2.txt")
    if os.path.exists(sample_resume):
        with open(sample_resume, "r") as f:
            text = f.read()
        out = generate_resume_pdf(text, os.path.join(BASE_DIR, ".tmp", "test_resume.pdf"))
        print(f"Resume PDF: {out}")

    # Test with a sample cover letter
    sample_cl = os.path.join(BASE_DIR, ".tmp", "cl_gemma-test.txt")
    if os.path.exists(sample_cl):
        with open(sample_cl, "r") as f:
            text = f.read()
        out = generate_cover_letter_pdf(text, os.path.join(BASE_DIR, ".tmp", "test_cover_letter.pdf"))
        print(f"Cover Letter PDF: {out}")
