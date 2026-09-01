/**
 * PAT Orbit Video Engine — Prompt Builder
 *
 * Converts Director metadata (VideoConditioning) into model-ready prompts.
 *
 * Two primary use cases:
 *   1. T2V models (Wan 2.1, Wan 2.2 T2V): build a text prompt from conditioning
 *   2. I2V models (SVD, Wan 2.2 TI2V): extract the image, use optional text
 *
 * For Veo (cloud): builds the enhanced prompt with character/camera/motion/continuity
 * For local engines: builds the text prompt that the adapter forwards to the server
 *
 * The Director metadata should NOT be concatenated blindly.
 * Each section is structured and labeled for clarity.
 */

import type {
  VideoConditioning,
  ConditioningCamera,
  ConditioningMotion,
  ConditioningContinuity,
  ConditioningCharacter,
} from "./conditioning";

// ── Text Prompt Builder ─────────────────────────────────────────────

/**
 * Build a text prompt from VideoConditioning for T2V or text-conditioned models.
 *
 * Output is a structured prompt with labeled sections:
 *   [Scene description]
 *   Camera: [camera direction]
 *   Motion: [motion direction]
 *   Characters: [character descriptions]
 *   Continuity: [continuity constraints]
 *   Style: [visual style]
 *   Beat: [emotional beat]
 *
 * For I2V models (SVD), the image is the primary input and this prompt
 * is optional — but still preserved for future engines that support both.
 */
export function buildTextPrompt(conditioning: VideoConditioning): string {
  const parts: string[] = [];

  // 1. Core scene description
  const base = (conditioning.prompt || "").trim();
  if (base) {
    parts.push(base);
  }

  // 2. Camera direction
  const cameraText = formatCamera(conditioning.camera);
  if (cameraText) {
    parts.push(`Camera: ${cameraText}.`);
  }

  // 3. Motion direction
  const motionText = formatMotion(conditioning.motion);
  if (motionText) {
    parts.push(`Motion: ${motionText}.`);
  }

  // 4. Characters
  const charText = formatCharacters(conditioning.characters);
  if (charText) {
    parts.push(`Characters: ${charText}.`);
  }

  // 5. Continuity
  const continuityText = formatContinuity(conditioning.continuity);
  if (continuityText) {
    parts.push(`Continuity: ${continuityText}.`);
  }

  // 6. Visual style
  if (conditioning.style && conditioning.style.trim()) {
    parts.push(`Visual style: ${conditioning.style.trim()}.`);
  }

  // 7. Emotional beat
  if (conditioning.beat && conditioning.beat.trim()) {
    parts.push(`Emotional beat: ${conditioning.beat.trim()}.`);
  }

  return parts.join("\n\n");
}

/**
 * Build a negative prompt for models that support it (T2V models).
 * Returns undefined for I2V models that don't use negative prompts.
 */
export function buildNegativePrompt(
  _conditioning: VideoConditioning
): string | undefined {
  return "blurry, low quality, distorted, watermark, text overlay, static image, artifacts";
}

/**
 * Extract the image input from conditioning.
 * Returns the data URI if present, undefined otherwise.
 */
export function extractImageInput(
  conditioning: VideoConditioning
): string | undefined {
  return conditioning.image || undefined;
}

// ── Veo Prompt Builder ──────────────────────────────────────────────

/**
 * Build an enhanced prompt specifically for Veo (cloud API).
 * This matches the existing behavior in functions.ts and generate-video/route.ts
 * but centralizes it in one place.
 */
export function buildVeoPrompt(conditioning: VideoConditioning): string {
  const parts: string[] = [];
  const base = (conditioning.prompt || "").trim();

  // Characters prefix
  if (conditioning.characters && conditioning.characters.length > 0) {
    const sceneChars = conditioning.characters.filter((c) => c.name?.trim());
    if (sceneChars.length > 0) {
      const charDesc = sceneChars.map((c) => {
        const cparts = [c.name];
        if (c.appearance?.trim()) cparts.push(`Appearance: ${c.appearance.trim()}`);
        if (c.role?.trim()) cparts.push(`Role: ${c.role.trim()}`);
        return cparts.join(" - ");
      });
      parts.push(`Characters: ${charDesc.join("; ")}.`);
    }
  }

  // Title
  if (conditioning.sceneTitle) {
    parts.push(`Title: ${conditioning.sceneTitle}.`);
  }

  // Scene
  parts.push(`Scene: ${base || "A cinematic scene"}.`);

  // Camera direction
  const cameraText = formatCamera(conditioning.camera);
  if (cameraText) {
    parts.push(`\nCamera direction: ${cameraText}.`);
  }

  // Motion direction
  const motionText = formatMotion(conditioning.motion);
  if (motionText) {
    parts.push(`\nMotion direction: ${motionText}.`);
  }

  // Continuity
  const continuityText = formatContinuity(conditioning.continuity);
  if (continuityText) {
    parts.push(`\nContinuity (preserve from previous scene): ${continuityText}.`);
  }

  return parts.join("\n");
}

// ── Formatting Helpers ──────────────────────────────────────────────

function formatCamera(camera?: ConditioningCamera): string {
  if (!camera) return "";
  const parts: string[] = [];
  if (camera.shotType) parts.push(`${camera.shotType} shot`);
  if (camera.angle && camera.angle !== "eye-level") parts.push(`${camera.angle} angle`);
  if (camera.movement && camera.movement !== "static") parts.push(`${camera.movement} camera movement`);
  if (camera.framing) parts.push(`${camera.framing} framing`);
  return parts.join(", ");
}

function formatMotion(motion?: ConditioningMotion): string {
  if (!motion) return "";
  const parts: string[] = [];
  if (motion.subjectMovement && motion.subjectMovement !== "none") {
    parts.push(`Subject: ${motion.subjectMovement}`);
  }
  if (motion.environmentMovement && motion.environmentMovement !== "none") {
    parts.push(`Environment: ${motion.environmentMovement}`);
  }
  if (motion.intensity && motion.intensity !== "subtle") {
    parts.push(`Intensity: ${motion.intensity}`);
  }
  return parts.join(". ");
}

function formatCharacters(characters?: ConditioningCharacter[]): string {
  if (!characters || characters.length === 0) return "";
  return characters
    .filter((c) => c.name?.trim())
    .map((c) => {
      const parts = [c.name];
      if (c.appearance?.trim()) parts.push(c.appearance.trim());
      if (c.role?.trim()) parts.push(`(${c.role.trim()})`);
      return parts.join(": ");
    })
    .join("; ");
}

function formatContinuity(continuity?: ConditioningContinuity): string {
  if (!continuity) return "";
  const parts: string[] = [];
  if (continuity.location) parts.push(`Location: ${continuity.location}`);
  if (continuity.timeOfDay) parts.push(`Time: ${continuity.timeOfDay}`);
  if (continuity.weather && continuity.weather !== "clear") parts.push(`Weather: ${continuity.weather}`);
  if (continuity.characters.length > 0) {
    const charStates = continuity.characters
      .map((c) => `${c.name}: ${c.appearance}`)
      .join("; ");
    parts.push(`Character appearance: ${charStates}`);
  }
  if (continuity.importantObjects.length > 0) {
    parts.push(`Important objects: ${continuity.importantObjects.join(", ")}`);
  }
  return parts.join(". ");
}
