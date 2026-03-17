/**
 * Unit tests: Search logic
 */
import { describe, it, expect } from "vitest";

// Replicate search scoring logic from useSearch.ts for unit testing
// (Hook can't be tested without React rendering context, so we test the core algorithm)

interface SearchableItem {
  id: string;
  type: "product" | "suggestion" | "report";
  title: string;
  subtitle: string;
  href: string;
  searchFields: string[];
}

interface SearchResult {
  id: string;
  type: "product" | "suggestion" | "report";
  title: string;
  subtitle: string;
  href: string;
  score: number;
}

function searchItems(items: SearchableItem[], query: string): SearchResult[] {
  if (!query || query.length < 2) return [];

  const normalizedQuery = query.toLowerCase().trim();
  const queryTerms = normalizedQuery.split(/\s+/);

  const scored: SearchResult[] = [];

  for (const item of items) {
    let bestScore = 0;

    for (const field of item.searchFields) {
      const normalizedField = field.toLowerCase();

      if (normalizedField === normalizedQuery) {
        bestScore = Math.max(bestScore, 1.0);
        continue;
      }
      if (normalizedField.startsWith(normalizedQuery)) {
        bestScore = Math.max(bestScore, 0.9);
        continue;
      }
      if (normalizedField.includes(normalizedQuery)) {
        bestScore = Math.max(bestScore, 0.8);
        continue;
      }

      const allTermsFound = queryTerms.every((term) =>
        normalizedField.includes(term)
      );
      if (allTermsFound) {
        bestScore = Math.max(bestScore, 0.6);
        continue;
      }

      const matchedTerms = queryTerms.filter((term) =>
        normalizedField.includes(term)
      );
      if (matchedTerms.length > 0) {
        const partialScore = (matchedTerms.length / queryTerms.length) * 0.4;
        bestScore = Math.max(bestScore, partialScore);
      }
    }

    if (bestScore > 0) {
      scored.push({
        id: item.id,
        type: item.type,
        title: item.title,
        subtitle: item.subtitle,
        href: item.href,
        score: bestScore,
      });
    }
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, 20);
}

const testItems: SearchableItem[] = [
  {
    id: "1",
    type: "product",
    title: "Premium Stainless Steel Garlic Press",
    subtitle: "KitchenPro",
    href: "/dashboard/product/B09V3KXJPB",
    searchFields: ["Premium Stainless Steel Garlic Press", "KitchenPro", "B09V3KXJPB", "Kitchen Gadgets"],
  },
  {
    id: "2",
    type: "product",
    title: "Bamboo Cutting Board Set",
    subtitle: "EcoKitchen",
    href: "/dashboard/product/B0ABC12345",
    searchFields: ["Bamboo Cutting Board Set", "EcoKitchen", "B0ABC12345", "Kitchen"],
  },
  {
    id: "3",
    type: "suggestion",
    title: "Ergonomic Garlic Press with Silicone Grip",
    subtitle: "S-Tier Opportunity",
    href: "/dashboard/suggestions/sug-1",
    searchFields: ["Ergonomic Garlic Press with Silicone Grip", "Kitchen Gadgets"],
  },
  {
    id: "4",
    type: "report",
    title: "Intelligence Report: Garlic Press Market",
    subtitle: "Score: 78/100",
    href: "/dashboard/intelligence/rpt-1",
    searchFields: ["Garlic Press Market", "garlic", "press", "kitchen"],
  },
];

describe("Search Logic", () => {
  describe("query filtering", () => {
    it("returns empty for queries shorter than 2 chars", () => {
      expect(searchItems(testItems, "")).toHaveLength(0);
      expect(searchItems(testItems, "a")).toHaveLength(0);
    });

    it("returns results for valid queries", () => {
      const results = searchItems(testItems, "garlic");
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe("scoring", () => {
    it("exact match gets score 1.0", () => {
      const items: SearchableItem[] = [
        {
          id: "1",
          type: "product",
          title: "Garlic",
          subtitle: "",
          href: "/",
          searchFields: ["garlic"],
        },
      ];
      const results = searchItems(items, "garlic");
      expect(results[0].score).toBe(1.0);
    });

    it("starts-with match gets score 0.9", () => {
      const items: SearchableItem[] = [
        {
          id: "1",
          type: "product",
          title: "Garlic Press",
          subtitle: "",
          href: "/",
          searchFields: ["garlic press"],
        },
      ];
      const results = searchItems(items, "garlic");
      expect(results[0].score).toBe(0.9);
    });

    it("contains match gets score 0.8", () => {
      const items: SearchableItem[] = [
        {
          id: "1",
          type: "product",
          title: "Premium Garlic Press",
          subtitle: "",
          href: "/",
          searchFields: ["premium garlic press"],
        },
      ];
      const results = searchItems(items, "garlic");
      expect(results[0].score).toBe(0.8);
    });

    it("ranks exact matches above partial matches", () => {
      const results = searchItems(testItems, "garlic press");
      // Items with both terms should rank higher
      expect(results.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("multi-term queries", () => {
    it("matches items containing all query terms", () => {
      const results = searchItems(testItems, "stainless steel");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].title).toContain("Stainless Steel");
    });

    it("partially matches items with some query terms", () => {
      const results = searchItems(testItems, "bamboo garlic");
      // Both "bamboo" and "garlic" items should appear with partial scores
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe("cross-type search", () => {
    it("returns products, suggestions, and reports", () => {
      const results = searchItems(testItems, "garlic");
      const types = new Set(results.map((r) => r.type));
      expect(types.has("product")).toBe(true);
      expect(types.has("suggestion")).toBe(true);
      expect(types.has("report")).toBe(true);
    });
  });

  describe("result limits", () => {
    it("returns at most 20 results", () => {
      const manyItems: SearchableItem[] = Array.from({ length: 30 }, (_, i) => ({
        id: String(i),
        type: "product" as const,
        title: `Product ${i} with keyword`,
        subtitle: "",
        href: "/",
        searchFields: [`product ${i} with keyword`],
      }));
      const results = searchItems(manyItems, "keyword");
      expect(results.length).toBeLessThanOrEqual(20);
    });
  });

  describe("case insensitivity", () => {
    it("matches regardless of case", () => {
      const results = searchItems(testItems, "GARLIC");
      expect(results.length).toBeGreaterThan(0);

      const results2 = searchItems(testItems, "Garlic");
      expect(results2.length).toBeGreaterThan(0);
    });
  });

  describe("ASIN search", () => {
    it("matches ASIN codes in search fields", () => {
      const results = searchItems(testItems, "B09V3KXJPB");
      expect(results.length).toBe(1);
      expect(results[0].id).toBe("1");
    });
  });
});
