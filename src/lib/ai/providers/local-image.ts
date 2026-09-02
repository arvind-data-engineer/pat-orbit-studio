/**
 * Local Image Provider
 *
 * Generates images without external APIs. Supports:
 * 1. ComfyUI integration (if running locally)
 * 2. User-uploaded images (pass-through)
 * 3. SVG placeholder generation (always works, no dependencies)
 *
 * For ComfyUI: sends the prompt to a local ComfyUI instance
 * running Stable Diffusion or FLUX.
 */

import type { ImageGenerationRequest, ImageProvider, ProviderStatus } from "./types";
import { getAIConfig } from "./config";

// ── ComfyUI Integration ─────────────────────────────────────────────

async function callComfyUI(prompt: string): Promise<string | null> {
  const config = getAIConfig();
  const url = config.localImageUrl;

  try {
    // Check if ComfyUI is available
    const healthCheck = await fetch(`${url}/system_stats`, {
      signal: AbortSignal.timeout(3_000),
    });

    if (!healthCheck.ok) return null;

    // Queue a prompt (ComfyUI API)
    const workflow = buildDefaultWorkflow(prompt);
    const response = await fetch(`${url}/prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: workflow }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      console.error(`[LocalImage] ComfyUI returned ${response.status}`);
      return null;
    }

    const data = await response.json() as { prompt_id: string };
    if (!data.prompt_id) return null;

    // Poll for completion (max 120 seconds)
    const imageUrl = await pollComfyUIResult(url, data.prompt_id);
    return imageUrl;
  } catch {
    return null;
  }
}

async function pollComfyUIResult(
  serverUrl: string,
  promptId: string,
  maxPolls = 24,
): Promise<string | null> {
  for (let i = 0; i < maxPolls; i++) {
    await new Promise((r) => setTimeout(r, 5_000));

    try {
      const response = await fetch(`${serverUrl}/history/${promptId}`, {
        signal: AbortSignal.timeout(5_000),
      });

      if (!response.ok) continue;

      const data = await response.json() as Record<string, unknown>;
      const result = data[promptId] as { outputs?: Record<string, unknown> } | undefined;

      if (!result?.outputs) continue;

      // Find the first image output
      const outputs = result.outputs;
      for (const nodeId of Object.keys(outputs)) {
        const output = outputs[nodeId] as { images?: Array<{ filename: string; subfolder: string; type: string }> };
        if (output.images && output.images.length > 0) {
          const img = output.images[0];
          const imgUrl = `${serverUrl}/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder)}&type=${img.type}`;

          // Fetch and convert to data URI
          const imgResponse = await fetch(imgUrl);
          if (imgResponse.ok) {
            const blob = await imgResponse.blob();
            const buffer = Buffer.from(await blob.arrayBuffer());
            const base64 = buffer.toString("base64");
            return `data:image/png;base64,${base64}`;
          }
        }
      }
    } catch {
      continue;
    }
  }

  return null;
}

function buildDefaultWorkflow(prompt: string): Record<string, unknown> {
  // Minimal ComfyUI workflow for Stable Diffusion XL
  return {
    "3": {
      class_type: "KSampler",
      inputs: {
        seed: Math.floor(Math.random() * 999999999),
        steps: 25,
        cfg: 7.5,
        sampler_name: "euler",
        scheduler: "normal",
        denoise: 1.0,
        model: ["4", 0],
        positive: ["6", 0],
        negative: ["7", 0],
        latent_image: ["5", 0],
      },
    },
    "4": {
      class_type: "CheckpointLoaderSimple",
      inputs: { ckpt_name: "sd_xl_base_1.0.safetensors" },
    },
    "5": {
      class_type: "EmptyLatentImage",
      inputs: { width: 1024, height: 576, batch_size: 1 },
    },
    "6": {
      class_type: "CLIPTextEncode",
      inputs: { text: prompt, clip: ["4", 1] },
    },
    "7": {
      class_type: "CLIPTextEncode",
      inputs: {
        text: "blurry, low quality, distorted, deformed",
        clip: ["4", 1],
      },
    },
    "8": {
      class_type: "VAEDecode",
      inputs: { samples: ["3", 0], vae: ["4", 2] },
    },
    "9": {
      class_type: "SaveImage",
      inputs: { filename_prefix: "patorbit", images: ["8", 0] },
    },
  };
}

// ── Placeholder Generator ───────────────────────────────────────────

function generatePlaceholderImage(
  prompt: string,
  sceneTitle?: string,
  width = 1024,
  height = 576,
): string {
  // Generate a minimal valid PNG with a cinematic dark gradient.
  // We create a raw 1024x576 RGB buffer and encode as PNG manually.
  // This produces a real raster image compatible with SVD.
  const { deflateSync } = require("zlib") as typeof import("zlib");

  // Generate deterministic color from prompt
  let hash = 0;
  for (let i = 0; i < prompt.length; i++) {
    hash = ((hash << 5) - hash + prompt.charCodeAt(i)) | 0;
  }
  const baseR = 15 + Math.abs(hash % 20);
  const baseG = 12 + Math.abs((hash >> 4) % 18);
  const baseB = 25 + Math.abs((hash >> 8) % 25);

  // Build raw RGB image data (no filter bytes for simplicity)
  const rowSize = width * 3;
  const rawData = Buffer.alloc(height * (1 + rowSize)); // +1 per row for filter byte

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (1 + rowSize);
    rawData[rowOffset] = 0; // filter: None

    // Gradient: darker at top/bottom, slightly lighter in center
    const yFactor = 1 - Math.abs((y / height - 0.5) * 2);
    const brightness = 0.4 + yFactor * 0.6;

    for (let x = 0; x < width; x++) {
      const pixOffset = rowOffset + 1 + x * 3;
      // Slight horizontal variation for cinematic feel
      const xFactor = 0.85 + 0.15 * Math.sin((x / width) * Math.PI);
      rawData[pixOffset] = Math.round(baseR * brightness * xFactor);
      rawData[pixOffset + 1] = Math.round(baseG * brightness * xFactor);
      rawData[pixOffset + 2] = Math.round(baseB * brightness * xFactor);
    }
  }

  const compressed = deflateSync(rawData);

  // Build PNG file
  const chunks: Buffer[] = [];

  // PNG signature
  chunks.push(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  chunks.push(makeChunk("IHDR", ihdr));

  // IDAT chunk
  chunks.push(makeChunk("IDAT", compressed));

  // IEND chunk
  chunks.push(makeChunk("IEND", Buffer.alloc(0)));

  const pngBuffer = Buffer.concat(chunks);
  const base64 = pngBuffer.toString("base64");
  return `data:image/png;base64,${base64}`;
}

function makeChunk(type: string, data: Buffer): Buffer {
  const { createHash } = require("crypto") as typeof import("crypto");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, "ascii");
  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcData), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// ── Main Provider ───────────────────────────────────────────────────

class LocalImageProvider implements ImageProvider {
  readonly name = "Local Image Generator";
  readonly requiresApiKey = false;

  async generateImage(request: ImageGenerationRequest): Promise<string> {
    console.log("[LocalImage] Generating image for:", request.sceneTitle || "Scene");

    // Build enhanced prompt
    let enhancedPrompt = request.prompt;
    if (request.style) {
      enhancedPrompt += ` Style: ${request.style}.`;
    }
    if (request.camera) {
      const camParts: string[] = [];
      if (request.camera.shotType) camParts.push(request.camera.shotType + " shot");
      if (request.camera.angle) camParts.push(request.camera.angle + " angle");
      if (camParts.length > 0) enhancedPrompt += ` Camera: ${camParts.join(", ")}.`;
    }

    // Try ComfyUI first
    const comfyImage = await callComfyUI(enhancedPrompt);
    if (comfyImage) {
      console.log("[LocalImage] Image generated via ComfyUI");
      return comfyImage;
    }

    // Fall back to placeholder
    console.log("[LocalImage] ComfyUI not available, generating placeholder frame");
    return generatePlaceholderImage(enhancedPrompt, request.sceneTitle);
  }
}

export async function checkLocalImageHealth(): Promise<ProviderStatus> {
  const config = getAIConfig();
  try {
    const response = await fetch(`${config.localImageUrl}/system_stats`, {
      signal: AbortSignal.timeout(3_000),
    });
    if (response.ok) {
      return { available: true, name: "ComfyUI (connected)" };
    }
    return { available: false, name: "ComfyUI", error: `Server returned ${response.status}` };
  } catch {
    return {
      available: false,
      name: "Placeholder Generator",
      error: "ComfyUI not running (using SVG placeholder)",
    };
  }
}

export const localImageProvider: ImageProvider = new LocalImageProvider();
export default localImageProvider;
