/**
 * Local Story Provider — Ollama Director
 *
 * Uses a locally running Ollama LLM to generate structured ProductionPlans.
 * No external API calls. No Gemini. No cloud dependency.
 *
 * Requires:
 *   1. Ollama installed and running (https://ollama.ai)
 *   2. A model pulled (e.g. ollama pull qwen2.5:3b)
 *   3. LOCAL_LLM_URL and LOCAL_LLM_MODEL configured in .env.local
 *
 * If Ollama is unavailable, throws a clear error — never falls back silently.
 */

import type { DirectorInput } from "../director";
import type { ProductionPlan, DirectorScene, DirectorCharacter } from "../director-schema";
import type { StoryProvider, ProviderStatus } from "./types";
import { getAIConfig } from "./config";

// ── Ollama Health ───────────────────────────────────────────────────

async function checkOllama(): Promise<{
  reachable: boolean;
  modelAvailable: boolean;
  availableModels: string[];
  error?: string;
}> {
  const config = getAIConfig();
  try {
    const resp = await fetch(`${config.localLlmUrl}/api/tags`, {
      signal: AbortSignal.timeout(5_000),
    });
    if (!resp.ok) {
      return { reachable: false, modelAvailable: false, availableModels: [], error: `HTTP ${resp.status}` };
    }
    const data = (await resp.json()) as { models?: Array<{ name: string }> };
    const models = (data.models ?? []).map((m) => m.name);
    const modelAvailable = models.some(
      (m) => m === config.localLlmModel || m.startsWith(config.localLlmModel + ":"),
    );
    return { reachable: true, modelAvailable, availableModels: models };
  } catch (err) {
    return {
      reachable: false,
      modelAvailable: false,
      availableModels: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ── Prompt (optimized for small LLMs) ──────────────────────────────

function buildDirectorPrompt(input: DirectorInput): string {
  const durationPerScene = Math.round(input.duration / 5);
  const characters = input.characters.length > 0
    ? input.characters.map((c) => `${c.name} (${c.role}): ${c.appearance}`).join("; ")
    : "Create appropriate characters";

  return `You are a film director. Generate a JSON production plan for: "${input.idea}"

Genre: ${input.genre} | Style: ${input.visualStyle} | Duration: ${input.duration}s | Scenes: 5 (${durationPerScene}s each)
Characters: ${characters}

Return a JSON object with exactly these 4 top-level keys: project, characters, scenes, music.

project: {title, genre, tone, duration, aspectRatio, visualStyle}
characters: [{name, role, appearance, description}]
music: {style, mood, intensity}

scenes: array of exactly 5 objects, each with:
- id: "scene-1" through "scene-5"
- title: short cinematic title
- purpose: "hook"|"development"|"turning-point"|"climax"|"resolution"
- beat: emotional beat (1 sentence)
- duration: ${durationPerScene}
- narration: 2-3 sentences spoken narration for TTS voiceover
- characters: array of character names in this scene
- visual: {subject, environment, action, lighting, composition, visualStyle:"${input.visualStyle}"}
- camera: {shotType, angle, movement, framing}
- motion: {subjectMovement, environmentMovement, intensity:"subtle"|"moderate"|"dramatic"}
- voice: {voice:"Natural"|"Deep"|"Soft", emotion, pace:"slow"|"moderate"|"fast", emphasis}
- continuityBefore: {characters:[{name,appearance}], location, timeOfDay, weather, importantObjects:[], visualStyle:"${input.visualStyle}", previousSceneEnding}
- continuityAfter: same structure, previousSceneEnding describes how scene ends

Scene 1 hook, Scene 5 resolution. Vary camera shots between scenes. Be specific and cinematic.
Return ONLY valid JSON. No markdown. No code fences.`;
}

// ── JSON Parsing + Validation ───────────────────────────────────────

function extractJson(text: string): string {
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) return fenceMatch[1].trim();
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return text.substring(firstBrace, lastBrace + 1);
  }
  return text.trim();
}

function validateAndNormalize(data: Record<string, unknown>, input: DirectorInput): ProductionPlan {
  // Always ensure top-level ProductionPlan structure exists
  if (!data.project) {
    data.project = {
      title: input.idea.split(/[.!?\n]/)[0]?.trim()?.slice(0, 60) || "Untitled",
      genre: input.genre,
      tone: input.tone,
      duration: input.duration,
      aspectRatio: input.aspectRatio,
      visualStyle: input.visualStyle,
    };
  }
  if (!data.characters || !Array.isArray(data.characters) || data.characters.length === 0) {
    data.characters = input.characters.length > 0
      ? input.characters
      : [{ name: "Protagonist", role: "main", appearance: "A person", description: "Main character" }];
  }
  if (!data.music) {
    data.music = { style: "Cinematic", mood: input.tone, intensity: "medium" };
  }

  const project = data.project as ProductionPlan["project"] | undefined;
  if (!project || typeof project.title !== "string") {
    throw new Error("AI returned incomplete project data. Missing title or genre.");
  }

  const characters = (data.characters ?? []) as DirectorCharacter[];
  const scenes = (data.scenes ?? []) as DirectorScene[];
  if (!Array.isArray(scenes) || scenes.length === 0) {
    throw new Error("AI did not return any scenes.");
  }

  const validScenes = scenes.slice(0, 5);
  const purposes = ["hook", "development", "turning-point", "climax", "resolution"];

  validScenes.forEach((scene, i) => {
    if (!scene.id) scene.id = `scene-${i + 1}`;
    if (!scene.title) scene.title = `Scene ${i + 1}`;
    if (!scene.purpose) scene.purpose = purposes[i] ?? "scene";
    if (!scene.beat) scene.beat = "";
    if (typeof scene.duration !== "number") scene.duration = Math.round(input.duration / 5);
    if (!scene.narration) scene.narration = "";
    if (!Array.isArray(scene.characters)) scene.characters = [];

    if (!scene.visual || typeof scene.visual !== "object") {
      scene.visual = {
        subject: "", environment: "", action: "",
        lighting: "", composition: "", visualStyle: input.visualStyle,
      };
    }
    scene.visual.visualStyle = scene.visual.visualStyle || input.visualStyle;

    if (!scene.camera || typeof scene.camera !== "object") {
      scene.camera = { shotType: "medium", angle: "eye-level", movement: "static", framing: "centered" };
    }

    if (!scene.motion || typeof scene.motion !== "object") {
      scene.motion = { subjectMovement: "none", environmentMovement: "none", intensity: "subtle" };
    }

    if (!scene.voice || typeof scene.voice !== "object") {
      scene.voice = { voice: "Natural", emotion: "neutral", pace: "moderate", emphasis: "" };
    }
  });

  // Continuity normalization
  for (let i = 0; i < validScenes.length; i++) {
    const scene = validScenes[i];
    const prev = i > 0 ? validScenes[i - 1] : null;

    if (!scene.continuityBefore && prev?.continuityAfter) {
      scene.continuityBefore = { ...prev.continuityAfter };
    }

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

  const music = (data.music ?? {
    style: "Cinematic", mood: "cinematic", intensity: "medium",
  }) as ProductionPlan["music"];

  return { project, characters: (data.characters ?? []) as DirectorCharacter[], scenes: validScenes, music };
}

function parseAndValidate(raw: string, input: DirectorInput): ProductionPlan {
  const cleaned = extractJson(raw);
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(cleaned);
  } catch {
    throw new Error(
      "AI returned invalid JSON. Try a different model or increase context window.",
    );
  }
  return validateAndNormalize(data, input);
}

// ── Ollama Call ─────────────────────────────────────────────────────

async function callOllama(input: DirectorInput): Promise<ProductionPlan> {
  const config = getAIConfig();
  const url = `${config.localLlmUrl}/api/generate`;

  const health = await checkOllama();
  if (!health.reachable) {
    throw new Error(
      `Local AI is enabled but Ollama is not running at ${config.localLlmUrl}. ` +
      `Start Ollama and try again. Installation: https://ollama.ai`,
    );
  }
  if (!health.modelAvailable) {
    const available = health.availableModels.length > 0
      ? `Available models: ${health.availableModels.join(", ")}`
      : "No models are installed.";
    throw new Error(
      `Local AI model "${config.localLlmModel}" is not available in Ollama. ` +
      `Install it with: ollama pull ${config.localLlmModel}\n${available}`,
    );
  }

  console.log(`[LocalDirector] Calling Ollama model: ${config.localLlmModel}`);
  const prompt = buildDirectorPrompt(input);

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
        top_p: 0.9,
        repeat_penalty: 1.1,
      },
    }),
    signal: AbortSignal.timeout(300_000), // 5 minutes
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Ollama returned HTTP ${response.status}: ${body.slice(0, 200)}`);
  }

  const data = (await response.json()) as { response?: string; error?: string };
  if (data.error) throw new Error(`Ollama error: ${data.error}`);
  if (!data.response) throw new Error("Ollama returned an empty response.");

  console.log(`[LocalDirector] Ollama response received (${data.response.length} chars)`);

  try {
    return parseAndValidate(data.response, input);
  } catch (parseErr) {
    console.log("[LocalDirector] First parse failed, attempting repair...");
    const repairPrompt = `Fix this JSON to match the ProductionPlan schema. Return ONLY valid JSON.\n${data.response.slice(0, 3000)}`;
    try {
      const repairResp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: config.localLlmModel,
          prompt: repairPrompt,
          format: "json",
          stream: false,
          options: { temperature: 0.3, num_predict: 4096 },
        }),
        signal: AbortSignal.timeout(120_000),
      });
      if (repairResp.ok) {
        const repairData = (await repairResp.json()) as { response?: string };
        if (repairData.response) return parseAndValidate(repairData.response, input);
      }
    } catch { /* fall through */ }
    throw parseErr;
  }
}

// ── Main Provider ───────────────────────────────────────────────────

class LocalStoryProvider implements StoryProvider {
  readonly name = "Ollama Director";
  readonly requiresApiKey = false;

  async generatePlan(input: DirectorInput): Promise<ProductionPlan> {
    console.log("[LocalDirector] Generating production plan via Ollama...");
    const plan = await callOllama(input);
    console.log(`[LocalDirector] Plan generated: ${plan.scenes.length} scenes, ${plan.characters.length} characters`);
    return plan;
  }
}

export async function checkLocalDirectorHealth(): Promise<ProviderStatus> {
  const config = getAIConfig();
  const health = await checkOllama();
  if (!health.reachable) {
    return { available: false, name: "Ollama", error: `Not reachable at ${config.localLlmUrl}. Start Ollama: https://ollama.ai` };
  }
  if (!health.modelAvailable) {
    return {
      available: false,
      name: `Ollama (${config.localLlmModel})`,
      error: `Model "${config.localLlmModel}" not found. Pull it: ollama pull ${config.localLlmModel}` +
        (health.availableModels.length > 0 ? `. Available: ${health.availableModels.join(", ")}` : ""),
    };
  }
  return { available: true, name: `Ollama (${config.localLlmModel})` };
}

export const localStoryProvider: StoryProvider = new LocalStoryProvider();
export default localStoryProvider;
