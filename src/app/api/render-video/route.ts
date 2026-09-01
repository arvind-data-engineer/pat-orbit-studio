import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { uploadToBlob } from "@/lib/blob";
import { executeRender } from "@/lib/video/render-pipeline";

export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      scenes,
      aspectRatio,
      captions,
      music,
      voiceAudios,
      transition,
      transitionDuration,
    } = body as {
      scenes: Array<{
        id: number;
        video: string;
        narration?: string;
      }>;
      aspectRatio?: string;
      captions?: boolean;
      music?: string;
      voiceAudios?: Record<number, string>;
      transition?: string;
      transitionDuration?: number;
    };

    /* ---- Validate input ---- */
    if (!Array.isArray(scenes) || scenes.length === 0) {
      return NextResponse.json(
        { error: "No scene videos provided." },
        { status: 400 }
      );
    }

    for (let i = 0; i < scenes.length; i++) {
      const s = scenes[i];
      if (!s || typeof s !== "object" || !s.video) {
        return NextResponse.json(
          { error: `Scene ${i + 1} is missing a video.` },
          { status: 400 }
        );
      }
    }

    /* ---- Execute render via shared pipeline ---- */
    const result = await executeRender({
      scenes,
      aspectRatio,
      captions,
      music,
      voiceAudios,
      transition,
      transitionDuration,
    });

    /* ---- Upload to Blob ---- */
    const outputBuffer = await readFile(result.outputPath);
    if (outputBuffer.length === 0) {
      throw new Error("FFmpeg produced an empty output file.");
    }

    const filename = `final-video-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp4`;
    const videoUrl = await uploadToBlob(outputBuffer, filename, "video/mp4");

    return NextResponse.json({
      videoUrl,
      size: outputBuffer.length,
      duration: result.totalDuration,
      scenes: result.numScenes,
      hasVoice: result.hasVoice,
      hasMusic: result.hasMusic,
      hasCaptions: result.hasCaptions,
    });
  } catch (error) {
    console.error("Render video error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to render video.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
