import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      story,
      language = "Hindi",
      contentType = "Story",
      style = "Cartoon",
      duration = "60 sec",
      characters = [],
    } = body as {
      story?: string;
      language?: string;
      contentType?: string;
      style?: string;
      duration?: string;
      characters?: Array<{ name: string; description?: string; appearance?: string; role?: string }>;
    };

    if (!story || !story.trim()) {
      return NextResponse.json(
        { error: "Please provide a story idea." },
        { status: 400 }
      );
    }

    // Build character context for the story
    let characterContext = '';
    if (Array.isArray(characters) && characters.length > 0) {
      const definedChars = characters.filter((c) => c.name?.trim());
      if (definedChars.length > 0) {
        characterContext = `

DEFINED CHARACTERS (use these consistently throughout the story):
${definedChars.map((c) => {
  const parts = [`- ${c.name}`];
  if (c.role?.trim()) parts.push(`  Role: ${c.role.trim()}`);
  if (c.appearance?.trim()) parts.push(`  Appearance: ${c.appearance.trim()}`);
  if (c.description?.trim()) parts.push(`  Description: ${c.description.trim()}`);
  return parts.join('\n');
}).join('\n')}

IMPORTANT CHARACTER RULES:
- Use the defined character names exactly as given.
- Describe characters consistently using their defined appearance in visual prompts.
- Do not rename or change character appearances.
- Not every character must appear in every scene - use them naturally where they fit.
- If a character is referenced in a scene, include their defined appearance in the visual prompt for that scene.`;
      }
    }

    const prompt = `You are a professional cinematic story engine for PAT Orbit Studio, an AI video creation tool. You write short visual stories optimized for video production.

USER IDEA:
${story}

SETTINGS:
- Language: ${language}
- Visual style: ${style}
- Target duration: ${duration}
${characterContext}

YOUR TASK:
Create exactly 5 cinematic scenes that form a complete, emotionally engaging story.

SCENE STRUCTURE (adapt naturally to genre and tone):
Scene 1 - HOOK: Immediately establish the protagonist and world. Create curiosity with a compelling opening image or moment. Drop the viewer into the story with no unnecessary exposition.
Scene 2 - DEVELOPMENT: Introduce a meaningful problem, discovery, or escalation. Build tension or curiosity. Something changes.
Scene 3 - TURNING POINT: The most important event or revelation. Should visually contrast with previous scenes. The story shifts direction.
Scene 4 - CLIMAX: Highest emotional or action tension. The protagonist faces the core challenge. This is the peak moment.
Scene 5 - RESOLUTION: Pay off the story. End with a memorable final image or emotional beat. Leave the viewer with a feeling.

VISUAL PROMPT QUALITY (critical for AI image/video generation):
Every visual prompt MUST include these elements when applicable:
- SUBJECT: Who or what is in the frame, described in detail (clothing, expression, pose)
- ENVIRONMENT: The setting - specific location, time of day, atmosphere
- ACTION: What is happening in the moment
- LIGHTING: Quality and direction of light (golden hour, neon glow, moonlight, dramatic shadows)
- COMPOSITION: Camera angle and framing (close-up, wide shot, low angle, over-the-shoulder)

Example of a GOOD visual prompt:
"Close-up of a 12-year-old boy with messy brown hair and a blue jacket, pushing open a heavy wooden door in a dark abandoned hallway. Warm golden light spills through the crack, illuminating dust particles. His face shows wonder mixed with fear. Cinematic composition, shallow depth of field, atmospheric lighting."

Example of a BAD visual prompt:
"A boy opening a door."

CONTINUITY RULES:
- Each scene must flow naturally from the previous one.
- Maintain consistent character appearances across all scenes.
- Vary the visual composition between scenes (do not repeat the same camera angle).
- Each scene should have a distinct emotional beat that progresses the story.
- Build to a climax in scene 4, then resolve in scene 5.
- If the user's idea suggests a different structure, adapt naturally.

NARRATION RULES:
- Write narration in ${language}.${language === 'Hindi' ? ' Use Devanagari script.' : ''}
- Narration should be natural spoken language suitable for voice-over.
- Keep each scene narration between 2-4 sentences.
- Make the narration cinematic - describe what the viewer sees and feels.
- Avoid exposition dumps. Show, do not tell.

OUTPUT FORMAT:
Return ONLY valid JSON. No markdown. No code fences. Escape quotes inside strings.

{
  "title": "Short compelling title",
  "scenes": [
    {
      "id": 1,
      "title": "Scene title (2-4 words)",
      "narration": "Cinematic narration",
      "visual": "Detailed visual prompt in English with subject, environment, action, lighting, and composition",
      "beat": "Emotional beat (e.g., Curiosity, Tension, Discovery, Fear, Hope)",
      "sceneDuration": "Approximate duration in seconds (e.g., 10, 12, 15)"
    }
  ]
}

CRITICAL:
- Exactly 5 scenes.
- Each visual prompt must be detailed and cinematic.
- Each scene must connect to the previous and next scene.
- The story should be engaging for short-form video.
- Do NOT use markdown or code fences in the response.`;

    let response;

const models = [
  "gemini-3.7-flash",
  "gemini-3.6-flash",
];

let lastError: unknown = null;

for (const model of models) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(
        `Generating story with ${model}, attempt ${attempt}...`
      );

      response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      if (response?.text) {
        break;
      }
    } catch (error) {
      lastError = error;

      const errorText =
        error instanceof Error
          ? error.message
          : String(error);

      console.error(
        `${model} attempt ${attempt} failed:`,
        errorText
      );

      const isUnavailable =
        errorText.includes("503") ||
        errorText.includes("UNAVAILABLE") ||
        errorText.includes("high demand");

      if (!isUnavailable) {
        throw error;
      }

      if (attempt < 3) {
        const delay = attempt * 2000;

        console.log(
          `Gemini busy. Retrying in ${delay}ms...`
        );

        await new Promise((resolve) =>
          setTimeout(resolve, delay)
        );
      }
    }
  }

  if (response?.text) {
    break;
  }

  console.log(
    `${model} unavailable. Trying next model...`
  );
}

if (!response?.text) {
  throw (
    lastError instanceof Error
      ? lastError
      : new Error(
          "Gemini is temporarily unavailable. Please try again shortly."
        )
  );
}

    let text = response.text?.trim();

    if (!text) {
      throw new Error("Gemini returned an empty response.");
    }

    // Remove accidental markdown code fences.
    text = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let result;

    try {
      result = JSON.parse(text);
    } catch {
      console.error("Invalid Gemini JSON:");
      console.error(text);

      throw new Error(
        "AI returned invalid story data. Please try generating again."
      );
    }

    // Validate the basic structure.
    if (
      !result ||
      typeof result.title !== "string" ||
      !Array.isArray(result.scenes)
    ) {
      throw new Error("AI returned an invalid story structure.");
    }

    if (result.scenes.length !== 5) {
      throw new Error("AI did not generate exactly 5 scenes.");
    }

    // Ensure each scene has required fields and add defaults for new fields
    result.scenes = result.scenes.map((scene: Record<string, unknown>, i: number) => ({
      id: typeof scene.id === 'number' ? scene.id : i + 1,
      title: typeof scene.title === 'string' ? scene.title : `Scene ${i + 1}`,
      narration: typeof scene.narration === 'string' ? scene.narration : '',
      visual: typeof scene.visual === 'string' ? scene.visual : '',
      beat: typeof scene.beat === 'string' ? scene.beat : '',
      sceneDuration: typeof scene.sceneDuration === 'string' ? scene.sceneDuration : '10',
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Generate story error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate story.",
      },
      { status: 500 }
    );
  }
}