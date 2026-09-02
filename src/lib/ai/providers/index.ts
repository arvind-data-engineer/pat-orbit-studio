/**
 * PAT Orbit AI Provider Registry
 *
 * Factory that creates the correct provider based on environment config.
 * Single entry point for all provider access.
 *
 * Usage:
 *   import { getStoryProvider, getImageProvider, getVoiceProvider } from "@/lib/ai/providers";
 *   const storyProvider = getStoryProvider();
 *   const plan = await storyProvider.generatePlan(input);
 */

import { getAIConfig } from "./config";
import type { StoryProvider, ImageProvider, VoiceProvider, AIProviderStatus } from "./types";

// Lazy-loaded providers (cached)
let _storyProvider: StoryProvider | null = null;
let _imageProvider: ImageProvider | null = null;
let _voiceProvider: VoiceProvider | null = null;

export function getStoryProvider(): StoryProvider {
  if (_storyProvider) return _storyProvider;

  const config = getAIConfig();

  if (config.storyProvider === "gemini") {
    if (!config.geminiApiKey) {
      throw new Error(
        "AI_PROVIDER=gemini but GEMINI_API_KEY is not configured. " +
        "Set AI_PROVIDER=local or configure GEMINI_API_KEY."
      );
    }
    const { geminiStoryProvider } = require("./gemini-director");
    _storyProvider = geminiStoryProvider as StoryProvider;
  } else {
    const { localStoryProvider } = require("./local-director");
    _storyProvider = localStoryProvider as StoryProvider;
  }

  console.log(`[Providers] Story provider: ${_storyProvider.name}`);
  return _storyProvider;
}

export function getImageProvider(): ImageProvider {
  if (_imageProvider) return _imageProvider;

  const config = getAIConfig();

  if (config.imageProvider === "gemini") {
    if (!config.geminiApiKey) {
      throw new Error(
        "IMAGE_PROVIDER=gemini but GEMINI_API_KEY is not configured. " +
        "Set IMAGE_PROVIDER=local or configure GEMINI_API_KEY."
      );
    }
    const { geminiImageProvider } = require("./gemini-image");
    _imageProvider = geminiImageProvider as ImageProvider;
  } else {
    const { localImageProvider } = require("./local-image");
    _imageProvider = localImageProvider as ImageProvider;
  }

  console.log(`[Providers] Image provider: ${_imageProvider.name}`);
  return _imageProvider;
}

export function getVoiceProvider(): VoiceProvider {
  if (_voiceProvider) return _voiceProvider;

  const config = getAIConfig();

  if (config.ttsProvider === "gemini") {
    if (!config.geminiApiKey) {
      throw new Error(
        "TTS_PROVIDER=gemini but GEMINI_API_KEY is not configured. " +
        "Set TTS_PROVIDER=local or configure GEMINI_API_KEY."
      );
    }
    const { geminiVoiceProvider } = require("./gemini-voice");
    _voiceProvider = geminiVoiceProvider as VoiceProvider;
  } else {
    const { localVoiceProvider } = require("./local-voice");
    _voiceProvider = localVoiceProvider as VoiceProvider;
  }

  console.log(`[Providers] Voice provider: ${_voiceProvider.name}`);
  return _voiceProvider;
}

/** Reset all cached providers (for testing or config changes). */
export function resetProviders(): void {
  _storyProvider = null;
  _imageProvider = null;
  _voiceProvider = null;
}

/** Get health status of all configured providers. */
export async function getProviderStatus(): Promise<AIProviderStatus> {
  const config = getAIConfig();

  // Import health check functions based on config
  const results: AIProviderStatus = {
    story: { available: false, name: "Unknown" },
    image: { available: false, name: "Unknown" },
    voice: { available: false, name: "Unknown" },
    video: { available: false, name: "Unknown" },
  };

  // Story provider health
  if (config.storyProvider === "gemini") {
    const { checkGeminiDirectorHealth } = require("./gemini-director");
    results.story = await checkGeminiDirectorHealth();
  } else {
    const { checkLocalDirectorHealth } = require("./local-director");
    results.story = await checkLocalDirectorHealth();
  }

  // Image provider health
  if (config.imageProvider === "gemini") {
    const { checkGeminiImageHealth } = require("./gemini-image");
    results.image = await checkGeminiImageHealth();
  } else {
    const { checkLocalImageHealth } = require("./local-image");
    results.image = await checkLocalImageHealth();
  }

  // Voice provider health
  if (config.ttsProvider === "gemini") {
    const { checkGeminiVoiceHealth } = require("./gemini-voice");
    results.voice = await checkGeminiVoiceHealth();
  } else {
    const { checkLocalVoiceHealth } = require("./local-voice");
    results.voice = await checkLocalVoiceHealth();
  }

  // Video engine health (always check)
  try {
    const { checkLocalEngineHealth } = await import("@/lib/video/engines/local");
    const videoHealth = await checkLocalEngineHealth();
    results.video = {
      available: videoHealth.available,
      name: videoHealth.available
        ? `SVD (${videoHealth.gpu_name || videoHealth.device || "local"})`
        : "SVD",
      error: videoHealth.error,
    };
  } catch {
    results.video = { available: false, name: "SVD", error: "Could not check" };
  }

  return results;
}

// Re-export config
export { getAIConfig } from "./config";
export type { AIConfig, ProviderType } from "./config";

// Re-export types
export type { StoryProvider, ImageProvider, VoiceProvider, AIProviderStatus, ProviderStatus } from "./types";

// Re-export DirectorInput for convenience
export type { DirectorInput } from "@/lib/ai/director";
