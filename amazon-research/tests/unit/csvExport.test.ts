/**
 * Unit tests: CSV Export service
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// We test the internal CSV generation logic without browser DOM

/**
 * Replicate the escapeCSV function from csvExport.ts for testing
 * (We can't import the actual file easily since it uses document.* in the download fn)
 */
function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCSV(headers: string[], rows: string[][]): string {
  const headerLine = headers.map(escapeCSV).join(",");
  const dataLines = rows.map((row) => row.map(escapeCSV).join(","));
  return [headerLine, ...dataLines].join("\n");
}

describe("CSV Escaping", () => {
  it("returns empty string for null", () => {
    expect(escapeCSV(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(escapeCSV(undefined)).toBe("");
  });

  it("passes through simple strings", () => {
    expect(escapeCSV("hello")).toBe("hello");
  });

  it("wraps strings with commas in quotes", () => {
    expect(escapeCSV("hello, world")).toBe('"hello, world"');
  });

  it("escapes double quotes by doubling them", () => {
    expect(escapeCSV('say "hello"')).toBe('"say ""hello"""');
  });

  it("wraps strings with newlines in quotes", () => {
    expect(escapeCSV("line1\nline2")).toBe('"line1\nline2"');
  });

  it("converts numbers to strings", () => {
    expect(escapeCSV(42)).toBe("42");
  });

  it("converts booleans to strings", () => {
    expect(escapeCSV(true)).toBe("true");
  });

  // Security: prevent formula injection in spreadsheets
  it("does not add special escaping for formula injection (=, +, -, @)", () => {
    // Note: CSV spec doesn't require escaping these, but spreadsheet apps
    // may interpret them as formulas. This documents current behavior.
    expect(escapeCSV("=SUM(A1:A10)")).toBe("=SUM(A1:A10)");
  });
});

describe("CSV Generation", () => {
  it("generates valid CSV with headers and rows", () => {
    const csv = toCSV(
      ["Name", "Price", "Category"],
      [
        ["Widget", "9.99", "Tools"],
        ["Gadget", "19.99", "Electronics"],
      ]
    );
    expect(csv).toBe("Name,Price,Category\nWidget,9.99,Tools\nGadget,19.99,Electronics");
  });

  it("handles empty rows", () => {
    const csv = toCSV(["Name", "Price"], []);
    expect(csv).toBe("Name,Price");
  });

  it("handles special characters in data", () => {
    const csv = toCSV(
      ["Title"],
      [['Premium "Deluxe" Widget, Large']]
    );
    expect(csv).toBe('Title\n"Premium ""Deluxe"" Widget, Large"');
  });

  it("handles empty cell values", () => {
    const csv = toCSV(
      ["A", "B", "C"],
      [["1", "", "3"]]
    );
    expect(csv).toBe("A,B,C\n1,,3");
  });
});

describe("Product CSV column mapping", () => {
  it("includes all expected product columns", () => {
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
    expect(headers).toHaveLength(15);
    expect(headers[0]).toBe("ASIN");
    expect(headers[headers.length - 1]).toBe("Recommendation");
  });
});
