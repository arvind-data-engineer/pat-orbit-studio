/**
 * PAT Orbit Video Engine — Local Open-Source Engine
 *
 * Communicates with a local FastAPI inference server running
 * Stable Video Diffusion (SVD-XT 1.1) via HuggingFace diffusers.
 *
 * The Python server runs outside the Next.js process and handles
 * PyTorch/GPU inference. This adapter translates the VideoEngine
 * interface into HTTP requests against that server.
 *
 * Required environment variables:
 *   LOCAL_VIDEO_ENGINE_URL — base URL of the inference server (default: http://localhost:8000)
 *
 * The local engine is optional. If the server is not running, generate()
 * returns a clear error instructing the user to start it.
 */

import type {
  VideoEngine,
  VideoGenerationRequest,
  VideoJobStatusResult,
} from "../types";

// ── Configuration ────────────────────────────────────────────────────

const DEFAULT_SERVER_URL = "http://localhost:8000";

function getServerUrl(): string {
  return (process.env.LOCAL_VIDEO_ENGINE_URL || DEFAULT_SERVER_URL).replace(/\/$/, "");
}

// ── Job tracking (in-memory, server-side only) ──────────────────────

interface LocalJob {
  jobId: string;
  status: "queued" | "processing" | "completed" | "failed";
  videoUrl?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Engine Implementation ────────────────────────────────────────────

class LocalVideoEngine implements VideoEngine {
  /**
   * Start video generation by posting to the local inference server.
   * Returns a jobId that the caller polls via getStatus().
   */
  async generate(request: VideoGenerationRequest): Promise<{ jobId: string }> {
    const serverUrl = getServerUrl();

    // Build JSON payload for the local inference server
    const payload: Record<string, unknown> = {
      prompt: request.prompt,
      scene_id: request.sceneId,
      scene_title: request.sceneTitle,
    };

    // Pass target duration for multi-clip generation
    if (request.duration && request.duration > 0) {
      payload.target_duration = request.duration;
    }

    // Pass image as base64 data URI (server extracts it)
    if (request.image) {
      payload.image = request.image;
    }

    // Pass Director camera/motion plans
    if (request.camera) {
      payload.camera = request.camera;
    }
    if (request.motion) {
      payload.motion = request.motion;
    }

    // Pass character info
    if (request.characters && request.characters.length > 0) {
      payload.characters = request.characters;
    }

    // Pass continuity state
    if (request.continuity) {
      payload.continuity = request.continuity;
    }

    let response: Response;
    try {
      response = await fetch(`${serverUrl}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30_000), // 30s timeout for job creation
      });
    } catch (err) {
      if (isAbortError(err) || isTimeoutError(err) || isConnectionError(err)) {
        throw new Error(
          "Local video engine is not running. Start the local inference server: " +
          `python src/lib/video/engines/server.py`
        );
      }
      throw err;
    }

    if (!response.ok) {
      let errorMsg = `Local video engine returned ${response.status}`;
      try {
        const body = await response.json();
        errorMsg = body.detail || body.error || errorMsg;
      } catch {
        // Use default
      }
      throw new Error(errorMsg);
    }

    const result = await response.json() as { job_id: string };
    if (!result.job_id) {
      throw new Error("Local video engine returned invalid response: missing job_id");
    }

    return { jobId: result.job_id };
  }

  /**
   * Poll the local inference server for job status.
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
        error: "Cannot reach local video engine. Is it running?",
      };
    }

    if (!response.ok) {
      return {
        jobId,
        status: "failed",
        error: `Local video engine returned ${response.status}`,
      };
    }

    const data = await response.json() as {
      job_id: string;
      status: "queued" | "processing" | "completed" | "failed";
      video_url?: string;
      error?: string;
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
      // Best-effort — cancellation may not succeed
    }
  }
}

// ── Health Check ─────────────────────────────────────────────────────

/**
 * Check whether the local video inference server is reachable and healthy.
 * Returns health info or null if unavailable.
 */
export async function checkLocalEngineHealth(): Promise<{
  available: boolean;
  model?: string;
  device?: string;
  vram?: string;
  gpu_name?: string;
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
    };
    return {
      available: data.status === "ok",
      model: data.model,
      device: data.device,
      vram: data.vram,
      gpu_name: data.gpu_name,
    };
  } catch (err) {
    return {
      available: false,
      error: isConnectionError(err) ? "Server not reachable" : String(err),
    };
  }
}

// ── Error Helpers ────────────────────────────────────────────────────

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}

function isTimeoutError(err: unknown): boolean {
  return err instanceof Error && (
    err.name === "TimeoutError" ||
    err.message?.includes("timeout") ||
    err.message?.includes("abort")
  );
}

function isConnectionError(err: unknown): boolean {
  return err instanceof TypeError && (
    err.message?.includes("fetch") ||
    err.message?.includes("network") ||
    err.message?.includes("ECONNREFUSED") ||
    err.message?.includes("Failed to fetch")
  );
}

// ── Singleton Export ─────────────────────────────────────────────────

export const localVideoEngine = new LocalVideoEngine();
export default localVideoEngine;
