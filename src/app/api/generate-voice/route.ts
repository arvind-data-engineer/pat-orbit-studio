import { NextResponse } from "next/server";
import { getVoiceProvider } from "@/lib/ai/providers";

export async function POST(request: Request) {
  try {
    const { narration, language, voice, voicePlan } = await request.json();

    if (!narration || !narration.trim()) {
      return NextResponse.json(
        { error: "Narration text is required." },
        { status: 400 }
      );
    }

    // Use the configured voice provider
    const voiceProvider = getVoiceProvider();
    const result = await voiceProvider.generateVoice({
      narration: narration.trim(),
      language,
      voice,
      voicePlan,
    });

    return NextResponse.json(result);
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
