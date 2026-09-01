/**
 * PAT Orbit Video Engine — Video Conditioning
 *
 * A model-agnostic intermediate representation of Director instructions
 * that sits between the AI Director and any video engine adapter.
 *
 * Flow:
 *
 *   Director → VideoConditioning → PromptBuilder → VideoEngine
 *
 * Each engine adapter converts VideoConditioning into its model-specific input:
 *   - SVD: uses only `image` (image-to-video), ignores text
 *   - Wan 2.1: uses only text (text-to-video), ignores image
 *   - Wan 2.2 TI2V: uses both image AND text (the ideal case)
 *
 * The Director should NOT need to know which model is being used.
 */

// ── Types ───────────────────────────────────────────────────────────

export interface ConditioningCamera {
  shotType?: string;
  angle?: string;
  movement?: string;
  framing?: string;
}

export interface ConditioningMotion {
  subjectMovement?: string;
  environmentMovement?: string;
  intensity?: string;
}

export interface ConditioningCharacter {
  name: string;
  appearance?: string;
  role?: string;
}

export interface ConditioningContinuity {
  characters: Array<{ name: string; appearance: string }>;
  location: string;
  timeOfDay: string;
  weather: string;
  importantObjects: string[];
}

/**
 * Model-agnostic representation of everything needed to generate a video clip.
 *
 * This is the single source of truth for what information a video engine receives.
 * Engine adapters convert this into their model-specific format.
 */
export interface VideoConditioning {
  // ── Core ──────────────────────────────────────────────────────────

  /** Natural language description of the scene action/mood. */
  prompt: string;

  /** Negative prompt for models that support it (T2V models). */
  negativePrompt?: string;

  // ── Image Input ───────────────────────────────────────────────────

  /** Reference image (data URI) — required for I2V, unused for T2V. */
  image?: string;

  // ── Director Plans ────────────────────────────────────────────────

  camera?: ConditioningCamera;
  motion?: ConditioningMotion;
  characters?: ConditioningCharacter[];
  continuity?: ConditioningContinuity;

  // ── Scene Metadata ────────────────────────────────────────────────

  /** Emotional beat (e.g. "tension", "relief", "climax"). */
  beat?: string;

  /** Visual style (e.g. "cinematic", "cartoon", "anime", "realistic"). */
  style?: string;

  // ── Output Configuration ──────────────────────────────────────────

  /** Target duration in seconds. */
  duration: number;

  /** Aspect ratio: "16:9", "9:16", "1:1". */
  aspectRatio: string;

  /** Output frame rate. */
  fps?: number;

  /** Output width in pixels. */
  width?: number;

  /** Output height in pixels. */
  height?: number;

  /** Quality tier for engines that support it. */
  quality?: "draft" | "preview" | "production";

  /** Seed for reproducibility. */
  seed?: number;

  // ── Tracking ──────────────────────────────────────────────────────

  /** Scene identifier. */
  sceneId?: number | string;

  /** Human-readable scene title. */
  sceneTitle?: string;
}

// ── Factory ─────────────────────────────────────────────────────────

/**
 * Build a VideoConditioning from raw job data.
 * This is the canonical conversion point — used by the shared generation service.
 */
export function buildConditioning(opts: {
  prompt: string;
  image?: string;
  duration?: string | number;
  aspectRatio?: string;
  sceneId?: number | string;
  sceneTitle?: string;
  characters?: Array<{ name: string; appearance?: string; role?: string }>;
  camera?: ConditioningCamera;
  motion?: ConditioningMotion;
  continuity?: ConditioningContinuity;
  beat?: string;
  style?: string;
  quality?: "draft" | "preview" | "production";
  seed?: number;
  fps?: number;
  width?: number;
  height?: number;
}): VideoConditioning {
  // Parse duration from string like "4 seconds" or number
  let duration = 4; // default
  if (typeof opts.duration === "number") {
    duration = opts.duration;
  } else if (typeof opts.duration === "string") {
    const match = opts.duration.match(/(\d+)/);
    if (match) duration = parseInt(match[1], 10);
  }

  return {
    prompt: opts.prompt || "",
    image: opts.image || undefined,
    duration,
    aspectRatio: opts.aspectRatio || "16:9",
    sceneId: opts.sceneId,
    sceneTitle: opts.sceneTitle,
    characters: opts.characters,
    camera: opts.camera,
    motion: opts.motion,
    continuity: opts.continuity,
    beat: opts.beat,
    style: opts.style,
    quality: opts.quality,
    seed: opts.seed,
    fps: opts.fps,
    width: opts.width,
    height: opts.height,
  };
}
