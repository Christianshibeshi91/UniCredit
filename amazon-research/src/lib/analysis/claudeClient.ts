/**
 * LLM Client — Ollama with Qwen (drop-in replacement for Anthropic SDK).
 * Provides the same interface so all consuming code works unchanged.
 *
 * Set OLLAMA_BASE_URL (default: http://localhost:11434) and
 * OLLAMA_MODEL (default: qwen2.5) to configure.
 */

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5";

// ── Anthropic-Compatible Types ───────────────────────────────────

export namespace Anthropic {
  export interface Tool {
    name: string;
    description: string;
    input_schema: {
      type: "object";
      properties: Record<string, unknown>;
      required?: string[];
      [key: string]: unknown;
    };
  }

  export interface ToolUseBlock {
    type: "tool_use";
    id: string;
    name: string;
    input: unknown;
  }

  export interface TextBlock {
    type: "text";
    text: string;
  }

  export type ContentBlock = ToolUseBlock | TextBlock;

  export interface MessageCreateParams {
    model: string;
    max_tokens: number;
    system: string;
    tools?: Tool[];
    tool_choice?: { type: string; name?: string };
    messages: { role: string; content: string }[];
    [key: string]: unknown;
  }

  export interface MessageResponse {
    content: ContentBlock[];
    usage: { input_tokens: number; output_tokens: number };
  }

  export class APIError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.name = "APIError";
      this.status = status;
    }
  }
}

// ── Ollama ↔ Anthropic Format Converters ─────────────────────────

interface OllamaTool {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

function toOllamaTool(tool: Anthropic.Tool): OllamaTool {
  return {
    type: "function",
    function: { name: tool.name, description: tool.description, parameters: tool.input_schema },
  };
}

interface OllamaToolCall {
  function: { name: string; arguments: Record<string, unknown> | string };
}

interface OllamaResponse {
  message?: { role: string; content?: string; tool_calls?: OllamaToolCall[] };
  prompt_eval_count?: number;
  eval_count?: number;
}

function parseOllamaResponse(data: OllamaResponse): Anthropic.MessageResponse {
  const content: Anthropic.ContentBlock[] = [];

  if (data.message?.content) {
    content.push({ type: "text", text: data.message.content });
  }

  if (data.message?.tool_calls) {
    for (const tc of data.message.tool_calls) {
      const args =
        typeof tc.function.arguments === "string"
          ? JSON.parse(tc.function.arguments)
          : tc.function.arguments;
      content.push({ type: "tool_use", id: crypto.randomUUID(), name: tc.function.name, input: args });
    }
  }

  // Fallback: if model returned JSON in content instead of a tool call, extract it
  if (!data.message?.tool_calls && data.message?.content) {
    try {
      const jsonMatch = data.message.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        content.push({ type: "tool_use", id: crypto.randomUUID(), name: "_fallback_json", input: parsed });
      }
    } catch {
      // Not valid JSON — leave as text only
    }
  }

  return {
    content,
    usage: { input_tokens: data.prompt_eval_count ?? 0, output_tokens: data.eval_count ?? 0 },
  };
}

// ── Ollama Client (Anthropic-compatible interface) ───────────────

const messages = {
  async create(params: Anthropic.MessageCreateParams): Promise<Anthropic.MessageResponse> {
    const ollamaMessages: { role: string; content: string }[] = [];

    if (params.system) {
      ollamaMessages.push({ role: "system", content: params.system });
    }

    for (const msg of params.messages) {
      ollamaMessages.push({ role: msg.role, content: msg.content as string });
    }

    // Reinforce tool_choice by appending an instruction
    if (params.tool_choice && "name" in params.tool_choice && params.tool_choice.name && params.tools?.length) {
      const last = ollamaMessages[ollamaMessages.length - 1];
      last.content += `\n\nIMPORTANT: You MUST call the "${params.tool_choice.name}" function with your response. Do not respond with plain text — use the tool.`;
    }

    const body: Record<string, unknown> = {
      model: params.model || OLLAMA_MODEL,
      messages: ollamaMessages,
      stream: false,
      options: { num_predict: params.max_tokens || 4096 },
    };

    if (params.tools?.length) {
      body.tools = params.tools.map(toOllamaTool);
    }

    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Anthropic.APIError(`Ollama error: ${text}`, response.status);
    }

    const data = (await response.json()) as OllamaResponse;
    return parseOllamaResponse(data);
  },

  /** Thin wrapper: calls create() and emits text events after completion. */
  stream(params: Anthropic.MessageCreateParams) {
    const textCallbacks: ((text: string) => void)[] = [];
    let messagePromise: Promise<Anthropic.MessageResponse> | null = null;

    const startCall = () => {
      if (!messagePromise) {
        messagePromise = messages.create(params).then((msg) => {
          for (const block of msg.content) {
            if (block.type === "text") {
              for (const cb of textCallbacks) cb(block.text);
            }
          }
          return msg;
        });
      }
      return messagePromise;
    };

    return {
      on(event: string, callback: (text: string) => void) {
        if (event === "text") textCallbacks.push(callback);
        startCall();
        return this;
      },
      async finalMessage(): Promise<Anthropic.MessageResponse> {
        return startCall();
      },
    };
  },
};

export const client = { messages };
export const MODEL = OLLAMA_MODEL;
export const INTELLIGENCE_MODEL = OLLAMA_MODEL;
export const ANALYSIS_MODEL = OLLAMA_MODEL;

/** True when an LLM backend is configured (Ollama URL or Anthropic key). */
export const isLLMConfigured = Boolean(
  process.env.OLLAMA_BASE_URL || process.env.ANTHROPIC_API_KEY
);

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
    super(`Circuit breaker is open. Will retry after ${new Date(reopenAt).toISOString()}`);
    this.name = "CircuitOpenError";
  }
}

// ── Circuit Breaker ───────────────────────────────────────────────

class CircuitBreaker {
  private failures: number[] = [];
  private openUntil = 0;
  private readonly windowMs = 10 * 60 * 1000;
  private readonly threshold = 5;
  private readonly cooldownMs = 60 * 1000;

  check(): void {
    if (Date.now() < this.openUntil) throw new CircuitOpenError(this.openUntil);
    if (this.openUntil > 0 && Date.now() >= this.openUntil) {
      this.openUntil = 0;
      this.failures = [];
    }
  }

  recordFailure(): void {
    const now = Date.now();
    this.failures.push(now);
    this.failures = this.failures.filter((t) => t >= now - this.windowMs);
    if (this.failures.length >= this.threshold) {
      this.openUntil = now + this.cooldownMs;
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
      if (error instanceof CircuitOpenError) throw error;
      if (error instanceof Anthropic.APIError && NON_RETRYABLE_STATUS.has(error.status)) {
        circuitBreaker.recordFailure();
        throw error;
      }
      circuitBreaker.recordFailure();
      if (attempt < maxAttempts) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 500;
        console.warn(`[Retry] Attempt ${attempt}/${maxAttempts} failed. Retrying in ${Math.round(delay)}ms...`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastError;
}
