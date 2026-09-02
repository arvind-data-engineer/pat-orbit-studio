/**
 * PAT Orbit AI Provider Configuration
 *
 * Reads environment variables to determine which providers to use.
 * Defaults to local providers (no external API keys required).
 *
 * Environment variables:
 *   AI_PROVIDER=local|gemini         — Story generation (default: local)
 *   IMAGE_PROVIDER=local|gemini      — Image generation (default: local)
 *   TTS_PROVIDER=local|gemini        — Voice/TTS (default: local)
 *   VIDEO_ENGINE=local|veo           — Video generation (default: local)
 *
 *   GEMINI_API_KEY                   — Required only when using Gemini providers
 *
 *   LOCAL_LLM_URL                    — Ollama URL (default: http://127.0.0.1:11434)
 *   LOCAL_LLM_MODEL                  — Ollama model (default: llama3.2)
 *   LOCAL_IMAGE_URL                  — ComfyUI URL (default: http://127.0.0.1:8188)
 *   LOCAL_TTS_ENGINE                 — TTS engine: edge|piper (default: edge)
 *   LOCAL_VIDEO_ENGINE_URL           — SVD server URL (default: http://127.0.0.1:8000)
 */

export type ProviderType = "local" | "gemini";

export interface AIConfig {
  storyProvider: ProviderType;
  imageProvider: ProviderType;
  ttsProvider: ProviderType;
  videoEngine: string;

  // Local LLM settings
  localLlmUrl: string;
  localLlmModel: string;

  // Local image settings
  localImageUrl: string;

  // Local TTS settings
  localTtsEngine: string;

  // Local video settings
  localVideoEngineUrl: string;

  // Gemini settings
  geminiApiKey: string;
}

function env(key: string, fallback: string): string {
  return process.env[key]?.trim() || fallback;
}

let _config: AIConfig | null = null;

export function getAIConfig(): AIConfig {
  if (_config) return _config;

  _config = {
    storyProvider: (env("AI_PROVIDER", "local") as ProviderType) || "local",
    imageProvider: (env("IMAGE_PROVIDER", "local") as ProviderType) || "local",
    ttsProvider: (env("TTS_PROVIDER", "local") as ProviderType) || "local",
    videoEngine: env("VIDEO_ENGINE", "local"),

    localLlmUrl: env("LOCAL_LLM_URL", "http://127.0.0.1:11434"),
    localLlmModel: env("LOCAL_LLM_MODEL", "llama3.2"),

    localImageUrl: env("LOCAL_IMAGE_URL", "http://127.0.0.1:8188"),
    localTtsEngine: env("LOCAL_TTS_ENGINE", "edge"),
    localVideoEngineUrl: env("LOCAL_VIDEO_ENGINE_URL", "http://127.0.0.1:8000"),

    geminiApiKey: process.env.GEMINI_API_KEY || "",
  };

  return _config;
}

/** Reset cached config (for testing). */
export function resetConfig(): void {
  _config = null;
}
