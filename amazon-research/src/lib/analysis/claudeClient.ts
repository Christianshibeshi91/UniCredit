import Anthropic from "@anthropic-ai/sdk";

// ── Singleton Client ──────────────────────────────────────────────

export const client = new Anthropic();
export const MODEL = "claude-sonnet-4-20250514";
export const INTELLIGENCE_MODEL = "claude-sonnet-4-6";
export const ANALYSIS_MODEL = "claude-opus-4-6";

// ── Error Classes ─────────────────────────────────────────────────

export class AnalysisError extends Error {
  constructor(
    message: string,
    public readonly context: string,
    public readonly attemptCount: number,
    public readonly originalError: unknown
  ) {
    super(message);
    this.name = "AnalysisError";
  }
}

export class CircuitOpenError extends Error {
  constructor(public readonly reopenAt: number) {
    super(
      `Circuit breaker is open. Will retry after ${new Date(reopenAt).toISOString()}`
    );
    this.name = "CircuitOpenError";
  }
}

// ── Circuit Breaker ───────────────────────────────────────────────

class CircuitBreaker {
  private failures: number[] = [];
  private openUntil = 0;
  private readonly windowMs = 10 * 60 * 1000; // 10 minutes
  private readonly threshold = 5;
  private readonly cooldownMs = 60 * 1000; // 60 seconds

  check(): void {
    if (Date.now() < this.openUntil) {
      throw new CircuitOpenError(this.openUntil);
    }
    // Reset if cooldown has elapsed
    if (this.openUntil > 0 && Date.now() >= this.openUntil) {
      this.openUntil = 0;
      this.failures = [];
    }
  }

  recordFailure(): void {
    const now = Date.now();
    this.failures.push(now);

    // Trim failures outside the window
    const windowStart = now - this.windowMs;
    this.failures = this.failures.filter((t) => t >= windowStart);

    if (this.failures.length >= this.threshold) {
      this.openUntil = now + this.cooldownMs;
      console.error(
        `[CircuitBreaker] OPEN — ${this.failures.length} failures in ${this.windowMs / 1000}s window. ` +
          `Blocking requests until ${new Date(this.openUntil).toISOString()}`
      );
    }
  }

  recordSuccess(): void {
    this.failures = [];
    this.openUntil = 0;
  }
}

export const circuitBreaker = new CircuitBreaker();

// ── Retry Logic ───────────────────────────────────────────────────

export const NON_RETRYABLE_STATUS = new Set([400, 401, 403, 404]);

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 1000
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      circuitBreaker.check();
      const result = await fn();
      circuitBreaker.recordSuccess();
      return result;
    } catch (error) {
      lastError = error;

      if (error instanceof CircuitOpenError) {
        throw error;
      }

      // Don't retry non-retryable errors
      if (
        error instanceof Anthropic.APIError &&
        NON_RETRYABLE_STATUS.has(error.status)
      ) {
        circuitBreaker.recordFailure();
        throw error;
      }

      circuitBreaker.recordFailure();

      if (attempt < maxAttempts) {
        const delay =
          baseDelayMs * Math.pow(2, attempt - 1) +
          Math.random() * 500;
        console.warn(
          `[Retry] Attempt ${attempt}/${maxAttempts} failed. Retrying in ${Math.round(delay)}ms...`
        );
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastError;
}
