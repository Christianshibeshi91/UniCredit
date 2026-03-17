"use client";

import { useState, useCallback, useMemo } from "react";

export interface SearchResult {
  id: string;
  type: "product" | "suggestion" | "report";
  title: string;
  subtitle: string;
  href: string;
  score: number; // relevance score 0-1
}

interface UseSearchReturn {
  query: string;
  setQuery: (q: string) => void;
  results: SearchResult[];
  isSearching: boolean;
}

interface SearchableItem {
  id: string;
  type: "product" | "suggestion" | "report";
  title: string;
  subtitle: string;
  href: string;
  searchFields: string[]; // Fields to search against
}

/**
 * Client-side fuzzy search across products, suggestions, and intelligence reports.
 * Provides ranked results based on string matching with simple fuzzy scoring.
 */
export function useSearch(items: SearchableItem[]): UseSearchReturn {
  const [query, setQuery] = useState("");
  const [isSearching] = useState(false);

  const results = useMemo(() => {
    if (!query || query.length < 2) return [];

    const normalizedQuery = query.toLowerCase().trim();
    const queryTerms = normalizedQuery.split(/\s+/);

    const scored: SearchResult[] = [];

    for (const item of items) {
      let bestScore = 0;

      for (const field of item.searchFields) {
        const normalizedField = field.toLowerCase();

        // Exact match gets highest score
        if (normalizedField === normalizedQuery) {
          bestScore = Math.max(bestScore, 1.0);
          continue;
        }

        // Contains full query
        if (normalizedField.includes(normalizedQuery)) {
          bestScore = Math.max(bestScore, 0.8);
          continue;
        }

        // Starts with query
        if (normalizedField.startsWith(normalizedQuery)) {
          bestScore = Math.max(bestScore, 0.9);
          continue;
        }

        // All query terms found in field
        const allTermsFound = queryTerms.every((term) =>
          normalizedField.includes(term)
        );
        if (allTermsFound) {
          bestScore = Math.max(bestScore, 0.6);
          continue;
        }

        // Partial term matching
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

    // Sort by score descending, limit to top 20
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
  }, [query, items]);

  return { query, setQuery, results, isSearching };
}
