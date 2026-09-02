/**
 * Gemini Voice Provider
 *
 * Wraps the existing Gemini-based TTS implementation.
 * Requires GEMINI_API_KEY environment variable.
 */

import { GoogleGenAI } from "@google/genai";
import type { VoiceGenerationRequest, VoiceProvider, ProviderStatus } from "./types";

const VOICE_MAP: Record<string, string> = {
  Natural: "Aoede",
  Deep: "Charon",
  Soft: "Kore",
};

const LANG_MAP: Record<string, string> = {
  Hindi: "hi-IN",
  Hinglish: "hi-IN",
  English: "en-US",
};

class GeminiVoiceProvider implements VoiceProvider {
  readonly name = "Gemini TTS";
  readonly requiresApiKey = true;

  async generateVoice(request: VoiceGenerationRequest): Promise<{
    audio: string;
    mimeType: string;
    voice: string;
  }> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not configured.");
    }

    const ai = new GoogleGenAI({ apiKey });
    const text = request.narration?.trim();
    if (!text) throw new Error("Narration text is required.");

    const voiceName = VOICE_MAP[request.voicePlan?.voice || request.voice || "Natural"] || "Aoede";
    const langCode = LANG_MAP[request.language || ""] || "en-US";

    // Build enhanced narration with Director voice guidance
    let enhancedNarration = text;
    if (request.voicePlan) {
      const directives: string[] = [];
      if (request.voicePlan.emotion) directives.push(`Emotion: ${request.voicePlan.emotion}`);
      if (request.voicePlan.pace) directives.push(`Pace: ${request.voicePlan.pace}`);
      if (request.voicePlan.emphasis) directives.push(`Emphasis: ${request.voicePlan.emphasis}`);
      if (directives.length > 0) {
        enhancedNarration = `[${directives.join("; ")}]\n${enhancedNarration}`;
      }
    }

    const TTS_MODELS = ["gemini-3.1-flash-tts-preview", "gemini-2.5-flash-preview-tts"];

    for (const ttsModel of TTS_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model: ttsModel,
          contents: enhancedNarration,
          config: {
            responseModalities: ["audio"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName },
              },
              languageCode: langCode,
            },
          },
        });

        const parts = response.candidates?.[0]?.content?.parts ?? [];
        for (const part of parts) {
          if (part.inlineData?.data && part.inlineData?.mimeType) {
            return {
              audio: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
              mimeType: part.inlineData.mimeType,
              voice: voiceName,
            };
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) continue;
        throw err;
      }
    }

    throw new Error("No audio was returned by Gemini.");
  }
}

export async function checkGeminiVoiceHealth(): Promise<ProviderStatus> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { available: false, name: "Gemini TTS", error: "GEMINI_API_KEY not configured" };
  }
  return { available: true, name: "Gemini TTS (configured)" };
}

export const geminiVoiceProvider: VoiceProvider = new GeminiVoiceProvider();
export default geminiVoiceProvider;
