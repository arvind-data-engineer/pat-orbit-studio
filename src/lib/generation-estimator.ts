/**
 * PAT Orbit — Generation Time Estimator
 *
 * Provides estimated generation times based on measured performance
 * data. Isolated from the UI so it can be extended for future engines.
 *
 * All times are approximate and clearly labeled as estimates.
 */

// ── Measured Performance Data (RTX 3050 6GB) ────────────────────────

interface EngineProfile {
  name: string;
  clipDurationSec: number;
  /** Approximate seconds per clip at different quality levels. */
  timePerClip: {
    preview: number;   // 8 frames, 3 steps
    production: number; // 14 frames, 10 steps
    quality: number;   // 14 frames, 20 steps
  };
}

const PROFILES: Record<string, EngineProfile> = {
  local: {
    name: "SVD Local",
    clipDurationSec: 2, // ~2 seconds per clip at 8 frames / 7 FPS
    timePerClip: {
      preview: 130,
      production: 240,
      quality: 480,
    },
  },
  veo: {
    name: "Veo Cloud",
    clipDurationSec: 8, // up to 8 seconds
    timePerClip: {
      preview: 15,
      production: 20,
      quality: 30,
    },
  },
};

// ── Types ───────────────────────────────────────────────────────────

export interface GenerationEstimate {
  engine: string;
  quality: string;
  numberOfClips: number;
  clipDurationSec: number;
  /** Estimated seconds per clip. */
  timePerClipSec: number;
  /** Total estimated generation time in seconds. */
  totalTimeSec: number;
  /** Human-readable estimate like "~8–10 min". */
  displayText: string;
  /** Whether this is a rough estimate or based on measured data. */
  isApproximate: boolean;
}

// ── Main function ───────────────────────────────────────────────────

/**
 * Estimate generation time for a video scene.
 *
 * @param engine - "local" | "veo" | other engine name
 * @param quality - "preview" | "production" | "quality"
 * @param targetDurationSec - desired output duration in seconds
 * @returns estimate object with display text
 */
export function estimateGenerationTime(
  engine: string,
  quality: string,
  targetDurationSec: number
): GenerationEstimate {
  const profile = PROFILES[engine];

  if (!profile) {
    return {
      engine,
      quality,
      numberOfClips: 1,
      clipDurationSec: targetDurationSec,
      timePerClipSec: 0,
      totalTimeSec: 0,
      displayText: "Estimate unavailable",
      isApproximate: true,
    };
  }

  const qual = quality in profile.timePerClip ? quality as keyof typeof profile.timePerClip : "production";
  const timePerClip = profile.timePerClip[qual];
  const clipDuration = profile.clipDurationSec;

  // For Veo, duration is the actual clip length (no multi-clip needed for ≤8s)
  let numberOfClips: number;
  if (engine === "veo") {
    numberOfClips = 1;
  } else {
    // SVD: multiple ~2s clips concatenated
    numberOfClips = Math.max(1, Math.ceil(targetDurationSec / clipDuration));
  }

  const totalTimeSec = numberOfClips * timePerClip;
  const displayText = formatDuration(totalTimeSec);

  return {
    engine,
    quality: qual,
    numberOfClips,
    clipDurationSec: clipDuration,
    timePerClipSec: timePerClip,
    totalTimeSec,
    displayText,
    isApproximate: true,
  };
}

// ── Formatting ──────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  if (seconds < 60) return `~${seconds} sec`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `~${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainMin = minutes % 60;
  return remainMin > 0 ? `~${hours}h ${remainMin}m` : `~${hours}h`;
}

/**
 * Get a quick estimate string for display in the UI.
 * Returns null if no estimate can be calculated.
 */
export function getQuickEstimate(
  engine: string,
  quality: string,
  targetDurationSec: number
): string | null {
  const est = estimateGenerationTime(engine, quality, targetDurationSec);
  if (est.totalTimeSec === 0) return null;
  return `Est. ${est.displayText}`;
}
