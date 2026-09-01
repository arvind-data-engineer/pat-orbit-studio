/**
 * PAT Orbit Video Engine — Wan 2.1 Local Engine Adapter
 *
 * Communicates with a local FastAPI inference server running
 * Wan 2.1 T2V-1.3B via HuggingFace diffusers.
 *
 * IMPORTANT LIMITATION:
 *   Wan 2.1 T2V-1.3B is a TEXT-TO-VIDEO model only.
 *   It does NOT accept an input image for image-to-video.
 *   The `image` field in VideoGenerationRequest is IGNORED.
 *   Video motion is driven entirely by the text prompt.
 *
 * To use image-to-video, upgrade to Wan 2.2 TI2V-5B which
 * natively supports both text and image input.
 *
 * Required environment variables:
 *   VIDEO_ENGINE          — set to "wan21" to activate this engine
 *   WAN21_ENGINE_URL      — base URL of the inference server (default: http://localhost:8001)
 *
 * Server startup:
 *   python src/lib/video/engines/server_wan21.py
 */

import type {
  VideoEngine,
  EngineCapabilities,
  VideoGenerationRequest,
  VideoJobStatusResult,
} from "../types";

// ── Configuration ────────────────────────────────────────────────────

const DEFAULT_SERVER_URL = "http://localhost:8001";

function getServerUrl(): string {
  return (process.env.WAN21_ENGINE_URL || DEFAULT_SERVER_URL).replace(/\/$/, "");
}

// ── Engine Implementation ────────────────────────────────────────────

class Wan21VideoEngine implements VideoEngine {
  /**
   * Wan 2.1 T2V-1.3B is text-to-video only.
   * Does NOT support image-to-video. Image field is ignored.
   */
  capabilities(): EngineCapabilities {
    return {
      supportsTextToVideo: true,
      supportsImageToVideo: false,
      supportsTextConditioning: true,
      supportsMultiClip: false,
      supportsAudio: false,
      maxRecommendedVram: 8,
      displayName: "Wan 2.1 T2V-1.3B (Local, Experimental)",
    };
  }

  /**
   * Start video generation by posting to the Wan 2.1 inference server.
   * Returns a jobId that the caller polls via getStatus().
   *
   * NOTE: The `image` field is logged but NOT sent to the server,
   * because Wan 2.1 T2V-1.3B does not support image-to-video.
   */
  async generate(request: VideoGenerationRequest): Promise<{ jobId: string }> {
    const serverUrl = getServerUrl();

    if (request.image) {
      console.log(
        "[Wan21] NOTE: Image provided but Wan 2.1 T2V-1.3B is text-to-video only. " +
        "Image will be ignored. Use Wan 2.2 TI2V-5B for image-to-video support."
      );
    }

    // Build prompt with Director camera/motion context
    let prompt = request.prompt || "A cinematic scene with natural motion";
    if (request.camera) {
      const camParts: string[] = [];
      if (request.camera.shotType) camParts.push(request.camera.shotType);
      if (request.camera.movement) camParts.push(`${request.camera.movement} camera movement`);
      if (camParts.length) prompt += `. ${camParts.join(", ")}`;
    }
    if (request.motion) {
      const movParts: string[] = [];
      if (request.motion.subjectMovement) movParts.push(request.motion.subjectMovement);
      if (request.motion.intensity) movParts.push(`${request.motion.intensity} intensity`);
      if (movParts.length) prompt += `. ${movParts.join(", ")}`;
    }

    const payload: Record<string, unknown> = {
      prompt,
      duration: request.duration,
      aspect_ratio: request.aspectRatio,
      scene_id: request.sceneId,
      scene_title: request.sceneTitle,
      camera: request.camera,
      motion: request.motion,
      characters: request.characters,
      continuity: request.continuity,
    };

    let response: Response;
    try {
      response = await fetch(`${serverUrl}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30_000),
      });
    } catch (err) {
      if (isConnectionError(err)) {
        throw new Error(
          "Wan 2.1 video engine is not running. Start the inference server:\n" +
          "  python src/lib/video/engines/server_wan21.py"
        );
      }
      throw err;
    }

    if (!response.ok) {
      let errorMsg = `Wan 2.1 engine returned ${response.status}`;
      try {
        const body = await response.json() as { detail?: string; error?: string };
        errorMsg = body.detail || body.error || errorMsg;
      } catch {
        // Use default
      }
      throw new Error(errorMsg);
    }

    const result = await response.json() as { job_id: string };
    if (!result.job_id) {
      throw new Error("Wan 2.1 engine returned invalid response: missing job_id");
    }

    return { jobId: result.job_id };
  }

  /**
   * Poll the Wan 2.1 inference server for job status.
   */
  async getStatus(jobId: string): Promise<VideoJobStatusResult> {
    const serverUrl = getServerUrl();

    let response: Response;
    try {
      response = await fetch(`${serverUrl}/status/${jobId}`, {
        method: "GET",
        signal: AbortSignal.timeout(10_000),
      });
    } catch (err) {
      return {
        jobId,
        status: "failed",
        error: "Cannot reach Wan 2.1 video engine. Is it running?",
      };
    }

    if (!response.ok) {
      return {
        jobId,
        status: "failed",
        error: `Wan 2.1 engine returned ${response.status}`,
      };
    }

    const data = await response.json() as {
      job_id: string;
      status: "queued" | "processing" | "completed" | "failed";
      video_url?: string;
      error?: string;
      metadata?: Record<string, unknown>;
    };

    return {
      jobId: data.job_id || jobId,
      status: data.status,
      videoUrl: data.video_url,
      error: data.error,
    };
  }

  /**
   * Request cancellation of a running job.
   */
  async cancel(jobId: string): Promise<void> {
    const serverUrl = getServerUrl();
    try {
      await fetch(`${serverUrl}/cancel/${jobId}`, {
        method: "POST",
        signal: AbortSignal.timeout(5_000),
      });
    } catch {
      // Best-effort
    }
  }
}

// ── Health Check ─────────────────────────────────────────────────────

/**
 * Check whether the Wan 2.1 inference server is reachable and healthy.
 */
export async function checkWan21EngineHealth(): Promise<{
  available: boolean;
  model?: string;
  device?: string;
  vram?: string;
  gpu_name?: string;
  max_frames?: number;
  fps?: number;
  error?: string;
}> {
  const serverUrl = getServerUrl();
  try {
    const response = await fetch(`${serverUrl}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) {
      return { available: false, error: `Server returned ${response.status}` };
    }
    const data = await response.json() as {
      status: string;
      model?: string;
      device?: string;
      vram?: string;
      gpu_name?: string;
      max_frames?: number;
      fps?: number;
    };
    return {
      available: data.status === "ok" || data.status === "loaded",
      model: data.model,
      device: data.device,
      vram: data.vram,
      gpu_name: data.gpu_name,
      max_frames: data.max_frames,
      fps: data.fps,
    };
  } catch (err) {
    return {
      available: false,
      error: isConnectionError(err) ? "Wan 2.1 server not reachable" : String(err),
    };
  }
}

// ── Error Helpers ────────────────────────────────────────────────────

function isConnectionError(err: unknown): boolean {
  return (
    err instanceof TypeError &&
    (err.message?.includes("fetch") ||
      err.message?.includes("network") ||
      err.message?.includes("ECONNREFUSED") ||
      err.message?.includes("Failed to fetch"))
  );
}

// ── Singleton Export ─────────────────────────────────────────────────

export const wan21VideoEngine = new Wan21VideoEngine();
export default wan21VideoEngine;
