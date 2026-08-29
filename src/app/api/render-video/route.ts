import { NextResponse } from "next/server";
import ffmpegPath from "ffmpeg-static";
import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, readFile, mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { uploadToBlob, downloadAsBuffer } from "@/lib/blob";

const execFileAsync = promisify(execFile);

export const maxDuration = 300;

/**
 * Generate a simple ambient/music tone using FFmpeg's sine generator.
 */
async function generateMusicTone(
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

  await execFileAsync(ffmpeg, args, { timeout: 60000 });
}

export async function POST(request: Request) {
  let tempDir: string | null = null;

  try {
    const body = await request.json();
    const {
      scenes,
      aspectRatio,
      captions,
      music,
      voiceAudios,
    } = body as {
      scenes: Array<{
        id: number;
        video: string; // URL or data URI
        narration?: string;
      }>;
      aspectRatio?: string;
      captions?: boolean;
      music?: string;
      voiceAudios?: Record<number, string>; // data URIs for voice
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

    if (!ffmpegPath) {
      return NextResponse.json(
        { error: "FFmpeg is not available on this server." },
        { status: 500 }
      );
    }

    const ffmpeg = ffmpegPath;

    /* ---- Prepare temp directory ---- */
    tempDir = await mkdtemp(join(tmpdir(), "pat-render-"));

    /* ---- Download/write each scene video to a temp file ---- */
    const inputFiles: string[] = [];

    for (let i = 0; i < scenes.length; i++) {
      const s = scenes[i];
      const buffer = await downloadAsBuffer(s.video);

      if (buffer.length === 0) {
        return NextResponse.json(
          { error: `Scene ${i + 1} video is empty.` },
          { status: 400 }
        );
      }

      const filePath = join(tempDir, `scene_${String(i + 1).padStart(2, "0")}.mp4`);
      await writeFile(filePath, buffer);
      inputFiles.push(filePath);
    }

    /* ---- Write voice audio files if provided ---- */
    const voiceFiles: string[] = [];
    if (voiceAudios && typeof voiceAudios === "object") {
      for (let i = 0; i < scenes.length; i++) {
        const s = scenes[i];
        const audioData = voiceAudios[s.id];
        if (audioData) {
          const audioBuffer = await downloadAsBuffer(audioData);
          const audioPath = join(tempDir, `voice_${String(i + 1).padStart(2, "0")}.wav`);
          await writeFile(audioPath, audioBuffer);
          voiceFiles[i] = audioPath;
        }
      }
    }

    /* ---- Get video durations for each scene ---- */
    const getDuration = async (filePath: string): Promise<number> => {
      try {
        const { stdout } = await execFileAsync(ffmpeg, [
          "-i", filePath,
          "-show_entries", "format=duration",
          "-v", "quiet",
          "-of", "csv=p=0",
        ], { timeout: 10000 });
        return parseFloat(stdout.trim()) || 5;
      } catch {
        return 5;
      }
    };

    const sceneDurations: number[] = [];
    for (const f of inputFiles) {
      sceneDurations.push(await getDuration(f));
    }
    const totalDuration = sceneDurations.reduce((a, b) => a + b, 0);

    /* ---- Generate background music if requested ---- */
    let musicPath: string | null = null;
    if (music && music !== "None") {
      musicPath = join(tempDir, "music.wav");
      await generateMusicTone(ffmpeg, totalDuration + 2, music, musicPath);
    }

    /* ---- Build the complex FFmpeg filter graph ---- */
    const filterParts: string[] = [];
    const inputArgs: string[] = [];

    const concatListPath = join(tempDir, "concat.txt");
    const concatContent = inputFiles
      .map((f) => `file '${f.replace(/\\\\/g, "/").replace(/'/g, "'\\''")}'`)
      .join("\n");
    await writeFile(concatListPath, concatContent, "utf-8");

    inputArgs.push("-f", "concat", "-safe", "0", "-i", concatListPath);

    const voiceInputIndices: number[] = [];
    let inputIdx = 1;

    for (let i = 0; i < scenes.length; i++) {
      if (voiceFiles[i]) {
        inputArgs.push("-i", voiceFiles[i]);
        voiceInputIndices[i] = inputIdx;
        inputIdx++;
      }
    }

    let musicInputIdx = -1;
    if (musicPath) {
      inputArgs.push("-i", musicPath);
      musicInputIdx = inputIdx;
      inputIdx++;
    }

    /* ---- Build filter complex ---- */
    let scaleFilter: string;
    if (aspectRatio === "9:16") {
      scaleFilter = "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black";
    } else if (aspectRatio === "16:9") {
      scaleFilter = "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black";
    } else {
      scaleFilter = "scale=1080:1080:force_original_aspect_ratio=decrease,pad=1080:1080:(ow-iw)/2:(oh-ih)/2:color=black";
    }

    filterParts.push(`[0:v]${scaleFilter},setsar=1,format=yuv420p[vscaled]`);

    const audioInputs: string[] = [];

    if (voiceInputIndices.length > 0) {
      let cumulativeDelay = 0;

      for (let i = 0; i < scenes.length; i++) {
        if (voiceInputIndices[i] !== undefined) {
          const idx = voiceInputIndices[i];
          const delayMs = Math.round(cumulativeDelay * 1000);
          filterParts.push(
            `[${idx}:a]adelay=${delayMs}|${delayMs},aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=mono[v${i}]`
          );
          audioInputs.push(`[v${i}]`);
        }
        cumulativeDelay += sceneDurations[i];
      }

      if (audioInputs.length > 1) {
        filterParts.push(
          `${audioInputs.join("")}amix=inputs=${audioInputs.length}:duration=longest:dropout_transition=0[voice]`
        );
      } else if (audioInputs.length === 1) {
        filterParts.push(`${audioInputs[0]}acopy[voice]`);
      }
    }

    if (musicInputIdx >= 0) {
      filterParts.push(
        `[${musicInputIdx}:a]volume=0.15,afade=t=in:st=0:d=2,afade=t=out:st=${Math.max(0, totalDuration - 2)}:d=2[music]`
      );
    }

    const hasVoice = voiceInputIndices.length > 0;
    const hasMusic = musicInputIdx >= 0;

    if (hasVoice && hasMusic) {
      filterParts.push("[voice][music]amix=inputs=2:duration=longest:dropout_transition=0[aout]");
    } else if (hasVoice) {
      filterParts.push("[voice]acopy[aout]");
    } else if (hasMusic) {
      filterParts.push("[music]acopy[aout]");
    } else {
      filterParts.push(`anullsrc=r=44100:cl=mono[silence]`);
      filterParts.push(
        `[silence]atrim=duration=${totalDuration},aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=mono[aout]`
      );
    }

    /* ---- Captions ---- */
    if (captions && scenes.some((s) => s.narration)) {
      let cumulativeTime = 0;
      const drawTexts: string[] = [];

      for (let i = 0; i < scenes.length; i++) {
        const s = scenes[i];
        if (s.narration && s.narration.trim()) {
          const startTime = cumulativeTime;
          const endTime = cumulativeTime + sceneDurations[i];
          const text = s.narration
            .replace(/\\/g, "\\\\")
            .replace(/:/g, "\\:")
            .replace(/'/g, "\\'")
            .replace(/%/g, "%%")
            .replace(/\n/g, " ")
            .substring(0, 120);

          drawTexts.push(
            `drawtext=text='${text}':fontcolor=white:fontsize=28:box=1:boxcolor=black@0.6:boxborderw=8:x=(w-text_w)/2:y=h-th-60:enable='between(t,${startTime.toFixed(2)},${endTime.toFixed(2)})'`
          );
        }
        cumulativeTime += sceneDurations[i];
      }

      if (drawTexts.length > 0) {
        filterParts.push(`[vscaled]${drawTexts.join(",")}[vout]`);
      } else {
        filterParts.push("[vscaled]copy[vout]");
      }
    } else {
      filterParts.push("[vscaled]copy[vout]");
    }

    /* ---- Output file ---- */
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
      timeout: 600000,
      maxBuffer: 100 * 1024 * 1024,
    });

    /* ---- Read and upload the output ---- */
    const outputBuffer = await readFile(outputPath);

    if (outputBuffer.length === 0) {
      throw new Error("FFmpeg produced an empty output file.");
    }

    /* Upload to Vercel Blob instead of returning base64 */
    const filename = `final-video-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp4`;
    const videoUrl = await uploadToBlob(outputBuffer, filename, "video/mp4");

    return NextResponse.json({
      videoUrl,
      size: outputBuffer.length,
      duration: totalDuration,
      scenes: scenes.length,
      hasVoice,
      hasMusic,
      hasCaptions: !!captions,
    });
  } catch (error) {
    console.error("Render video error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to render video.";

    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    /* ---- Clean up temp files ---- */
    if (tempDir) {
      try {
        await rm(tempDir, { recursive: true, force: true });
      } catch {
        // Best-effort cleanup
      }
    }
  }
}
