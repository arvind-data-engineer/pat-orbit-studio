/**
 * Local Voice Provider
 *
 * Generates voice audio without external API keys. Supports:
 * 1. edge-tts (Microsoft Edge TTS — free, no API key, high quality)
 * 2. Fallback: returns a silent audio placeholder
 *
 * edge-tts requires: pip install edge-tts
 * It connects to Microsoft Edge's free TTS service (no API key needed).
 */

import type { VoiceGenerationRequest, VoiceProvider, ProviderStatus } from "./types";

// ── Voice Mapping ───────────────────────────────────────────────────

// edge-tts voice IDs
const VOICE_MAP: Record<string, string> = {
  Natural: "en-US-GuyNeural",
  Deep: "en-US-ChristopherNeural",
  Soft: "en-US-JennyNeural",
  "en-US": "en-US-GuyNeural",
  "hi-IN": "hi-IN-MadhurNeural",
  "en-GB": "en-GB-RyanNeural",
};

// ── edge-tts Integration ────────────────────────────────────────────

async function callEdgeTTS(
  text: string,
  voice: string,
  langCode: string,
): Promise<string | null> {
  try {
    // Use edge-tts via a small helper script
    // edge-tts is a Python package: pip install edge-tts
    const { execFile } = await import("child_process");
    const { promisify } = await import("util");
    const execFileAsync = promisify(execFile);
    const { join } = await import("path");
    const { tmpdir } = await import("os");
    const { readFile, unlink, mkdir } = await import("fs/promises");

    const outputFile = join(tmpdir(), `patorbit-tts-${Date.now()}.mp3`);

    // Resolve voice name
    const voiceId = VOICE_MAP[voice] || VOICE_MAP[langCode] || "en-US-GuyNeural";

    // Try edge-tts Python command (python -m edge_tts)
    try {
      await execFileAsync("python", ["-m", "edge_tts",
        "--voice", voiceId,
        "--text", text,
        "--write-media", outputFile,
      ], { timeout: 30_000 });

      const audioBuffer = await readFile(outputFile);
      const base64 = audioBuffer.toString("base64");
      await unlink(outputFile).catch(() => {});
      return `data:audio/mpeg;base64,${base64}`;
    } catch {
      // edge-tts not installed or failed
      await unlink(outputFile).catch(() => {});
      return null;
    }
  } catch {
    return null;
  }
}

// ── Fallback: Silent Audio ──────────────────────────────────────────

function generateSilentAudio(durationSeconds = 3): string {
  // Generate a minimal silent WAV file
  const sampleRate = 22050;
  const numSamples = sampleRate * durationSeconds;
  const dataSize = numSamples * 2; // 16-bit mono
  const fileSize = 44 + dataSize;

  const buffer = Buffer.alloc(fileSize);

  // WAV header
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(fileSize - 8, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16); // fmt chunk size
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  // All zeros = silence

  const base64 = buffer.toString("base64");
  return `data:audio/wav;base64,${base64}`;
}

// ── Main Provider ───────────────────────────────────────────────────

class LocalVoiceProvider implements VoiceProvider {
  readonly name = "Local Voice Generator";
  readonly requiresApiKey = false;

  async generateVoice(request: VoiceGenerationRequest): Promise<{
    audio: string;
    mimeType: string;
    voice: string;
  }> {
    const text = request.narration?.trim();
    if (!text) {
      throw new Error("Narration text is required.");
    }

    const voiceName = request.voicePlan?.voice || request.voice || "Natural";
    const langCode = request.language || "en-US";

    console.log(`[LocalVoice] Generating voice: voice=${voiceName}, lang=${langCode}`);

    // Try edge-tts
    const edgeAudio = await callEdgeTTS(text, voiceName, langCode);
    if (edgeAudio) {
      console.log("[LocalVoice] Voice generated via edge-tts");
      return {
        audio: edgeAudio,
        mimeType: "audio/mpeg",
        voice: voiceName,
      };
    }

    // Fall back to silent audio placeholder
    console.log("[LocalVoice] edge-tts not available, generating silent placeholder");
    const silentDuration = Math.max(3, Math.min(30, text.length * 0.08));
    return {
      audio: generateSilentAudio(silentDuration),
      mimeType: "audio/wav",
      voice: "placeholder",
    };
  }
}

export async function checkLocalVoiceHealth(): Promise<ProviderStatus> {
  try {
    const { execFile } = await import("child_process");
    const { promisify } = await import("util");
    const execFileAsync = promisify(execFile);
    await execFileAsync("python", ["-m", "edge_tts", "--version"], { timeout: 5_000 });
    return { available: true, name: "edge-tts (installed)" };
  } catch {
    return {
      available: false,
      name: "edge-tts",
      error: "Not installed (install: pip install edge-tts)",
    };
  }
}

export const localVoiceProvider: VoiceProvider = new LocalVoiceProvider();
export default localVoiceProvider;
