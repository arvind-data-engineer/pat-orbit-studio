/**
 * PAT Orbit Video Engine — Shared Generation Service
 *
 * Single source of truth for video generation execution flow:
 *   1. Resolve the active engine (local / wan21 / veo)
 *   2. Build VideoConditioning from job data
 *   3. Start generation via engine.generate()
 *   4. Poll until completed or failed
 *   5. Upload result to Blob if needed
 *   6. Return a consistent result
 *
 * Both the API route and the Inngest function call into this service.
 * This eliminates the duplicate code that previously existed.
 */

import { getActiveEngine } from "./engine";
import type { VideoEngine, VideoGenerationRequest, VideoJobStatusResult } from "./types";
import type { VideoConditioning, ConditioningCamera, ConditioningMotion, ConditioningContinuity } from "./conditioning";
import { buildConditioning } from "./conditioning";

// ── Types ───────────────────────────────────────────────────────────

export interface GenerateVideoServiceResult {
  /** Whether generation succeeded. */
  success: boolean;

  /** Video URL (Blob URL or data URI). Present on success. */
  videoUrl?: string;

  /** Error message. Present on failure. */
  error?: string;

  /** Actual output duration in seconds, if known. */
  duration?: number;
}

// ── Options ─────────────────────────────────────────────────────────

export interface GenerateVideoOptions {
  /** Job ID for tracking/logging. */
  jobId: string;

  /** Raw job data from Redis. */
  job: {
    prompt?: string;
    image?: string;
    duration?: string;
    aspectRatio?: string;
    sceneId?: number | string;
    sceneTitle?: string;
    characters?: Array<{ name: string; description?: string; appearance?: string; role?: string }>;
    camera?: ConditioningCamera;
    motion?: ConditioningMotion;
    continuityBefore?: ConditioningContinuity;
  };

  /** Maximum polls before timeout. Default: 240 (20 min at 5s intervals). */
  maxPolls?: number;

  /** Poll interval in ms. Default: 5000. */
  pollIntervalMs?: number;

  /** Optional callback to report progress. */
  onProgress?: (progress: string) => void;

  /** Optional callback to upload video to Blob. */
  uploadToBlob?: (buffer: Buffer, filename: string, mimeType: string) => Promise<string>;
}

// ── Shared Generation Function ──────────────────────────────────────

/**
 * Generate a video using the currently active engine.
 *
 * For local engines (SVD, Wan 2.1): handles the full generate → poll → upload cycle.
 * For Veo: returns null so the caller can use the Gemini API directly.
 *
 * This is the single function both the API route and Inngest should call.
 */
export async function generateVideo(
  options: GenerateVideoOptions
): Promise<GenerateVideoServiceResult> {
  const { jobId, job } = options;
  const maxPolls = options.maxPolls ?? 240;
  const pollIntervalMs = options.pollIntervalMs ?? 5_000;
  const onProgress = options.onProgress;

  // ── 1. Get active engine ──────────────────────────────────
  const engine = getActiveEngine();

  if (!engine) {
    // Veo (cloud) — caller should handle this separately
    return {
      success: false,
      error: "__VEO__",
    };
  }

  // ── 2. Build VideoConditioning ────────────────────────────
  const conditioning = buildConditioning({
    prompt: job.prompt || "",
    image: job.image,
    duration: job.duration,
    aspectRatio: job.aspectRatio,
    sceneId: job.sceneId,
    sceneTitle: job.sceneTitle,
    characters: job.characters,
    camera: job.camera,
    motion: job.motion,
    continuity: job.continuityBefore,
  });

  const engineName = engine.capabilities?.().displayName || "Local";

  // ── 3. Start generation ───────────────────────────────────
  console.log(`[video/generate] ${engineName}: starting generation for ${jobId}`);
  let localJobId: string;

  try {
    const result = await engine.generate(conditioning as VideoGenerationRequest);
    localJobId = result.jobId;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Failed to start video generation.";
    console.error(`[video/generate] ${engineName}: failed to start ${jobId}: ${errorMsg}`);
    return { success: false, error: errorMsg };
  }

  // ── 4. Poll until completed or failed ─────────────────────
  if (!engine.getStatus) {
    return { success: false, error: `${engineName} engine does not support status polling.` };
  }

  for (let i = 0; i < maxPolls; i++) {
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

    let status: VideoJobStatusResult;
    try {
      status = await engine.getStatus(localJobId);
    } catch {
      // Transient network error — keep polling
      continue;
    }

    // Completed
    if (status.status === "completed" && status.videoUrl) {
      let videoUrl = status.videoUrl;

      // Upload data URI to Blob if the upload function is provided
      if (videoUrl.startsWith("data:") && options.uploadToBlob) {
        try {
          const base64Data = videoUrl.split(",")[1] || "";
          const videoBuffer = Buffer.from(base64Data, "base64");
          if (videoBuffer.length > 0) {
            const filename = `scene-video-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp4`;
            videoUrl = await options.uploadToBlob(videoBuffer, filename, "video/mp4");
          }
        } catch (err) {
          console.error(`[video/generate] Failed to upload to Blob:`, err);
          // Keep the data URI as fallback
        }
      }

      console.log(`[video/generate] ${engineName}: completed ${jobId}`);
      return {
        success: true,
        videoUrl,
        duration: status.duration,
      };
    }

    // Failed
    if (status.status === "failed") {
      const errorMsg = status.error || `${engineName} video generation failed.`;
      console.error(`[video/generate] ${engineName}: failed ${jobId}: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }

    // Report progress
    if (status.progress && onProgress && i % 3 === 0) {
      onProgress(status.progress);
    }
  }

  // Timeout
  const timeoutMsg = `${engineName} video generation timed out after ${Math.round(maxPolls * pollIntervalMs / 1000)}s.`;
  console.error(`[video/generate] ${timeoutMsg}`);
  return { success: false, error: timeoutMsg };
}
