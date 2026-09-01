/**
 * PAT Orbit Video Engine — Provider-Independent Types
 *
 * These types define the abstract interface for video generation.
 * No provider-specific logic (Veo, Runway, Kling, etc.) belongs here.
 * Concrete implementations live in provider-specific modules.
 */

// ── Engine Capabilities ────────────────────────────────────────────

/**
 * Describes what a video engine supports.
 * Used by the application to determine which actions are available
 * without hard-coding model-specific logic.
 */
export interface EngineCapabilities {
  /** Engine can generate video from text prompt alone. */
  supportsTextToVideo: boolean;
  /** Engine can generate video from an input image. */
  supportsImageToVideo: boolean;
  /** Engine can use text conditioning alongside image input (e.g. Wan 2.2 TI2V). */
  supportsTextConditioning: boolean;
  /** Engine supports generating multiple clips and concatenating. */
  supportsMultiClip: boolean;
  /** Engine produces audio alongside video. */
  supportsAudio: boolean;
  /** Recommended maximum VRAM in GB for practical use. */
  maxRecommendedVram?: number;
  /** Engine-specific human-readable name. */
  displayName: string;
}

// ── Request ─────────────────────────────────────────────────────────

export interface VideoGenerationRequest {
  /** The text prompt describing the desired video. */
  prompt: string;

  /** Optional reference image (data URI or URL) to guide generation. */
  image?: string;

  /** Camera plan — shot type, angle, movement, framing. */
  camera?: {
    shotType: string;
    angle: string;
    movement: string;
    framing: string;
  };

  /** Motion plan — subject movement, environment movement, intensity. */
  motion?: {
    subjectMovement: string;
    environmentMovement: string;
    intensity: "subtle" | "moderate" | "dramatic";
  };

  /** Characters present in the scene, with appearance details. */
  characters?: Array<{
    name: string;
    appearance?: string;
    role?: string;
  }>;

  /** Continuity state from the previous scene. */
  continuity?: {
    characters: Array<{ name: string; appearance: string }>;
    location: string;
    timeOfDay: string;
    weather: string;
    importantObjects: string[];
  };

  /** Target duration in seconds. */
  duration?: number;

  /** Aspect ratio, e.g. "16:9", "9:16", "1:1". */
  aspectRatio?: string;

  /** Opaque scene identifier for tracking. */
  sceneId?: number | string;

  /** Human-readable scene title. */
  sceneTitle?: string;
}

// ── Result ──────────────────────────────────────────────────────────

export interface VideoGenerationResult {
  /** URL or data URI of the generated video. */
  videoUrl: string;

  /** Actual duration of the generated video in seconds, if known. */
  duration?: number;

  /** Video width in pixels, if known. */
  width?: number;

  /** Video height in pixels, if known. */
  height?: number;

  /** Arbitrary provider-specific metadata. */
  metadata?: Record<string, unknown>;
}

// ── Job Status ──────────────────────────────────────────────────────

export type VideoJobStatus = "queued" | "processing" | "completed" | "failed";

export interface VideoJobStatusResult {
  jobId: string;
  status: VideoJobStatus;
  /** Present when status is "completed". */
  videoUrl?: string;
  /** Present when status is "failed". */
  error?: string;
  /** Present when status is "processing" — e.g. "Clip 2/3". */
  progress?: string;
  /** Actual output duration in seconds, if known. */
  duration?: number;
}

// ── Engine Interface ────────────────────────────────────────────────

export interface VideoEngine {
  /**
   * Start video generation. Returns a job identifier for polling.
   * The caller should poll `getStatus` until completed or failed.
   */
  generate(request: VideoGenerationRequest): Promise<{ jobId: string }>;

  /** Poll the status of a previously started generation job. */
  getStatus?(jobId: string): Promise<VideoJobStatusResult>;

  /** Request cancellation of a running job. Best-effort — may not succeed. */
  cancel?(jobId: string): Promise<void>;

  /**
   * Describe what this engine supports.
   * Optional — engines that don't implement this are treated as
   * supporting everything (backward compatible).
   */
  capabilities?(): EngineCapabilities;
}
