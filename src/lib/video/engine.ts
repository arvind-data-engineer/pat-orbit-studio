/**
 * PAT Orbit Video Engine — Abstraction Layer
 *
 * Provider-independent interface for video generation.
 * Concrete providers (Veo, Runway, Kling, etc.) implement `VideoEngine`
 * and register themselves here. The rest of the application depends
 * only on this module, never on a specific provider directly.
 *
 * Architecture:
 *
 *   page.tsx / API routes
 *         │
 *         ▼
 *   engine.ts  ← you are here
 *         │
 *         ▼
 *   provider/veo.ts  (or runway.ts, kling.ts, …)
 *
 * To add a new provider:
 *   1. Create src/lib/video/provider/<name>.ts
 *   2. Implement the VideoEngine interface
 *   3. Call registerEngine("<name>", impl) at startup
 *   4. Set VIDEO_PROVIDER=<name> in the environment
 */

import type { VideoEngine } from "./types";
import { localVideoEngine } from "./engines/local";
import { wan21VideoEngine } from "./engines/wan21";

// Re-export all types so consumers can import from this module.
export type {
  VideoEngine,
  VideoGenerationRequest,
  VideoGenerationResult,
  VideoJobStatus,
  VideoJobStatusResult,
} from "./types";

// ── Engine Registry ─────────────────────────────────────────────────

const engines = new Map<string, VideoEngine>();
let activeEngineName: string | null = null;

/** Register a video engine implementation under a name. */
export function registerEngine(name: string, engine: VideoEngine): void {
  engines.set(name, engine);
  console.log(`[VideoEngine] registered: ${name}`);
}

/** Set the active engine by name. Throws if not registered. */
export function setActiveEngine(name: string): void {
  if (!engines.has(name)) {
    throw new Error(`[VideoEngine] "${name}" is not registered.`);
  }
  activeEngineName = name;
  console.log(`[VideoEngine] active: ${name}`);
}

/** Get the currently active engine. Throws if none is set. */
export function getEngine(): VideoEngine {
  if (!activeEngineName) {
    throw new Error(
      "[VideoEngine] No engine is active. Call setActiveEngine() first."
    );
  }
  const engine = engines.get(activeEngineName);
  if (!engine) {
    throw new Error(
      `[VideoEngine] "${activeEngineName}" is not registered.`
    );
  }
  return engine;
}

/** Check whether a named engine is registered. */
export function hasEngine(name: string): boolean {
  return engines.has(name);
}

/** List all registered engine names. */
export function listEngines(): string[] {
  return Array.from(engines.keys());
}

// ── Provider Selection ──────────────────────────────────────────────

/**
 * Check whether the local SVD video engine is selected via environment.
 * Returns true when VIDEO_ENGINE=local.
 * Defaults to false (Veo is the default provider).
 */
export function useLocalEngine(): boolean {
  return (process.env.VIDEO_ENGINE || "veo").toLowerCase() === "local";
}

/**
 * Check whether the Wan 2.1 video engine is selected.
 * Returns true when VIDEO_ENGINE=wan21.
 */
export function useWan21Engine(): boolean {
  return (process.env.VIDEO_ENGINE || "veo").toLowerCase() === "wan21";
}

/**
 * Get the active engine based on VIDEO_ENGINE env var.
 * Returns the appropriate engine adapter, or null when using Veo.
 *
 * Supported values:
 *   veo   — default Gemini/Veo path (returns null)
 *   local — SVD-XT local engine
 *   wan21 — Wan 2.1 T2V-1.3B local engine
 */
export function getActiveEngine(): VideoEngine | null {
  const engineName = (process.env.VIDEO_ENGINE || "veo").toLowerCase();
  if (engineName === "local") {
    return localVideoEngine;
  }
  if (engineName === "wan21") {
    return wan21VideoEngine;
  }
  return null;
}
