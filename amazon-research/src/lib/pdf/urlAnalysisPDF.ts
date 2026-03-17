import { jsPDF } from "jspdf";
import type { URLAnalysisReport } from "@/lib/types/urlAnalysis";

const MARGIN = 20;
const PAGE_WIDTH = 210; // A4
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;
const LINE_HEIGHT = 5;

function addHeader(doc: jsPDF, title: string, y: number): number {
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text(title, MARGIN, y);
  doc.setDrawColor(99, 102, 241); // indigo-500
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y + 2, MARGIN + CONTENT_WIDTH, y + 2);
  return y + 10;
}

function addSubHeader(doc: jsPDF, text: string, y: number): number {
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(51, 65, 85); // slate-700
  doc.text(text, MARGIN, y);
  return y + 6;
}

function addText(doc: jsPDF, text: string, y: number, maxWidth?: number): number {
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105); // slate-500
  const lines = doc.splitTextToSize(text, maxWidth ?? CONTENT_WIDTH);
  doc.text(lines, MARGIN, y);
  return y + lines.length * LINE_HEIGHT;
}

function addKeyValue(doc: jsPDF, key: string, value: string, y: number): number {
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(51, 65, 85);
  doc.text(key + ":", MARGIN, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text(value, MARGIN + 45, y);
  return y + LINE_HEIGHT;
}

function checkPageBreak(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > 280) {
    doc.addPage();
    return 20;
  }
  return y;
}

export function generateURLAnalysisPDF(report: URLAnalysisReport): void {
  const doc = new jsPDF();
  const { normalizedProduct: product, grade } = report;

  // ─── Page 1: Cover ─────────────────────────────────────────────
  doc.setFillColor(99, 102, 241); // indigo-500
  doc.rect(0, 0, PAGE_WIDTH, 50, "F");

  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("URL Product Analysis", MARGIN, 25);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, MARGIN, 35);
  doc.text(`Model: ${report.claudeModel}`, MARGIN, 42);

  let y = 65;
  y = addKeyValue(doc, "Product", product.title, y);
  y = addKeyValue(doc, "Source", report.source.toUpperCase(), y);
  y = addKeyValue(doc, "URL", report.url, y);
  y = addKeyValue(doc, "Price", `${product.currency}${product.price}`, y);
  y = addKeyValue(doc, "Rating", `${product.rating} stars (${product.reviewCount.toLocaleString()} reviews)`, y);
  if (product.bsr) {
    y = addKeyValue(doc, "BSR", `#${product.bsr.toLocaleString()}`, y);
  }

  y += 10;

  // Overall Grade
  if (grade) {
    doc.setFontSize(48);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(99, 102, 241);
    doc.text(grade.overallGrade, PAGE_WIDTH / 2, y + 15, { align: "center" });
    doc.setFontSize(12);
    doc.setTextColor(71, 85, 105);
    doc.text(`Score: ${grade.overallScore}/100`, PAGE_WIDTH / 2, y + 25, { align: "center" });

    y += 35;
    y = addText(doc, grade.gradeSummary, y);
  }

  // ─── Page 2: Dimension Breakdown ───────────────────────────────
  if (grade) {
    doc.addPage();
    y = 20;
    y = addHeader(doc, "Grade Dimensions", y);

    for (const dim of grade.dimensions) {
      y = checkPageBreak(doc, y, 20);
      y = addSubHeader(doc, `${dim.name}: ${dim.grade} (${dim.score}/20)`, y);
      y = addText(doc, dim.rationale, y);
      if (dim.quickWin) {
        y = addText(doc, `Quick Win: ${dim.quickWin}`, y);
      }
      y += 3;
    }

    y = checkPageBreak(doc, y, 30);
    y = addSubHeader(doc, "Strengths", y);
    for (const s of grade.strengths) {
      y = addText(doc, `• ${s}`, y);
    }

    y += 3;
    y = checkPageBreak(doc, y, 30);
    y = addSubHeader(doc, "Critical Weaknesses", y);
    for (const w of grade.criticalWeaknesses) {
      y = addText(doc, `• ${w}`, y);
    }
  }

  // ─── Page 3: Review Analysis ───────────────────────────────────
  if (report.reviewMining) {
    doc.addPage();
    y = 20;
    y = addHeader(doc, "Review Analysis", y);

    const rm = report.reviewMining;
    y = addKeyValue(doc, "Reviews Analyzed", rm.totalReviewsAnalyzed.toLocaleString(), y);
    y = addKeyValue(doc, "Sentiment", `${rm.sentimentBreakdown.positive}% positive / ${rm.sentimentBreakdown.neutral}% neutral / ${rm.sentimentBreakdown.negative}% negative`, y);
    y += 5;

    y = addSubHeader(doc, "Top Complaint Themes", y);
    for (const theme of rm.topComplaintThemes.slice(0, 5)) {
      y = checkPageBreak(doc, y, 12);
      y = addText(doc, `• ${theme.theme} (${theme.severity}, ${theme.reviewCount} mentions)`, y);
      y = addText(doc, `  Fix: ${theme.productFix}`, y);
    }

    y += 3;
    y = addSubHeader(doc, "Top Praise Themes", y);
    for (const theme of rm.topPraiseThemes.slice(0, 4)) {
      y = checkPageBreak(doc, y, 10);
      y = addText(doc, `• ${theme.theme} (${theme.reviewCount} mentions)`, y);
    }
  }

  // ─── Page 4: Fake Review + Listing Rewrite Summary ─────────────
  if (report.fakeReviewDetection) {
    doc.addPage();
    y = 20;
    y = addHeader(doc, "Review Authenticity", y);

    const fr = report.fakeReviewDetection;
    y = addKeyValue(doc, "Verdict", fr.verdict, y);
    y = addKeyValue(doc, "Suspicion Score", `${fr.suspicionScore}/100`, y);
    y = addText(doc, fr.summary, y);

    y += 5;
    if (fr.flags.length > 0) {
      y = addSubHeader(doc, "Flags", y);
      for (const flag of fr.flags) {
        y = checkPageBreak(doc, y, 10);
        y = addText(doc, `• [${flag.severity}] ${flag.flag}: ${flag.evidence}`, y);
      }
    }
  }

  if (report.listingRewrite) {
    y = checkPageBreak(doc, y, 30);
    y += 5;
    y = addHeader(doc, "Listing Rewrite Summary", y);
    y = addKeyValue(doc, "Original Score", String(report.listingRewrite.originalListingScore), y);
    y = addKeyValue(doc, "Rewritten Score", String(report.listingRewrite.rewrittenListingScore), y);

    y += 3;
    y = addSubHeader(doc, "Rewritten Title", y);
    y = addText(doc, report.listingRewrite.rewrittenTitle, y);

    if (report.listingRewrite.keywordsAdded.length > 0) {
      y += 3;
      y = addSubHeader(doc, "Keywords Added", y);
      y = addText(doc, report.listingRewrite.keywordsAdded.join(", "), y);
    }
  }

  // ─── Page 5: Image Grading + Q&A ──────────────────────────────
  if (report.imageGrading) {
    doc.addPage();
    y = 20;
    y = addHeader(doc, "Image Grading", y);
    y = addKeyValue(doc, "Overall Image Score", `${report.imageGrading.overallImageScore}/100`, y);

    if (report.imageGrading.missingImageTypes.length > 0) {
      y = addText(doc, `Missing: ${report.imageGrading.missingImageTypes.join(", ")}`, y);
    }

    for (const img of report.imageGrading.images) {
      y = checkPageBreak(doc, y, 10);
      y = addText(doc, `Slot ${img.imageIndex + 1} (${img.type}): ${img.grade} — ${img.score}/100`, y);
    }
  }

  if (report.qaExtraction) {
    y = checkPageBreak(doc, y, 25);
    y += 5;
    y = addHeader(doc, "Q&A Insights", y);
    y = addKeyValue(doc, "Questions Analyzed", String(report.qaExtraction.totalQuestionsAnalyzed), y);

    for (const gap of report.qaExtraction.listingGaps) {
      y = checkPageBreak(doc, y, 12);
      y = addText(doc, `Gap: "${gap.question}" → ${gap.whereToAdd}`, y);
      y = addText(doc, `  Suggested: "${gap.suggestedCopy}"`, y);
    }
  }

  // ─── Page 6: Price History + Supplier ──────────────────────────
  if (report.priceHistory) {
    doc.addPage();
    y = 20;
    y = addHeader(doc, "Price History (90 Days)", y);
    y = addKeyValue(doc, "Direction", report.priceHistory.priceDirection, y);
    y = addKeyValue(doc, "Volatility", report.priceHistory.priceVolatility, y);
    y = addKeyValue(doc, "90-Day Low", `$${report.priceHistory.lowestPrice90Days.toFixed(2)}`, y);
    y = addKeyValue(doc, "90-Day High", `$${report.priceHistory.highestPrice90Days.toFixed(2)}`, y);
    y = addKeyValue(doc, "Optimal Window", report.priceHistory.optimalPriceWindow, y);
    y += 3;
    y = addText(doc, report.priceHistory.pricingInsight, y);
  }

  if (report.supplierMatch) {
    y = checkPageBreak(doc, y, 30);
    y += 5;
    y = addHeader(doc, "Supplier Match", y);
    y = addKeyValue(doc, "Est. Source Cost", `$${report.supplierMatch.estimatedSourceCost.low} – $${report.supplierMatch.estimatedSourceCost.high}`, y);
    y = addKeyValue(doc, "Projected Margin", `${report.supplierMatch.marginVsCurrentPrice.projectedNetMargin}%`, y);
    y = addKeyValue(doc, "Search Keywords", report.supplierMatch.searchKeywords.join(", "), y);
    y += 3;
    y = addText(doc, report.supplierMatch.sourcingVerdict, y);
  }

  // ─── Page 7: PPC + Pricing + Repeat Purchase ──────────────────
  if (report.ppcKeywords || report.pricingStrategy || report.repeatPurchase) {
    doc.addPage();
    y = 20;

    if (report.ppcKeywords) {
      y = addHeader(doc, "PPC Keywords", y);
      y = addSubHeader(doc, "Exact Match", y);
      y = addText(doc, report.ppcKeywords.exactMatchTargets.map((k) => k.keyword).join(", "), y);
      y += 3;
      y = addSubHeader(doc, "Broad Match", y);
      y = addText(doc, report.ppcKeywords.broadMatchOpportunities.map((k) => k.keyword).join(", "), y);
      y += 5;
    }

    if (report.pricingStrategy) {
      y = checkPageBreak(doc, y, 20);
      y = addHeader(doc, "Pricing Strategy", y);
      y = addKeyValue(doc, "Optimal Price", `$${report.pricingStrategy.optimalPrice}`, y);
      y = addText(doc, report.pricingStrategy.priceRationale, y);
      y += 5;
    }

    if (report.repeatPurchase) {
      y = checkPageBreak(doc, y, 20);
      y = addHeader(doc, "Repeat Purchase", y);
      y = addKeyValue(doc, "Score", `${report.repeatPurchase.score}/100`, y);
      y = addKeyValue(doc, "Probability", report.repeatPurchase.probability, y);
      y = addKeyValue(doc, "12-Month LTV", `$${report.repeatPurchase.ltv.estimatedLTV12Month}`, y);
      y += 3;
    }
  }

  // ─── Page 8: Action Plan ───────────────────────────────────────
  if (report.actionPlan) {
    doc.addPage();
    y = 20;
    y = addHeader(doc, "Action Plan", y);
    y = addText(doc, report.actionPlan.priorityStatement, y);
    y += 5;

    const sections = [
      { title: "Immediate Actions (This Week)", items: report.actionPlan.immediateActions },
      { title: "Short-Term Actions (This Month)", items: report.actionPlan.shortTermActions },
      { title: "Long-Term Actions (This Quarter)", items: report.actionPlan.longTermActions },
    ];

    for (const section of sections) {
      y = checkPageBreak(doc, y, 15);
      y = addSubHeader(doc, section.title, y);
      for (const item of section.items) {
        y = checkPageBreak(doc, y, 15);
        y = addText(doc, `• ${item.action} ($${item.estimatedCost}) — ${item.expectedImpact}`, y);
        for (const step of item.specificSteps) {
          y = addText(doc, `    ○ ${step}`, y);
        }
      }
      y += 3;
    }

    y = checkPageBreak(doc, y, 10);
    y = addKeyValue(doc, "Total Investment", `$${report.actionPlan.totalEstimatedCost.toLocaleString()}`, y);
  }

  // Save
  const filename = product.title.slice(0, 50).replace(/[^a-zA-Z0-9 ]/g, "").trim().replace(/\s+/g, "-");
  doc.save(`${filename}-analysis.pdf`);
}
