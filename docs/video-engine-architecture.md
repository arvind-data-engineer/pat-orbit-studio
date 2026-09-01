# PAT Orbit — Video Engine Architecture

> **Version:** 3.0 (September 2026)
> **Status:** Refactored — unified engine registry, shared generation service, model-agnostic conditioning

## Architecture Diagram

```
PAT Orbit UI (page.tsx)
     │
     ▼
Video Job (POST /api/jobs/video → Redis → Inngest)
     │
     ▼
Shared Generation Service (src/lib/video/generate.ts)
     │
     ▼
VideoConditioning (src/lib/video/conditioning.ts)
     │
     ├──→ PromptBuilder (src/lib/video/prompt-builder.ts)
     │         │
     │         ▼
     │    Text prompt for T2V models
     │
     ▼
VideoEngine Registry (src/lib/video/engine.ts)
     │
     ├──→ local (SVD-XT 1.1)     ──→ Python server (server.py)
     ├──→ wan21 (Wan 2.1 T2V)    ──→ Python server (server_wan21.py)
     └──→ veo (Gemini/Veo cloud)  ──→ Google API
              │
              ▼
         Video Result
              │
              ▼
         Vercel Blob Upload
```

## New Files (v3.0)

| File | Purpose |
|------|---------|
| `src/lib/video/conditioning.ts` | `VideoConditioning` type + `buildConditioning()` factory |
| `src/lib/video/prompt-builder.ts` | `buildTextPrompt()`, `buildVeoPrompt()`, `buildNegativePrompt()` |
| `src/lib/video/generate.ts` | `generateVideo()` — shared generation service |

## Updated Files (v3.0)

| File | Change |
|------|--------|
| `src/lib/video/types.ts` | Added `EngineCapabilities` interface, extended `VideoEngine` with `capabilities?()` |
| `src/lib/video/engine.ts` | Unified registry — removed `useLocalEngine()`/`useWan21Engine()`, auto-registers engines |
| `src/lib/video/engines/local.ts` | Added `capabilities()` returning SVD-specific capabilities |
| `src/lib/video/engines/wan21.ts` | Added `capabilities()` returning Wan 2.1-specific capabilities |
| `src/app/api/generate-video/route.ts` | Thin orchestration — delegates to `generateVideo()` for local, handles Veo directly |
| `src/inngest/functions.ts` | Thin orchestration — delegates to `generateVideo()` for local, handles Veo directly |

## Key Design Decisions

### 1. Unified Engine Registry

Before: `useLocalEngine()` and `useWan21Engine()` were separate functions checked independently.
After: `getActiveEngine()` reads `VIDEO_ENGINE` env var and returns the registered engine.

```typescript
// Before (ad-hoc)
if (useLocalEngine()) { /* SVD path */ }
if (useWan21Engine()) { /* Wan path */ }

// After (registry)
const engine = getActiveEngine(); // Returns VideoEngine or null for Veo
```

### 2. VideoConditioning

A model-agnostic intermediate representation of Director instructions:

```typescript
interface VideoConditioning {
  prompt: string;
  negativePrompt?: string;
  image?: string;            // I2V only
  camera?: ConditioningCamera;
  motion?: ConditioningMotion;
  characters?: ConditioningCharacter[];
  continuity?: ConditioningContinuity;
  beat?: string;
  style?: string;
  duration: number;
  aspectRatio: string;
  // ... more fields
}
```

Flow: `Director → VideoConditioning → PromptBuilder → VideoEngine`

### 3. Shared Generation Service

`generateVideo()` in `src/lib/video/generate.ts` owns the common flow:
1. Resolve active engine
2. Build VideoConditioning
3. Call engine.generate()
4. Poll until completed or failed
5. Upload to Blob if needed
6. Return consistent result

Both the API route and Inngest function call this single function.

### 4. Engine Capabilities

Each engine describes what it supports:

```typescript
// SVD-XT
{
  supportsTextToVideo: false,
  supportsImageToVideo: true,
  supportsTextConditioning: false,
  supportsMultiClip: true,
  displayName: "SVD-XT 1.1 (Local)"
}

// Wan 2.2 TI2V (future)
{
  supportsTextToVideo: true,
  supportsImageToVideo: true,
  supportsTextConditioning: true,
  supportsMultiClip: true,
  displayName: "Wan 2.2 TI2V-5B"
}
```

### 5. Veo Path Preserved

Veo (cloud) returns `null` from `getActiveEngine()`. The shared service returns `__VEO__` so the caller handles it with the Gemini API directly. This preserves the existing Veo behavior exactly.

## Adding a New Engine

1. Create `src/lib/video/engines/<name>.ts` implementing `VideoEngine`
2. Create `src/lib/video/engines/server_<name>.py` for local inference
3. Import and register in `engine.ts`:
   ```typescript
   import { newEngine } from "./engines/<name>";
   registerEngine("<name>", newEngine);
   ```
4. Set `VIDEO_ENGINE=<name>` in `.env.local`

That's it. The shared service, conditioning layer, and prompt builder handle the rest.

## Prompt Building

### For T2V models (Wan 2.1, future T2V):

```
Camera: dolly-in shot, tracking framing.
Motion: Subject: walking forward. Intensity: moderate.
Characters: Alex: brown hair, blue jacket (Explorer).
Continuity: Location: forest. Time: sunset.
Visual style: cinematic.
Emotional beat: tension.
```

### For I2V models (SVD):

The image is the primary input. The text prompt is stored but not consumed by SVD.

### For Veo (cloud):

```
Characters: Alex - Appearance: brown hair, blue jacket - Role: Explorer.

Title: The Discovery.

Scene: Camera slowly dollies in on Alex entering the glowing forest...

Camera direction: dolly-in shot, tracking framing.

Motion direction: Subject: walking forward. Intensity: moderate.

Continuity (preserve from previous scene): Location: forest entrance. Time: sunset.
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VIDEO_ENGINE` | `veo` | Engine: `veo`, `local`, `wan21` |
| `LOCAL_VIDEO_ENGINE_URL` | `http://localhost:8000` | SVD server URL |
| `WAN21_ENGINE_URL` | `http://localhost:8001` | Wan 2.1 server URL |

## Current Engines

| Engine | VIDEO_ENGINE | Type | Image | Text | Status |
|--------|-------------|------|-------|------|--------|
| Veo | `veo` | Cloud | ✅ | ✅ | Production |
| SVD-XT 1.1 | `local` | Local I2V | ✅ | ❌ | Production |
| Wan 2.1 T2V | `wan21` | Local T2V | ❌ | ✅ | Experimental |
| Wan 2.2 TI2V | (future) | Local I2V+T2V | ✅ | ✅ | Planned |
