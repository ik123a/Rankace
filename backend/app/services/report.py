"""Rankace PDF and summary report generator."""
import datetime as dt
from fpdf import FPDF


class RankacePDF(FPDF):
    def header(self):
        self.set_font("Helvetica", "B", 12)
        self.set_text_color(30, 41, 59)
        self.cell(0, 8, "RANKACE  |  SEO Opportunity & Search Visibility Report", new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(226, 232, 240)
        self.set_line_width(0.3)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(4)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(148, 163, 184)
        self.cell(0, 10, f"Page {self.page_no()} | Confidential SEO Growth Intelligence | Rankace", align="C")


def clean_text(text: str) -> str:
    """Sanitize text to Latin-1 compatible for standard PDF fonts."""
    if not text:
        return ""
    replacements = {
        "\u2014": " - ",
        "\u2013": " - ",
        "\u2018": "'",
        "\u2019": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u2022": "*",
        "\u2713": "[YES]",
        "\u2715": "[NO]",
        "\u2192": "->",
    }
    for orig, repl in replacements.items():
        text = text.replace(orig, repl)
    return text.encode("latin-1", "replace").decode("latin-1")


def generate_pdf_report(project, score, issues, recs, gaps, keywords) -> bytes:
    pdf = RankacePDF(orientation="P", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    # Title & Metadata
    pdf.set_font("Helvetica", "B", 20)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(0, 10, clean_text(f"SEO Analysis: {project.name}"), new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(100, 116, 139)
    date_str = dt.datetime.now().strftime("%B %d, %Y")
    pdf.cell(0, 6, clean_text(f"Website: {project.website_url}  |  Target Query: {project.target_keyword or 'None'}  |  Date: {date_str}"), new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    # Executive Summary Card
    health_val = score.health if score else 0
    opp_val = score.opportunity if score else 0
    pdf.set_fill_color(248, 250, 252)
    pdf.set_draw_color(203, 213, 225)
    pdf.rect(10, pdf.get_y(), 190, 24, "FD")
    y_start = pdf.get_y() + 4

    pdf.set_xy(15, y_start)
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(100, 116, 139)
    pdf.cell(40, 5, "SEO HEALTH")
    pdf.set_xy(15, y_start + 6)
    pdf.set_font("Helvetica", "B", 18)
    pdf.set_text_color(37, 99, 235)
    pdf.cell(40, 8, f"{health_val}/100")

    pdf.set_xy(65, y_start)
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(100, 116, 139)
    pdf.cell(45, 5, "SEARCH VISIBILITY")
    pdf.set_xy(65, y_start + 6)
    pdf.set_font("Helvetica", "B", 18)
    pdf.set_text_color(16, 185, 129)
    pdf.cell(45, 8, f"{opp_val}/100")

    pdf.set_xy(120, y_start)
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(100, 116, 139)
    pdf.cell(40, 5, "CRITICAL ISSUES")
    crit_count = sum(1 for i in issues if i.severity == "critical")
    pdf.set_xy(120, y_start + 6)
    pdf.set_font("Helvetica", "B", 18)
    pdf.set_text_color(239, 68, 68)
    pdf.cell(40, 8, str(crit_count))

    pdf.set_xy(165, y_start)
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(100, 116, 139)
    pdf.cell(30, 5, "OPPORTUNITIES")
    pdf.set_xy(165, y_start + 6)
    pdf.set_font("Helvetica", "B", 18)
    pdf.set_text_color(79, 70, 229)
    pdf.cell(30, 8, str(len(recs)))

    pdf.set_y(y_start + 20)
    pdf.ln(4)

    # Section 1: Executive Summary
    pdf.set_font("Helvetica", "B", 13)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(0, 7, "1. Executive Summary", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(51, 65, 85)
    summary_text = (
        f"Rankace performed a full technical crawl and content intelligence audit of {project.website_url}. "
        f"The current SEO Health score is {health_val}/100 with a Search Visibility Potential of {opp_val}/100. "
        f"We identified {len(issues)} technical issues (including {crit_count} critical) and detected "
        f"{len(gaps)} key topical content opportunities compared to benchmark standards. "
        "Prioritizing the actionable recommendations below will address crawling bottlenecks and improve topical depth."
    )
    pdf.multi_cell(190, 5, clean_text(summary_text))
    pdf.ln(3)

    # Section 2: Top Prioritized Recommendations
    pdf.set_font("Helvetica", "B", 13)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(0, 7, "2. Prioritized Action Plan", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 9)

    for idx, r in enumerate(recs[:6], 1):
        pdf.set_fill_color(241, 245, 249)
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(30, 41, 59)
        badge = f"[{r.priority.upper()} PRIORITY | {r.impact.upper()} IMPACT | {r.effort.upper()} EFFORT]"
        pdf.cell(190, 6, clean_text(f"{idx}. {r.title}  {badge}"), fill=True, new_x="LMARGIN", new_y="NEXT")

        pdf.set_font("Helvetica", "", 8.5)
        pdf.set_text_color(71, 85, 105)
        pdf.multi_cell(190, 4.5, clean_text(f"Problem: {r.problem}\nWhy it matters: {r.why}\nRecommended Action: {r.action}"))
        pdf.ln(2)

    # Section 3: Technical SEO Issues Breakdown
    pdf.set_font("Helvetica", "B", 13)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(0, 7, "3. Technical SEO Issues Summary", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 9)

    if not issues:
        pdf.set_text_color(16, 185, 129)
        pdf.cell(0, 5, "No technical issues found. Excellent!", new_x="LMARGIN", new_y="NEXT")
    else:
        for it in issues[:8]:
            color = (239, 68, 68) if it.severity == "critical" else (245, 158, 11) if it.severity == "high" else (71, 85, 105)
            pdf.set_font("Helvetica", "B", 9)
            pdf.set_text_color(*color)
            pdf.cell(30, 5, f"[{it.severity.upper()}]")
            pdf.set_font("Helvetica", "", 8.5)
            pdf.set_text_color(51, 65, 85)
            pdf.cell(160, 5, clean_text(f"{it.check}: {it.message[:80]}"), new_x="LMARGIN", new_y="NEXT")

    pdf.ln(3)

    # Section 4: Content Gaps
    if gaps:
        pdf.set_font("Helvetica", "B", 13)
        pdf.set_text_color(15, 23, 42)
        pdf.cell(0, 7, "4. Content & Topic Gaps", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "", 8.5)
        pdf.set_text_color(51, 65, 85)
        for g in gaps[:6]:
            status = "MISSING on your site (Present on competitors)" if g.gap_level == "high" else "Covered"
            pdf.cell(70, 5, clean_text(f"* {g.topic}"))
            pdf.cell(120, 5, clean_text(f"Status: {status} [{g.gap_level.upper()}]"), new_x="LMARGIN", new_y="NEXT")

    pdf.ln(4)

    # Disclaimer
    pdf.set_draw_color(226, 232, 240)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(3)
    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(148, 163, 184)
    disclaimer = (
        "Disclaimer: Rankace estimates SEO and search visibility potential based on empirical best practices, "
        "crawling data, and semantic NLP models. It does not claim to know or reproduce Google's proprietary "
        "ranking algorithm. Results should guide strategic optimizations."
    )
    pdf.multi_cell(190, 4, clean_text(disclaimer))

    return bytes(pdf.output())
