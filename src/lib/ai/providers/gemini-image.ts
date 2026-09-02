/**
 * Gemini Image Provider
 *
 * Wraps the existing Gemini-based image generation.
 * Requires GEMINI_API_KEY environment variable.
 */

import { GoogleGenAI } from "@google/genai";
import type { ImageGenerationRequest, ImageProvider, ProviderStatus } from "./types";

class GeminiImageProvider implements ImageProvider {
  readonly name = "Gemini Image Generator";
  readonly requiresApiKey = true;

  async generateImage(request: ImageGenerationRequest): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not configured.");
    }

    const ai = new GoogleGenAI({ apiKey });

    // Build enhanced prompt
    let enhancedPrompt = request.prompt;
    if (request.characters && request.characters.length > 0) {
      const charDescs = request.characters
        .filter((c) => c.name?.trim())
        .map((c) => {
          const parts = [c.name];
          if (c.appearance?.trim()) parts.push(`Appearance: ${c.appearance.trim()}`);
          return parts.join(" - ");
        });
      if (charDescs.length > 0) {
        enhancedPrompt = `Characters: ${charDescs.join("; ")}\n\nScene: ${enhancedPrompt}`;
      }
    }
    if (request.sceneBeat?.trim()) {
      enhancedPrompt += `\n\nEmotional tone: ${request.sceneBeat.trim()}.`;
    }
    if (request.camera) {
      const camParts: string[] = [];
      if (request.camera.shotType) camParts.push(`${request.camera.shotType} shot`);
      if (request.camera.angle) camParts.push(`${request.camera.angle} angle`);
      if (camParts.length > 0) enhancedPrompt += `\n\nCamera: ${camParts.join(", ")}.`;
    }
    if (request.style?.trim()) {
      enhancedPrompt += `\n\nVisual style: ${request.style.trim()}. Cinematic, high quality.`;
    } else {
      enhancedPrompt += `\n\nCinematic composition, high quality, detailed.`;
    }

    const IMAGE_MODELS = ["gemini-3-pro-image", "gemini-3.1-flash-image", "gemini-2.5-flash-image"];

    for (const model of IMAGE_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: enhancedPrompt,
        });

        const parts = response.candidates?.[0]?.content?.parts ?? [];
        for (const part of parts) {
          if (part.inlineData?.data && part.inlineData?.mimeType) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) continue;
        throw err;
      }
    }

    throw new Error("No image was returned by Gemini.");
  }
}

export async function checkGeminiImageHealth(): Promise<ProviderStatus> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { available: false, name: "Gemini", error: "GEMINI_API_KEY not configured" };
  }
  return { available: true, name: "Gemini (configured)" };
}

export const geminiImageProvider: ImageProvider = new GeminiImageProvider();
export default geminiImageProvider;
