# PAT Orbit — Future Wan 2.2 TI2V-5B Integration Plan

**Status:** Design only — NOT implemented  
**Prerequisite:** 12GB+ VRAM GPU  
**Model:** Wan 2.2 Text+Image-to-Video 5B  

---

## Why Wan 2.2?

| Feature | SVD-XT 1.1 (Current) | Wan 2.2 TI2V-5B |
|---------|----------------------|------------------|
| Input | Image only | Text + Image |
| VRAM | ~6GB (with offload) | ~12GB+ |
| Resolution | 1024×576 | 1280×720 |
| Clip length | ~2s (14 frames) | ~5s+ |
| Quality | Good | Better |
| Speed (RTX 3050) | ~4 min/clip | N/A (needs GPU) |
| Text conditioning | No | Yes |
| Camera control | No | Yes (via text prompt) |

---

## What Already Works for Wan 2.2

The current architecture is designed for this upgrade:

### VideoConditioning
```typescript
interface VideoConditioning {
  prompt: string;           // ← Wan 2.2 uses this directly
  negativePrompt?: string;  // ← Wan 2.2 supports this
  image?: string;           // ← Wan 2.2 uses as I2V reference
  camera?: DirectorCamera;  // ← Translated to text prompt
  motion?: DirectorMotion;  // ← Translated to text prompt
  characters?: Character[]; // ← Included in prompt
  duration?: number;        // ← Controls clip length
  fps?: number;             // ← Output FPS
  width?: number;           // ← Output resolution
  height?: number;          // ← Output resolution
  seed?: number;            // ← Deterministic generation
}
```

### PromptBuilder
Already translates Director metadata into structured text prompts.
For Wan 2.2, the same PromptBuilder output becomes the text input.

### Engine Capabilities
```typescript
// SVD capabilities (current)
supportsTextToVideo: false
supportsImageToVideo: true
supportsTextConditioning: false

// Wan 2.2 capabilities (future)
supportsTextToVideo: true
supportsImageToVideo: true
supportsTextConditioning: true
```

### Engine Registry
```typescript
// Already supports multiple engines
registerEngine("svd", localSVDEngine);
registerEngine("wan22", wan22Engine);  // Future
```

---

## What Needs to Be Implemented

### 1. New Engine Adapter: `src/lib/video/engines/wan22.ts`
- Implement VideoEngine interface
- Send VideoConditioning to Python server
- Handle progress polling
- Handle multi-clip generation

### 2. New Python Server: `src/lib/video/engines/server_wan22.py`
- Load Wan 2.2 model (requires ~12GB VRAM)
- Accept text + image conditioning
- Generate video clips
- Support GPU locking
- Support OOM handling
- Return progress updates
- Validate output MP4

### 3. Prompt Enhancement
- Translate Director camera/motion/continuity into Wan 2.2 text prompt
- Include character descriptions
- Handle negative prompts for quality

### 4. Configuration
```env
VIDEO_ENGINE=wan22
WAN_MODEL_PATH=D:\AI\models\wan2.2-ti2v-5b
WAN_DTYPE=fp16
WAN_ENABLE_CPU_OFFLOAD=false  # Not needed with 12GB+
```

### 5. Fallback Logic
```
if VIDEO_ENGINE=wan22 and GPU unavailable:
    → fall back to local (SVD)
    → warn user
```

---

## Integration Points

### page.tsx (No Changes Needed)
The frontend already handles:
- Scene generation states
- Progress display
- Engine selection via VIDEO_ENGINE

### Inngest Functions (No Changes Needed)
Already uses:
```typescript
const localResult = await generateVideo({ ... });
```
This routes to whatever engine is active.

### Render Pipeline (No Changes Needed)
Already handles any MP4 output regardless of source engine.

---

## Migration Steps (When GPU Is Ready)

1. Install Wan 2.2 model to `D:\AI\models\`
2. Create `server_wan22.py` based on `server.py`
3. Create `wan22.ts` adapter
4. Register in `engine.ts`
5. Set `VIDEO_ENGINE=wan22`
6. Test text+image → video generation
7. Test multi-clip generation
8. Test render pipeline
9. Update documentation

---

## Expected Performance (Estimated, Not Measured)

| Metric | SVD-XT (RTX 3050) | Wan 2.2 (RTX 4070+) |
|--------|-------------------|---------------------|
| Generation time | ~4 min/clip | ~30s/clip (est.) |
| Clip duration | ~2s | ~5s (est.) |
| Resolution | 1024×576 | 1280×720 (est.) |
| Quality | Good | Better (est.) |
| Text control | None | Full (est.) |

**Note:** These are rough estimates. Actual performance depends on GPU model, VRAM, and system configuration.
