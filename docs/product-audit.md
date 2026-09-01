# PAT Orbit — Complete Product Audit

> **Date:** September 1, 2026
> **Commit:** 3a27765
> **Hardware:** RTX 3050 6GB, 16GB RAM, Windows

---

## Architecture Overview

```
User Input (story idea + characters)
    ↓
AI Director (Gemini 2.5 Flash) → ProductionPlan (5 scenes, characters, camera, motion, continuity)
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

### Component Map

| Component | File(s) | Status |
|-----------|---------|--------|
| AI Director | `src/lib/ai/director.ts` | ✅ Working |
| Director Schema | `src/lib/ai/director-schema.ts` | ✅ Working |
| Regeneration Planner | `src/lib/ai/regeneration.ts` | ✅ Working |
| Story Generation API | `src/app/api/generate-story/route.ts` | ✅ Working |
| Image Generation API | `src/app/api/generate-image/route.ts` | ✅ Working |
| Voice Generation API | `src/app/api/generate-voice/route.ts` | ✅ Working |
| Video Generation API | `src/app/api/generate-video/route.ts` | ✅ Working |
| Video Job API | `src/app/api/jobs/video/route.ts` | ✅ Working |
| Render Job API | `src/app/api/jobs/render/route.ts` | ✅ Working |
| Render Video API | `src/app/api/render-video/route.ts` | ⚠️ Bug |
| Inngest Functions | `src/inngest/functions.ts` | ✅ Fixed (3a27765) |
| VideoEngine Registry | `src/lib/video/engine.ts` | ✅ Working |
| VideoConditioning | `src/lib/video/conditioning.ts` | ✅ Working |
| PromptBuilder | `src/lib/video/prompt-builder.ts` | ✅ Working |
| Shared Generation Service | `src/lib/video/generate.ts` | ✅ Working |
| SVD Local Engine | `src/lib/video/engines/local.ts` | ✅ Working |
| SVD Python Server | `src/lib/video/engines/server.py` | ✅ Working (v3.0.0) |
| Wan 2.1 Engine (disabled) | `src/lib/video/engines/wan21.ts` | ⚠️ Experimental |
| Wan 2.1 Server (disabled) | `src/lib/video/engines/server_wan21.py` | ⚠️ Experimental |
| Redis Job Store | `src/lib/jobs.ts` | ✅ Working |
| Blob Upload | `src/lib/blob.ts` | ✅ Working |
| Inngest Client | `src/lib/inngest.ts` | ✅ Working |
| Frontend | `src/app/page.tsx` | ✅ Working |

---

## CRITICAL Bugs

### C1: `render-video/route.ts` has the same getDuration bug (DUPLICATE of #2)

**File:** `src/app/api/render-video/route.ts`, line 133
**Bug:** Passes ffprobe args (`-show_entries`, `-of csv=p=0`) to the ffmpeg binary.
**Impact:** All video durations in the synchronous render route default to 5 seconds. This means audio/video sync is wrong for the synchronous render path (separate from the Inngest render path).
**Status:** Was fixed in `inngest/functions.ts` (commit 3a27765) but **NOT** in `render-video/route.ts`.

### C2: Progress stored in `error` field

**Files:** `src/inngest/functions.ts` line 54, `src/app/page.tsx` line 957
**Bug:** `updateJob(jobId, { status: "processing", error: progress })` writes "Clip 1/3" into the `error` field.
**Impact:** Semantically wrong — a success message lives in an error field. Works because the frontend checks for "Clip" prefix. But if a real error occurs after a progress update, the error overwrites the progress and vice versa.
**Severity:** Medium — functional but fragile.

### C3: Render-video route duplicates Inngest render logic

**File:** `src/app/api/render-video/route.ts` (348 lines)
**Bug:** Contains a complete copy of the render pipeline that also exists in `src/inngest/functions.ts` `renderVideoJob`. Both have the same FFmpeg filter complex, music generation, voice mixing, caption rendering.
**Impact:** Bug fixes must be applied in TWO places. The getDuration bug (C1) proves this — it was fixed in Inngest but not in the route.

---

## HIGH Priority Issues

### H1: Render timeout is too short for long videos

**File:** `src/app/page.tsx` line 1127
**Issue:** `MAX_POLL = 180` at 3s intervals = 9 minutes max. A 5-scene render with voice generation + FFmpeg encoding can easily exceed 9 minutes on slow hardware.
**Fix:** Increase to 360 (18 minutes).

### H2: No deduplication of video generation requests

**File:** `src/app/page.tsx` line 858
**Issue:** If the user clicks "Generate Video" twice rapidly, two jobs are created. The first is abandoned (its polling interval is cleared). This wastes GPU time and can cause the second job to queue behind the first.
**Fix:** Disable the button while a job is in progress.

### H3: Voice audio stored as data URIs in React state

**File:** `src/app/page.tsx` — `voiceAudios` state
**Issue:** Voice audio is stored as base64 data URIs in component state. For a 5-scene project, this can be 50-200MB of base64 strings in memory. This can cause React performance issues and high memory usage.
**Impact:** Browser memory pressure, potential OOM on long projects.
**Fix:** Store voice audio in Blob immediately and keep only URLs.

### H4: Scene status not persisted across load

**File:** `src/app/page.tsx` — `loadProject()`
**Issue:** `setSceneStatus({})` — all scene statuses are reset to empty when loading a project. If a video was generating when the page was refreshed, the status is lost and the user has no idea what happened.
**Impact:** Lost generation state after page refresh.
**Fix:** Persist `sceneVideos` (which IS persisted) and check if scenes have videos on load.

### H5: Export video fetches data URI as Blob

**File:** `src/app/page.tsx` — `exportVideo()`
**Issue:** The `finalVideo` URL is a Blob URL from Vercel. `fetch(finalVideo)` works for HTTP URLs but may fail for data URIs in some browsers. The current implementation handles this correctly for Blob URLs but the code path for data URIs (local generation without Blob upload) is fragile.

---

## MEDIUM Priority Issues

### M1: No project auto-save

**Issue:** Projects must be manually saved (Ctrl+S or button). If the user generates content and navigates away without saving, all work is lost.
**Impact:** User frustration.
**Fix:** Auto-save on every significant state change.

### M2: localStorage limit

**Issue:** Projects are stored in `localStorage` which has a 5MB limit. Large projects with many scene images/videos (data URIs) can hit this limit.
**Impact:** Silent save failure.
**Fix:** Check `localStorage` quota before saving, warn user if approaching limit.

### M3: Duplicate `render-video/route.ts` and Inngest render

**Issue:** Two separate render implementations exist — one synchronous (`render-video/route.ts`) and one async (Inngest). They have different behavior and different bugs.
**Impact:** Maintenance burden, inconsistent behavior.
**Fix:** The synchronous route should delegate to the Inngest path or share the render logic.

### M4: Inngest step timeout vs job timeout

**Issue:** `STEP_TIMEOUT_MS = 1_200_000` (20 min) per Inngest step. But the render function does everything in a single step. A long render with voice generation can exceed this.
**Impact:** Render jobs can time out silently.

### M5: No graceful degradation when Redis is unavailable

**Issue:** `getRedis()` returns null if env vars are missing. All job operations return null. The video generation API returns 503. But the user gets a generic "Job queue unavailable" message.
**Impact:** Poor error message for a common configuration issue.

### M6: Frontend doesn't show which engine is being used

**Issue:** When `VIDEO_ENGINE=local`, the user sees "Generating video..." but doesn't know if it's using Veo (fast) or SVD (slow). The estimated time is wildly different.
**Impact:** User expects Veo speed, gets SVD speed.

### M7: No validation that all scenes have videos before render

**File:** `src/app/page.tsx` line 1083
**Issue:** `startRender()` checks `totalVideosGenerated < result.scenes.length` but doesn't check which specific scenes are missing videos. If some scenes have data: URIs and some have Blob URLs, the render may fail.
**Impact:** Render failure on mixed video sources.

### M8: generate-story route uses `response?.text` which may not exist

**File:** `src/lib/ai/director.ts`
**Issue:** `response?.text` — the Gemini SDK returns `response.text` as a property, but the type system may not guarantee this. This is a minor type safety issue.

### M9: Character detection is regex-based

**File:** `src/app/page.tsx` — `generateStory()`
**Issue:** Auto-detecting character names from story text using regex is unreliable. It can match common words ("The", "When") which are already in stopwords, but may miss lowercase names or non-English names.
**Impact:** Incorrect character auto-detection.
**Fix:** Let the Director return character names explicitly (which it already does).

---

## LOW Priority Issues

### L1: No rate limiting on API routes

**Issue:** Any client can call `/api/generate-image`, `/api/generate-story`, etc. without limits. Each call costs Gemini API money.
**Fix:** Add simple rate limiting.

### L2: No request size limits

**Issue:** Large image data URIs can be sent to the server without size limits.
**Fix:** Add body size limits.

### L3: Error messages expose internal details

**Issue:** Some error messages include file paths or stack traces. For example, FFmpeg errors include stderr output.
**Fix:** Sanitize error messages before returning to client.

### L4: WebSocket not used for real-time progress

**Issue:** Video generation progress is polled every 5 seconds. WebSocket would be more efficient and responsive.
**Fix:** Consider WebSocket for future improvement.

### L5: No generation history/cost tracking

**Issue:** No visibility into how many API calls have been made, how much they cost, or how long they took.
**Fix:** Add optional analytics.

---

## NICE_TO_HAVE

### N1: Scene thumbnails in project list
### N2: Drag-and-drop scene reordering
### N3: Undo/redo for scene edits
### N4: Collaborative editing
### N5: Custom AI Director prompts
### N6: Batch scene generation
### N7: Video preview before render
### N8: Export to multiple formats
### N9: Audio waveform visualization
### N10: Scene timing visualization

---

## Security Findings

### S1: API keys in environment variables ✅

All API keys (`GEMINI_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `BLOB_READ_WRITE_TOKEN`) are in `.env.local` and not exposed to the client. The `NEXT_PUBLIC_` prefix is not used for any secrets.

### S2: Local Python server is HTTP-only ⚠️

The local SVD server runs on `http://localhost:8000`. This is acceptable for local development but should not be exposed to the network in production. The server binds to `0.0.0.0` which means it's accessible from the network.

**Fix:** Bind to `127.0.0.1` by default, with an opt-in `VIDEO_ENGINE_HOST=0.0.0.0` for network access.

### S3: No CORS on local server ⚠️

The Python server doesn't set CORS headers. This is fine for server-to-server communication but would be an issue if the frontend tried to call it directly.

### S4: FFmpeg command injection ⚠️

In `render-video/route.ts`, the `drawtext` filter uses `s.narration` which is user-controlled. While the code escapes `\`, `:`, `'`, and `%`, there may be other FFmpeg special characters that aren't escaped.

**Fix:** Sanitize narration text more thoroughly before passing to FFmpeg.

### S5: Image upload validation ✅

Image data is validated before GPU processing — `validate_image_data()` checks base64 decoding, minimum size, and PIL image verification.

### S6: Video URL validation ✅

The render job API validates video URLs start with `http` or `data:`.

---

## Storage/Disk Findings

### ST1: Temp files use system temp directory ✅ (configurable)

`VIDEO_TEMP_DIR` can be set to `D:/AI/cache/video` to keep generated files off C:.

### ST2: HuggingFace cache on D: ✅

`HF_HOME=D:/AI/huggingface` keeps model weights on D:.

### ST3: npm cache on D: ⚠️

npm cache was previously cleaned but not relocated. Should set `npm config set cache "D:/Development/npm-cache"`.

### ST4: Generated data URIs in localStorage ⚠️

Scene images and videos are stored as data URIs in localStorage. This can consume significant space and hit the 5MB localStorage limit.

### ST5: pip cache on C: ⚠️

pip cache may accumulate on C:. Should set `PIP_CACHE_DIR=D:/Development/pip-cache`.

---

## Remaining Limitations

| Limitation | Impact | Can Fix Without GPU? | Should Wait For |
|-----------|--------|---------------------|-----------------|
| SVD generates only ~2s clips | Short clips need multi-clip concat | Already implemented | Wan 2.2 for longer clips |
| SVD is image-to-video only | Cannot use Director text prompts | Partially — preserve metadata | Wan 2.2 TI2V |
| SVD outputs 7 FPS | Choppy playback | ✅ Frame interpolation available | Better GPU |
| SVD generation is slow (~130s/clip) | Poor user experience | ✅ OOM retry, preview mode | Better GPU |
| Music is a sine tone | Low quality background audio | ✅ | Real music generation model |
| No scene-to-scene transitions | Hard cuts between scenes | ✅ Crossfade possible | — |
| No real-time progress WebSocket | 5s polling delay | ✅ | — |
| localStorage 5MB limit | Large projects can't save | ✅ IndexedDB possible | — |
| No authentication | Anyone can use the API | ✅ | — |
| No deployment config | Manual server management | ✅ Docker/PM2 | — |

---

## Recommended Implementation Order

### Immediate (1-2 hours)

1. **Fix render-video/route.ts getDuration** (C1) — same bug as Inngest
2. **Increase render poll timeout** (H1) — 9 min → 18 min
3. **Add video generation deduplication** (H2) — disable button during generation
4. **Fix render-video route duplication** (C3/M3) — share logic with Inngest

### Short-term (4-8 hours)

5. **Persist scene generation status** (H4) — save video URLs, restore on load
6. **Auto-save projects** (M1) — save on significant state changes
7. **Show estimated generation time** (M6) — display engine + ETA
8. **Sanitize FFmpeg narration** (S4) — thorough text escaping
9. **Bind local server to 127.0.0.1** (S2) — security hardening

### Medium-term (1-2 days)

10. **Move voice audio to Blob** (H3) — reduce memory pressure
11. **Add rate limiting** (L1) — protect API keys
12. **Add request size limits** (L2) — prevent abuse
13. **Improve error messages** (M5) — user-friendly messages
14. **Validate scene videos before render** (M7)

### Future (requires GPU upgrade)

15. Wan 2.2 TI2V-5B integration
16. Higher resolution generation
17. Longer clip generation
18. Text-conditioned video generation
19. Real music generation
20. Scene transitions
