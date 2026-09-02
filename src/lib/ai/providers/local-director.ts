/**
 * Local Story Provider — Template-Based Director
 *
 * Generates a structured ProductionPlan from user input without any LLM.
 * Uses scene templates and the user's creative brief to produce a
 * complete 5-scene production plan compatible with the downstream pipeline.
 *
 * When Ollama is available, this provider will use it for better quality.
 * When Ollama is not available, it falls back to template-based generation.
 *
 * The output matches ProductionPlan from director-schema.ts exactly.
 */

import type { DirectorInput } from "../director";
import type { ProductionPlan, DirectorScene, DirectorCharacter } from "../director-schema";
import type { StoryProvider, ProviderStatus } from "./types";
import { getAIConfig } from "./config";

// ── Scene Templates ─────────────────────────────────────────────────

interface SceneTemplate {
  purpose: string;
  beat: string;
  shotType: string;
  angle: string;
  movement: string;
  intensity: "subtle" | "moderate" | "dramatic";
}

const SCENE_TEMPLATES: SceneTemplate[] = [
  {
    purpose: "hook",
    beat: "Establish the world and create curiosity",
    shotType: "wide",
    angle: "eye-level",
    movement: "slow pan",
    intensity: "subtle",
  },
  {
    purpose: "development",
    beat: "Introduce conflict or discovery",
    shotType: "medium",
    angle: "slight low",
    movement: "dolly-in",
    intensity: "moderate",
  },
  {
    purpose: "turning-point",
    beat: "The moment everything changes",
    shotType: "close-up",
    angle: "eye-level",
    movement: "slow push",
    intensity: "dramatic",
  },
  {
    purpose: "climax",
    beat: "Peak tension and emotion",
    shotType: "medium close-up",
    angle: "dutch",
    movement: "tracking",
    intensity: "dramatic",
  },
  {
    purpose: "resolution",
    beat: "Resolution and reflection",
    shotType: "wide",
    angle: "high",
    movement: "slow pull back",
    intensity: "subtle",
  },
];

// ── Ollama Integration ──────────────────────────────────────────────

async function callOllama(input: DirectorInput): Promise<ProductionPlan | null> {
  const config = getAIConfig();
  const url = `${config.localLlmUrl}/api/generate`;

  const durationPerScene = Math.round(input.duration / 5);

  const prompt = buildPrompt(input, durationPerScene);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.localLlmModel,
        prompt,
        format: "json",
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 4096,
        },
      }),
      signal: AbortSignal.timeout(120_000),
    });

    if (!response.ok) {
      console.error(`[LocalDirector] Ollama returned ${response.status}`);
      return null;
    }

    const data = await response.json() as { response?: string };
    if (!data.response) return null;

    const plan = parsePlan(data.response, input);
    return plan;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[LocalDirector] Ollama error: ${msg}`);
    return null;
  }
}

function buildPrompt(input: DirectorInput, durationPerScene: number): string {
  return `You are a film director. Given a creative brief, produce a production plan as JSON.

Brief:
Idea: ${input.idea}
Genre: ${input.genre}
Duration: ${input.duration}s (${durationPerScene}s per scene)
Visual style: ${input.visualStyle}

Produce exactly 5 scenes with: title, narration, visual (subject, environment, action, lighting, composition, visualStyle), camera (shotType, angle, movement, framing), motion (subjectMovement, environmentMovement, intensity), voice (voice, emotion, pace, emphasis), continuityBefore, continuityAfter.

Return JSON with: { project: { title, genre, tone, duration, aspectRatio, visualStyle }, characters: [{ name, role, appearance, description }], scenes: [{ id, title, purpose, beat, duration, narration, characters, visual, camera, motion, voice, continuityBefore, continuityAfter }], music: { style, mood, intensity } }

Do NOT use markdown or code fences. Return ONLY valid JSON.`;
}

// ── Template-Based Director ─────────────────────────────────────────

function templateBasedDirector(input: DirectorInput): ProductionPlan {
  const durationPerScene = Math.round(input.duration / 5);

  const characters: DirectorCharacter[] = input.characters.length > 0
    ? input.characters
    : [{
        name: "Protagonist",
        role: "main character",
        appearance: "A person in the scene",
        description: "The main character of this story",
      }];

  const scenes: DirectorScene[] = SCENE_TEMPLATES.map((template, i) => {
    const sceneNum = i + 1;
    const isFirst = i === 0;
    const isLast = i === SCENE_TEMPLATES.length - 1;

    // Build narration from the idea
    const narration = generateNarration(input.idea, template, sceneNum, isFirst, isLast);

    // Build visual prompt
    const visualSubject = input.idea.length > 100
      ? input.idea.slice(0, 100)
      : input.idea;

    const scene: DirectorScene = {
      id: `scene-${sceneNum}`,
      title: `${template.purpose.charAt(0).toUpperCase() + template.purpose.slice(1)} — Scene ${sceneNum}`,
      purpose: template.purpose,
      beat: template.beat,
      duration: durationPerScene,
      narration,
      characters: characters.map((c) => c.name),
      visual: {
        subject: visualSubject,
        environment: `A cinematic ${input.genre.toLowerCase()} setting`,
        action: `The scene unfolds with ${input.tone.toLowerCase()} energy`,
        lighting: input.visualStyle.includes("dark")
          ? "Dramatic low-key lighting with deep shadows"
          : "Cinematic natural lighting with warm tones",
        composition: `${template.shotType} shot with ${template.angle} angle`,
        visualStyle: input.visualStyle,
      },
      camera: {
        shotType: template.shotType,
        angle: template.angle,
        movement: template.movement,
        framing: "rule-of-thirds",
      },
      motion: {
        subjectMovement: isFirst || isLast ? "slow" : "moderate",
        environmentMovement: template.movement.includes("pan") ? "gentle camera drift" : "static",
        intensity: template.intensity,
      },
      voice: {
        voice: (input.characters[0]?.role?.toLowerCase().includes("female")
          ? "Soft"
          : input.genre.toLowerCase().includes("action")
            ? "Deep"
            : "Natural") as "Natural" | "Deep" | "Soft",
        emotion: template.beat,
        pace: template.intensity === "dramatic" ? "slow" : "moderate",
        emphasis: "",
      },
      continuityBefore: {
        characters: characters.map((c) => ({
          name: c.name,
          appearance: c.appearance || "Default appearance",
        })),
        location: `Scene ${sceneNum} location`,
        timeOfDay: i < 2 ? "morning" : i < 4 ? "afternoon" : "evening",
        weather: "clear",
        importantObjects: [],
        visualStyle: input.visualStyle,
        previousSceneEnding: i === 0
          ? "Story begins"
          : `Scene ${sceneNum - 1} ends`,
      },
      continuityAfter: {
        characters: characters.map((c) => ({
          name: c.name,
          appearance: c.appearance || "Default appearance",
        })),
        location: `Scene ${sceneNum} location`,
        timeOfDay: i < 2 ? "morning" : i < 4 ? "afternoon" : "evening",
        weather: "clear",
        importantObjects: [],
        visualStyle: input.visualStyle,
        previousSceneEnding: isLast
          ? "The story reaches its conclusion"
          : `Leading into Scene ${sceneNum + 1}`,
      },
    };

    return scene;
  });

  return {
    project: {
      title: extractTitle(input.idea),
      genre: input.genre,
      tone: input.tone,
      duration: input.duration,
      aspectRatio: input.aspectRatio,
      visualStyle: input.visualStyle,
    },
    characters,
    scenes,
    music: {
      style: input.genre.toLowerCase().includes("drama")
        ? "Emotional"
        : input.genre.toLowerCase().includes("action")
          ? "Cinematic"
          : "Ambient",
      mood: input.tone,
      intensity: "medium",
    },
  };
}

function extractTitle(idea: string): string {
  // Take first sentence or first 60 chars
  const firstSentence = idea.split(/[.!?\n]/)[0]?.trim();
  if (firstSentence && firstSentence.length > 5 && firstSentence.length <= 60) {
    return firstSentence;
  }
  if (firstSentence && firstSentence.length > 60) {
    return firstSentence.slice(0, 57) + "...";
  }
  return idea.slice(0, 60).trim() || "Untitled Film";
}

function generateNarration(
  idea: string,
  template: SceneTemplate,
  sceneNum: number,
  isFirst: boolean,
  isLast: boolean,
): string {
  const shortIdea = idea.length > 80 ? idea.slice(0, 80) : idea;

  if (isFirst) {
    return `In this opening scene, we are introduced to ${shortIdea}. The story begins with a sense of ${template.beat.toLowerCase()}.`;
  }
  if (isLast) {
    return `The story reaches its conclusion as everything comes together. ${shortIdea} finds its resolution.`;
  }

  const developments = [
    `The story develops as new elements emerge around ${shortIdea}.`,
    `A turning point arrives, changing everything we thought we knew.`,
    `The tension reaches its peak in this climactic moment.`,
  ];

  return developments[sceneNum - 2] || `The story continues to unfold.`;
}

// ── JSON Parsing (shared with Gemini director) ──────────────────────

function parsePlan(raw: string, input: DirectorInput): ProductionPlan {
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(cleaned);
  } catch {
    throw new Error("AI returned invalid JSON. Please try again.");
  }

  const project = data.project as ProductionPlan["project"] | undefined;
  if (!project || typeof project.title !== "string") {
    throw new Error("AI returned incomplete project data.");
  }

  const characters = (data.characters ?? []) as DirectorCharacter[];
  if (!Array.isArray(characters) || characters.length === 0) {
    throw new Error("AI did not return any characters.");
  }

  const scenes = (data.scenes ?? []) as DirectorScene[];
  if (!Array.isArray(scenes) || scenes.length === 0) {
    throw new Error("AI did not return any scenes.");
  }

  // Normalize scenes
  const validScenes = scenes.slice(0, 5);
  const purposes = ["hook", "development", "turning-point", "climax", "resolution"];
  validScenes.forEach((scene, i) => {
    if (!scene.id) scene.id = `scene-${i + 1}`;
    if (!scene.purpose) scene.purpose = purposes[i] ?? "scene";
    if (!scene.visual) {
      scene.visual = {
        subject: "", environment: "", action: "",
        lighting: "", composition: "", visualStyle: input.visualStyle,
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

  // Continuity normalization
  for (let i = 0; i < validScenes.length; i++) {
    const scene = validScenes[i];
    const prev = i > 0 ? validScenes[i - 1] : null;
    if (!scene.continuityBefore && prev?.continuityAfter) {
      scene.continuityBefore = { ...prev.continuityAfter };
    }
    if (!scene.continuityAfter) {
      const base = scene.continuityBefore ?? {
        characters: [], location: "", timeOfDay: "", weather: "",
        importantObjects: [], visualStyle: input.visualStyle, previousSceneEnding: "",
      };
      scene.continuityAfter = {
        ...base,
        previousSceneEnding: scene.narration?.slice(0, 120) || "",
      };
    }
  }

  const music = (data.music ?? {
    style: "Cinematic", mood: "cinematic", intensity: "medium",
  }) as ProductionPlan["music"];

  return { project, characters, scenes: validScenes, music };
}

// ── Main Provider Implementation ────────────────────────────────────

class LocalStoryProvider implements StoryProvider {
  readonly name = "Local Director";
  readonly requiresApiKey = false;

  async generatePlan(input: DirectorInput): Promise<ProductionPlan> {
    console.log("[LocalDirector] Generating production plan...");

    // Try Ollama first (much better quality)
    const config = getAIConfig();
    let ollamaAvailable = false;

    try {
      const healthCheck = await fetch(`${config.localLlmUrl}/api/tags`, {
        signal: AbortSignal.timeout(3_000),
      });
      ollamaAvailable = healthCheck.ok;
    } catch {
      ollamaAvailable = false;
    }

    if (ollamaAvailable) {
      console.log("[LocalDirector] Using Ollama LLM...");
      try {
        const plan = await callOllama(input);
        if (plan) {
          console.log("[LocalDirector] Ollama generation complete");
          return plan;
        }
      } catch (err) {
        console.error("[LocalDirector] Ollama failed, falling back to templates:", err);
      }
    } else {
      console.log("[LocalDirector] Ollama not available, using template-based director");
    }

    // Fall back to template-based generation
    console.log("[LocalDirector] Using template-based director...");
    const plan = templateBasedDirector(input);
    console.log("[LocalDirector] Template generation complete");
    return plan;
  }
}

// ── Health Check ────────────────────────────────────────────────────

export async function checkLocalDirectorHealth(): Promise<ProviderStatus> {
  const config = getAIConfig();
  try {
    const response = await fetch(`${config.localLlmUrl}/api/tags`, {
      signal: AbortSignal.timeout(3_000),
    });
    if (response.ok) {
      const data = await response.json() as { models?: Array<{ name: string }> };
      const modelName = data.models?.[0]?.name || "unknown";
      return { available: true, name: `Ollama (${modelName})` };
    }
    return { available: false, name: "Ollama", error: `Server returned ${response.status}` };
  } catch {
    return {
      available: false,
      name: "Template Director",
      error: "Ollama not running (using template fallback)",
    };
  }
}

export const localStoryProvider: StoryProvider = new LocalStoryProvider();
export default localStoryProvider;
