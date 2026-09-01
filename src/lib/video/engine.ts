/**
 * PAT Orbit Video Engine — Abstraction Layer
 *
 * Provider-independent interface for video generation.
 * Concrete providers (Veo, SVD, Wan, etc.) implement `VideoEngine`
 * and register themselves here. The rest of the application depends
 * only on this module, never on a specific provider directly.
 *
 * Architecture:
 *
 *   page.tsx / API routes / Inngest
 *         │
 *         ▼
 *   engine.ts  ← you are here
 *         │
 *         ▼
 *   engines/local.ts   (SVD-XT)
 *   engines/wan21.ts   (Wan 2.1 — experimental)
 *   engines/veo.ts     (future — cloud Gemini/Veo)
 *
 * To add a new provider:
 *   1. Create src/lib/video/engines/<name>.ts
 *   2. Implement the VideoEngine interface
 *   3. Import and register: registerEngine("<name>", impl)
 *   4. Set VIDEO_ENGINE=<name> in the environment
 */

import type { VideoEngine, EngineCapabilities } from "./types";
import { localVideoEngine } from "./engines/local";
import { wan21VideoEngine } from "./engines/wan21";

// Re-export all types so consumers can import from this module.
export type {
  VideoEngine,
  EngineCapabilities,
  VideoGenerationRequest,
  VideoGenerationResult,
  VideoJobStatus,
  VideoJobStatusResult,
} from "./types";

// ── Engine Registry ─────────────────────────────────────────────────

const engines = new Map<string, VideoEngine>();

/** Register a video engine implementation under a name. */
export function registerEngine(name: string, engine: VideoEngine): void {
  engines.set(name, engine);
  console.log(`[VideoEngine] registered: ${name}`);
}

/** Check whether a named engine is registered. */
export function hasEngine(name: string): boolean {
  return engines.has(name);
}

/** List all registered engine names. */
export function listEngines(): string[] {
  return Array.from(engines.keys());
}

/**
 * Get the active engine based on the VIDEO_ENGINE environment variable.
 *
 * Supported values:
 *   veo   — default Gemini/Veo cloud path (returns null — handled by Inngest/API)
 *   local — SVD-XT local engine
 *   wan21 — Wan 2.1 T2V-1.3B local engine (experimental)
 *
 * Returns null when using Veo (cloud path), since Veo doesn't use
 * the local engine adapter system.
 *
 * Throws a clear error if an unknown engine name is configured.
 */
export function getActiveEngine(): VideoEngine | null {
  const engineName = (process.env.VIDEO_ENGINE || "veo").toLowerCase();

  // Veo is the default cloud path — returns null so callers
  // know to use the Gemini/Veo API directly.
  if (engineName === "veo") {
    return null;
  }

  const engine = engines.get(engineName);
  if (!engine) {
    const registered = Array.from(engines.keys());
    throw new Error(
      `[VideoEngine] Unknown engine "${engineName}". ` +
      `Registered engines: ${registered.join(", ") || "none"}. ` +
      `Set VIDEO_ENGINE to a valid engine name.`
    );
  }

  return engine;
}

/**
 * Get capabilities for the active engine.
 * Returns null if using Veo (cloud path) or if engine has no capabilities.
 */
export function getActiveCapabilities(): EngineCapabilities | null {
  const engine = getActiveEngine();
  if (!engine) return null;
  if (engine.capabilities) return engine.capabilities();
  // Backward compatible: engines without capabilities report full support
  return {
    supportsTextToVideo: true,
    supportsImageToVideo: true,
    supportsTextConditioning: true,
    supportsMultiClip: true,
    supportsAudio: false,
    displayName: "Unknown Engine",
  };
}

// ── Auto-register built-in engines ──────────────────────────────────
// These imports are safe — each engine is a lightweight class that
// only makes HTTP requests; no model loading happens at import time.

registerEngine("local", localVideoEngine);
registerEngine("wan21", wan21VideoEngine);
