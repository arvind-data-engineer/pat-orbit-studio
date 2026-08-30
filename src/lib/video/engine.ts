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
