# PAT Orbit — Local Video Engine

Local, open-source video generation engine using **Stable Video Diffusion (SVD-XT 1.1)** by Stability AI.

This engine runs entirely on your own hardware — no paid API required for video generation.

## Model Choice

| Property | Value |
|----------|-------|
| **Model** | `stabilityai/stable-video-diffusion-img2vid-xt` |
| **Type** | Image-to-video |
| **License** | Stability AI Community License (free for non-commercial) |
| **Input** | Single image + text prompt |
| **Output** | Multi-frame video clip (1024×576) |
| **Framework** | PyTorch + HuggingFace diffusers |

### Why SVD-XT?

1. **Image-to-video** — Takes a scene image as input, not just text. Perfect for PAT Orbit's workflow.
2. **Consumer GPU compatible** — Runs on NVIDIA GPUs with 6+ GB VRAM (with CPU offloading).
3. **Mature ecosystem** — Well-supported via HuggingFace `diffusers`.
4. **No API costs** — Runs 100% locally.

## Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **GPU** | NVIDIA RTX 3050 (6GB VRAM, with CPU offload) | NVIDIA RTX 4070+ (12GB+ VRAM) |
| **RAM** | 16 GB | 32 GB |
| **Disk** | 10 GB (model weights) | 20 GB (weights + temp) |
| **OS** | Windows 10+, macOS 12+, Linux | — |

### RTX 3050 6GB (Verified)

SVD works on 6 GB VRAM with CPU offloading and attention slicing. Generation is slower but functional.

## Multi-Clip Pipeline

SVD generates short clips (~2 seconds each). For longer scenes, PAT Orbit uses a **multi-clip pipeline**:

```
Scene (target_duration)
    ↓
Calculate clips needed: ceil(target_duration / clip_duration)
    ↓
Generate Clip 1 from scene image
    ↓
Generate Clip 2 from scene image
    ↓
Generate Clip 3 from scene image
    ↓
FFmpeg concatenation (stream copy, no re-encode)
    ↓
Final scene video (multiple of clip_duration seconds)
    ↓
Upload to Blob
```

### Example

- Scene duration: 6 seconds
- Clip duration: 2 seconds (14 frames at 7 fps)
- Clips needed: 3
- Total generation time: ~3 × per-clip time

### Configuration

The server accepts an optional `target_duration` parameter:

```json
POST /generate
{
  "prompt": "...",
  "image": "data:image/png;base64,...",
  "target_duration": 6
}
```

When `target_duration` is provided and greater than the clip duration, the server automatically generates the required number of clips and concatenates them.

When `target_duration` is omitted, a single clip is generated (backward compatible).

## Benchmark Results

### RTX 3050 6GB Laptop — Measured Performance

| Config | Frames | Steps | Time | Video | Duration | Per-step |
|--------|--------|-------|------|-------|----------|----------|
| TEST A | 8 | 10 | 363.7s | 46 KB | 1.14s | 36.4s* |
| **TEST B** | **10** | **15** | **231.3s** | **45 KB** | **1.43s** | **15.4s** |
| **TEST C** | **14** | **20** | **207.3s** | **45 KB** | **2.00s** | **10.4s** |

*TEST A includes cold model loading time (~200s).

**Production default: TEST C (14 frames, 20 steps, 7 fps)**

### Estimated Per-Scene Times (RTX 3050 6GB, model warm)

| Scene Duration | Clips Needed | Estimated Time |
|---------------|-------------|----------------|
| 2 seconds | 1 | ~4 min |
| 4 seconds | 2 | ~8 min |
| 6 seconds | 3 | ~12 min |
| 8 seconds | 4 | ~16 min |
| 10 seconds | 5 | ~20 min |

### 5-Scene Project Total

| Scene Length | Total Clips | Total Video Gen Time |
|-------------|-------------|---------------------|
| 4 sec/scene | 10 clips | ~40 min |
| 6 sec/scene | 15 clips | ~60 min |

**Note:** First generation includes model loading (~3-5 min). Subsequent generations are faster (warm model).

## Configuration

### PAT Orbit (Next.js)

```bash
# In .env.local
VIDEO_ENGINE=local
LOCAL_VIDEO_ENGINE_URL=http://localhost:8000
```

### Python Inference Server

```bash
# Environment variables (set before starting server)
VIDEO_FRAMES=14      # Frames per clip (default: auto)
VIDEO_STEPS=20       # Denoising steps (default: pipeline default ~30)
VIDEO_FPS=7          # Output FPS
VIDEO_WIDTH=1024     # Output width (default: 1024)
VIDEO_HEIGHT=576     # Output height (default: 576)
DECODE_CHUNKS=4      # VAE decode chunks (default: auto)
```

### RTX 3050 6GB Recommended Settings

```bash
VIDEO_FRAMES=14
VIDEO_STEPS=20
VIDEO_FPS=7
```

### Fast Preview Settings

```bash
VIDEO_FRAMES=8
VIDEO_STEPS=10
VIDEO_FPS=7
```

## Installation

### 1. Install Python dependencies

```bash
pip install torch diffusers transformers accelerate fastapi uvicorn pillow imageio imageio-ffmpeg
```

For NVIDIA GPUs:
```bash
pip install torch --index-url https://download.pytorch.org/whl/cu121
```

### 2. Start the server

```bash
# Terminal 1
python src/lib/video/engines/server.py

# Terminal 2 (PAT Orbit with local video)
VIDEO_ENGINE=local npm run dev
```

## API Endpoints

### `POST /generate`

Start video generation. Supports multi-clip via `target_duration`.

```json
{
  "prompt": "Camera slowly dollies in...",
  "image": "data:image/png;base64,...",
  "target_duration": 6,
  "camera": { "shotType": "medium", "movement": "dolly-in" },
  "motion": { "subjectMovement": "walking", "intensity": "subtle" }
}
```

Response:
```json
{ "job_id": "local-a1b2c3d4e5f6", "status": "queued" }
```

### `GET /status/{job_id}`

```json
{
  "job_id": "local-a1b2c3d4e5f6",
  "status": "completed",
  "video_url": "data:video/mp4;base64,..."
}
```

Status values: `queued`, `processing`, `completed`, `failed`

During multi-clip generation, the `error` field temporarily shows progress (e.g., "Clip 2/3").

### `POST /cancel/{job_id}`

Cancel a running job (best-effort).

### `GET /health`

Returns model info and current configuration.

## Limitations

| Limitation | Details |
|------------|---------|
| **Duration** | ~2 seconds per clip (14 frames at 7 fps) |
| **Resolution** | 1024×576 (native model resolution) |
| **Image required** | SVD is image-to-video. An input image is always needed. |
| **No audio** | Video generation is visual only. Voice/music handled separately. |
| **Generation time** | ~4 min per clip on RTX 3050 6GB |
| **Total project** | ~40-60 min for 5-scene project on RTX 3050 6GB |

## Troubleshooting

### "Local video engine is not running"

```bash
python src/lib/video/engines/server.py
```

### "CUDA out of memory"

- Close other GPU-using applications
- Reduce `VIDEO_FRAMES` to 8 or 10
- Reduce `VIDEO_STEPS` to 10-15
- The server uses CPU offload automatically for < 8GB VRAM

### Generation is very slow

On RTX 3050 6GB, ~4 min per clip is expected due to CPU offloading. For faster generation:
- Use fewer steps: `VIDEO_STEPS=10`
- Use fewer frames: `VIDEO_FRAMES=8`
- Upgrade to a GPU with 12+ GB VRAM

### Model not found

The model weights download on first use (~5 GB). Ensure internet access on first run.

### FFmpeg concatenation fails

FFmpeg is bundled with imageio-ffmpeg. Ensure `imageio-ffmpeg` is installed:
```bash
pip install imageio-ffmpeg
```

## Comparison: Local vs. Cloud (Veo)

| Feature | Local (SVD) | Cloud (Veo) |
|---------|-------------|-------------|
| **Cost** | Free (hardware only) | Per-generation API cost |
| **Speed** | ~4 min/clip (RTX 3050) | 1-5 min total |
| **Quality** | Good | Excellent |
| **Duration** | Multi-clip pipeline | Up to 8s per clip |
| **Resolution** | 1024×576 | 720p-1080p |
| **Offline** | Yes | No |
| **Privacy** | Fully local | Data sent to Google |
| **Setup** | Python + GPU required | Just an API key |

## Future Upgrade Path

1. **Frame interpolation** — RIFE to increase 7 fps → 24/30 fps
2. **Better models** — Wan 2.2 TI2V-5B when 12+ GB VRAM is available
3. **Resolution upscale** — Real-ESRGAN post-processing for 1080p
4. **Parallel clip generation** — Multi-GPU for faster multi-clip
