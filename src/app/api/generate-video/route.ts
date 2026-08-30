import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { uploadToBlob } from "@/lib/blob";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const { prompt, image, duration, aspectRatio, characters, sceneTitle, camera, motion, continuityBefore } = await request.json() as {
      prompt?: string;
      image?: string;
      duration?: string;
      aspectRatio?: string;
      characters?: Array<{ name: string; description?: string; appearance?: string; role?: string }>;
      sceneTitle?: string;
      camera?: { shotType?: string; angle?: string; movement?: string; framing?: string };
      motion?: { subjectMovement?: string; environmentMovement?: string; intensity?: string };
      continuityBefore?: { characters: { name: string; appearance: string }[]; location: string; timeOfDay: string; weather: string; importantObjects: string[] };
    };

    if (!prompt || !prompt.trim()) {
      return NextResponse.json(
        { error: "Video prompt is required." },
        { status: 400 }
      );
    }

    const config: Record<string, unknown> = {
      numberOfVideos: 1,
    };

    if (aspectRatio && ["16:9", "9:16"].includes(aspectRatio)) {
      config.aspectRatio = aspectRatio;
    }

    if (duration) {
      const match = duration.match(/(\d+)/);
      if (match) {
        config.durationSeconds = Math.min(parseInt(match[1], 10), 8);
      }
    }

    // Build enhanced prompt with character consistency
    let videoPrompt = prompt.trim();
    if (Array.isArray(characters) && characters.length > 0) {
      const sceneChars = characters.filter((c) => c.name?.trim());
      if (sceneChars.length > 0) {
        const charDesc = sceneChars.map((c) => {
          const parts = [c.name];
          if (c.appearance?.trim()) parts.push(`Appearance: ${c.appearance.trim()}`);
          if (c.role?.trim()) parts.push(`Role: ${c.role.trim()}`);
          return parts.join(' - ');
        });
        videoPrompt = `Characters: ${charDesc.join('; ')}.\n\nScene: ${videoPrompt}`;
      }
    }
    if (sceneTitle) {
      videoPrompt = `Title: ${sceneTitle}. ${videoPrompt}`;
    }

    // Use Director camera plan for video motion guidance
    if (camera) {
      const camParts: string[] = [];
      if (camera.shotType) camParts.push(`${camera.shotType} shot`);
      if (camera.angle) camParts.push(`${camera.angle} angle`);
      if (camera.movement && camera.movement !== 'static') camParts.push(`${camera.movement} camera movement`);
      if (camParts.length > 0) {
        videoPrompt += `\n\nCamera direction: ${camParts.join(', ')}.`;
      }
    }

    // Use Director motion plan for movement guidance
    if (motion) {
      const motionParts: string[] = [];
      if (motion.subjectMovement && motion.subjectMovement !== 'none') {
        motionParts.push(`Subject: ${motion.subjectMovement}`);
      }
      if (motion.environmentMovement && motion.environmentMovement !== 'none') {
        motionParts.push(`Environment: ${motion.environmentMovement}`);
      }
      if (motion.intensity && motion.intensity !== 'subtle') {
        motionParts.push(`Intensity: ${motion.intensity}`);
      }
      if (motionParts.length > 0) {
        videoPrompt += `\n\nMotion direction: ${motionParts.join('. ')}.`;
      }
    }

    // Use Director continuity data for consistent video generation
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
        continuityParts.push(`Important objects: ${continuityBefore.importantObjects.join(', ')}`);
      }
      if (continuityParts.length > 0) {
        videoPrompt += `\n\nContinuity (preserve from previous scene): ${continuityParts.join('. ')}.`;
      }
    }

    const params: Record<string, unknown> = {
      model: "veo-2.0-generate-001",
      prompt: videoPrompt,
      config,
    };

    if (image && typeof image === "string") {
      const commaIdx = image.indexOf(",");
      if (commaIdx !== -1) {
        const meta = image.substring(0, commaIdx);
        const base64Data = image.substring(commaIdx + 1);
        const mimeMatch = meta.match(/data:(.*?);/);
        const mimeType = mimeMatch ? mimeMatch[1] : "image/png";
        params.image = { imageBytes: base64Data, mimeType };
      }
    }

    const operation = await ai.models.generateVideos(
      params as unknown as Parameters<typeof ai.models.generateVideos>[0]
    );

    const MAX_POLLS = 30;
    const POLL_INTERVAL_MS = 10000;
    let currentOp = operation;

    for (let i = 0; i < MAX_POLLS; i++) {
      if (currentOp.done) break;
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      currentOp = await ai.operations.getVideosOperation({
        operation: currentOp,
      });
    }

    if (!currentOp.done) {
      return NextResponse.json(
        { error: "Video generation timed out. Please try again." },
        { status: 504 }
      );
    }

    if (currentOp.error) {
      const msg =
        (currentOp.error as Record<string, unknown>).message ||
        "Video generation failed on the server.";
      return NextResponse.json({ error: String(msg) }, { status: 500 });
    }

    const videos = currentOp.response?.generatedVideos ?? [];

    for (const v of videos) {
      if (v.video?.videoBytes && v.video?.mimeType) {
        /* Upload to Vercel Blob instead of returning base64 */
        const videoBuffer = Buffer.from(v.video.videoBytes, "base64");
        const filename = `scene-video-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp4`;
        const videoUrl = await uploadToBlob(videoBuffer, filename, v.video.mimeType);
        return NextResponse.json({ videoUrl });
      }

      if (v.video?.uri) {
        return NextResponse.json({
          videoUri: v.video.uri,
          mimeType: v.video.mimeType || "video/mp4",
        });
      }
    }

    throw new Error("No video was returned by the model.");
  } catch (error) {
    console.error("Generate video error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate video.",
      },
      { status: 500 }
    );
  }
}
