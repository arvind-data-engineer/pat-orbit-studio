import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

/* Map user-friendly voice names to Gemini prebuilt voice IDs */
const VOICE_MAP: Record<string, string> = {
  Natural: "Aoede",
  Deep: "Charon",
  Soft: "Kore",
};

/* Map language names to BCP-47 language codes */
const LANG_MAP: Record<string, string> = {
  Hindi: "hi-IN",
  Hinglish: "hi-IN",
  English: "en-US",
};

export async function POST(request: Request) {
  try {
    const { narration, language, voice, voicePlan } = await request.json();

    if (!narration || !narration.trim()) {
      return NextResponse.json(
        { error: "Narration text is required." },
        { status: 400 }
      );
    }

    // Director voice plan can override the default voice selection
    const voiceName = VOICE_MAP[voicePlan?.voice] || VOICE_MAP[voice] || VOICE_MAP["Natural"];
    const langCode = LANG_MAP[language] || "en-US";

    // Build enhanced narration with Director voice guidance
    let enhancedNarration = narration.trim();
    if (voicePlan) {
      const directives: string[] = [];
      if (voicePlan.emotion) directives.push(`Emotion: ${voicePlan.emotion}`);
      if (voicePlan.pace) directives.push(`Pace: ${voicePlan.pace}`);
      if (voicePlan.emphasis) directives.push(`Emphasis: ${voicePlan.emphasis}`);
      if (directives.length > 0) {
        enhancedNarration = `[${directives.join("; ")}]\n${enhancedNarration}`;
      }
    }

    /* Use Gemini generateContent with audio response modality for TTS */
    const TTS_MODELS = ["gemini-3.1-flash-tts-preview", "gemini-2.5-flash-preview-tts"];
    let lastError: unknown = null;

    for (const ttsModel of TTS_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model: ttsModel,
          contents: enhancedNarration,
          config: {
            responseModalities: ["audio"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName,
                },
              },
              languageCode: langCode,
            },
          },
        });

        /* Extract audio from response parts */
        const parts = response.candidates?.[0]?.content?.parts ?? [];

        for (const part of parts) {
          if (part.inlineData?.data && part.inlineData?.mimeType) {
            return NextResponse.json({
              audio: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
              mimeType: part.inlineData.mimeType,
              voice: voiceName,
            });
          }
        }
      } catch (err) {
        lastError = err;
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[Voice] ${ttsModel} failed:`, msg.slice(0, 200));
        if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota")) {
          continue;
        }
        throw err;
      }
    }

    if (lastError) throw lastError;
    throw new Error("No audio was returned by any available model.");
  } catch (error) {
    console.error("Generate voice error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to generate voice.",
      },
      { status: 500 }
    );
  }
}
