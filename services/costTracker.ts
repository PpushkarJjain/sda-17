// --- Gemini API Cost Tracker ---
// Tracks token usage and estimated cost per session (resets on page refresh).

export type ModelId =
  | 'gemini-2.5-flash'
  | 'gemini-2.5-flash-image'
  | 'gemini-3-pro-image-preview';

// Pricing per token (USD). Source: ai.google.dev/gemini-api/docs/pricing (March 2026)
const MODEL_PRICING: Record<ModelId, { inputPerToken: number; outputPerToken: number }> = {
  'gemini-2.5-flash': {
    inputPerToken: 0.15 / 1_000_000,   // $0.15 per 1M input tokens
    outputPerToken: 0.60 / 1_000_000,   // $0.60 per 1M output tokens
  },
  'gemini-2.5-flash-image': {
    inputPerToken: 0.15 / 1_000_000,
    outputPerToken: 0.60 / 1_000_000,
  },
  'gemini-3-pro-image-preview': {
    inputPerToken: 2.00 / 1_000_000,    // $2.00 per 1M input tokens
    outputPerToken: 12.00 / 1_000_000,  // $12.00 per 1M output tokens (covers image output tokens)
  },
};

export interface UsageEntry {
  timestamp: number;
  model: ModelId;
  functionName: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
}

export interface SessionSummary {
  totalCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalEstimatedCost: number;
  entries: UsageEntry[];
}

// --- In-memory session store ---
let sessionEntries: UsageEntry[] = [];
let listeners: Array<() => void> = [];

// Cached snapshot — only re-created when data actually changes.
// This is REQUIRED for useSyncExternalStore to avoid infinite re-render loops.
let cachedSnapshot: SessionSummary = buildSnapshot();

function buildSnapshot(): SessionSummary {
  return {
    totalCalls: sessionEntries.length,
    totalInputTokens: sessionEntries.reduce((sum, e) => sum + e.inputTokens, 0),
    totalOutputTokens: sessionEntries.reduce((sum, e) => sum + e.outputTokens, 0),
    totalEstimatedCost: sessionEntries.reduce((sum, e) => sum + e.estimatedCost, 0),
    entries: [...sessionEntries],
  };
}

const notify = () => {
  cachedSnapshot = buildSnapshot();
  listeners.forEach(fn => fn());
};

/**
 * Log usage from a Gemini API response.
 * Call this after every `ai.models.generateContent()` call.
 */
export const logUsage = (
  model: string,
  functionName: string,
  usageMetadata: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number } | undefined
) => {
  if (!usageMetadata) return;

  const modelId = (Object.keys(MODEL_PRICING).includes(model) ? model : 'gemini-2.5-flash') as ModelId;
  const pricing = MODEL_PRICING[modelId];

  const inputTokens = usageMetadata.promptTokenCount || 0;
  const outputTokens = usageMetadata.candidatesTokenCount || 0;
  const totalTokens = usageMetadata.totalTokenCount || (inputTokens + outputTokens);

  const estimatedCost = (inputTokens * pricing.inputPerToken) + (outputTokens * pricing.outputPerToken);

  sessionEntries.push({
    timestamp: Date.now(),
    model: modelId,
    functionName,
    inputTokens,
    outputTokens,
    totalTokens,
    estimatedCost,
  });

  notify();
};

/** Get the cached session summary (stable reference for useSyncExternalStore). */
export const getSessionSummary = (): SessionSummary => cachedSnapshot;

/** Reset all session tracking data. */
export const resetSession = () => {
  sessionEntries = [];
  notify();
};

/** Subscribe to usage updates. Returns an unsubscribe function. */
export const subscribe = (callback: () => void): (() => void) => {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter(fn => fn !== callback);
  };
};
