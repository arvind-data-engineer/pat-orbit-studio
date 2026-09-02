/**
 * PAT Orbit AI Provider Abstractions
 *
 * Clean interfaces for story, image, and voice generation.
 * Each provider can be local or cloud-based. The application
 * selects providers via environment variables:
 *
 *   AI_PROVIDER=local|gemini
 *   IMAGE_PROVIDER=local|gemini
 *   TTS_PROVIDER=local|gemini
 */

import type { ProductionPlan } from "../director-schema";
import type { DirectorInput } from "../director";

// ── Story Generation Provider ───────────────────────────────────────

export interface StoryProvider {
  /** Provider name for logging/display. */
  readonly name: string;

  /** Whether this provider requires external API keys. */
  readonly requiresApiKey: boolean;

  /** Generate a production plan from a creative brief. */
  generatePlan(input: DirectorInput): Promise<ProductionPlan>;
}

// ── Image Generation Provider ───────────────────────────────────────

export interface ImageGenerationRequest {
  prompt: string;
  characters?: Array<{
    name: string;
    description?: string;
    appearance?: string;
    role?: string;
  }>;
  sceneTitle?: string;
  style?: string;
  sceneBeat?: string;
  camera?: {
    shotType?: string;
    angle?: string;
    movement?: string;
    framing?: string;
  };
  motion?: {
    subjectMovement?: string;
    environmentMovement?: string;
    intensity?: string;
  };
  continuityBefore?: {
    characters: Array<{ name: string; appearance: string }>;
    location: string;
    timeOfDay: string;
    weather: string;
    importantObjects: string[];
  };
}

export interface ImageProvider {
  /** Provider name for logging/display. */
  readonly name: string;

  /** Whether this provider requires external API keys. */
  readonly requiresApiKey: boolean;

  /** Generate an image. Returns a data URI or URL. */
  generateImage(request: ImageGenerationRequest): Promise<string>;
}

// ── Voice/TTS Provider ──────────────────────────────────────────────

export interface VoiceGenerationRequest {
  narration: string;
  language?: string;
  voice?: string;
  voicePlan?: {
    voice?: string;
    emotion?: string;
    pace?: string;
    emphasis?: string;
  };
}

export interface VoiceProvider {
  /** Provider name for logging/display. */
  readonly name: string;

  /** Whether this provider requires external API keys. */
  readonly requiresApiKey: boolean;

  /** Generate voice audio. Returns a data URI with the audio. */
  generateVoice(request: VoiceGenerationRequest): Promise<{
    audio: string; // data URI
    mimeType: string;
    voice: string;
  }>;
}

// ── Provider Status ─────────────────────────────────────────────────

export interface ProviderStatus {
  available: boolean;
  name: string;
  error?: string;
}

export interface AIProviderStatus {
  story: ProviderStatus;
  image: ProviderStatus;
  voice: ProviderStatus;
  video: ProviderStatus;
}
