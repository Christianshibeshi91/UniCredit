import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Levenshtein edit distance between two strings */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[] = Array.from({ length: n + 1 }, (_, i) => i);

  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      dp[j] = a[i - 1] === b[j - 1]
        ? prev
        : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = temp;
    }
  }
  return dp[n];
}

/** Deduplicate items where getKey() values have Levenshtein distance <= threshold */
export function deduplicateByLevenshtein<T>(
  items: T[],
  getKey: (item: T) => string,
  threshold = 2
): T[] {
  const result: T[] = [];
  for (const item of items) {
    const key = getKey(item);
    const isDuplicate = result.some(
      (existing) => levenshtein(getKey(existing), key) <= threshold
    );
    if (!isDuplicate) {
      result.push(item);
    }
  }
  return result;
}
