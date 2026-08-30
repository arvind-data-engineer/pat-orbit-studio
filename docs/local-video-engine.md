# PAT Orbit — Local Video Engine

Local, open-source video generation engine using **Stable Video Diffusion (SVD-XT 1.1)** by Stability AI.

This engine runs entirely on your own hardware — no paid API required for video generation.

## Model Choice

| Property | Value |
|----------|-------|
| **Model** | `stabilityai/stable-video-diffusion-img2vid-xt` |
| **Type** | Image-to-video (25 frames at 14 fps ≈ 1.8s) |
| **License** | Stability AI Community License (free for non-commercial) |
| **Input** | Single image + text prompt |
| **Output** | 25-frame video clip (768×576 or 1024×576) |
| **Framework** | PyTorch + HuggingFace diffusers |

### Why SVD-XT?

1. **Image-to-video** — Our primary use case generates video from scene images. SVD takes an image as input, not just text.
2. **Consumer GPU compatible** — Runs on NVIDIA GPUs with 8+ GB VRAM (RTX 3060 and above). Apple Silicon via MPS.
3. **Mature ecosystem** — Well-supported via HuggingFace `diffusers` with extensive documentation.
4. **Fast inference** — ~10-30 seconds per 25-frame clip on a modern GPU.
5. **No API costs** — Runs 100% locally.

## Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **GPU** | NVIDIA RTX 3060 (8GB VRAM) | NVIDIA RTX 4070+ (12GB+ VRAM) |
| **RAM** | 16 GB | 32 GB |
| **Disk** | 10 GB (model weights) | 20 GB (weights + temp) |
| **OS** | Windows 10+, macOS 12+, Linux | — |

### Apple Silicon (M1/M2/M3/M4)

SVD runs on Apple Silicon via MPS (Metal Performance Shaders). Performance is slower than NVIDIA GPUs (~60-120 seconds per clip) but fully functional.

## Installation

### 1. Create a Python virtual environment

```bash
cd pat-orbit-studio
python -m venv .venv
source .venv/bin/activate  # Linux/macOS
# or: .venv\Scripts\activate  # Windows
```

### 2. Install dependencies

```bash
pip install torch diffusers transformers accelerate fastapi uvicorn pillow imageio imageio-ffmpeg
```

For NVIDIA GPUs, install CUDA-enabled PyTorch:

```bash
pip install torch --index-url https://download.pytorch.org/whl/cu121
```

For Apple Silicon:

```bash
pip install torch
```

### 3. Download model weights

The first time you run the server, the model will be downloaded automatically from HuggingFace Hub (~5 GB). To pre-download:

```bash
python -c "
from diffusers import StableVideoDiffusionPipeline
StableVideoDiffusionPipeline.from_pretrained('stabilityai/stable-video-diffusion-img2vid-xt')
print('Model downloaded successfully')
"
```

To use a custom cache directory:

```bash
export VIDEO_ENGINE_CACHE_DIR=/path/to/models
```

## Configuring PAT Orbit to Use the Local Engine

Add these environment variables to your `.env.local` (or Vercel Production environment):

```bash
# Switch from Veo (default) to local engine
VIDEO_ENGINE=local

# URL of the local Python inference server
LOCAL_VIDEO_ENGINE_URL=http://localhost:8000
```

When `VIDEO_ENGINE=veo` or is not set, PAT Orbit uses the existing Gemini/Veo path.

When `VIDEO_ENGINE=local`, all video generation routes through the local SVD server.

### Quick Start

```bash
# Terminal 1 — Start the local video engine
python src/lib/video/engines/server.py

# Terminal 2 — Start PAT Orbit (with VIDEO_ENGINE=local)
VIDEO_ENGINE=local npm run dev
```

### Running the Local Inference Server

```bash
# Default (auto-detect device, port 8000)
python src/lib/video/engines/server.py

# Custom settings
VIDEO_ENGINE_PORT=8000 \
VIDEO_ENGINE_DEVICE=cuda \
VIDEO_ENGINE_MODEL=stabilityai/stable-video-diffusion-img2vid-xt \
python src/lib/video/engines/server.py
```

The server will start and listen on `http://0.0.0.0:8000`.

## Environment Variables

### PAT Orbit (Next.js)

| Variable | Default | Description |
|----------|---------|-------------|
| `VIDEO_ENGINE` | `veo` | Provider selection: `veo` or `local` |
| `LOCAL_VIDEO_ENGINE_URL` | `http://localhost:8000` | URL of the local inference server |

### Python Inference Server

| Variable | Default | Description |
|----------|---------|-------------|
| `VIDEO_ENGINE_PORT` | `8000` | Server port |
| `VIDEO_ENGINE_DEVICE` | auto-detect | Inference device: `cuda`, `mps`, `cpu` |
| `VIDEO_ENGINE_MODEL` | `stabilityai/stable-video-diffusion-img2vid-xt` | HuggingFace model ID |
| `VIDEO_ENGINE_CACHE_DIR` | `~/.cache/huggingface` | Model weights cache directory |

## How PAT Orbit Communicates with the Local Engine

```
┌──────────────────────────────────────────────────────────────┐
│  PAT Orbit Studio (Next.js)                                  │
│                                                              │
│  src/lib/video/engines/local.ts                              │
│    ├── generate(request)  → POST /generate                   │
│    ├── getStatus(jobId)   → GET  /status/{jobId}             │
│    └── cancel(jobId)      → POST /cancel/{jobId}             │
│                                                              │
└──────────────────────┬───────────────────────────────────────┘
                       │ HTTP (JSON)
                       ▼
┌──────────────────────────────────────────────────────────────┐
│  Local Inference Server (Python/FastAPI)                     │
│                                                              │
│  src/lib/video/engines/server.py                             │
│    ├── GET  /health          → model info + status           │
│    ├── POST /generate        → start generation (async)      │
│    ├── GET  /status/{jobId}  → poll generation status        │
│    └── POST /cancel/{jobId}  → cancel (best-effort)          │
│                                                              │
│  Stable Video Diffusion (SVD-XT 1.1)                        │
│  via HuggingFace diffusers + PyTorch                         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Flow

1. PAT Orbit sends a `POST /generate` request with the scene image, prompt, and Director metadata.
2. The server queues the job and returns a `job_id`.
3. PAT Orbit polls `GET /status/{job_id}` every ~3 seconds.
4. When complete, the response includes a `video_url` (data URI or local file URL).
5. PAT Orbit stores the video URL in the scene state and uploads to Vercel Blob if in production.

## API Endpoints

### `GET /health`

Returns model and server status.

```json
{
  "status": "ok",
  "model": "stabilityai/stable-video-diffusion-img2vid-xt",
  "device": "cuda",
  "vram": "12.0 GB",
  "gpu_name": "NVIDIA GeForce RTX 4070",
  "jobs_active": 0
}
```

### `POST /generate`

Start video generation.

```json
{
  "prompt": "Camera slowly dollies in as the character walks through the forest",
  "image": "data:image/png;base64,...",
  "camera": { "shotType": "medium", "angle": "eye-level", "movement": "dolly-in" },
  "motion": { "subjectMovement": "walking forward", "intensity": "subtle" },
  "characters": [{ "name": "Alex", "appearance": "12-year-old boy, blue jacket" }],
  "duration": 10,
  "aspect_ratio": "16:9"
}
```

Response:
```json
{
  "job_id": "local-a1b2c3d4e5f6",
  "status": "queued"
}
```

### `GET /status/{job_id}`

Poll generation status.

```json
{
  "job_id": "local-a1b2c3d4e5f6",
  "status": "completed",
  "video_url": "data:video/mp4;base64,..."
}
```

### `POST /cancel/{job_id}`

Cancel a running job (best-effort).

## Limitations

| Limitation | Details |
|------------|---------|
| **Duration** | ~1.8 seconds per generation (25 frames at 14 fps) |
| **Resolution** | 768×576 or 1024×576 |
| **Image required** | SVD is image-to-video, not text-to-video. An input image is always needed. |
| **No audio** | Video generation is visual only. Audio is handled separately by the voice/music system. |
| **Single GPU** | Runs on one GPU. No distributed inference. |
| **VRAM** | Requires 8+ GB VRAM. May fail on lower-end hardware. |

## Expected Generation Time

| Hardware | Time per clip |
|----------|---------------|
| RTX 3060 (8GB) | ~20-30 seconds |
| RTX 4070 (12GB) | ~10-15 seconds |
| RTX 4090 (24GB) | ~8-12 seconds |
| Apple M1 Pro | ~60-90 seconds |
| Apple M2 Max | ~40-60 seconds |
| CPU (no GPU) | ~5-10 minutes (not recommended) |

For a 5-scene project, expect 2-5 minutes total video generation time on a mid-range GPU.

## Future Upgrade Path

### Short-term improvements

1. **Motion modules** — Add AnimateDiff motion modules for smoother, longer video clips
2. **Frame interpolation** — Use RIFE or similar to increase frame rate from 14 fps to 24/30 fps
3. **Resolution upscale** — Add a post-processing upscaler (Real-ESRGAN) for 1080p output

### Medium-term upgrades

1. **Wan 2.1 / CogVideoX** — Upgrade to newer open-source video models as they mature
2. **Multi-GPU** — Support pipeline parallelism for larger models
3. **Video longer than 2s** — Use temporal tiling to generate longer clips

### Long-term possibilities

1. **Character consistency training** — Fine-tune with LoRA for specific character appearances
2. **Style transfer** — Apply consistent visual style across all scenes
3. **Real-time preview** — Lower-quality instant preview for rapid iteration

## Troubleshooting

### "Local video engine is not running"

The inference server is not started. Run:

```bash
python src/lib/video/engines/server.py
```

### "CUDA out of memory"

Reduce resolution or use `VIDEO_ENGINE_DEVICE=cpu` as fallback. Or close other GPU-using applications.

### "Model not found"

The model weights haven't been downloaded. Run the pre-download command in the Installation section.

### Slow generation on Mac

Apple Silicon MPS is slower than NVIDIA CUDA. This is expected. Consider using the cloud Veo engine for faster generation.

## Comparison: Local vs. Cloud (Veo)

| Feature | Local (SVD) | Cloud (Veo) |
|---------|-------------|-------------|
| **Cost** | Free (hardware only) | Per-generation API cost |
| **Speed** | 10-90 seconds | 1-5 minutes |
| **Quality** | Good | Excellent |
| **Duration** | ~1.8s per clip | Up to 8s per clip |
| **Resolution** | 768×576 | 720p-1080p |
| **Offline** | Yes | No |
| **Privacy** | Fully local | Data sent to Google |
| **Setup** | Python + GPU required | Just an API key |
