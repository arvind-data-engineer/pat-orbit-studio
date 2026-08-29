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
    const { prompt, characters, sceneTitle, style, sceneBeat } = body as {
      prompt?: string;
      characters?: CharacterInfo[];
      sceneTitle?: string;
      style?: string;
      sceneBeat?: string;
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
          error instanceof Error
            ? error.message
            : "Failed to generate image.",
      },
      { status: 500 }
    );
  }
}