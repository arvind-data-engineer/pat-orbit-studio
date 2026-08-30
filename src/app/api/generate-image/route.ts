import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

type CharacterInfo = {
  name: string;
  description?: string;
  appearance?: string;
  role?: string;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, characters, sceneTitle, style, sceneBeat, camera, motion, continuityBefore } = body as {
      prompt?: string;
      characters?: CharacterInfo[];
      sceneTitle?: string;
      style?: string;
      sceneBeat?: string;
      camera?: { shotType?: string; angle?: string; movement?: string; framing?: string };
      motion?: { subjectMovement?: string; environmentMovement?: string; intensity?: string };
      continuityBefore?: { characters: { name: string; appearance: string }[]; location: string; timeOfDay: string; weather: string; importantObjects: string[] };
    };

    if (!prompt || !prompt.trim()) {
      return NextResponse.json(
        { error: "Image prompt is required." },
        { status: 400 }
      );
    }

    // Build enhanced prompt with character consistency
    let enhancedPrompt = prompt.trim();

    if (characters && characters.length > 0) {
      const characterDescriptions = characters
        .filter((c) => c.name?.trim())
        .map((c) => {
          const parts = [c.name];
          if (c.appearance?.trim()) parts.push(`Appearance: ${c.appearance.trim()}`);
          if (c.role?.trim()) parts.push(`Role: ${c.role.trim()}`);
          if (c.description?.trim()) parts.push(`Description: ${c.description.trim()}`);
          return parts.join(" - ");
        });

      if (characterDescriptions.length > 0) {
        enhancedPrompt = `Generate a cinematic image for the scene "${sceneTitle || "Scene"}".\n\nCharacters present in this scene:\n${characterDescriptions.map((d) => `- ${d}`).join("\n")}\n\nScene description: ${enhancedPrompt}`;
      }
    }

    if (sceneBeat && sceneBeat.trim()) {
      enhancedPrompt += `\n\nEmotional tone: ${sceneBeat.trim()}.`;
    }

    // Use Director camera plan for enhanced composition guidance
    if (camera) {
      const camParts: string[] = [];
      if (camera.shotType) camParts.push(`${camera.shotType} shot`);
      if (camera.angle) camParts.push(`${camera.angle} angle`);
      if (camera.framing) camParts.push(`${camera.framing} framing`);
      if (camParts.length > 0) {
        enhancedPrompt += `\n\nCamera: ${camParts.join(", ")}.`;
      }
    }

    // Use Director motion plan for subject/environment guidance
    if (motion) {
      const motionParts: string[] = [];
      if (motion.subjectMovement && motion.subjectMovement !== "none") {
        motionParts.push(`Subject movement: ${motion.subjectMovement}`);
      }
      if (motion.environmentMovement && motion.environmentMovement !== "none") {
        motionParts.push(`Environment movement: ${motion.environmentMovement}`);
      }
      if (motion.intensity && motion.intensity !== "subtle") {
        motionParts.push(`Motion intensity: ${motion.intensity}`);
      }
      if (motionParts.length > 0) {
        enhancedPrompt += `\n\n${motionParts.join(". ")}.`;
      }
    }

    // Use Director continuity data for consistent visuals
    if (continuityBefore) {
      const continuityParts: string[] = [];
      if (continuityBefore.location) continuityParts.push(`Location: ${continuityBefore.location}`);
      if (continuityBefore.timeOfDay) continuityParts.push(`Time of day: ${continuityBefore.timeOfDay}`);
      if (continuityBefore.weather) continuityParts.push(`Weather: ${continuityBefore.weather}`);
      if (continuityBefore.characters.length > 0) {
        const charStates = continuityBefore.characters.map((c) => `${c.name}: ${c.appearance}`).join('; ');
        continuityParts.push(`Character appearance: ${charStates}`);
      }
      if (continuityBefore.importantObjects.length > 0) {
        continuityParts.push(`Important objects in scene: ${continuityBefore.importantObjects.join(', ')}`);
      }
      if (continuityParts.length > 0) {
        enhancedPrompt += `\n\nContinuity (preserve from previous scene): ${continuityParts.join('. ')}.`;
      }
    }

    if (style && style.trim()) {
      enhancedPrompt += `\n\nVisual style: ${style.trim()}. Cinematic composition, high quality, detailed, professional photography.`;
    } else {
      enhancedPrompt += `\n\nCinematic composition, high quality, detailed, professional photography.`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: enhancedPrompt,
    });

    const parts = response.candidates?.[0]?.content?.parts ?? [];

    for (const part of parts) {
      if (part.inlineData?.data && part.inlineData?.mimeType) {
        return NextResponse.json({
          image: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
        });
      }
    }

    throw new Error("No image was returned by Gemini.");
  } catch (error) {
    console.error("Generate image error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to generate image.",
      },
      { status: 500 }
    );
  }
}
