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
    const { narration, language, voice } = await request.json();

    if (!narration || !narration.trim()) {
      return NextResponse.json(
        { error: "Narration text is required." },
        { status: 400 }
      );
    }

    const voiceName = VOICE_MAP[voice] || VOICE_MAP["Natural"];
    const langCode = LANG_MAP[language] || "en-US";

    /* Use Gemini generateContent with audio response modality for TTS */
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: narration.trim(),
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

    throw new Error("No audio was returned by the model.");
  } catch (error) {
    console.error("Generate voice error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate voice.",
      },
      { status: 500 }
    );
  }
}
