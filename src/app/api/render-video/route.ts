import { NextResponse } from "next/server";
import ffmpegPath from "ffmpeg-static";
import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, unlink, readFile, mkdtemp, readdir, rmdir } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

const execFileAsync = promisify(execFile);

/**
 * Helper: decode a data URI or raw base64 string into a Buffer.
 */
function decodeMedia(data: string): Buffer {
  if (data.startsWith("data:")) {
    const commaIdx = data.indexOf(",");
    if (commaIdx === -1) throw new Error("Malformed data URI.");
    return Buffer.from(data.substring(commaIdx + 1), "base64");
  }
  return Buffer.from(data, "base64");
}

/**
 * Generate a simple ambient/music tone using FFmpeg's sine generator.
 * Returns the path to the generated WAV file.
 */
async function generateMusicTone(
  ffmpeg: string,
  durationSec: number,
  style: string,
  outPath: string
): Promise<void> {
  /* Different frequencies and amplitudes for different moods */
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
      scenes: Array<{ id: number; video: string; narration?: string }>;
      aspectRatio?: string;
      captions?: boolean;
      music?: string;
      voiceAudios?: Record<number, string>;
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

    /* ---- Write each scene video to a temp file ---- */
    const inputFiles: string[] = [];

    for (let i = 0; i < scenes.length; i++) {
      const s = scenes[i];
      const buffer = decodeMedia(s.video);

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
          const audioBuffer = decodeMedia(audioData);
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
        return 5; /* fallback */
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

    /* Input 0: concatenated video */
    const concatListPath = join(tempDir, "concat.txt");
    const concatContent = inputFiles
      .map((f) => `file '${f.replace(/\\/g, "/").replace(/'/g, "'\\''")}'`)
      .join("\n");
    await writeFile(concatListPath, concatContent, "utf-8");

    inputArgs.push("-f", "concat", "-safe", "0", "-i", concatListPath);

    /* Input 1+: voice audio tracks (one per scene that has voice) */
    const voiceInputIndices: number[] = [];
    let inputIdx = 1;

    for (let i = 0; i < scenes.length; i++) {
      if (voiceFiles[i]) {
        inputArgs.push("-i", voiceFiles[i]);
        voiceInputIndices[i] = inputIdx;
        inputIdx++;
      }
    }

    /* Input for music (if any) */
    let musicInputIdx = -1;
    if (musicPath) {
      inputArgs.push("-i", musicPath);
      musicInputIdx = inputIdx;
      inputIdx++;
    }

    /* ---- Build filter complex ---- */

    /* Scale video to target aspect ratio */
    let scaleFilter: string;
    if (aspectRatio === "9:16") {
      scaleFilter = "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black";
    } else if (aspectRatio === "16:9") {
      scaleFilter = "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black";
    } else {
      scaleFilter = "scale=1080:1080:force_original_aspect_ratio=decrease,pad=1080:1080:(ow-iw)/2:(oh-ih)/2:color=black";
    }

    /* Apply scale to video stream [0:v] -> [vscaled] */
    filterParts.push(`[0:v]${scaleFilter},setsar=1,format=yuv420p[vscaled]`);

    /* Build audio mix */
    const audioInputs: string[] = [];

    /* Voice audio: concatenate and delay each scene's voice */
    if (voiceInputIndices.length > 0) {
      let cumulativeDelay = 0;

      for (let i = 0; i < scenes.length; i++) {
        if (voiceInputIndices[i] !== undefined) {
          const idx = voiceInputIndices[i];
          /* Delay the voice to align with its scene start time */
          const delayMs = Math.round(cumulativeDelay * 1000);
          filterParts.push(
            `[${idx}:a]adelay=${delayMs}|${delayMs},aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=mono[v${i}]`
          );
          audioInputs.push(`[v${i}]`);
        }
        cumulativeDelay += sceneDurations[i];
      }

      /* Mix all voice tracks together */
      if (audioInputs.length > 1) {
        filterParts.push(
          `${audioInputs.join("")}amix=inputs=${audioInputs.length}:duration=longest:dropout_transition=0[voice]`
        );
      } else if (audioInputs.length === 1) {
        filterParts.push(`${audioInputs[0]}acopy[voice]`);
      }
    }

    /* Music: mix at low volume */
    if (musicInputIdx >= 0) {
      filterParts.push(
        `[${musicInputIdx}:a]volume=0.15,afade=t=in:st=0:d=2,afade=t=out:st=${Math.max(0, totalDuration - 2)}:d=2[music]`
      );
    }

    /* Final audio mix: voice + music (or just voice, or silence) */
    const hasVoice = voiceInputIndices.length > 0;
    const hasMusic = musicInputIdx >= 0;

    if (hasVoice && hasMusic) {
      filterParts.push("[voice][music]amix=inputs=2:duration=longest:dropout_transition=0[aout]");
    } else if (hasVoice) {
      filterParts.push("[voice]acopy[aout]");
    } else if (hasMusic) {
      filterParts.push("[music]acopy[aout]");
    } else {
      /* No audio: generate silence */
      filterParts.push(
        `anullsrc=r=44100:cl=mono[silence]`
      );
      filterParts.push(
        `[silence]atrim=duration=${totalDuration},aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=mono[aout]`
      );
    }

    /* ---- Captions: burn subtitles using drawtext ---- */
    if (captions && scenes.some((s) => s.narration)) {
      let cumulativeTime = 0;
      const drawTexts: string[] = [];

      for (let i = 0; i < scenes.length; i++) {
        const s = scenes[i];
        if (s.narration && s.narration.trim()) {
          const startTime = cumulativeTime;
          const endTime = cumulativeTime + sceneDurations[i];
          /* Escape special characters for FFmpeg drawtext */
          const text = s.narration
            .replace(/\\/g, "\\\\")
            .replace(/:/g, "\\:")
            .replace(/'/g, "\\'")
            .replace(/%/g, "%%")
            .replace(/\n/g, " ")
            .substring(0, 120); /* Limit length */

          drawTexts.push(
            `drawtext=text='${text}':fontcolor=white:fontsize=28:box=1:boxcolor=black@0.6:boxborderw=8:x=(w-text_w)/2:y=h-th-60:enable='between(t,${startTime.toFixed(2)},${endTime.toFixed(2)})'`
          );
        }
        cumulativeTime += sceneDurations[i];
      }

      if (drawTexts.length > 0) {
        const chainedFilters = drawTexts.join(",");
        filterParts.push(`[vscaled]${chainedFilters}[vout]`);
      } else {
        filterParts.push("[vscaled]copy[vout]");
      }
    } else {
      filterParts.push("[vscaled]copy[vout]");
    }

    /* ---- Output file ---- */
    const outputPath = join(tempDir, "final.mp4");

    /* ---- Build FFmpeg command ---- */
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
      timeout: 600000, /* 10 minutes max */
      maxBuffer: 100 * 1024 * 1024, /* 100MB buffer */
    });

    /* ---- Read the output ---- */
    const outputBuffer = await readFile(outputPath);

    if (outputBuffer.length === 0) {
      throw new Error("FFmpeg produced an empty output file.");
    }

    const base64Video = outputBuffer.toString("base64");

    return NextResponse.json({
      video: `data:video/mp4;base64,${base64Video}`,
      size: outputBuffer.length,
      scenes: scenes.length,
      hasVoice: voiceInputIndices.length > 0,
      hasMusic: hasMusic,
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
        const files = await readdir(tempDir);
        for (const file of files) {
          await unlink(join(tempDir, file)).catch(() => {});
        }
        await rmdir(tempDir).catch(() => {});
      } catch {
        /* Best-effort cleanup */
      }
    }
  }
}
