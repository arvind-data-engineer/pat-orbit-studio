# PAT Orbit — Pre-GPU Upgrade Roadmap

> **Date:** September 1, 2026
> **Current State:** Commit efce139 — architecture verified stable
> **Hardware:** RTX 3050 6GB, 16GB RAM, Windows
> **Goal:** Maximize production readiness before GPU upgrade

---

## Current Architecture Summary

```
User Input
    ↓
AI Director → ProductionPlan (5 scenes, characters, camera, motion, continuity)
    ↓
Scene Image Generation (Gemini 2.5 Flash Image)
    ↓
Video Generation (Gemini Veo OR Local SVD)
    ↓
Voice Generation (Gemini TTS)
    ↓
Final Render (FFmpeg: video concat + voice + music + captions)
    ↓
Blob Upload → Frontend Display
```

### What Already Works ✅

| Component | Status | Notes |
|-----------|--------|-------|
| AI Director | ✅ Working | Generates structured ProductionPlan with continuity |
| Image Generation | ✅ Working | Gemini 2.5 Flash with character/camera/motion guidance |
| Veo Cloud Video | ✅ Working | Full Director metadata flow |
| Local SVD Video | ✅ Working | Image-to-video with multi-clip + FFmpeg concat |
| Voice Generation | ✅ Working | Gemini TTS with Director voice plan |
| Final Render | ✅ Working | FFmpeg: video + voice + music + captions |
| Engine Registry | ✅ Working | Unified VIDEO_ENGINE selection |
| VideoConditioning | ✅ Working | Model-agnostic intermediate representation |
| PromptBuilder | ✅ Working | Director → model-ready prompts |
| Shared generateVideo() | ✅ Working | Eliminates duplicate code |
| GPU Lock | ✅ Working | One generation at a time |
| Progress Tracking | ✅ Working | Clip 1/N, Clip 2/N, etc. |
| MP4 Validation | ✅ Working | ftyp box check |
| Input Validation | ✅ Working | Image/prompt/aspect-ratio checks |
| Job State (Redis) | ✅ Working | createJob, getJob, updateJob |
| Blob Upload | ✅ Working | Scene videos + final video |
| Frontend UX | ✅ Working | Scene editor, generation controls, project management |
| SVD Continuity | ✅ Implemented | Last-frame extraction for clip-to-clip |
| SVD Seed Control | ✅ Implemented | Deterministic `42 + clip_index` |
| SVD Quality Presets | ✅ Implemented | preview/production/quality |

---

## Remaining Weaknesses

### CRITICAL BUGS (Must Fix)

| # | Issue | File | Impact | Fix Complexity |
|---|-------|------|--------|----------------|
| 1 | **`extract_last_frame_from_frames` uses `Image.fromarray` without importing `Image`** | server.py:320 | Continuity extraction crashes with `NameError` — multi-clip continuity is broken | Low — add `from PIL import Image` |
| 2 | **Inngest `getDuration` uses ffprobe args with ffmpeg binary** | functions.ts:303 | Always returns 5s default — render audio sync is wrong | Low — use ffprobe-static or ffmpeg duration parsing |
| 3 | **Version string inconsistency** — FastAPI "3.0.0" vs startup log "v2.0" | server.py:1013 | Cosmetic but confusing | Trivial |

### HIGH PRIORITY (Should Fix)

| # | Issue | Impact | Fix Complexity |
|---|-------|--------|----------------|
| 4 | **No audio-video sync in render** — voice is laid over video without duration matching | Voice may be longer/shorter than video | Medium |
| 5 | **SVD clips are independent even with continuity** — no transition effects between clips | Visible discontinuity between clips | Medium |
| 6 | **No frame interpolation** — SVD outputs 7 FPS, looks choppy | Low perceived quality | High (needs RIFE or similar) |
| 7 | **No retry on OOM** — single OOM kills the entire job | Wasted GPU time on transient failures | Medium |
| 8 | **Temp files on C: drive** — generated clips use `tempfile.gettempdir()` which is C: | C: disk fills up | Low — configure TEMP to D: |
| 9 | **Local server runs as foreground process** — killed when terminal closes | Must restart manually | Medium — create a service wrapper |

### MEDIUM PRIORITY (Nice to Have)

| # | Issue | Impact | Fix Complexity |
|---|-------|--------|----------------|
| 10 | **No transition effects between scenes** — hard cuts only | Less professional output | High |
| 11 | **Music is a simple sine tone** — not real music | Low quality audio | High (needs music generation) |
| 12 | **No monitoring/alerting** — failures are silent | Hard to debug in production | Medium |
| 13 | **No rate limiting on API routes** — potential abuse | Security concern | Low |
| 14 | **Frontend doesn't show estimated time** — user sees "this may take several minutes" | Poor UX | Medium |

### LOW PRIORITY (Future)

| # | Issue | Impact | Fix Complexity |
|---|-------|--------|----------------|
| 15 | **No progress persistence** — if server restarts, in-progress jobs are lost | Must regenerate | High |
| 16 | **No scene-to-scene continuity** — each scene is independent | Characters look different between scenes | High |
| 17 | **No watermark/logo** — output has no branding | No IP protection | Low |
| 18 | **No export formats** — only MP4 | Limited compatibility | Low |

---

## Recommended Implementation Order

### Phase 1: Fix Critical Bugs (1-2 hours)

**Why first:** These are real bugs that break existing functionality.

1. Fix `extract_last_frame_from_frames` — add missing `Image` import
2. Fix Inngest `getDuration` — use correct ffprobe path
3. Fix version string inconsistency

**Risk:** Low — minimal code changes
**Benefit:** Continuity works, render sync is correct

### Phase 2: SVD Quality Improvements (4-8 hours)

**Why next:** Biggest impact on local video quality.

1. Add frame interpolation (RIFE) — 7 FPS → 24/30 FPS
2. Add crossfade transitions between SVD clips
3. Add OOM retry with reduced settings
4. Configure TEMP to D: drive
5. Create server startup script

**Risk:** Medium — new dependencies
**Benefit:** Visibly smoother, more professional output

### Phase 3: Render Pipeline Hardening (2-4 hours)

**Why now:** After SVD is improved, make the render reliable.

1. Fix audio-video sync in FFmpeg render
2. Add scene transition effects (crossfade, fade-to-black)
3. Add proper error recovery for FFmpeg failures
4. Add temp file cleanup verification

**Risk:** Low — incremental changes
**Benefit:** Reliable final output

### Phase 4: Frontend UX Improvements (4-8 hours)

**Why later:** Focus on backend quality first.

1. Show estimated generation time based on config
2. Show per-clip progress with timing
3. Add video preview in workspace
4. Improve error messages for long-running operations
5. Add generation history/cost tracking

**Risk:** Low — UI only
**Benefit:** Better user experience

### Phase 5: Production Deployment (2-4 hours)

**Why last:** Must be stable before deploying.

1. Create server startup/management script
2. Add health monitoring
3. Add logging/observability
4. Document deployment process
5. Create Docker/PM2 configuration

**Risk:** Medium — operational changes
**Benefit:** Reliable production operation

---

## What Can Be Completed Without GPU Upgrade

| Item | Can Do Now? | Notes |
|------|------------|-------|
| Fix critical bugs | ✅ Yes | Pure code fixes |
| Frame interpolation (RIFE) | ✅ Yes | CPU-compatible, no GPU needed |
| Crossfade transitions | ✅ Yes | FFmpeg filters |
| OOM retry | ✅ Yes | Retry with reduced settings |
| Render sync | ✅ Yes | FFmpeg filter complex |
| Frontend UX | ✅ Yes | UI improvements |
| Deployment scripts | ✅ Yes | Server management |
| Monitoring | ✅ Yes | Logging/alerting |
| Scene continuity | ⚠️ Partial | Can improve but limited by SVD quality |
| Frame interpolation quality | ⚠️ Partial | RIFE is decent but not perfect |
| Higher resolution | ❌ No | Needs 12GB+ VRAM |
| Wan 2.2 TI2V | ❌ No | Needs 12GB+ VRAM |
| Real music generation | ❌ No | Needs cloud API or local model |
| 4K output | ❌ No | Needs more VRAM |

---

## What Should Wait for Wan 2.2 (12GB+ GPU)

| Item | Why Wait | Expected Benefit |
|------|----------|-----------------|
| Text-to-video from prompt | Wan 2.2 native T2V | Director metadata directly controls video |
| Image-to-video + text | Wan 2.2 native I2V+T2V | Both image and text conditioning |
| Higher resolution | More VRAM = higher res | 720p instead of 480p |
| Longer clips | More VRAM = more frames | 5s clips instead of 2s |
| Faster generation | No CPU offload needed | 5-15 min instead of 40 min |
| Better motion quality | Larger model = better motion | More natural movement |
| Character consistency | Text conditioning helps | Maintain appearance across scenes |

---

## SVD Performance Profile (RTX 3050 6GB)

| Config | Frames | Steps | Time/Clip | Duration | Quality | Use Case |
|--------|--------|-------|-----------|----------|---------|----------|
| preview | 8 | 3 | ~6 min | 1.14s | Low | Testing/development |
| production | 14 | 10 | ~20 min | 2.0s | Good | **Recommended default** |
| quality | 14 | 20 | ~40 min | 2.0s | Best | When time permits |

**Key constraint:** CPU offload adds ~124s per denoising step regardless of frame count. The bottleneck is GPU↔CPU memory transfer, not computation.

---

## Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| RIFE installation fails | Medium | No frame interpolation | Fallback to existing 7 FPS |
| FFmpeg concat breaks | Low | Render fails | Already has re-encode fallback |
| SVD model update breaks API | Low | Generation fails | Pin diffusers version |
| Temp files fill C: drive | Medium | Disk full error | Configure TEMP to D: |
| Server crashes during long job | Medium | Job lost | Add job persistence |
| Gemini API changes | Low | Video/image gen fails | Already has error handling |

---

## Expected Benefits

| Improvement | Before | After | Impact |
|-------------|--------|-------|--------|
| Fix critical bugs | Broken continuity, wrong render sync | Working continuity, correct sync | **High** |
| Frame interpolation | 7 FPS (choppy) | 24 FPS (smooth) | **High** |
| Crossfade transitions | Hard cuts | Smooth transitions | **Medium** |
| OOM retry | Single failure kills job | Automatic recovery | **Medium** |
| Render audio sync | Voice may be wrong length | Correct sync | **High** |
| Frontend UX | "This may take several minutes" | Actual ETA + per-clip timing | **Medium** |
| Deployment | Manual process | Automated startup | **Medium** |

---

## Files That Need Changes

| File | Changes Needed | Priority |
|------|---------------|----------|
| `src/lib/video/engines/server.py` | Fix Image import, version string, TEMP config, OOM retry | Critical |
| `src/inngest/functions.ts` | Fix getDuration ffprobe bug | Critical |
| `src/app/page.tsx` | Add estimated time display, per-clip timing | Medium |
| `docs/local-video-engine.md` | Update with measured results | Low |
| `docs/pre-gpu-roadmap.md` | This document | Done |

## Files That Should NOT Change

| File | Reason |
|------|--------|
| `src/lib/video/types.ts` | Architecture verified stable |
| `src/lib/video/engine.ts` | Registry verified working |
| `src/lib/video/conditioning.ts` | Abstraction verified correct |
| `src/lib/video/prompt-builder.ts` | Prompt building verified working |
| `src/lib/video/generate.ts` | Shared service verified working |
| `src/app/api/generate-video/route.ts` | Veo path verified working |
| `src/app/api/jobs/video/route.ts` | Job creation verified working |
| `src/lib/ai/director-schema.ts` | Director types verified correct |
| `src/lib/ai/director.ts` | Director logic verified working |
| `src/app/api/generate-image/route.ts` | Image gen verified working |
| `src/app/api/generate-voice/route.ts` | Voice gen verified working |

---

## Summary

**Current state:** PAT Orbit has a solid architecture with a working end-to-end pipeline. The main weaknesses are in SVD quality (7 FPS, 2s clips, ~40 min generation) and a few real bugs in the render pipeline.

**Priority actions:**
1. Fix 3 critical bugs (1-2 hours)
2. Add frame interpolation + transitions (4-8 hours)
3. Harden render pipeline (2-4 hours)
4. Improve frontend UX (4-8 hours)

**What a GPU upgrade unlocks:**
- Wan 2.2 TI2V-5B: text+image → video with Director metadata
- 5-10× faster generation
- 720p resolution
- 5s clips
- Better motion quality
- Character consistency via text conditioning

**The architecture is ready.** When a 12GB+ GPU arrives, adding Wan 2.2 is a matter of creating one new engine adapter — the conditioning layer, prompt builder, and generation service are all model-agnostic and waiting for it.
