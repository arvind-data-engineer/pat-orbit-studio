# PAT Orbit — Local Video Engine (v3.0)

Local, open-source video generation engine using **Stable Video Diffusion (SVD-XT 1.1)** by Stability AI.

This engine runs entirely on your own hardware — no paid API required for video generation.

## What's New in v3.0

- **Frame interpolation** — Optional FFmpeg-based minterpolation (7 FPS → 24 FPS)
- **OOM retry** — Automatic retry with reduced settings on CUDA out-of-memory
- **Clip-to-clip continuity** — Each clip starts from the last frame of the previous clip
- **Temp directory control** — `VIDEO_TEMP_DIR` to keep generated files on D: drive
- **Fixed continuity bug** — `extract_last_frame_from_frames` now has correct PIL import
- **Fixed render sync** — Inngest `getDuration` now correctly parses video duration
- **Consistent versioning** — All endpoints report v3.0.0

## Previous Features (v2.0)

- **GPU lock** — Only one generation at a time, preventing OOM and corruption
- **Quality presets** — `VIDEO_QUALITY=preview|production|quality` for quick configuration
- **Progress tracking** — Real-time clip progress ("Clip 2/3") separate from errors
- **MP4 validation** — Output is verified before returning to the caller
- **Input validation** — Invalid images are rejected before GPU work starts
- **Duration trimming** — Final video is trimmed to the requested duration
- **Health diagnostics** — `/health` returns GPU memory, queue status, uptime, FFmpeg check

## Model

| Property | Value |
|----------|-------|
| **Model** | `stabilityai/stable-video-diffusion-img2vid-xt` |
| **Type** | Image-to-video |
| **License** | Stability AI Community License (free for non-commercial) |
| **Input** | Single image (required) |
| **Output** | Multi-frame video clip |
| **Framework** | PyTorch + HuggingFace diffusers |

## Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **GPU** | NVIDIA RTX 3050 (6GB VRAM, with CPU offload) | NVIDIA RTX 4070+ (12GB+ VRAM) |
| **RAM** | 16 GB | 32 GB |
| **Disk** | 10 GB (model weights) | 20 GB (weights + temp) |
| **OS** | Windows 10+, macOS 12+, Linux | — |

## Quality Presets

Set `VIDEO_QUALITY` for quick configuration. Explicit `VIDEO_FRAMES`/`VIDEO_STEPS` override the preset.

| Preset | Frames | Steps | Speed | Quality | RTX 3050 Time |
|--------|--------|-------|-------|---------|----------------|
| `preview` | 8 | 10 | Fast | Acceptable | ~6 min/clip |
| `production` (default) | 14 | 20 | Normal | Good | ~4 min/clip |

```bash
# Quick preview mode
VIDEO_QUALITY=preview python src/lib/video/engines/server.py

# Production mode (default)
VIDEO_QUALITY=production python src/lib/video/engines/server.py
```

## Configuration

### PAT Orbit (Next.js)

```bash
# In .env.local
VIDEO_ENGINE=local
LOCAL_VIDEO_ENGINE_URL=http://localhost:8000
```

### Python Inference Server

```bash
# Quality presets
VIDEO_QUALITY=production   # "preview", "production", or "quality"

# Explicit overrides (override quality preset)
VIDEO_FRAMES=14
VIDEO_STEPS=20
VIDEO_FPS=7
VIDEO_WIDTH=1024
VIDEO_HEIGHT=576
DECODE_CHUNKS=4
VIDEO_ENGINE_PORT=8000
VIDEO_ENGINE_DEVICE=cuda

# Frame interpolation (v3.0)
VIDEO_INTERPOLATION=none    # "none" or "ffmpeg" (minterpolate)
VIDEO_TARGET_FPS=24         # Target FPS when interpolating

# OOM retry (v3.0)
VIDEO_OOM_RETRY=true        # Retry once with preview settings on OOM

# Temp directory (v3.0) — keep generated files on D: drive
VIDEO_TEMP_DIR=D:/AI/cache/video
```

### RTX 3050 6GB Recommended Settings

```bash
VIDEO_QUALITY=production
# or explicitly:
VIDEO_FRAMES=14
VIDEO_STEPS=20
VIDEO_FPS=7
```

## Benchmark Results (RTX 3050 6GB)

| Test | Frames | Steps | Time | Duration | Per-step |
|------|--------|-------|------|----------|----------|
| TEST A (cold) | 8 | 10 | 363.7s | 1.14s | 36.4s |
| TEST B (warm) | 10 | 15 | 231.3s | 1.43s | 15.4s |
| **TEST C (warm)** | **14** | **20** | **207.3s** | **2.00s** | **10.4s** |

### Per-Scene Times (RTX 3050, model warm)

| Scene Duration | Clips | Estimated Time |
|----------------|-------|----------------|
| 2 seconds | 1 | ~4 min |
| 4 seconds | 2 | ~8 min |
| 6 seconds | 3 | ~12 min |
| 5 scenes × 4 sec | 10 | ~40 min |

## Multi-Clip Pipeline

SVD generates short clips (~2 seconds each). For longer scenes, PAT Orbit uses a multi-clip pipeline:

```
Scene (target_duration)
    ↓
Calculate clips: ceil(target_duration / clip_duration)
    ↓
Generate Clip 1 from scene image
Generate Clip 2 from scene image
Generate Clip 3 from scene image
    ↓
FFmpeg concatenation (stream copy)
    ↓
Trim to target duration
    ↓
Validate MP4 output
    ↓
Return final video
```

## API Endpoints

### `GET /health`

Comprehensive diagnostics:

```json
{
  "status": "ok",
  "version": "2.0.0",
  "engine": "svd-xt-1.1",
  "model": "stabilityai/stable-video-diffusion-img2vid-xt",
  "device": "cuda",
  "gpu_name": "NVIDIA GeForce RTX 3050 6GB Laptop",
  "vram": "6.0 GB",
  "quality_preset": "production",
  "config": { "frames": 14, "steps": 20, "fps": 7, "width": 1024, "height": 576 },
  "gpu": { "allocated_gb": 3.2, "reserved_gb": 4.1, "total_gb": 6.0, "free_gb": 2.8 },
  "ffmpeg_available": true,
  "model_loaded": true,
  "jobs": { "active": null, "total_tracked": 5, "queued": 0, "processing": 1, "completed": 3, "failed": 1 },
  "uptime_seconds": 3600
}
```

### `POST /generate`

```json
{
  "prompt": "Camera slowly dollies in...",
  "image": "data:image/png;base64,...",
  "target_duration": 6,
  "camera": { "shotType": "medium", "movement": "dolly-in" },
  "motion": { "subjectMovement": "walking", "intensity": "subtle" },
  "characters": [{ "name": "Alex", "appearance": "brown hair, blue jacket" }],
  "continuity": { "location": "forest", "timeOfDay": "sunset" }
}
```

Response: `{ "job_id": "local-a1b2c3d4e5f6", "status": "queued" }`

### `GET /status/{job_id}`

```json
{
  "job_id": "local-a1b2c3d4e5f6",
  "status": "processing",
  "progress": "Clip 2/3",
  "video_url": null,
  "error": null,
  "duration": null,
  "created_at": 1700000000.0,
  "updated_at": 1700000010.0
}
```

Status values: `queued`, `processing`, `completed`, `failed`

### `POST /cancel/{job_id}`

Cancel a running job (best-effort).

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| GPU busy | Another generation is running | Wait for current job to finish |
| GPU OOM | Not enough VRAM | Reduce `VIDEO_FRAMES` or `VIDEO_STEPS` |
| Invalid image | Corrupted or unreadable image | Regenerate the scene image |
| FFmpeg not available | Missing imageio-ffmpeg | `pip install imageio-ffmpeg` |
| Server not running | Python server not started | `python src/lib/video/engines/server.py` |

## Architecture

```
PAT Orbit (Next.js)
    ↓
Shared Generation Service (generate.ts)
    ↓
VideoConditioning (conditioning.ts)
    ↓
VideoEngine Registry (engine.ts)
    ↓
Local adapter (local.ts)
    ↓
POST http://localhost:8000/generate
    ↓
Python FastAPI server
    ↓
GPU Lock (only 1 concurrent job)
    ↓
SVD-XT inference (CPU offload)
    ↓
Multi-clip generation + FFmpeg concat
    ↓
MP4 validation
    ↓
Base64 response → Blob upload
```

## Installation

```bash
pip install torch diffusers transformers accelerate fastapi uvicorn pillow imageio imageio-ffmpeg
```

For NVIDIA GPUs:
```bash
pip install torch --index-url https://download.pytorch.org/whl/cu121
```

## Quick Start

```bash
# Terminal 1: Start the server
VIDEO_QUALITY=production python src/lib/video/engines/server.py

# Terminal 2: Start PAT Orbit with local video engine
VIDEO_ENGINE=local npm run dev
```

## Limitations

| Limitation | Details |
|------------|---------|
| **Duration** | ~2 seconds per clip (14 frames at 7 fps) |
| **Resolution** | 1024×576 (native model resolution) |
| **Image required** | SVD is image-to-video. An input image is always needed. |
| **No audio** | Video generation is visual only. Voice/music handled separately. |
| **Single GPU** | Only one generation at a time (GPU lock) |
| **No text prompt** | SVD is image-conditioned. Text prompts are stored but not used for SVD. |

## Comparison: Local vs. Cloud (Veo)

| Feature | Local (SVD) | Cloud (Veo) |
|---------|-------------|-------------|
| **Cost** | Free (hardware only) | Per-generation API cost |
| **Speed** | ~4 min/clip (RTX 3050) | 1-5 min total |
| **Quality** | Good | Excellent |
| **Duration** | Multi-clip pipeline | Up to 8s per clip |
| **Offline** | Yes | No |
| **Privacy** | Fully local | Data sent to Google |

## Troubleshooting

### "GPU is busy. Another generation is in progress."
Wait for the current generation to complete. The server processes one job at a time to prevent GPU OOM.

### "GPU ran out of memory"
- Close other GPU-using applications
- Set `VIDEO_QUALITY=preview` (8 frames, 10 steps)
- Or reduce: `VIDEO_FRAMES=8 VIDEO_STEPS=10`

### "Invalid input image"
The scene image may be corrupted. Regenerate the image first.

### Generation is very slow
On RTX 3050 6GB, ~4 min per clip is expected due to CPU offloading. For faster preview:
```bash
VIDEO_QUALITY=preview python src/lib/video/engines/server.py
```

## Future Upgrade Path

1. **Frame interpolation** — RIFE to increase 7 fps → 24/30 fps
2. **Better models** — Wan 2.2 TI2V-5B when 12+ GB VRAM is available
3. **Resolution upscale** — Real-ESRGAN post-processing for 1080p
4. **Parallel clips** — Multi-GPU support for faster multi-clip
