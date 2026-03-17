/**
 * CSV Export Service.
 * Pure client-side CSV generation from product and analysis data.
 * Generates CSV string, creates Blob, and triggers download.
 */

import type { Product } from "@/lib/types";
import type { IntelligenceReport } from "@/lib/types/intelligence";

/**
 * Escape a CSV field value (handles commas, quotes, newlines, and formula injection).
 * Prefixes cells starting with formula trigger characters (=, +, -, @) with a
 * tab character to prevent formula injection in Excel/Google Sheets.
 */
function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return "";
  let str = String(value);

  // Prevent CSV formula injection: prefix dangerous leading characters with a tab
  const FORMULA_TRIGGERS = ["=", "+", "-", "@"];
  if (str.length > 0 && FORMULA_TRIGGERS.includes(str[0])) {
    str = "\t" + str;
  }

  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\t")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Convert array of objects to CSV string.
 */
function toCSV(headers: string[], rows: string[][]): string {
  const headerLine = headers.map(escapeCSV).join(",");
  const dataLines = rows.map((row) => row.map(escapeCSV).join(","));
  return [headerLine, ...dataLines].join("\n");
}

/**
 * Trigger a file download in the browser.
 */
function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export products to CSV and trigger download.
 */
export function exportProductsCSV(
  products: Array<Product & { opportunity?: Record<string, unknown> | null }>
): void {
  const headers = [
    "ASIN",
    "Title",
    "Brand",
    "Category",
    "Subcategory",
    "Price",
    "Rating",
    "Review Count",
    "BSR",
    "Est. Monthly Sales",
    "Est. Monthly Revenue",
    "Profit Margin",
    "Opportunity Score",
    "Tier",
    "Recommendation",
  ];

  const rows = products.map((p) => [
    p.asin,
    p.title,
    p.brand,
    p.category,
    p.subcategory,
    String(p.price),
    String(p.rating),
    String(p.reviewCount),
    String(p.bsr),
    String(p.estimatedMonthlySales),
    String(p.estimatedMonthlyRevenue),
    String(Math.round(p.profitMarginEstimate * 100)) + "%",
    p.opportunity ? String(p.opportunity.opportunityScore ?? "") : "",
    p.opportunity ? String(p.opportunity.tier ?? "") : "",
    p.opportunity ? String(p.opportunity.recommendation ?? "") : "",
  ]);

  const csv = toCSV(headers, rows);
  const date = new Date().toISOString().split("T")[0];
  downloadCSV(csv, `amazon-products-${date}.csv`);
}

/**
 * Export opportunities to CSV and trigger download.
 */
export function exportOpportunitiesCSV(
  opportunities: Array<{
    id: string;
    productId: string;
    opportunityScore: number;
    tier: string;
    recommendation: string;
    scoreBreakdown?: {
      demandScore: number;
      competitionScore: number;
      marginScore: number;
      sentimentScore: number;
    };
  }>
): void {
  const headers = [
    "Product ID",
    "Opportunity Score",
    "Tier",
    "Recommendation",
    "Demand Score",
    "Competition Score",
    "Margin Score",
    "Sentiment Score",
  ];

  const rows = opportunities.map((o) => [
    o.productId,
    String(o.opportunityScore),
    o.tier,
    o.recommendation,
    String(o.scoreBreakdown?.demandScore ?? ""),
    String(o.scoreBreakdown?.competitionScore ?? ""),
    String(o.scoreBreakdown?.marginScore ?? ""),
    String(o.scoreBreakdown?.sentimentScore ?? ""),
  ]);

  const csv = toCSV(headers, rows);
  const date = new Date().toISOString().split("T")[0];
  downloadCSV(csv, `amazon-opportunities-${date}.csv`);
}

/**
 * Export an intelligence report to CSV and trigger download.
 */
export function exportIntelligenceCSV(report: IntelligenceReport): void {
  const sections: string[][] = [];

  // Header
  sections.push(["Intelligence Report", report.id]);
  sections.push(["Status", report.status]);
  sections.push(["Capital", String(report.inputContext.availableCapital)]);
  sections.push(["Created", report.createdAt]);
  sections.push([]);

  // Verdict
  if (report.verdict) {
    sections.push(["== Product Verdict =="]);
    sections.push(["Product", report.verdict.productName]);
    sections.push(["Target Price", String(report.verdict.targetPrice)]);
    sections.push(["Unit Cost", String(report.verdict.estimatedUnitCost)]);
    sections.push(["MOQ", String(report.verdict.minimumOrderQuantity)]);
    sections.push(["Category", report.verdict.category]);
    sections.push(["Investment Thesis", report.verdict.investmentThesis]);
    sections.push(["Win Score", String(report.verdict.totalWinScore)]);
    sections.push([]);
  }

  // Financial model
  if (report.financialModel) {
    sections.push(["== Financial Model =="]);
    sections.push(["Break-even Units", String(report.financialModel.breakEvenUnits)]);
    sections.push(["Break-even Months", String(report.financialModel.breakEvenMonths)]);
    sections.push(["ROI (12 month)", String(Math.round(report.financialModel.roi12Month * 100)) + "%"]);
    sections.push(["Unit Profit", String(report.financialModel.unitEconomics.profitPerUnit)]);
    sections.push(["Margin %", String(Math.round(report.financialModel.unitEconomics.marginPercent * 100)) + "%"]);
    sections.push([]);
  }

  // Success probability
  if (report.successProbability) {
    sections.push(["== Success Probability =="]);
    sections.push(["Overall Score", String(report.successProbability.overallScore)]);
    sections.push(["Confidence Interval", `${report.successProbability.confidenceInterval[0]}-${report.successProbability.confidenceInterval[1]}`]);
    sections.push(["Assessment", report.successProbability.honestAssessment]);
    sections.push([]);
  }

  // Risks
  if (report.riskRegister) {
    sections.push(["== Risk Register =="]);
    sections.push(["Risk", "Likelihood", "Impact", "Adjusted Severity", "Mitigation"]);
    for (const risk of report.riskRegister.risks) {
      sections.push([
        risk.title,
        String(risk.likelihood),
        String(risk.impact),
        String(risk.adjustedSeverity),
        risk.mitigation,
      ]);
    }
    sections.push([]);
  }

  // Token usage
  sections.push(["== Token Usage =="]);
  sections.push(["Input Tokens", String(report.tokenUsage.totalInputTokens)]);
  sections.push(["Output Tokens", String(report.tokenUsage.totalOutputTokens)]);

  const csv = sections.map((row) => row.map(escapeCSV).join(",")).join("\n");
  const date = new Date().toISOString().split("T")[0];
  const productName = report.verdict?.productName?.replace(/[^a-zA-Z0-9]/g, "-") ?? "report";
  downloadCSV(csv, `intelligence-${productName}-${date}.csv`);
}
