import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { prompt, image, duration, aspectRatio } = await request.json();

    if (!prompt || !prompt.trim()) {
      return NextResponse.json(
        { error: "Video prompt is required." },
        { status: 400 }
      );
    }

    /* ---------------------------------------------------------- *
     * Build parameters for ai.models.generateVideos()
     * - model: veo-2.0-generate-001  (current Gemini video model)
     * - prompt: scene visual description
     * - image: optional base64 reference image for image-to-video
     * - config: aspect ratio, duration, 1 video
     * ---------------------------------------------------------- */

    const config: Record<string, unknown> = {
      numberOfVideos: 1,
    };

    /* Aspect ratio from user settings */
    if (aspectRatio && ["16:9", "9:16"].includes(aspectRatio)) {
      config.aspectRatio = aspectRatio;
    }

    /* Duration: convert "60 sec" string to seconds number */
    if (duration) {
      const match = duration.match(/(\d+)/);
      if (match) {
        config.durationSeconds = Math.min(
          parseInt(match[1], 10),
          8
        ); // Veo 2 max is 8 seconds
      }
    }

    const params: Record<string, unknown> = {
      model: "veo-2.0-generate-001",
      prompt: prompt.trim(),
      config,
    };

    /* If a generated scene image exists, pass it for image-to-video */
    if (image && typeof image === "string") {
      /* image is a data URI like "data:image/png;base64,ABC..." */
      const commaIdx = image.indexOf(",");
      if (commaIdx !== -1) {
        const meta = image.substring(0, commaIdx); // data:image/png;base64
        const base64Data = image.substring(commaIdx + 1);
        const mimeMatch = meta.match(/data:(.*?);/);
        const mimeType = mimeMatch ? mimeMatch[1] : "image/png";

        params.image = {
          imageBytes: base64Data,
          mimeType,
        };
      }
    }

    /* Start the video generation operation */
    const operation = await ai.models.generateVideos(
      params as unknown as Parameters<typeof ai.models.generateVideos>[0]
    );

    /* Poll until the operation completes (max ~5 minutes) */
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

    /* Extract the generated video */
    const videos = currentOp.response?.generatedVideos ?? [];

    for (const v of videos) {
      if (v.video?.videoBytes && v.video?.mimeType) {
        return NextResponse.json({
          video: `data:${v.video.mimeType};base64,${v.video.videoBytes}`,
        });
      }

      /* Some responses return a URI instead of inline bytes */
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
