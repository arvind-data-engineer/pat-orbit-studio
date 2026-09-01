# PAT Orbit — Video Engine Architecture Audit & Model Evaluation

> **Date:** September 1, 2026
> **Scope:** Full architecture audit, model-agnostic conditioning design, open-source model evaluation
> **Status:** FINDINGS ONLY — no code changes in this phase

---

## PHASE 1 — ARCHITECTURE AUDIT

### 1. Engine Registration (engine.ts)

**Finding:** The engine registry (`Map<string, VideoEngine>` + `registerEngine`/`setActiveEngine`) is **never actually used** by the application.

In practice, engine selection is done via ad-hoc helper functions:

```typescript
// engine.ts — used in practice
export function useLocalEngine(): boolean {
  return (process.env.VIDEO_ENGINE || "veo").toLowerCase() === "local";
}
export function useWan21Engine(): boolean {
  return (process.env.VIDEO_ENGINE || "veo").toLowerCase() === "wan21";
}
```

These are consumed in two separate places with **duplicated logic**:
- `src/app/api/generate-video/route.ts` — has its own `useLocalEngine()` / `useWan21Engine()` checks
- `src/inngest/functions.ts` — uses `getActiveEngine()` (the only place using the registry)

**Impact:** Adding a new engine requires modifying BOTH files. The registry abstraction is unused dead code.

### 2. Duplicate Code Paths (generate-video/route.ts vs inngest/functions.ts)

**Critical finding:** There are TWO completely separate video generation paths:

| Path | Used By | Polls Locally | Uploads to Blob |
|------|---------|---------------|-----------------|
| `generate-video/route.ts` | `page.tsx` (direct) | Yes (240 polls × 5s) | Yes |
| `inngest/functions.ts` | `page.tsx` (via jobs/video) | Yes (240 polls × 5s) | Yes |

Both paths independently:
- Import the local engine adapter
- Build VideoGenerationRequest
- Poll for completion
- Handle errors
- Upload to Blob

**Impact:** Bug fixes must be applied twice. Risk of inconsistency.

### 3. Director Metadata Flow

Director metadata (camera, motion, continuity, characters) flows through:

```
page.tsx → /api/jobs/video → Inngest → local.ts → server.py
```

But SVD is **image-conditioned only** — it ignores all text/metadata. The data is stored but unused.

For Wan 2.1, the adapter concatenates camera + motion into the text prompt. For a future TI2V model, the metadata should feed into both image conditioning AND text conditioning.

**Impact:** No current model properly uses all Director data. Need a proper conditioning layer.

### 4. VideoEngine Interface Assessment

The current `VideoGenerationRequest` in `types.ts`:

```typescript
export interface VideoGenerationRequest {
  prompt: string;           // ✅ Used by Wan (T2V), stored by SVD (I2V)
  image?: string;           // ✅ Used by SVD (I2V), ignored by Wan (T2V)
  camera?: { ... };         // ⚠️ Stored, partially used for prompt building
  motion?: { ... };         // ⚠️ Stored, partially used for prompt building
  characters?: Array<...>;  // ⚠️ Stored, partially used for prompt building
  continuity?: { ... };     // ⚠️ Stored, not used by local engines
  duration?: number;        // ✅ Used correctly for multi-clip
  aspectRatio?: string;     // ✅ Passed through
  sceneId?: number|string;  // ✅ Used for tracking
  sceneTitle?: string;      // ✅ Used for logging
}
```

**Missing from the interface:**
- `style` / `visualStyle` — needed for prompt building
- `negativePrompt` — needed by some models
- `seed` — needed for reproducibility
- `quality` preset — needed for preview vs production
- `fps` — needed for configurable frame rate
- `width` / `height` — currently hardcoded in server
- `directorBeat` — scene emotional beat (not the same as `motion.intensity`)

**Impact:** Current interface works but needs extension for future models.

### 5. Python Server Architecture

`server.py` (SVD) is production-quality:
- GPU lock ✅
- Input validation ✅
- MP4 validation ✅
- Multi-clip + FFmpeg concat ✅
- Duration trimming ✅
- Progress reporting ✅
- OOM handling ✅
- Quality presets ✅
- Health diagnostics ✅

`server_wan21.py` is incomplete/experimental:
- No GPU lock ⚠️
- No input validation ⚠️
- No MP4 validation ⚠️
- No multi-clip ⚠️
- No progress reporting ⚠️
- No OOM retry strategy ⚠️
- Never tested successfully on RTX 3050 6GB ❌

**Impact:** Wan 2.1 server needs significant work before production use.

### 6. Architectural Problems Summary

| Problem | Severity | Impact |
|---------|----------|--------|
| Engine registry unused | Medium | Adding engines requires touching multiple files |
| Duplicate code paths (route vs Inngest) | High | Bug fixes must be applied twice |
| No VideoConditioning abstraction | High | Prompt building duplicated across adapters |
| Director metadata unused by local engines | Medium | Camera/motion/continuity wasted on SVD |
| Wan 2.1 server incomplete | Low | Not in production path anyway |
| No shared Python server base class | Medium | Server rewrite for each new model |
| Progress field piggybacks on error field | Low | Already partially fixed |
| No negativePrompt in request type | Low | Only affects T2V models |

---

## PHASE 2 — MODEL-AGNOSTIC CONDITIONING LAYER

### Design: VideoConditioning

A shared internal representation that sits between the Director and any video engine:

```typescript
// src/lib/video/conditioning.ts (proposed)

export interface VideoConditioning {
  // ── Core ──────────────────────────────────────
  /** Natural language description of the scene */
  prompt: string;
  /** Negative prompt for models that support it */
  negativePrompt?: string;

  // ── Image Input ───────────────────────────────
  /** Reference image (data URI) — required for I2V, unused for T2V */
  image?: string;

  // ── Director Plans ────────────────────────────
  camera?: {
    shotType: string;
    angle: string;
    movement: string;
    framing: string;
  };
  motion?: {
    subjectMovement: string;
    environmentMovement: string;
    intensity: "subtle" | "moderate" | "dramatic";
  };
  characters?: Array<{
    name: string;
    appearance?: string;
    role?: string;
  }>;
  continuity?: {
    characters: Array<{ name: string; appearance: string }>;
    location: string;
    timeOfDay: string;
    weather: string;
    importantObjects: string[];
  };

  // ── Scene Metadata ────────────────────────────
  beat?: string;           // emotional beat
  style?: string;          // visual style (cinematic, cartoon, anime...)
  visualPrompt?: string;   // AI Director's visual plan for image generation

  // ── Output Configuration ──────────────────────
  duration: number;        // target duration in seconds
  aspectRatio: string;     // "16:9", "9:16", "1:1"
  fps?: number;            // output frame rate
  width?: number;          // output width
  height?: number;         // output height
  quality?: "draft" | "preview" | "production";
  seed?: number;           // for reproducibility

  // ── Tracking ──────────────────────────────────
  sceneId?: number | string;
  sceneTitle?: string;
}
```

### Design: Prompt Builder

Each engine adapter converts `VideoConditioning` into its model-specific input:

```typescript
// src/lib/video/prompt-builder.ts (proposed)

/** Build a text prompt for a T2V model from Director conditioning */
export function buildTextPrompt(c: VideoConditioning): string { ... }

/** Extract the image for an I2V model from conditioning */
export function extractImageInput(c: VideoConditioning): string | null { ... }

/** Build negative prompt for models that support it */
export function buildNegativePrompt(c: VideoConditioning): string { ... }
```

### Design: Engine Adapter Pattern

Each new engine follows this pattern:

```
src/lib/video/engines/<engine>.ts      — TypeScript adapter (VideoEngine interface)
src/lib/video/engines/server_<engine>.py — Python inference server
```

The adapter's job is ONLY:
1. Receive `VideoGenerationRequest` from PAT Orbit
2. Convert to `VideoConditioning`
3. Convert `VideoConditioning` → engine-specific HTTP payload
4. Forward to Python server
5. Convert response back to `VideoJobStatusResult`

---

## PHASE 3 — MODEL EVALUATION

### Current Baseline: SVD-XT 1.1

| Metric | Value |
|--------|-------|
| Model | `stabilityai/stable-video-diffusion-img2vid-xt` |
| Parameters | ~2.4B |
| Type | Image-to-video ONLY |
| License | Stability AI Community |
| RTX 3050 6GB | ✅ Works (CPU offload) |
| Per-clip time (RTX 3050) | **~3.5 min** (warm, 14 frames, 20 steps) |
| Output | 1024×576, 7 fps, ~2 seconds |
| Quality | Decent motion, limited temporal coherence |
| Text prompt | ❌ Not supported |
| Multi-clip | ✅ Implemented |
| Production status | **Working and deployed** |

### Candidate Comparison

| Model | I2V | T2V | 6GB VRAM | 12GB VRAM | Quality | License | Duration | Status |
|-------|-----|-----|----------|-----------|---------|---------|----------|--------|
| **SVD-XT 1.1** | ✅ | ❌ | ✅ Proven | ✅ | ★★☆☆ | Stability | 2s/clip | **Current** |
| **Wan 2.1 1.3B** | ❌ | ✅ | ⚠️ RAM issue | ✅ | ★★★☆ | Apache 2.0 | 5s | **Tested, failed on 16GB RAM** |
| **Wan 2.2 TI2V-5B** | ✅ | ✅ | ❌ Need 8GB+ | ✅ | ★★★★ | Apache 2.0 | 5s | **Target for 12GB GPU** |
| **Wan 2.2 14B GGUF** | ❌ | ✅ | ⚠️ Very slow | ✅ | ★★★★★ | Apache 2.0 | 5s | **Flagship, needs 12GB+** |
| **LTX-Video 2B** | ✅ | ✅ | ❌ | ⚠️ Tight | ★★★☆ | Apache 2.0 | 3s | Not viable for 6GB |
| **CogVideoX 5B** | ✅ | ✅ | ⚠️ Slow | ✅ | ★★★☆ | Apache 2.0 | 10s | Possible but inferior |
| **HunyuanVideo 1.5** | ⚠️ | ✅ | ❌ | ❌ | ★★★★★ | Tencent | 5s | Needs 14GB+ |

### Detailed Analysis of Top Candidates

#### 1. SVD-XT 1.1 (Current — Keep as Fallback)

- **Pros:** Proven working. Image-conditioned. Works on 6GB. Production-ready server.
- **Cons:** No text prompt. Only 2 seconds per clip. Very slow on CPU offload.
- **Verdict:** KEEP. Reliable fallback. Do not remove.

#### 2. Wan 2.1 T2V-1.3B

- **Tested on RTX 3050 6GB:** ❌ FAILED
  - Model downloaded successfully (19 files, ~5GB)
  - Loading failed with Windows pagefile error 1455
  - Root cause: 16GB RAM with only 4GB free — model needs ~5GB RAM for T5 encoder + model weights
- **What would fix it:** 32GB RAM OR 32GB+ pagefile OR close all applications before loading
- **Text-to-video only:** Cannot use generated scene images as input
- **Quality:** Better motion than SVD but T2V-only makes it unsuitable for PAT Orbit's image-first workflow
- **Verdict:** NOT RECOMMENDED as primary engine. T2V-only is a fundamental mismatch with PAT Orbit's I2V pipeline.

#### 3. Wan 2.2 TI2V-5B ⭐ RECOMMENDED NEXT ENGINE

- **Why:** Native image+text → video. Apache 2.0. The ideal engine for PAT Orbit's Director pipeline.
- **Hardware needed:** 12GB+ VRAM (RTX 3060 12GB minimum for practical use)
- **Estimated speed on 12GB:** 5-15 minutes per 4s clip at 480p
- **Key advantage:** Camera, motion, continuity, characters all feed directly into text conditioning alongside the scene image
- **Verdict:** The TARGET engine. Implement when GPU is upgraded to 12GB+.

#### 4. CogVideoX 5B I2V

- **Why considered:** Native I2V. Apache 2.0. Works on 5-8GB with optimization.
- **Drawback:** Older architecture, slower than Wan, less community support, quality below Wan 2.2
- **Verdict:** BACKUP option if Wan 2.2 doesn't fit hardware.

### Recommendations

#### For Current Hardware (RTX 3050 6GB, 16GB RAM)

| Priority | Engine | Action |
|----------|--------|--------|
| 1 | SVD-XT 1.1 | **Keep as primary**. Already working. |
| 2 | Wan 2.1 1.3B | **Do not implement**. T2V-only doesn't match I2V pipeline. Failed on 16GB RAM. |
| 3 | Architecture | **Refactor** — clean up engine registry, add VideoConditioning, eliminate duplicate code. |
| 4 | Wan 2.2 TI2V-5B | **Prepare architecture** for easy swap when 12GB GPU is available. |

#### For Next Hardware Upgrade (RTX 3060 12GB)

| Priority | Engine | Action |
|----------|--------|--------|
| 1 | Wan 2.2 TI2V-5B | **Implement as primary engine**. Native I2V + text. Apache 2.0. |
| 2 | SVD-XT 1.1 | **Keep as fallback** for when GPU is unavailable. |

### Hardware Upgrade Recommendation

| GPU | Cost (used) | What It Unlocks |
|-----|------------|-----------------|
| RTX 3060 12GB | ~$150-200 | Wan 2.2 TI2V-5B (native I2V), 5-15 min/clip at 480p |
| RTX 4060 Ti 16GB | ~$350 | Wan 2.2 TI2V-5B fast, Wan 14B GGUF at 720p |
| RTX 4090 24GB | ~$1500 | Wan 2.2 14B FP8, 720p, 1-2 min/clip |

**Best value:** RTX 3060 12GB — unlocks the ideal engine for PAT Orbit.

---

## PHASE 4 — RECOMMENDED IMPLEMENTATION PLAN

Given the audit findings, here is the recommended order of work:

### Step 1: Clean Up Engine Architecture (No GPU changes needed)

1. **Unify engine selection** — Replace `useLocalEngine()`/`useWan21Engine()` with the registry
2. **Remove duplicate code** — Merge `generate-video/route.ts` polling into Inngest only
3. **Add `VideoConditioning` type** — Model-agnostic intermediate representation
4. **Add prompt builder** — Shared function for Director → text prompt conversion
5. **Extend `VideoGenerationRequest`** — Add `style`, `negativePrompt`, `seed`, `quality`, `beat`
6. **Clean up Wan 2.1 code** — Mark as experimental, disable by default, no GPU lock/polling

### Step 2: Improve SVD Server (Current engine improvements)

1. Add **configurable resolution per request** (not just env vars)
2. Add **seed control** for reproducible clips
3. Improve **clip-to-clip continuity** (use last frame of clip N-1 as first frame of clip N)
4. Add **frame interpolation** option (RIFE) for 7fps → 24fps

### Step 3: Prepare for Wan 2.2 TI2V-5B (When 12GB GPU available)

1. Create `server_wan22.py` — Based on `server.py` patterns (GPU lock, validation, multi-clip)
2. Create `engines/wan22.ts` — TypeScript adapter using VideoConditioning
3. Register as `VIDEO_ENGINE=wan22`
4. Feed Director camera/motion/continuity into text conditioning
5. Use scene image as I2V conditioning

### Step 4: Production Hardening

1. Server health monitoring in PAT Orbit UI
2. Automatic engine fallback (try wan22 → fall back to local → fall back to Veo)
3. Generation queue visualization
4. Cost estimation (local = free, Veo = per-generation)

---

## DECISION POINT

**Immediate recommendation:** Do NOT add a new video model now. The RTX 3050 6GB is the bottleneck.

Instead, focus on:
1. **Architecture cleanup** — This directly enables faster future engine additions
2. **SVD improvements** — Better clips from the existing engine
3. **Save for GPU upgrade** — RTX 3060 12GB unlocks Wan 2.2 TI2V-5B

The current SVD engine generates 2-second clips at ~4 min each. For a 5-scene story with 4-second scenes, that's ~40 minutes of generation — slow but functional.

**When you have 12GB VRAM, implement Wan 2.2 TI2V-5B.** It will produce dramatically better results and properly use the Director metadata (camera, motion, continuity, characters).

---

## FILES IN AUDIT

| File | Status | Notes |
|------|--------|-------|
| `src/lib/video/types.ts` | ✅ Good | Needs extension for conditioning |
| `src/lib/video/engine.ts` | ⚠️ Unused registry | Needs refactor |
| `src/lib/video/engines/local.ts` | ✅ Good | Production-ready SVD adapter |
| `src/lib/video/engines/wan21.ts` | ⚠️ Experimental | Never tested on RTX 3050 |
| `src/lib/video/engines/server.py` | ✅ Excellent | Production-quality SVD server |
| `src/lib/video/engines/server_wan21.py` | ⚠️ Incomplete | Missing validation, GPU lock, multi-clip |
| `src/inngest/functions.ts` | ✅ Good | Uses engine registry correctly |
| `src/app/api/generate-video/route.ts` | ⚠️ Duplicate | Duplicates Inngest logic |
| `src/app/api/jobs/video/route.ts` | ✅ Good | Clean job creation |
| `src/lib/ai/director-schema.ts` | ✅ Good | Complete Director types |
| `docs/local-video-engine.md` | ✅ Good | Updated documentation |
| `docs/video-model-benchmark.md` | ✅ Good | Model comparison |
| `docs/wan21-local-engine.md` | ✅ Good | Documents failed test |
