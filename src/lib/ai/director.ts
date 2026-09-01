/**
 * AI Director — generates a structured ProductionPlan from a creative brief.
 *
 * Uses Gemini to act as a professional film director, producing:
 *   • story concept with 5-act cinematic structure
 *   • consistent character definitions
 *   • per-scene visual, camera, motion, and voice plans
 *   • a global music plan
 *
 * The output matches ProductionPlan from director-schema.ts exactly.
 */

import { GoogleGenAI } from "@google/genai";
import type {
  ProductionPlan,
  DirectorProject,
  DirectorCharacter,
  DirectorScene,
  ContinuityState,
} from "./director-schema";

// ── Input ───────────────────────────────────────────────────────────

export interface DirectorInput {
  idea: string;
  genre: string;
  tone: string;
  duration: number; // total seconds
  aspectRatio: "9:16" | "16:9" | "1:1";
  visualStyle: string;
  characters: { name: string; role: string; appearance: string; description: string }[];
}

// ── Models to try (newest first) ────────────────────────────────────

const MODELS = ["gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.5-flash", "gemini-2.5-flash"];

// ── Main function ───────────────────────────────────────────────────

export async function createProductionPlan(
  input: DirectorInput
): Promise<ProductionPlan> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Gemini API key is not configured. Please set GEMINI_API_KEY."
    );
  }

  const ai = new GoogleGenAI({ apiKey });

  console.log("[Director] planning started");
  const prompt = buildPrompt(input);
  const text = await callGemini(ai, prompt);
  const plan = parsePlan(text, input);
  console.log("[Director] initial plan created");

  // Self-critique pass — best effort, never blocks the plan.
  try {
    console.log("[Director] critique started");
    const critiqued = await critiqueProductionPlan(ai, plan);
    console.log("[Director] critique completed");
    return critiqued;
  } catch (critiqueErr) {
    console.error("[Director] critique failed — using original plan:",
      critiqueErr instanceof Error ? critiqueErr.message : String(critiqueErr));
    return plan;
  }
}

// ── Prompt construction ─────────────────────────────────────────────

function buildPrompt(input: DirectorInput): string {
  const durationPerScene = Math.round(input.duration / 5);

  const characterBlock =
    input.characters.length > 0
      ? input.characters
          .map(
            (c) =>
              `- ${c.name} (${c.role}): ${c.appearance}. ${c.description}`
          )
          .join("\n")
      : "(No predefined characters — create appropriate ones for the story.)";

  return `You are a world-class film director and screenwriter. Given a creative brief, produce a complete cinematic production plan as a single JSON object.

## Creative Brief

Idea: ${input.idea}
Genre: ${input.genre}
Tone: ${input.tone}
Total duration: ${input.duration} seconds
Aspect ratio: ${input.aspectRatio}
Visual style: ${input.visualStyle}

## Characters

${characterBlock}

## Requirements

1. Create exactly 5 scenes following this story arc:
   - Scene 1: Hook — immediately establish the protagonist/world, create curiosity.
   - Scene 2: Development — introduce a meaningful problem, discovery, or escalation.
   - Scene 3: Turning Point — the most important event/change in the story.
   - Scene 4: Climax — highest emotional/action tension.
   - Scene 5: Resolution — pay off the story, end with a memorable final image.

2. Every scene must contain:
   - title, purpose, beat, narration
   - characters present (by exact name from the character list)
   - visual plan (subject, environment, action, lighting, composition, visualStyle)
   - camera plan (shotType, angle, movement, framing)
   - motion plan (subjectMovement, environmentMovement, intensity)
   - voice plan (voice, emotion, pace, emphasis)

3. Character consistency:
   - Never change a character's defined appearance.
   - Use character names exactly as given.
   - Only include characters in scenes where they naturally belong.
   - Maintain visual and narrative continuity between scenes.

8. CONTINUITY (critical):
   - For every scene, provide continuityBefore (the world state at the START) and continuityAfter (the world state at the END).
   - Scene 1 continuityBefore establishes the initial world state.
   - Every later scene's continuityBefore MUST match the previous scene's continuityAfter.
   - Characters must retain their defined appearance and clothing unless the story explicitly changes it.
   - Location must remain consistent unless the story moves somewhere else.
   - Time of day and weather should remain consistent unless the story changes them.
   - Important objects (props, items) must persist when relevant to the story.
   - The ending state of one scene logically becomes the starting state of the next scene.
   - Continuity should support the story — do not force every detail to remain unchanged if the plot requires change.
   - Track: characters with their current appearance/clothing, location, timeOfDay, weather, importantObjects, visualStyle, and a brief previousSceneEnding summary.

4. Camera and motion must vary naturally between scenes. Do not repeat the same shot type or movement in consecutive scenes.

5. Visual prompts must be detailed enough for an AI image/video generator. Include specific subjects, environments, lighting conditions, and composition notes.

6. Voice plan: choose from "Natural", "Deep", or "Soft" for the voice field. Pace must be "slow", "moderate", or "fast". Emphasis should name specific words or short phrases.

7. Music plan should match the genre and tone of the overall project.

## Output Format

Return ONLY a valid JSON object (no markdown, no code fences, no explanation) with this exact structure:

{
  "project": {
    "title": "string",
    "genre": "string",
    "tone": "string",
    "duration": ${input.duration},
    "aspectRatio": "${input.aspectRatio}",
    "visualStyle": "${input.visualStyle}"
  },
  "characters": [
    {
      "name": "string",
      "role": "string",
      "appearance": "string",
      "description": "string"
    }
  ],
  "scenes": [
    {
      "id": "scene-1",
      "title": "string",
      "purpose": "hook",
      "beat": "string — the emotional beat of this scene",
      "duration": ${durationPerScene},
      "narration": "string — the spoken narration for this scene",
      "characters": ["character name"],
      "visual": {
        "subject": "string",
        "environment": "string",
        "action": "string",
        "lighting": "string",
        "composition": "string",
        "visualStyle": "${input.visualStyle}"
      },
      "camera": {
        "shotType": "string",
        "angle": "string",
        "movement": "string",
        "framing": "string"
      },
      "motion": {
        "subjectMovement": "string",
        "environmentMovement": "string",
        "intensity": "subtle|moderate|dramatic"
      },
      "voice": {
        "voice": "Natural|Deep|Soft",
        "emotion": "string",
        "pace": "slow|moderate|fast",
        "emphasis": "string"
      },
      "continuityBefore": {
        "characters": [{ "name": "string", "appearance": "string — clothing, pose, expression" }],
        "location": "string",
        "timeOfDay": "string",
        "weather": "string",
        "importantObjects": ["string"],
        "visualStyle": "${input.visualStyle}",
        "previousSceneEnding": "string — brief summary of how the previous scene ended"
      },
      "continuityAfter": {
        "characters": [{ "name": "string", "appearance": "string — clothing, pose, expression" }],
        "location": "string",
        "timeOfDay": "string",
        "weather": "string",
        "importantObjects": ["string"],
        "visualStyle": "${input.visualStyle}",
        "previousSceneEnding": "string — brief summary of how this scene ended"
      }
    }
  ],
  "music": {
    "style": "None|Ambient|Cinematic|Emotional",
    "mood": "string",
    "intensity": "low|medium|high"
  }
}

CRITICAL:
- Exactly 5 scenes.
- Character names in scenes must match the characters array exactly.
- Each visual prompt must be detailed and cinematic.
- Each scene must connect narratively to the previous and next scene.
- Do NOT use markdown or code fences in the response.
- Duration of scenes should sum to approximately ${input.duration} seconds.`;
}

// ── Gemini call with model fallback + retry ─────────────────────────

async function callGemini(ai: GoogleGenAI, prompt: string): Promise<string> {
  let lastError: unknown = null;

  for (const model of MODELS) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(
          `[Director] Generating plan with ${model}, attempt ${attempt}…`
        );

        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: { responseMimeType: "application/json" },
        });

        if (response?.text) {
          return response.text.trim();
        }
      } catch (err) {
        lastError = err;

        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[Director] ${model} attempt ${attempt} failed:`, msg);

        const retryable =
          msg.includes("503") ||
          msg.includes("UNAVAILABLE") ||
          msg.includes("high demand") ||
          msg.includes("429");

        if (!retryable) throw err;

        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, attempt * 2000));
        }
      }
    }

    console.log(`[Director] ${model} exhausted. Trying next model…`);
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Gemini is temporarily unavailable. Please try again shortly.");
}

// ── JSON parsing + validation ───────────────────────────────────────

function parsePlan(raw: string, input: DirectorInput): ProductionPlan {
  // Strip accidental markdown fences.
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let data: Record<string, unknown>;

  try {
    data = JSON.parse(cleaned);
  } catch {
    console.error("[Director] Invalid JSON from Gemini:", cleaned.slice(0, 500));
    throw new Error(
      "AI returned invalid production data. Please try generating again."
    );
  }

  // ── Validate project ──
  const project = data.project as DirectorProject | undefined;
  if (
    !project ||
    typeof project.title !== "string" ||
    typeof project.genre !== "string"
  ) {
    throw new Error(
      "AI returned incomplete project data. Please try generating again."
    );
  }

  // ── Validate characters ──
  const characters = (data.characters ?? []) as DirectorCharacter[];
  if (!Array.isArray(characters) || characters.length === 0) {
    throw new Error(
      "AI did not return any characters. Please try generating again."
    );
  }

  // ── Validate scenes ──
  const scenes = (data.scenes ?? []) as DirectorScene[];
  if (!Array.isArray(scenes) || scenes.length === 0) {
    throw new Error(
      "AI did not return any scenes. Please try generating again."
    );
  }

  // Ensure exactly 5 scenes.
  const validScenes = scenes.slice(0, 5);
  const purposes = ["hook", "development", "turning-point", "climax", "resolution"];
  validScenes.forEach((scene, i) => {
    if (!scene.id) scene.id = `scene-${i + 1}`;
    if (!scene.purpose) scene.purpose = purposes[i] ?? "scene";
    if (!scene.visual) {
      scene.visual = {
        subject: "",
        environment: "",
        action: "",
        lighting: "",
        composition: "",
        visualStyle: input.visualStyle,
      };
    }
    if (!scene.camera) {
      scene.camera = { shotType: "medium", angle: "eye-level", movement: "static", framing: "centered" };
    }
    if (!scene.motion) {
      scene.motion = { subjectMovement: "none", environmentMovement: "none", intensity: "subtle" };
    }
    if (!scene.voice) {
      scene.voice = { voice: "Natural", emotion: "neutral", pace: "moderate", emphasis: "" };
    }
    if (!Array.isArray(scene.characters)) scene.characters = [];
  });

  // ── Continuity normalization ──
  // Ensure continuity chains from scene to scene. If a scene is missing
  // continuityBefore, inherit from the previous scene's continuityAfter.
  // If continuityAfter is missing, create a minimal one from continuityBefore.
  for (let i = 0; i < validScenes.length; i++) {
    const scene = validScenes[i];
    const prev = i > 0 ? validScenes[i - 1] : null;

    // If continuityBefore is missing, inherit from previous scene's continuityAfter
    if (!scene.continuityBefore && prev?.continuityAfter) {
      scene.continuityBefore = { ...prev.continuityAfter };
    }

    // Ensure continuityBefore has required sub-fields
    if (scene.continuityBefore) {
      const cb = scene.continuityBefore;
      if (!Array.isArray(cb.characters)) cb.characters = [];
      if (typeof cb.location !== "string") cb.location = "";
      if (typeof cb.timeOfDay !== "string") cb.timeOfDay = "";
      if (typeof cb.weather !== "string") cb.weather = "";
      if (!Array.isArray(cb.importantObjects)) cb.importantObjects = [];
      if (typeof cb.visualStyle !== "string") cb.visualStyle = input.visualStyle;
      if (typeof cb.previousSceneEnding !== "string") cb.previousSceneEnding = "";
    }

    // If continuityAfter is missing, build from continuityBefore + scene changes
    if (!scene.continuityAfter) {
      const base = scene.continuityBefore ?? {
        characters: [],
        location: "",
        timeOfDay: "",
        weather: "",
        importantObjects: [],
        visualStyle: input.visualStyle,
        previousSceneEnding: "",
      };
      scene.continuityAfter = {
        ...base,
        previousSceneEnding: scene.narration
          ? scene.narration.slice(0, 120)
          : base.previousSceneEnding,
      };
    }

    // Ensure continuityAfter has required sub-fields
    if (scene.continuityAfter) {
      const ca = scene.continuityAfter;
      if (!Array.isArray(ca.characters)) ca.characters = [];
      if (typeof ca.location !== "string") ca.location = scene.continuityBefore?.location ?? "";
      if (typeof ca.timeOfDay !== "string") ca.timeOfDay = scene.continuityBefore?.timeOfDay ?? "";
      if (typeof ca.weather !== "string") ca.weather = scene.continuityBefore?.weather ?? "";
      if (!Array.isArray(ca.importantObjects)) ca.importantObjects = scene.continuityBefore?.importantObjects ?? [];
      if (typeof ca.visualStyle !== "string") ca.visualStyle = input.visualStyle;
      if (typeof ca.previousSceneEnding !== "string") ca.previousSceneEnding = "";
    }
  }

  // ── Validate music ──
  const music = (data.music ?? { style: "Cinematic", mood: "cinematic", intensity: "medium" }) as ProductionPlan["music"];

  return {
    project,
    characters,
    scenes: validScenes,
    music,
  };
}

// ── Self-critique pass ─────────────────────────────────────────────

/**
 * Sends the generated plan through a lightweight critique that checks
 * story, character, continuity, visual, camera, motion, and voice.
 * Returns a fixed plan if issues are found, or the original plan on any failure.
 */
async function critiqueProductionPlan(
  ai: GoogleGenAI,
  plan: ProductionPlan
): Promise<ProductionPlan> {
  const critiquePrompt = buildCritiquePrompt(plan);

  // Single call — no retry loop. If this fails, return the original plan.
  let text: string;
  try {
    const response = await ai.models.generateContent({
      model: MODELS[0],
      contents: critiquePrompt,
      config: { responseMimeType: "application/json" },
    });
    text = response?.text?.trim() ?? "";
  } catch {
    // Critique is best-effort — any Gemini failure returns the original plan.
    return plan;
  }

  if (!text) return plan;

  // Parse the critique response.
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let result: Record<string, unknown>;
  try {
    result = JSON.parse(cleaned);
  } catch {
    // Invalid JSON from critique — return original plan.
    return plan;
  }

  const fixedPlan = result.fixedPlan as ProductionPlan | undefined;
  if (!fixedPlan || !Array.isArray(fixedPlan.scenes) || fixedPlan.scenes.length === 0) {
    return plan;
  }

  // Validate the fixed plan has the same basic structure.
  if (
    !fixedPlan.project ||
    typeof fixedPlan.project.title !== "string" ||
    !Array.isArray(fixedPlan.characters) ||
    fixedPlan.characters.length === 0
  ) {
    return plan;
  }

  // Log issues found (without private content).
  const issues = result.issues as Array<{ sceneId: string; category: string; severity: string; problem: string }> | undefined;
  if (Array.isArray(issues) && issues.length > 0) {
    console.log(`[Director] critique found ${issues.length} issue(s):`);
    for (const issue of issues.slice(0, 5)) {
      console.log(`  - [${issue.severity}] ${issue.category}: ${issue.problem}`);
    }
  }

  return fixedPlan;
}

function buildCritiquePrompt(plan: ProductionPlan): string {
  return `You are a senior film director reviewing another director's production plan. Analyze the plan below and fix any problems you find.

## Plan to Review

${JSON.stringify(plan, null, 2)}

## Review Checklist

STORY:
- Does every scene advance the story?
- Is the 5-scene progression logical (hook → development → turning point → climax → resolution)?
- Does Scene 4 feel like the climax?
- Does Scene 5 provide resolution?

CHARACTERS:
- Are defined characters used consistently?
- Are appearance and clothing consistent across scenes?
- Are character actions believable?

CONTINUITY:
- Does continuityBefore match the previous scene's continuityAfter?
- Are location changes logical?
- Are important objects preserved when relevant?
- Are time/weather changes reasonable?

VISUALS:
- Is the subject clearly visible?
- Is the environment clear?
- Is the action visually understandable?
- Is lighting appropriate?
- Is composition appropriate?

CAMERA:
- Does the camera shot match the emotional beat?
- Is camera movement appropriate?
- Are shots varied enough between scenes?

MOTION:
- Is the motion achievable by a video model?
- Does the motion match the image?
- Avoid overly complex actions.

VOICE:
- Does emotion match the scene?
- Is narration appropriate?

## Output Format

Return ONLY a valid JSON object with:
- issues: array of { sceneId, category, severity (high|medium|low), problem, fix }
- fixedPlan: the complete corrected ProductionPlan

If no issues are found, return the original plan unchanged in fixedPlan and an empty issues array.
Do NOT use markdown or code fences.`;
}
