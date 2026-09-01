/**
 * POST /api/generate-video
 *
 * Thin orchestration layer for video generation.
 * Delegates to the shared generation service in @/lib/video/generate.
 *
 * For local engines (SVD, Wan 2.1): handles the full generate → poll cycle.
 * For Veo (cloud): falls back to Gemini API directly.
 *
 * External API contract is UNCHANGED:
 *   Request:  { prompt, image?, duration?, aspectRatio?, characters?, sceneTitle?, camera?, motion?, continuityBefore? }
 *   Response: { videoUrl } or { videoUri, mimeType } or { error }
 */

import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { uploadToBlob } from "@/lib/blob";
import { generateVideo } from "@/lib/video/generate";
import { buildVeoPrompt } from "@/lib/video/prompt-builder";
import { buildConditioning } from "@/lib/video/conditioning";

export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
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

    if (!body.prompt || !body.prompt.trim()) {
      return NextResponse.json({ error: "Video prompt is required." }, { status: 400 });
    }

    // ── Try shared generation service (handles local engines) ────────
    const result = await generateVideo({
      jobId: `api-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      job: {
        prompt: body.prompt,
        image: body.image,
        duration: body.duration,
        aspectRatio: body.aspectRatio,
        sceneTitle: body.sceneTitle,
        characters: body.characters,
        camera: body.camera as never,
        motion: body.motion as never,
        continuityBefore: body.continuityBefore as never,
      },
      uploadToBlob,
    });

    // If result is not __VEO__, return it directly
    if (result.error !== "__VEO__") {
      if (result.success && result.videoUrl) {
        return NextResponse.json({ videoUrl: result.videoUrl });
      }
      return NextResponse.json({ error: result.error || "Video generation failed." }, { status: 500 });
    }

    // ── Veo (cloud) path — handled directly ──────────────────────────
    return await handleVeoGeneration(body);

  } catch (error) {
    console.error("Generate video error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate video." },
      { status: 500 }
    );
  }
}

// ── Veo-specific handler (unchanged from original) ──────────────────

async function handleVeoGeneration(body: {
  prompt?: string;
  image?: string;
  duration?: string;
  aspectRatio?: string;
  characters?: Array<{ name: string; description?: string; appearance?: string; role?: string }>;
  sceneTitle?: string;
  camera?: { shotType?: string; angle?: string; movement?: string; framing?: string };
  motion?: { subjectMovement?: string; environmentMovement?: string; intensity?: string };
  continuityBefore?: { characters: { name: string; appearance: string }[]; location: string; timeOfDay: string; weather: string; importantObjects: string[] };
}) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const conditioning = buildConditioning({
    prompt: body.prompt || "",
    image: body.image,
    duration: body.duration,
    aspectRatio: body.aspectRatio,
    sceneTitle: body.sceneTitle,
    characters: body.characters,
    camera: body.camera as never,
    motion: body.motion as never,
    continuity: body.continuityBefore as never,
  });

  const videoPrompt = buildVeoPrompt(conditioning);

  const config: Record<string, unknown> = { numberOfVideos: 1 };
  if (body.aspectRatio && ["16:9", "9:16"].includes(body.aspectRatio)) {
    config.aspectRatio = body.aspectRatio;
  }
  if (body.duration) {
    const match = body.duration.match(/(\d+)/);
    if (match) config.durationSeconds = Math.min(parseInt(match[1], 10), 8);
  }

  const params: Record<string, unknown> = {
    model: "veo-2.0-generate-001",
    prompt: videoPrompt,
    config,
  };

  if (body.image && typeof body.image === "string") {
    const commaIdx = body.image.indexOf(",");
    if (commaIdx !== -1) {
      const meta = body.image.substring(0, commaIdx);
      const base64Data = body.image.substring(commaIdx + 1);
      const mimeMatch = meta.match(/data:(.*?);/);
      const mimeType = mimeMatch ? mimeMatch[1] : "image/png";
      params.image = { imageBytes: base64Data, mimeType };
    }
  }

  const operation = await ai.models.generateVideos(
    params as unknown as Parameters<typeof ai.models.generateVideos>[0]
  );

  const MAX_POLLS = 30;
  const POLL_INTERVAL_MS = 10_000;
  let currentOp = operation;

  for (let i = 0; i < MAX_POLLS; i++) {
    if (currentOp.done) break;
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    currentOp = await ai.operations.getVideosOperation({ operation: currentOp });
  }

  if (!currentOp.done) {
    return NextResponse.json({ error: "Video generation timed out. Please try again." }, { status: 504 });
  }

  if (currentOp.error) {
    const msg = (currentOp.error as Record<string, unknown>).message || "Video generation failed on the server.";
    return NextResponse.json({ error: String(msg) }, { status: 500 });
  }

  const videos = currentOp.response?.generatedVideos ?? [];
  for (const v of videos) {
    if (v.video?.videoBytes && v.video?.mimeType) {
      const videoBuffer = Buffer.from(v.video.videoBytes, "base64");
      const filename = `scene-video-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp4`;
      const videoUrl = await uploadToBlob(videoBuffer, filename, v.video.mimeType);
      return NextResponse.json({ videoUrl });
    }
    if (v.video?.uri) {
      return NextResponse.json({ videoUri: v.video.uri, mimeType: v.video.mimeType || "video/mp4" });
    }
  }

  throw new Error("No video was returned by the model.");
}
