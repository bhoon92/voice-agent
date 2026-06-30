import type { llm } from "@livekit/agents";
import * as openai from "@livekit/agents-plugin-openai";
import * as google from "@livekit/agents-plugin-google";

/**
 * Catalog of LLM models shown in the UI. `available: false` entries are
 * rendered but, when selected, surface a "준비중" (coming soon) message.
 *
 * Notes:
 * - Qwen (Groq) handles Korean noticeably better than Llama, so it's default.
 * - Gemini free tier for LLM is now 0 quota on this account (Google cut the
 *   free tier in 2026), so it's marked unavailable until a billed key is used.
 * - Adding a key + flipping the flag is all it takes to enable Claude/GPT.
 */
export interface ModelInfo {
  id: string;
  label: string;
  provider: string;
  available: boolean;
}

export const MODEL_CATALOG: ModelInfo[] = [
  {
    id: "groq-qwen",
    label: "Qwen3 32B · Groq (한국어)",
    provider: "groq",
    available: true,
  },
  {
    id: "groq-llama",
    label: "Llama 3.3 70B · Groq",
    provider: "groq",
    available: true,
  },
  {
    id: "claude",
    label: "Claude Haiku 4.5 · Anthropic",
    provider: "anthropic",
    available: true,
  },
  {
    id: "gpt-4o",
    label: "GPT-4o · OpenAI",
    provider: "openai",
    available: true,
  },
  {
    id: "gemini-flash",
    label: "Gemini 2.5 Flash · Google",
    provider: "google",
    available: true,
  },
];

export const DEFAULT_MODEL = "groq-qwen";

export function isModelAvailable(id: string): boolean {
  return MODEL_CATALOG.some((m) => m.id === id && m.available);
}

export function createLLM(modelId: string): llm.LLM {
  switch (modelId) {
    case "claude":
      return new openai.LLM({
        baseURL: "https://api.anthropic.com/v1/",
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: "claude-haiku-4-5",
      });
    case "gpt-4o":
      return new openai.LLM({
        apiKey: process.env.OPENAI_API_KEY,
        model: "gpt-4o",
      });
    case "gemini-flash":
      return new google.LLM({ model: "gemini-2.5-flash" });
    case "groq-llama":
      return openai.LLM.withGroq({ model: "llama-3.3-70b-versatile" });
    case "groq-qwen":
    default:
      return openai.LLM.withGroq({ model: "qwen/qwen3-32b" });
  }
}
