# Wan 2.1 Local Video Engine

PAT Orbit Studio's second local video generation engine, powered by **Wan 2.1 T2V-1.3B**.

## Overview

| Property | Value |
|----------|-------|
| Model | `Wan-AI/Wan2.1-T2V-1.3B` |
| Type | Text-to-video (T2V) |
| License | Apache 2.0 |
| Min VRAM | 6 GB (with CPU offload) |
| Recommended VRAM | 12+ GB |
| Output | Up to 33 frames at 16 fps (~2s) |
| Resolution | 480p (default) or 720p on 12GB+ |

## ⚠️ Important Limitation

**Wan 2.1 T2V-1.3B is a text-to-video model only.** It does NOT accept an input image for image-to-video generation. The scene's visual prompt is used as the text prompt, but there is no way to constrain the output to match a previously generated image.

For image-to-video support, use:
- `VIDEO_ENGINE=local` (SVD-XT) — proven working, accepts images
- `VIDEO_ENGINE=wan22` (future) — Wan 2.2 TI2V-5B supports both text and image input

## Hardware Requirements

### RTX 3050 6GB (TESTED)
- **FAILED**: Model download completes (19 files, ~5GB), but loading into memory fails with Windows pagefile error 1455
- Only 4 GB free RAM available (16.8 GB total, 76% used)
- The 1.3B model requires ~2.5 GB weights + ~5 GB T5 encoder + overhead → exceeds available RAM + pagefile
- **Recommendation**: Close other applications, increase Windows pagefile to 32 GB+, or use a machine with 32+ GB RAM

### RTX 3060 12GB
- Full model on GPU (no offload needed)
- 720p output possible
- Generation time: ~5-10 minutes

### RTX 3080/4070+ (12GB+)
- Full model on GPU
- 720p output
- Generation time: ~3-5 minutes

## Installation

### 1. Install Python dependencies

```bash
pip install torch --index-url https://download.pytorch.org/whl/cu121
pip install diffusers transformers accelerate sentencepiece
pip install protobuf imageio[ffmpeg] fastapi uvicorn
```

### 2. Start the inference server

```bash
python src/lib/video/engines/server_wan21.py
```

The server will:
1. Listen on port 8001 (configurable)
2. Auto-detect GPU device
3. Lazy-load the model on first generation request

### 3. Configure PAT Orbit

```bash
# In .env.local
VIDEO_ENGINE=wan21
WAN21_ENGINE_URL=http://localhost:8001
```

Or start the dev server with:

```bash
VIDEO_ENGINE=wan21 npm run dev
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VIDEO_ENGINE` | `veo` | Set to `wan21` to activate this engine |
| `WAN21_ENGINE_URL` | `http://localhost:8001` | URL of the Python inference server |
| `WAN21_PORT` | `8001` | Server listen port (Python server) |
| `WAN21_DEVICE` | auto-detect | `cuda`, `mps`, or `cpu` |
| `WAN21_MODEL_ID` | `Wan-AI/Wan2.1-T2V-1.3B` | HuggingFace model ID |
| `WAN21_CACHE_DIR` | `~/.cache/huggingface` | Model cache directory |
| `WAN21_MAX_FRAMES` | `33` | Output frames (16 frames on 6GB VRAM) |
| `WAN21_FPS` | `16` | Output FPS |

## How It Works

```
PAT Orbit Studio (Next.js)
  src/lib/video/engines/wan21.ts
       │
       │  HTTP JSON
       ▼
Python Inference Server (FastAPI)
  src/lib/video/engines/server_wan21.py
       │
       ▼
Wan 2.1 T2V-1.3B
  via HuggingFace diffusers + PyTorch
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Check server and model status |
| `/generate` | POST | Start video generation (returns job_id) |
| `/status/{job_id}` | GET | Poll generation progress |
| `/cancel/{job_id}` | POST | Cancel a running job |
| `/preload` | POST | Pre-load model without generating |

### Request Format

```json
{
  "prompt": "A young explorer enters a glowing forest...",
  "duration": 10,
  "aspect_ratio": "16:9",
  "camera": {
    "shotType": "wide",
    "movement": "dolly_forward"
  },
  "motion": {
    "subjectMovement": "walking forward",
    "intensity": "moderate"
  },
  "characters": [
    {
      "name": "Alex",
      "appearance": "12-year-old boy, brown hair, blue jacket",
      "role": "Explorer"
    }
  ]
}
```

### Response Format

```json
{
  "job_id": "wan21-abc123def456",
  "status": "queued"
}
```

### Status Response

```json
{
  "job_id": "wan21-abc123def456",
  "status": "completed",
  "video_url": "data:video/mp4;base64,...",
  "metadata": {
    "frames": 33,
    "width": 480,
    "height": 832,
    "fps": 16,
    "generation_time": 1234.5,
    "file_size": 543210
  }
}
```

## Engine Selection Comparison

| Engine | `VIDEO_ENGINE` | Type | Image Input | Speed (6GB) | Quality |
|--------|----------------|------|-------------|-------------|---------|
| Veo | `veo` (default) | Cloud API | ✅ | ~30s | ★★★★ |
| SVD-XT | `local` | Local I2V | ✅ | ~55 min | ★★☆ |
| Wan 2.1 | `wan21` | Local T2V | ❌ | ❌ (OOM on 6GB/16GB RAM) | ★★★ |

## Upgrading to Wan 2.2

The recommended upgrade path is **Wan 2.2 TI2V-5B** which:
- Supports both text AND image input (true I2V)
- Apache 2.0 license
- Higher quality output
- Requires 12GB+ VRAM (RTX 3060 12GB recommended)
- ~5-15 minutes at 480p on 12GB

To upgrade later:
1. Update `server_wan21.py` to use `Wan2.2-TI2V-5B` model
2. Enable image input processing
3. Increase resolution to 720p

## Actual Test Results (August 2026)

### Test 1: RTX 3050 6GB + 16.8 GB RAM — FAILED

| Metric | Value |
|--------|-------|
| Model download | ✅ 19/19 files, ~5 GB, 96 min |
| Model loading | ❌ FAILED — Windows pagefile error 1455 |
| Root cause | Only 4 GB free RAM (12.8 GB used by OS/apps) |
| GPU | NVIDIA GeForce RTX 3050 6GB Laptop |
| System RAM | 16.8 GB total, 76.4% used |
| Device attempted | CUDA with CPU offload |
| Error | `OSError: The paging file is too small for this operation to complete` |
| Model cached | ✅ Yes — subsequent loads skip download |
| Fix required | 32+ GB total RAM or 32 GB+ Windows pagefile |

### Test 2: SVD-XT (VIDEO_ENGINE=local) — PASSED

| Metric | Value |
|--------|-------|
| Generation | ✅ 14 frames at 1024×576 |
| Duration | 2.0 seconds at 7 fps |
| File size | 56.4 KB |
| Total time | ~55 min (denoising on 6GB GPU + CPU offload) |
| Device | CUDA (enable_model_cpu_offload) |
| OOM | No — CPU offload kept within 6GB |

## Troubleshooting

### "Wan 2.1 video engine is not running"
Start the Python server:
```bash
python src/lib/video/engines/server_wan21.py
```

### CUDA out of memory
The server auto-enables CPU offload for GPUs with <10GB VRAM. If it still fails:
```bash
WAN21_MAX_FRAMES=14 python src/lib/video/engines/server_wan21.py
```

### Model download is slow
The first run downloads ~5GB of model weights from HuggingFace. Subsequent runs use the cache.

### Generation is very slow on CPU
Wan 2.1 requires a GPU for practical use. CPU generation can take hours for a single clip. Consider:
- Using `VIDEO_ENGINE=veo` (cloud) for production
- Upgrading to a GPU with 12GB+ VRAM
- Using `VIDEO_ENGINE=local` (SVD) which is slightly faster on 6GB

## Architecture Notes

- The Python server uses threading for background generation
- Model is lazy-loaded on first request (not at startup)
- Output is returned as base64 data URI (uploaded to Vercel Blob by the Inngest function)
- The TypeScript adapter (`wan21.ts`) implements the same `VideoEngine` interface as SVD and Veo
- Provider selection is via `VIDEO_ENGINE` environment variable
