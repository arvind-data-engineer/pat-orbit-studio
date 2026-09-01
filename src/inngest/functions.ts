import { GoogleGenAI } from "@google/genai";
import { inngest } from "@/lib/inngest";
import { getJob, updateJob } from "@/lib/jobs";
import { uploadToBlob } from "@/lib/blob";
import { getActiveEngine } from "@/lib/video/engine";
import { generateVideo } from "@/lib/video/generate";
import { buildVeoPrompt } from "@/lib/video/prompt-builder";
import { buildConditioning } from "@/lib/video/conditioning";
import ffmpegPath from "ffmpeg-static";
import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, readFile, mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

const execFileAsync = promisify(execFile);

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

function generateMusicToneSync(
  ffmpeg: string,
  durationSec: number,
  style: string,
  outPath: string
): Promise<void> {
  const presets: Record<string, { freq: string; vol: string }> = {
    Ambient: { freq: "220", vol: "0.03" },
    Cinematic: { freq: "165", vol: "0.04" },
    Emotional: { freq: "262", vol: "0.035" },
  };
  const p = presets[style] || presets.Ambient;
  const args = [
    "-y",
    "-f", "lavfi",
    "-i", `sine=frequency=${p.freq}:duration=${durationSec}:sample_rate=44100`,
    "-af", `volume=${p.vol},afade=t=in:st=0:d=2,afade=t=out:st=${Math.max(0, durationSec - 2)}:d=2`,
    "-ar", "44100",
    "-ac", "1",
    outPath,
  ];
  return execFileAsync(ffmpeg, args, { timeout: 60_000 }).then(() => {});
}

export const renderVideoJob = inngest.createFunction(
  {
    id: "render-video",
    name: "Render Final Video",
    triggers: [{ event: "jobs/render.create" }],
  },
  async ({ event }) => {
    const { jobId } = event.data;
    let tempDir: string | null = null;

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
      }

      const ffmpeg = ffmpegPath;

      /* 2. Download scene videos */
      tempDir = await mkdtemp(join(tmpdir(), "pat-render-"));
      const inputFiles: string[] = [];

      for (let i = 0; i < render.scenes.length; i++) {
        const s = render.scenes[i];
        const { downloadAsBuffer } = await import("@/lib/blob");
        const buffer = await downloadAsBuffer(s.video);
        if (buffer.length === 0) throw new Error(`Scene ${i + 1} video is empty.`);
        const filePath = join(tempDir, `scene_${String(i + 1).padStart(2, "0")}.mp4`);
        await writeFile(filePath, buffer);
        inputFiles.push(filePath);
      }

      /* 3. Voice audio — reuse existing or generate */
      const voiceFiles: string[] = [];
      for (let i = 0; i < render.scenes.length; i++) {
        const s = render.scenes[i];
        if (!s.narration || !s.narration.trim()) continue;

        const audioPath = join(tempDir, `voice_${String(i + 1).padStart(2, "0")}.wav`);

        // Reuse pre-generated voice audio if available from the frontend.
        const existingAudio = render.voiceAudios?.[s.id];
        if (existingAudio && typeof existingAudio === "string") {
          try {
            const commaIdx = existingAudio.indexOf(",");
            if (commaIdx !== -1) {
              const base64Data = existingAudio.substring(commaIdx + 1);
              const audioBuffer = Buffer.from(base64Data, "base64");
              if (audioBuffer.length > 0) {
                await writeFile(audioPath, audioBuffer);
                voiceFiles[i] = audioPath;
                console.log(`[inngest/render] Reused existing voice for scene ${i + 1}`);
                continue;
              }
            }
          } catch {
            // Fall through to generate fresh voice.
          }
        }

        // Generate fresh voice audio.
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const voiceMap: Record<string, string> = { Natural: "Aoede", Deep: "Charon", Soft: "Kore" };
        const langMap: Record<string, string> = { Hindi: "hi-IN", Hinglish: "hi-IN", English: "en-US" };
        const voiceName = voiceMap[render.voice || ""] || "Aoede";
        const langCode = langMap[render.language || ""] || "en-US";

        try {
          const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: s.narration.trim(),
            config: {
              responseModalities: ["audio"],
              speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName } },
                languageCode: langCode,
              },
            },
          });

          const parts = response.candidates?.[0]?.content?.parts ?? [];
          for (const part of parts) {
            if (part.inlineData?.data && part.inlineData?.mimeType) {
              const audioBuffer = Buffer.from(part.inlineData.data, "base64");
              await writeFile(audioPath, audioBuffer);
              voiceFiles[i] = audioPath;
              break;
            }
          }
        } catch {
          // Voice generation is non-fatal
        }
      }

      /* 4. Get video durations */
      const getDuration = async (fp: string): Promise<number> => {
        try {
          const { stdout } = await execFileAsync(ffmpeg, [
            "-i", fp, "-show_entries", "format=duration",
            "-v", "quiet", "-of", "csv=p=0",
          ], { timeout: 10_000 });
          return parseFloat(stdout.trim()) || 5;
        } catch {
          return 5;
        }
      };

      const durations: number[] = [];
      for (const f of inputFiles) durations.push(await getDuration(f));
      const totalDuration = durations.reduce((a, b) => a + b, 0);

      /* 5. Generate background music if requested */
      let musicPath: string | null = null;
      if (render.music && render.music !== "None") {
        musicPath = join(tempDir, "music.wav");
        await generateMusicToneSync(ffmpeg, totalDuration + 2, render.music, musicPath);
      }

      /* 6. Build filter complex */
      const filterParts: string[] = [];
      const inputArgs: string[] = [];

      const concatPath = join(tempDir, "concat.txt");
      const concatContent = inputFiles
        .map((f: string) => `file '${f.replace(/\\\\/g, "/").replace(/'/g, "'\\''")}'`)
        .join("\n");
      await writeFile(concatPath, concatContent, "utf-8");
      inputArgs.push("-f", "concat", "-safe", "0", "-i", concatPath);

      const voiceIdx: number[] = [];
      let idx = 1;
      for (let i = 0; i < render.scenes.length; i++) {
        if (voiceFiles[i]) {
          inputArgs.push("-i", voiceFiles[i]);
          voiceIdx[i] = idx++;
        }
      }

      let musicIdx = -1;
      if (musicPath) {
        inputArgs.push("-i", musicPath);
        musicIdx = idx++;
      }

      // Scale filter
      let sf: string;
      if (render.aspectRatio === "9:16")
        sf = "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black";
      else if (render.aspectRatio === "16:9")
        sf = "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black";
      else
        sf = "scale=1080:1080:force_original_aspect_ratio=decrease,pad=1080:1080:(ow-iw)/2:(oh-ih)/2:color=black";

      filterParts.push(`[0:v]${sf},setsar=1,format=yuv420p[vscaled]`);

      // Voice audio mixing
      const audioInputs: string[] = [];
      if (voiceIdx.length > 0) {
        let cumDelay = 0;
        for (let i = 0; i < render.scenes.length; i++) {
          if (voiceIdx[i] !== undefined) {
            const vi = voiceIdx[i];
            const dMs = Math.round(cumDelay * 1000);
            filterParts.push(
              `[${vi}:a]adelay=${dMs}|${dMs},aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=mono[v${i}]`
            );
            audioInputs.push(`[v${i}]`);
          }
          cumDelay += durations[i];
        }
        if (audioInputs.length > 1)
          filterParts.push(`${audioInputs.join("")}amix=inputs=${audioInputs.length}:duration=longest:dropout_transition=0[voice]`);
        else if (audioInputs.length === 1)
          filterParts.push(`${audioInputs[0]}acopy[voice]`);
      }

      if (musicIdx >= 0)
        filterParts.push(`[${musicIdx}:a]volume=0.15,afade=t=in:st=0:d=2,afade=t=out:st=${Math.max(0, totalDuration - 2)}:d=2[music]`);

      const hasVoice = voiceIdx.length > 0;
      const hasMusic = musicIdx >= 0;
      if (hasVoice && hasMusic)
        filterParts.push("[voice][music]amix=inputs=2:duration=longest:dropout_transition=0[aout]");
      else if (hasVoice)
        filterParts.push("[voice]acopy[aout]");
      else if (hasMusic)
        filterParts.push("[music]acopy[aout]");
      else {
        filterParts.push("anullsrc=r=44100:cl=mono[silence]");
        filterParts.push(`[silence]atrim=duration=${totalDuration},aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=mono[aout]`);
      }

      // Captions
      if (render.captions && render.scenes.some((s: { narration?: string }) => s.narration)) {
        let cumTime = 0;
        const drawTexts: string[] = [];
        for (let i = 0; i < render.scenes.length; i++) {
          const s = render.scenes[i];
          if (s.narration && s.narration.trim()) {
            const st = cumTime;
            const et = cumTime + durations[i];
            const text = s.narration
              .replace(/\\/g, "\\\\")
              .replace(/:/g, "\\:")
              .replace(/'/g, "\\'")
              .replace(/%/g, "%%")
              .replace(/\n/g, " ")
              .substring(0, 120);
            drawTexts.push(
              `drawtext=text='${text}':fontcolor=white:fontsize=28:box=1:boxcolor=black@0.6:boxborderw=8:x=(w-text_w)/2:y=h-th-60:enable='between(t,${st.toFixed(2)},${et.toFixed(2)})'`
            );
          }
          cumTime += durations[i];
        }
        if (drawTexts.length > 0)
          filterParts.push(`[vscaled]${drawTexts.join(",")}[vout]`);
        else
          filterParts.push("[vscaled]copy[vout]");
      } else {
        filterParts.push("[vscaled]copy[vout]");
      }

      /* 7. Run FFmpeg */
      const outputPath = join(tempDir, "final.mp4");
      const filterComplex = filterParts.join(";");

      const args = [
        "-y",
        ...inputArgs,
        "-filter_complex", filterComplex,
        "-map", "[vout]",
        "-map", "[aout]",
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "23",
        "-c:a", "aac",
        "-b:a", "128k",
        "-ar", "44100",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        "-shortest",
        outputPath,
      ];

      await execFileAsync(ffmpeg, args, {
        timeout: STEP_TIMEOUT_MS,
        maxBuffer: 100 * 1024 * 1024,
      });

      /* 8. Upload final video to Blob */
      const outputBuffer = await readFile(outputPath);
      if (outputBuffer.length === 0) {
        throw new Error("FFmpeg produced an empty output file.");
      }

      const filename = `final-video-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp4`;
      const videoUrl = await uploadToBlob(outputBuffer, filename, "video/mp4");

      /* 9. Mark job completed */
      console.log(`[inngest/render] Completed ${jobId}, ${outputBuffer.length} bytes`);
      await updateJob(jobId, { status: "completed", videoUrl });

      return {
        jobId,
        status: "completed",
        videoUrl,
        size: outputBuffer.length,
        duration: totalDuration,
        hasVoice,
        hasMusic,
        hasCaptions: !!render.captions,
      };
    } catch (error) {
      console.error(`[inngest/render] Failed ${jobId}:`, error instanceof Error ? error.message : error);
      await updateJob(jobId, {
        status: "failed",
        error: error instanceof Error ? error.message : "Failed to render video.",
      });
      throw error;
    } finally {
      if (tempDir) {
        try {
          await rm(tempDir, { recursive: true, force: true });
        } catch {
          // Best-effort cleanup
        }
      }
    }
  }
);
