/**
 * Health Check API — shows status of all AI providers
 *
 * GET /api/health
 */

import { NextResponse } from "next/server";
import { getProviderStatus, getAIConfig } from "@/lib/ai/providers";

export async function GET() {
  try {
    const config = getAIConfig();
    const status = await getProviderStatus();

    return NextResponse.json({
      status: "ok",
      ai: {
        provider: config.storyProvider,
        ollama: config.storyProvider === "local" ? {
          url: config.localLlmUrl,
          model: config.localLlmModel,
          available: status.story.available,
          status: status.story.error || status.story.name,
        } : null,
      },
      config: {
        storyProvider: config.storyProvider,
        imageProvider: config.imageProvider,
        ttsProvider: config.ttsProvider,
        videoEngine: config.videoEngine,
      },
      providers: status,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Health check failed",
      },
      { status: 500 }
    );
  }
}
