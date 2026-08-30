/**
 * AI Director Schema — TypeScript types for the production pipeline.
 *
 * These types describe a structured production plan that an AI Director
 * can generate from a user's creative brief. They are intentionally
 * decoupled from storage, API transport, and UI rendering so they can
 * be reused by any future Director code.
 */

// ── Project ─────────────────────────────────────────────────────────

export interface DirectorProject {
  title: string;
  genre: string;
  tone: string;
  duration: number; // seconds
  aspectRatio: "9:16" | "16:9" | "1:1";
  visualStyle: string;
}

// ── Characters ──────────────────────────────────────────────────────

export interface DirectorCharacter {
  name: string;
  role: string;
  appearance: string;
  description: string;
}

// ── Visual ──────────────────────────────────────────────────────────

export interface VisualPlan {
  subject: string;
  environment: string;
  action: string;
  lighting: string;
  composition: string;
  visualStyle: string;
}

// ── Camera ──────────────────────────────────────────────────────────

export interface CameraPlan {
  shotType: string; // e.g. "close-up", "medium", "wide", "extreme-wide"
  angle: string; // e.g. "eye-level", "low", "high", "dutch", "overhead"
  movement: string; // e.g. "static", "pan-left", "dolly-in", "tracking"
  framing: string; // e.g. "centered", "rule-of-thirds", "lead-room"
}

// ── Motion ──────────────────────────────────────────────────────────

export interface MotionPlan {
  subjectMovement: string;
  environmentMovement: string;
  intensity: "subtle" | "moderate" | "dramatic";
}

// ── Voice ───────────────────────────────────────────────────────────

export interface VoicePlan {
  voice: "Natural" | "Deep" | "Soft";
  emotion: string;
  pace: "slow" | "moderate" | "fast";
  emphasis: string; // words or phrases to stress
}

// ── Music ───────────────────────────────────────────────────────────

export interface MusicPlan {
  style: "None" | "Ambient" | "Cinematic" | "Emotional";
  mood: string;
  intensity: "low" | "medium" | "high";
}

// ── Continuity ─────────────────────────────────────────────────────

/** Tracks the visual/story state carried between scenes. */
export interface ContinuityCharacterState {
  name: string;
  appearance: string; // clothing, pose, expression — must stay consistent unless story changes it
}

export interface ContinuityState {
  characters: ContinuityCharacterState[];
  location: string;
  timeOfDay: string;
  weather: string;
  importantObjects: string[];
  visualStyle: string;
  previousSceneEnding: string; // brief summary of how the previous scene ended
}

// ── Scene ───────────────────────────────────────────────────────────

export interface DirectorScene {
  id: string;
  title: string;
  purpose: string; // narrative function (hook, development, turning-point, climax, resolution)
  beat: string; // emotional beat
  duration: number; // seconds
  narration: string;
  characters: string[]; // character names present in this scene
  visual: VisualPlan;
  camera: CameraPlan;
  motion: MotionPlan;
  voice: VoicePlan;
  continuityBefore?: ContinuityState;
  continuityAfter?: ContinuityState;
}

// ── Production Plan (top-level) ─────────────────────────────────────

export interface ProductionPlan {
  project: DirectorProject;
  characters: DirectorCharacter[];
  scenes: DirectorScene[];
  music: MusicPlan;
}
