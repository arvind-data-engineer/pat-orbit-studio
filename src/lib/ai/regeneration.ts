/**
 * AI Director — Smart Regeneration Planner
 *
 * Analyzes a regeneration request and produces a plan that preserves
 * what should stay and identifies what should change. Falls back to
 * a safe default plan if Gemini is unavailable.
 */

import { GoogleGenAI } from "@google/genai";
import type { DirectorScene, ProductionPlan } from "./director-schema";

// ── Types ───────────────────────────────────────────────────────────

export type RegenerationTarget = "image" | "video" | "voice" | "scene";

export interface VoiceAdjustment {
  emotion?: string;
  pace?: string;
  emphasis?: string;
  voice?: string;
}

export interface RegenerationPlan {
  target: RegenerationTarget;
  reason: string;
  preserve: string[];
  change: string[];
  revisedPrompt?: string; // only for image/video targets
  voiceAdjustment?: VoiceAdjustment; // only for voice target
}

interface RegenerationInput {
  scene: DirectorScene;
  plan: ProductionPlan;
  target: RegenerationTarget;
  feedback?: string;
}

// ── Gemini model (reuse same fallback list) ─────────────────────────

const MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"];

// ── Main entry points ───────────────────────────────────────────────

/**
 * Analyze a regeneration request and return a structured plan.
 * Always succeeds — falls back to safe defaults on any failure.
 */
export async function analyzeRegenerationRequest(
  input: RegenerationInput
): Promise<RegenerationPlan> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log("[Director] No API key — using fallback regeneration plan");
    return buildFallbackPlan(input.target, input.scene);
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = buildRegenerationPrompt(input);

  try {
    console.log(`[Director] analyzing ${input.target} regeneration…`);
    const response = await ai.models.generateContent({
      model: MODELS[0],
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });

    const text = response?.text?.trim() ?? "";
    if (!text) return buildFallbackPlan(input.target, input.scene);

    const plan = parseRegenerationPlan(text, input.target);
    console.log(`[Director] regeneration plan: ${plan.change.length} change(s), ${plan.preserve.length} preserved`);
    return plan;
  } catch (err) {
    console.error(
      "[Director] regeneration analysis failed:",
      err instanceof Error ? err.message : String(err)
    );
    return buildFallbackPlan(input.target, input.scene);
  }
}

// ── Prompt construction ─────────────────────────────────────────────

function buildRegenerationPrompt(input: RegenerationInput): string {
  const { scene, plan, target, feedback } = input;

  const characterBlock = plan.characters
    .filter((c) => scene.characters.includes(c.name))
    .map((c) => `- ${c.name} (${c.role}): ${c.appearance}`)
    .join("\n");

  const feedbackLine = feedback
    ? `\n\nUSER FEEDBACK:\n${feedback}`
    : "";

  return `You are a senior film director planning a targeted regeneration. Analyze the scene and determine exactly what must be preserved and what should change for the "${target}" regeneration.

## Scene Data

${JSON.stringify(scene, null, 2)}

## Characters in This Scene

${characterBlock || "(none defined)"}

## Target: ${target}${feedbackLine}

## Rules

Based on the target, determine:

1. PRESERVE — list every element that must remain exactly as-is.
2. CHANGE — list every element that should be regenerated or improved.
3. REVISED PROMPT — if the target is "image" or "video", provide an improved generation prompt that incorporates the changes while respecting preserved elements.

### Preservation rules by target:

IMAGE:
- Preserve: story beat, characters, character appearance, location, continuity state, visual style, scene narration meaning.
- Change only: composition, framing, lighting tweaks, visual interpretation details.
- Never change: character names, character appearance descriptions, location identity, story beat.

VIDEO:
- Preserve: the generated image (reference), characters, location, scene action.
- Change: motion plan, camera movement, timing.
- Never change: character appearance, scene location, story action.

VOICE:
- Preserve: narration text (NEVER rewrite or modify it), scene meaning, language.
- Change: emotion, pace, emphasis, voice settings.
- NEVER: do not rewrite, paraphrase, or alter the narration text in any way.
- Return a voiceAdjustment object with emotion/pace/emphasis/voice changes.

SCENE:
- Allow revising the complete scene when the scene itself is fundamentally wrong.
- Preserve: the overall story arc and continuity chain.
- Change: any scene element that needs correction.

## Output Format

Return ONLY a valid JSON object:

{
  "target": "${target}",
  "reason": "brief explanation of why regeneration is needed",
  "preserve": ["element 1", "element 2", ...],
  "change": ["element 1", "element 2", ...],
  "revisedPrompt": "improved prompt for the AI generator (only for image/video targets)",
  "voiceAdjustment": { "emotion": "string", "pace": "string", "emphasis": "string", "voice": "string" }
  // voiceAdjustment is only for target=voice. Do NOT include revisedPrompt for voice target.
}

Do NOT use markdown or code fences.`;
}

// ── Parse and validate ──────────────────────────────────────────────

function parseRegenerationPlan(
  raw: string,
  target: RegenerationTarget
): RegenerationPlan {
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(cleaned);
  } catch {
    console.error("[Director] Invalid JSON from regeneration analysis");
    return buildFallbackPlan(target);
  }

  const result: RegenerationPlan = {
    target: (typeof data.target === "string" ? data.target : target) as RegenerationTarget,
    reason: typeof data.reason === "string" ? data.reason : "Regeneration requested",
    preserve: Array.isArray(data.preserve) ? data.preserve.filter((x): x is string => typeof x === "string") : [],
    change: Array.isArray(data.change) ? data.change.filter((x): x is string => typeof x === "string") : [],
  };

  // For voice target: never use revisedPrompt as narration. Use voiceAdjustment instead.
  if (result.target === "voice") {
    const va = data.voiceAdjustment as Record<string, unknown> | undefined;
    if (va && typeof va === "object") {
      result.voiceAdjustment = {};
      if (typeof va.emotion === "string") result.voiceAdjustment.emotion = va.emotion;
      if (typeof va.pace === "string") result.voiceAdjustment.pace = va.pace;
      if (typeof va.emphasis === "string") result.voiceAdjustment.emphasis = va.emphasis;
      if (typeof va.voice === "string") result.voiceAdjustment.voice = va.voice;
    }
  } else {
    // For image/video: use revisedPrompt.
    if (typeof data.revisedPrompt === "string" && data.revisedPrompt.trim()) {
      result.revisedPrompt = data.revisedPrompt.trim();
    }
  }

  // Validate: must have at least some preserve or change items.
  if (result.preserve.length === 0 && result.change.length === 0) {
    return buildFallbackPlan(target);
  }

  return result;
}

// ── Fallback plan (no Gemini needed) ────────────────────────────────

function buildFallbackPlan(
  target: RegenerationTarget,
  scene?: DirectorScene
): RegenerationPlan {
  const basePreserve = scene
    ? [
        `Scene: ${scene.title}`,
        `Beat: ${scene.beat}`,
        `Characters: ${scene.characters.join(", ") || "none"}`,
      ]
    : [];

  switch (target) {
    case "image":
      return {
        target: "image",
        reason: "Image regeneration requested",
        preserve: [
          ...basePreserve,
          "Character appearance",
          "Location",
          "Visual style",
          "Continuity state",
        ],
        change: [
          "Composition",
          "Lighting",
          "Framing",
          "Visual interpretation",
        ],
      };

    case "video":
      return {
        target: "video",
        reason: "Video regeneration requested",
        preserve: [
          ...basePreserve,
          "Generated image reference",
          "Scene action",
          "Character appearance",
        ],
        change: [
          "Camera movement",
          "Motion intensity",
          "Timing",
        ],
      };

    case "voice":
      return {
        target: "voice",
        reason: "Voice regeneration requested",
        preserve: [
          ...basePreserve,
          "Narration text",
          "Scene meaning",
        ],
        change: [
          "Emotion",
          "Pace",
          "Emphasis",
          "Voice settings",
        ],
        voiceAdjustment: {},
      };

    case "scene":
      return {
        target: "scene",
        reason: "Full scene regeneration requested",
        preserve: [
          "Overall story arc",
          "Continuity chain position",
        ],
        change: [
          "Scene title",
          "Narration",
          "Visual plan",
          "Camera plan",
          "Motion plan",
          "Voice plan",
        ],
      };
  }
}
