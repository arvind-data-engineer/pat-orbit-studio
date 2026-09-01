# PAT Orbit — Product Polish Audit & Roadmap

**Date:** September 1, 2026  
**Baseline:** Commit 2ca2ea9 → Current  
**Hardware:** RTX 3050 6GB, 16GB RAM  

---

## Architecture Status

### Core Pipeline (Stable ✅)
- VideoEngine unified registry
- VideoConditioning abstraction
- PromptBuilder for Director → model prompts
- Shared generateVideo() service
- Shared render-pipeline.ts / executeRender()
- SVD local engine on RTX 3050 6GB
- Multi-clip SVD generation
- Scene-level crossfade transitions
- Veo cloud path (untouched)
- Inngest job processing
- Redis job state
- Vercel Blob uploads
- Project auto-save / import / export
- Generation time estimator
- Storage abstraction

### What Works Well ✅
1. Story generation → Director → scene creation
2. Per-scene image generation
3. Per-scene video generation (SVD local + Veo cloud)
4. Per-scene voice generation (Gemini TTS)
5. Multi-clip SVD with FFmpeg concatenation
6. Scene-level crossfade transitions
7. Final video render with audio mixing
8. Project save/load with auto-save
9. Project import/export as JSON
10. Keyboard shortcuts (Ctrl+S, arrow keys)
11. Character consistency system
12. Director metadata flow
13. Engine registry with capabilities

---

## Bugs Found & Fixed

### This Session

| # | Bug | Severity | Fix |
|---|-----|----------|-----|
| 1 | Project completion hardcoded to `>= 5` scenes — breaks projects with fewer scenes | HIGH | Changed to use actual scene count |
| 2 | No voice generation deduplication — rapid clicks waste Gemini API calls | MEDIUM | Added guard: `if (voiceStatus[sceneId] === 'generating') return` |
| 3 | No image generation deduplication guard | MEDIUM | Added guard: `if (sceneStatus[sceneId] === "image") return` |
| 4 | Render pipeline uses system tmpdir instead of `VIDEO_TEMP_DIR` | MEDIUM | Added `getTempDir()` that respects `VIDEO_TEMP_DIR` env var |
| 5 | Render pipeline doesn't clean up temp dir on success — disk leak | MEDIUM | Added temp dir cleanup after reading output buffer; return buffer in RenderOutput |
| 6 | Inngest render function reads file from disk after pipeline validated it — redundant I/O | LOW | Pipeline now returns `outputBuffer` directly, callers use it |
| 7 | Render progress shows fake stage labels based on polling attempts | LOW | Updated stages: Downloading → Mixing → Encoding → Finalizing |
| 8 | Progress dots show exactly 5 regardless of scene count | LOW | Changed to `Math.min(sceneCount, 10)` |

### Previously Fixed (Noted)
| # | Bug | Status |
|---|-----|--------|
| 1 | `extract_last_frame_from_frames` missing PIL import | Fixed |
| 2 | Inngest `getDuration` passes ffprobe args to ffmpeg | Fixed |
| 3 | `_get_temp_dir()` infinite recursion | Fixed |
| 4 | `extract_last_frame_from_video` missing PIL import | Fixed |
| 5 | render-video/route.ts same getDuration bug | Fixed |
| 6 | Local server bound to 0.0.0.0 | Fixed → 127.0.0.1 |

---

## Remaining Weaknesses

### CRITICAL (Requires GPU Upgrade)
1. SVD is slow (~4 min per short clip at production settings)
2. SVD produces only ~2s clips — multi-clip bridges this but adds time
3. No text-to-video capability (SVD is image-to-video only)
4. No character consistency across clips
5. No Wan 2.2 support (needs 12GB+ VRAM)

### HIGH (Fixable Without GPU)
1. Music is sine tones — needs real music generation
2. Voice audio stored as base64 data URIs in React state
3. localStorage 5MB limit — large projects may exceed this
4. No scene transitions between separate scenes (only within multi-clip)
5. No retry on failed voice generation
6. Render progress is approximate, not real

### MEDIUM
1. No IndexedDB (localStorage abstraction ready for migration)
2. No WebSocket for real-time render progress
3. No cost tracking for API usage
4. Auto-save fires on every state change — could be more selective
5. `export default function Home()` is one ~2800-line component
6. No scene-level video preview in timeline
7. No undo/redo

### LOW
1. No ARIA labels on many interactive elements
2. No mobile gesture support for scene reordering
3. No keyboard shortcut for render
4. No batch generation (generate all images at once)
5. No project tagging/filtering by creation date

---

## Implementation Priorities

### Phase 1: Reliability (DONE ✅)
- Fixed project completion detection
- Added generation deduplication
- Fixed render temp file cleanup
- Fixed render pipeline to use VIDEO_TEMP_DIR

### Phase 2: Next High-Value Fixes
1. Add retry for failed voice generation
2. Improve render progress with real stage data from server
3. Add batch "Generate All" for images
4. Add batch "Generate All" for voice
5. Scene deletion with confirmation
6. Better error messages for common failures

### Phase 3: Production Polish
1. IndexedDB migration for large projects
2. Voice audio → Blob/object URL
3. Scene-level transitions between scenes
4. Crossfade between scene videos in render
5. Better empty states

### Phase 4: Future (Requires GPU Upgrade)
1. Wan 2.2 TI2V-5B integration
2. Higher resolution (720p+)
3. Longer clips (5s+ without multi-clip)
4. Faster generation
5. Character consistency via text conditioning
6. RIFE frame interpolation for real-time quality

---

## Environment Variables

| Variable | Values | Default | Purpose |
|----------|--------|---------|---------|
| `VIDEO_ENGINE` | `veo`, `local` | `veo` | Active video engine |
| `VIDEO_FRAMES` | 8-14 | 14 | SVD frame count |
| `VIDEO_STEPS` | 3-25 | 20 | SVD denoising steps |
| `VIDEO_FPS` | 7-30 | 7 | Output FPS |
| `VIDEO_WIDTH` | pixels | 1024 | Output width |
| `VIDEO_HEIGHT` | pixels | 576 | Output height |
| `VIDEO_QUALITY` | `preview`, `production` | `production` | Quality preset |
| `VIDEO_INTERPOLATION` | `none`, `ffmpeg` | `none` | Frame interpolation |
| `VIDEO_TARGET_FPS` | 24, 30 | 24 | Target FPS when interpolating |
| `VIDEO_TRANSITION` | `none`, `crossfade` | `none` | Clip-level transitions |
| `VIDEO_TRANSITION_DURATION` | seconds | 0.5 | Clip transition duration |
| `VIDEO_SCENE_TRANSITION` | `none`, `crossfade` | `none` | Scene-level transitions |
| `VIDEO_SCENE_TRANSITION_DURATION` | seconds | 0.5 | Scene transition duration |
| `VIDEO_OOM_RETRY` | `true`, `false` | `true` | Retry once on OOM |
| `VIDEO_TEMP_DIR` | path | system temp | Temp file location |
| `VIDEO_ENGINE_HOST` | hostname | 127.0.0.1 | Server bind address |
| `VIDEO_ENGINE_PORT` | port | 8090 | Server port |
| `VIDEO_SEED` | integer | random | Deterministic seed |
| `HF_HOME` | path | ~/.cache/huggingface | HuggingFace cache |
| `VIDEO_CACHE_DIR` | path | ~/.cache/video | Video cache |

---

## File Map

| File | Purpose |
|------|---------|
| `src/app/page.tsx` | Main UI (~2800 lines) |
| `src/lib/storage.ts` | Project persistence abstraction |
| `src/lib/project-serialization.ts` | Import/export |
| `src/lib/generation-estimator.ts` | Time estimation |
| `src/lib/video/engine.ts` | Engine registry |
| `src/lib/video/types.ts` | Type definitions |
| `src/lib/video/conditioning.ts` | VideoConditioning |
| `src/lib/video/prompt-builder.ts` | Director → prompt |
| `src/lib/video/generate.ts` | Shared generation service |
| `src/lib/video/render-pipeline.ts` | Shared render pipeline |
| `src/lib/video/engines/local.ts` | SVD adapter |
| `src/lib/video/engines/server.py` | Python SVD server |
| `src/inngest/functions.ts` | Background jobs |
| `src/app/api/generate-video/route.ts` | Video generation API |
| `src/app/api/render-video/route.ts` | Render API |
| `src/app/api/jobs/video/route.ts` | Video job API |
| `src/app/api/jobs/render/route.ts` | Render job API |
