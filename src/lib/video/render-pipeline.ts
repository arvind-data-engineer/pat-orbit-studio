/**
 * PAT Orbit — Shared Render Pipeline
 *
 * Builds the FFmpeg filter graph for assembling scene videos into a
 * final rendered video. Supports optional crossfade transitions between scenes.
 *
 * Both the synchronous render-video API route and the Inngest background
 * render job use this module to avoid duplicating FFmpeg logic.
 */

import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, readFile, mkdtemp, rm, mkdir } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

/** Get the temp directory, preferring VIDEO_TEMP_DIR if set. */
async function getTempDir(): Promise<string> {
  const custom = process.env.VIDEO_TEMP_DIR;
  if (custom && custom.trim()) {
    try {
      await mkdir(custom, { recursive: true });
      return custom;
    } catch { /* fall through */ }
  }
  return tmpdir();
}

const execFileAsync = promisify(execFile);

// ── Types ───────────────────────────────────────────────────────────

export interface RenderSceneInput {
  id: number;
  video: string; // URL or data URI
  narration?: string;
}

export interface RenderConfig {
  scenes: RenderSceneInput[];
  aspectRatio?: string;
  captions?: boolean;
  music?: string;
  voice?: string;
  language?: string;
  voiceAudios?: Record<number, string>; // data URIs keyed by scene ID
  /** Scene transition: "none" (hard cut) or "crossfade" */
  transition?: string;
  /** Crossfade duration in seconds (default 0.5) */
  transitionDuration?: number;
}

export interface RenderOutput {
  outputPath: string;
  outputBuffer: Buffer;
  tempDir: string;
  totalDuration: number;
  hasVoice: boolean;
  hasMusic: boolean;
  hasCaptions: boolean;
  numScenes: number;
}

// ── Constants ───────────────────────────────────────────────────────

const SCENE_TRANSITION = (process.env.VIDEO_SCENE_TRANSITION || "none").toLowerCase();
const SCENE_TRANSITION_DURATION = parseFloat(process.env.VIDEO_SCENE_TRANSITION_DURATION || "0.5");

// ── Helpers ─────────────────────────────────────────────────────────

async function getDuration(ffmpeg: string, filePath: string): Promise<number> {
  try {
    const { stdout, stderr } = await execFileAsync(ffmpeg, ["-i", filePath], {
      timeout: 10_000,
    }).catch(({ stdout, stderr }) => ({
      stdout: stdout ?? "",
      stderr: stderr ?? "",
    }));
    const output = stdout + stderr;
    const match = output.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
    if (match) {
      const hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const seconds = parseFloat(match[3]);
      return hours * 3600 + minutes * 60 + seconds;
    }
    return 5;
  } catch {
    return 5;
  }
}

function escapeDrawText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'")
    .replace(/%/g, "%%")
    .replace(/\n/g, " ")
    .substring(0, 120);
}

function getScaleFilter(aspectRatio?: string): string {
  if (aspectRatio === "9:16")
    return "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black";
  if (aspectRatio === "16:9")
    return "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black";
  return "scale=1080:1080:force_original_aspect_ratio=decrease,pad=1080:1080:(ow-iw)/2:(oh-ih)/2:color=black";
}

// ── Build filter complex ────────────────────────────────────────────

interface FilterGraphInput {
  inputFiles: string[];
  voiceFiles: (string | undefined)[];
  voiceInputIndices: number[];
  musicInputIdx: number;
  inputArgs: string[];
  sceneDurations: number[];
  transition: string;
  transitionDuration: number;
  aspectRatio?: string;
  captions?: boolean;
  scenes: RenderSceneInput[];
}

interface FilterGraphResult {
  filterComplex: string;
  videoOutputLabel: string;
  audioOutputLabel: string;
}

function buildFilterGraph(config: FilterGraphInput): FilterGraphResult {
  const {
    inputFiles,
    voiceFiles,
    voiceInputIndices,
    musicInputIdx,
    inputArgs,
    sceneDurations,
    transition,
    transitionDuration,
    aspectRatio,
    captions,
    scenes,
  } = config;

  const filterParts: string[] = [];
  const sf = getScaleFilter(aspectRatio);
  const totalDuration = sceneDurations.reduce((a, b) => a + b, 0);
  const numScenes = inputFiles.length;

  // ── VIDEO: crossfade or hard cut ────────────────────────────────
  let videoOutputLabel: string;

  if (transition === "crossfade" && transitionDuration > 0 && numScenes >= 2) {
    // Use xfade filter chain — inputs are individual scene videos (0, 1, 2, ...)
    // Each scene is a separate -i input, not concat.txt
    const effectiveDurs: number[] = [];
    let offset = Math.max(0, sceneDurations[0] - transitionDuration);
    effectiveDurs.push(sceneDurations[0]);

    for (let i = 1; i < numScenes; i++) {
      effectiveDurs.push(sceneDurations[i]);
    }

    filterParts.push(`[0:v]${sf},setsar=1,format=yuv420p[v0]`);

    const fadeLabels: string[] = ["v0"];
    for (let i = 1; i < numScenes; i++) {
      const prevLabel = fadeLabels[i - 1];
      const nextLabel = i === numScenes - 1 ? "vxfade" : `vxf${i}`;
      // offset = cumulative duration of previous scenes minus overlaps
      const offsetVal = Math.max(0, offset);
      filterParts.push(
        `[${prevLabel}][${i}:v]xfade=transition=fade:duration=${transitionDuration}:offset=${offsetVal.toFixed(3)}[${nextLabel}]`
      );
      offset = offsetVal + effectiveDurs[i] - transitionDuration;
      fadeLabels.push(nextLabel);
    }

    // Apply captions on top of the transition result
    videoOutputLabel = "vxfaded";
    filterParts.push(`[vxfade]format=yuv420p[vraw]`);
  } else {
    // Hard cut: use concat demuxer (fast, stream copy compatible)
    // The concat.txt approach: all scenes merged into one stream
    filterParts.push(`[0:v]${sf},setsar=1,format=yuv420p[vraw]`);
    videoOutputLabel = "vraw";
  }

  // ── CAPTIONS ────────────────────────────────────────────────────
  if (captions && scenes.some((s) => s.narration && s.narration.trim())) {
    let cumTime = 0;
    const drawTexts: string[] = [];

    for (let i = 0; i < numScenes; i++) {
      const s = scenes[i];
      if (s.narration && s.narration.trim()) {
        const st = cumTime;
        const et = cumTime + sceneDurations[i];
        const text = escapeDrawText(s.narration);
        drawTexts.push(
          `drawtext=text='${text}':fontcolor=white:fontsize=28:box=1:boxcolor=black@0.6:boxborderw=8:x=(w-text_w)/2:y=h-th-60:enable='between(t,${st.toFixed(2)},${et.toFixed(2)})'`
        );
      }
      // Adjust timing: with crossfade, each subsequent scene starts earlier
      if (transition === "crossfade" && transitionDuration > 0 && i < numScenes - 1) {
        cumTime += sceneDurations[i] - transitionDuration;
      } else {
        cumTime += sceneDurations[i];
      }
    }

    if (drawTexts.length > 0) {
      filterParts.push(`[${videoOutputLabel}]${drawTexts.join(",")}[vout]`);
    } else {
      filterParts.push(`[${videoOutputLabel}]copy[vout]`);
    }
  } else {
    filterParts.push(`[${videoOutputLabel}]copy[vout]`);
  }

  // ── AUDIO: voice + music mixing ─────────────────────────────────
  const audioInputs: string[] = [];

  if (voiceInputIndices.length > 0) {
    let cumDelay = 0;

    for (let i = 0; i < numScenes; i++) {
      if (voiceInputIndices[i] !== undefined) {
        const idx = voiceInputIndices[i];
        const delayMs = Math.round(cumDelay * 1000);
        filterParts.push(
          `[${idx}:a]adelay=${delayMs}|${delayMs},aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=mono[v${i}]`
        );
        audioInputs.push(`[v${i}]`);
      }
      // Adjust delay: with crossfade, scenes overlap
      if (transition === "crossfade" && transitionDuration > 0 && i < numScenes - 1) {
        cumDelay += sceneDurations[i] - transitionDuration;
      } else {
        cumDelay += sceneDurations[i];
      }
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

  return {
    filterComplex: filterParts.join(";"),
    videoOutputLabel: "vout",
    audioOutputLabel: "aout",
  };
}

// ── Main render function ────────────────────────────────────────────

/**
 * Execute the full render pipeline: download scenes, build filter graph,
 * run FFmpeg, return the output path.
 *
 * Caller is responsible for cleanup (tempDir).
 */
export async function executeRender(config: RenderConfig): Promise<RenderOutput> {
  const {
    scenes,
    aspectRatio,
    captions,
    music,
    voiceAudios,
  } = config;

  const transition = config.transition || SCENE_TRANSITION;
  const transitionDuration = config.transitionDuration ?? SCENE_TRANSITION_DURATION;

  // Find FFmpeg
  let ffmpeg: string;
  try {
    const ffmpegStatic = (await import("ffmpeg-static")).default as string | null;
    if (!ffmpegStatic) throw new Error("ffmpeg-static returned null");
    ffmpeg = ffmpegStatic;
  } catch {
    throw new Error("FFmpeg is not available on this server.");
  }

  // Prepare temp directory
  const baseDir = await getTempDir();
  const tempDir = await mkdtemp(join(baseDir, "pat-render-"));

  try {
    // 1. Download scene videos
    const inputFiles: string[] = [];
    const { downloadAsBuffer } = await import("@/lib/blob");

    for (let i = 0; i < scenes.length; i++) {
      const s = scenes[i];
      const buffer = await downloadAsBuffer(s.video);
      if (buffer.length === 0) {
        throw new Error(`Scene ${i + 1} video is empty.`);
      }
      const filePath = join(tempDir, `scene_${String(i + 1).padStart(2, "0")}.mp4`);
      await writeFile(filePath, buffer);
      inputFiles.push(filePath);
    }

    // 2. Write voice audio files
    const voiceFiles: (string | undefined)[] = [];
    if (voiceAudios && typeof voiceAudios === "object") {
      for (let i = 0; i < scenes.length; i++) {
        const s = scenes[i];
        const audioData = voiceAudios[s.id];
        if (audioData) {
          const audioBuffer = await downloadAsBuffer(audioData);
          if (audioBuffer.length > 0) {
            const audioPath = join(tempDir, `voice_${String(i + 1).padStart(2, "0")}.wav`);
            await writeFile(audioPath, audioBuffer);
            voiceFiles[i] = audioPath;
          }
        }
      }
    }

    // 3. Get durations
    const sceneDurations: number[] = [];
    for (const f of inputFiles) {
      sceneDurations.push(await getDuration(ffmpeg, f));
    }
    const totalDuration = sceneDurations.reduce((a, b) => a + b, 0);

    // 4. Generate music if requested
    let musicPath: string | null = null;
    let musicInputIdx = -1;
    if (music && music !== "None") {
      musicPath = join(tempDir, "music.wav");
      const presets: Record<string, { freq: string; vol: string }> = {
        Ambient: { freq: "220", vol: "0.03" },
        Cinematic: { freq: "165", vol: "0.04" },
        Emotional: { freq: "262", vol: "0.035" },
      };
      const p = presets[music] || presets.Ambient;
      await execFileAsync(ffmpeg, [
        "-y",
        "-f", "lavfi",
        "-i", `sine=frequency=${p.freq}:duration=${totalDuration + 2}:sample_rate=44100`,
        "-af", `volume=${p.vol},afade=t=in:st=0:d=2,afade=t=out:st=${Math.max(0, totalDuration - 2)}:d=2`,
        "-ar", "44100",
        "-ac", "1",
        musicPath,
      ], { timeout: 60_000 });
    }

    // 5. Build input arguments and filter graph
    const inputArgs: string[] = [];
    let inputIdx = 0;

    if (transition === "crossfade" && transitionDuration > 0 && inputFiles.length >= 2) {
      // Individual video inputs for xfade
      for (const f of inputFiles) {
        inputArgs.push("-i", f);
        inputIdx++;
      }
    } else {
      // Concat demuxer for hard cut (fast)
      const concatPath = join(tempDir, "concat.txt");
      const concatContent = inputFiles
        .map((f) => `file '${f.replace(/\\\\/g, "/").replace(/'/g, "'\\''")}'`)
        .join("\n");
      await writeFile(concatPath, concatContent, "utf-8");
      inputArgs.push("-f", "concat", "-safe", "0", "-i", concatPath);
      inputIdx = 1; // concat counts as input 0
    }

    // Voice inputs
    const voiceInputIndices: number[] = [];
    for (let i = 0; i < scenes.length; i++) {
      const voiceFile = voiceFiles[i];
      if (voiceFile) {
        inputArgs.push("-i", voiceFile);
        voiceInputIndices[i] = inputIdx;
        inputIdx++;
      }
    }

    // Music input
    if (musicPath) {
      inputArgs.push("-i", musicPath);
      musicInputIdx = inputIdx;
      inputIdx++;
    }

    const { filterComplex } = buildFilterGraph({
      inputFiles,
      voiceFiles,
      voiceInputIndices,
      musicInputIdx,
      inputArgs,
      sceneDurations,
      transition,
      transitionDuration,
      aspectRatio,
      captions,
      scenes,
    });

    // 6. Run FFmpeg
    const outputPath = join(tempDir, "final.mp4");

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
      timeout: 600_000,
      maxBuffer: 100 * 1024 * 1024,
    });

    // 7. Validate output and clean up
    const outputBuffer = await readFile(outputPath);
    if (outputBuffer.length === 0) {
      throw new Error("FFmpeg produced an empty output file.");
    }

    // Clean up temp dir now that we have the output buffer
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch {
      // Best-effort
    }

    return {
      outputPath,
      outputBuffer,
      tempDir,
      totalDuration,
      hasVoice: voiceInputIndices.length > 0,
      hasMusic: musicInputIdx >= 0,
      hasCaptions: !!captions,
      numScenes: scenes.length,
    };
  } catch (error) {
    // Clean up temp dir on error
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch {
      // Best-effort
    }
    throw error;
  }
  // On success, callers must clean up tempDir after reading outputPath.
  // The RenderOutput includes tempDir for this purpose.
}
