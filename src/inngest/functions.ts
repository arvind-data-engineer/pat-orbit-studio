import { GoogleGenAI } from "@google/genai";
import { inngest } from "@/lib/inngest";
import { getJob, updateJob } from "@/lib/jobs";
import { uploadToBlob } from "@/lib/blob";
import { getActiveEngine } from "@/lib/video/engine";
import { generateVideo } from "@/lib/video/generate";
import { buildVeoPrompt } from "@/lib/video/prompt-builder";
import { buildConditioning } from "@/lib/video/conditioning";
import { getVoiceProvider } from "@/lib/ai/providers";
import ffmpegPath from "ffmpeg-static";


/* ================================================================== */
/*  Inngest step timeout: 20 minutes per step                          */
/* ================================================================== */

const STEP_TIMEOUT_MS = 1_200_000;  // 20 minutes (multi-clip SVD can take 10+ min)

/* ================================================================== */
/*  VIDEO GENERATION FUNCTION                                           */
/* ================================================================== */

export const generateVideoJob = inngest.createFunction(
  {
    id: "generate-video",
    name: "Generate Video",
    triggers: [{ event: "jobs/video.create" }],
  },
  async ({ event }) => {
    const { jobId } = event.data;

    /* 1. Read job from Redis and mark as processing */
    const job = await getJob(jobId);
    if (!job) throw new Error("Job not found");
    console.log(`[inngest/video] Processing ${jobId}, scene ${job.sceneId ?? 'unknown'}`);
    await updateJob(jobId, { status: "processing" });

    /* 2. Try shared generation service (handles local engines) */
    const localResult = await generateVideo({
      jobId,
      job: {
        prompt: job.prompt,
        image: job.image,
        duration: job.duration,
        aspectRatio: job.aspectRatio,
        sceneId: job.sceneId,
        sceneTitle: job.sceneTitle,
        characters: job.characters,
        camera: job.camera,
        motion: job.motion,
        continuityBefore: job.continuityBefore,
      },
      onProgress: (progress) => {
        console.log(`[inngest/video] ${jobId}: ${progress}`);
        updateJob(jobId, { status: "processing", error: progress });
      },
      uploadToBlob,
    });

    // If not __VEO__, the shared service handled it
    if (localResult.error !== "__VEO__") {
      if (localResult.success && localResult.videoUrl) {
        const extraUpdate: Record<string, unknown> = {};
        if (localResult.duration) extraUpdate.duration = localResult.duration;
        await updateJob(jobId, { status: "completed", videoUrl: localResult.videoUrl, ...extraUpdate });
        return { jobId, status: "completed", videoUrl: localResult.videoUrl };
      }
      await updateJob(jobId, { status: "failed", error: localResult.error || "Video generation failed." });
      throw new Error(localResult.error || "Video generation failed.");
    }

    /* 3. Veo (cloud) path */
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const conditioning = buildConditioning({
      prompt: job.prompt || "",
      image: job.image,
      duration: job.duration,
      aspectRatio: job.aspectRatio,
      sceneId: job.sceneId,
      sceneTitle: job.sceneTitle,
      characters: job.characters,
      camera: job.camera as never,
      motion: job.motion as never,
      continuity: job.continuityBefore as never,
    });
    const videoPrompt = buildVeoPrompt(conditioning);

    const config: Record<string, unknown> = { numberOfVideos: 1 };
    if (job.aspectRatio && ["16:9", "9:16"].includes(job.aspectRatio)) {
      config.aspectRatio = job.aspectRatio;
    }
    if (job.duration) {
      const match = job.duration.match(/(\d+)/);
      if (match) config.durationSeconds = Math.min(parseInt(match[1], 10), 8);
    }

    const params: Record<string, unknown> = {
      model: "veo-2.0-generate-001",
      prompt: videoPrompt,
      config,
    };

    if (job.image && typeof job.image === "string") {
      const commaIdx = job.image.indexOf(",");
      if (commaIdx !== -1) {
        const meta = job.image.substring(0, commaIdx);
        const base64Data = job.image.substring(commaIdx + 1);
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
      await updateJob(jobId, { status: "failed", error: "Video generation timed out after 5 minutes." });
      throw new Error("Video generation timed out after 5 minutes.");
    }

    if (currentOp.error) {
      const msg = (currentOp.error as Record<string, unknown>).message || "Video generation failed on the server.";
      await updateJob(jobId, { status: "failed", error: String(msg) });
      throw new Error(String(msg));
    }

    const videos = currentOp.response?.generatedVideos ?? [];
    for (const v of videos) {
      if (v.video?.videoBytes && v.video?.mimeType) {
        const videoBuffer = Buffer.from(v.video.videoBytes, "base64");
        const filename = `scene-video-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp4`;
        const videoUrl = await uploadToBlob(videoBuffer, filename, v.video.mimeType);
        console.log(`[inngest/video] Completed ${jobId}`);
        await updateJob(jobId, { status: "completed", videoUrl });
        return { jobId, status: "completed", videoUrl };
      }
      if (v.video?.uri) {
        console.log(`[inngest/video] Completed ${jobId} via URI`);
        await updateJob(jobId, { status: "completed", videoUrl: v.video.uri });
        return { jobId, status: "completed", videoUrl: v.video.uri };
      }
    }

    console.error(`[inngest/video] No video returned for ${jobId}`);
    await updateJob(jobId, { status: "failed", error: "No video was returned by the model." });
    throw new Error("No video was returned by the model.");
  }
);

/* ================================================================== */
/*  RENDER VIDEO FUNCTION                                               */
/* ================================================================== */

export const renderVideoJob = inngest.createFunction(
  {
    id: "render-video",
    name: "Render Final Video",
    triggers: [{ event: "jobs/render.create" }],
  },
  async ({ event }) => {
    const { jobId } = event.data;
    try {
      /* 1. Load job and validate */
      const job = await getJob(jobId);
      if (!job || !job.render) throw new Error("Render job not found");
      console.log(`[inngest/render] Processing ${jobId}, ${job.render.scenes.length} scenes`);
      await updateJob(jobId, { status: "processing" });

      const { render } = job;
      if (!render || !Array.isArray(render.scenes) || render.scenes.length === 0) {
        throw new Error("No scene videos provided.");
      }

      if (!ffmpegPath) {
        throw new Error("FFmpeg is not available on this server.");
      }      const ffmpeg = ffmpegPath;

      /* 2. Prepare voice audio — reuse existing or generate fresh */
      const voiceDataUris: Record<number, string> = {};
      for (let i = 0; i < render.scenes.length; i++) {
        const s = render.scenes[i];
        if (!s.narration || !s.narration.trim()) continue;

        // Reuse pre-generated voice audio from frontend
        const existingAudio = render.voiceAudios?.[s.id];
        if (existingAudio && typeof existingAudio === "string") {
          voiceDataUris[s.id] = existingAudio;
          console.log(`[inngest/render] Reused existing voice for scene ${i + 1}`);
          continue;
        }

        // Generate fresh voice audio via configured provider
        try {
          const voiceProvider = getVoiceProvider();
          const result = await voiceProvider.generateVoice({
            narration: s.narration.trim(),
            language: render.language || "en-US",
            voice: render.voice || "Natural",
          });
          if (result.audio) {
            voiceDataUris[s.id] = result.audio;
          }
        } catch {
          // Voice generation is non-fatal
        }
      }

      /* 3. Execute render via shared pipeline */
      const { executeRender } = await import("@/lib/video/render-pipeline");
      const renderResult = await executeRender({
        scenes: render.scenes.map((s) => ({ id: s.id, video: s.video, narration: s.narration })),
        aspectRatio: render.aspectRatio,
        captions: render.captions,
        music: render.music,
        voice: render.voice,
        language: render.language,
        voiceAudios: voiceDataUris,
        transition: render.transition,
        transitionDuration: render.transitionDuration,
      });

      /* 4. Upload final video to Blob */
      const outputBuffer = renderResult.outputBuffer;

      const filename = `final-video-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp4`;
      const videoUrl = await uploadToBlob(outputBuffer, filename, "video/mp4");

      /* 5. Mark job completed */
      console.log(`[inngest/render] Completed ${jobId}, ${outputBuffer.length} bytes`);
      await updateJob(jobId, { status: "completed", videoUrl });

      return {
        jobId,
        status: "completed",
        videoUrl,
        size: outputBuffer.length,
        duration: renderResult.totalDuration,
        hasVoice: renderResult.hasVoice,
        hasMusic: renderResult.hasMusic,
        hasCaptions: renderResult.hasCaptions,
      };
    } catch (error) {
      console.error(`[inngest/render] Failed ${jobId}:`, error instanceof Error ? error.message : error);
      await updateJob(jobId, {
        status: "failed",
        error: error instanceof Error ? error.message : "Failed to render video.",
      });
      throw error;
    } finally {
      // Temp dir cleanup is handled by the shared render pipeline
    }
  }
);
