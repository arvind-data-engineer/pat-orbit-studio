#!/usr/bin/env python3
"""
PAT Orbit Local Video Inference Server

Runs Stable Video Diffusion (SVD-XT 1.1) via HuggingFace diffusers
and exposes a simple HTTP API for the Next.js application.

Requirements:
    pip install torch diffusers transformers accelerate fastapi uvicorn pillow

Hardware:
    - GPU with 8+ GB VRAM (NVIDIA RTX 3060+, Mac M1+)
    - 16+ GB system RAM
    - ~10 GB disk for model weights

Usage:
    python src/lib/video/engines/server.py
    # or with custom settings:
    VIDEO_ENGINE_PORT=8000 VIDEO_ENGINE_DEVICE=cuda python src/lib/video/engines/server.py

Environment variables:
    VIDEO_ENGINE_PORT      — Server port (default: 8000)
    VIDEO_ENGINE_DEVICE    — Inference device: "cuda", "mps", "cpu" (default: auto-detect)
    VIDEO_ENGINE_MODEL     — HuggingFace model ID (default: stabilityai/stable-video-diffusion-img2vid-xt)
    VIDEO_ENGINE_CACHE_DIR — Model cache directory (default: ~/.cache/huggingface)

API:
    GET  /health           — Health check and model info
    POST /generate         — Start video generation (returns job_id)
    GET  /status/{job_id}  — Poll job status
    POST /cancel/{job_id}  — Cancel a job (best-effort)
"""

import os
import io
import uuid
import base64
import time
import threading
import logging
from typing import Optional
from dataclasses import dataclass, field

# ── Configuration ─────────────────────────────────────────────────────

PORT = int(os.environ.get("VIDEO_ENGINE_PORT", "8000"))
DEVICE = os.environ.get("VIDEO_ENGINE_DEVICE", "")  # auto-detect if empty
MODEL_ID = os.environ.get("VIDEO_ENGINE_MODEL", "stabilityai/stable-video-diffusion-img2vid-xt")
CACHE_DIR = os.environ.get("VIDEO_ENGINE_CACHE_DIR", "")

# ── Generation Settings (env-var configurable) ───────────────────────

# Override these via environment variables to tune performance.
# Defaults are optimized for RTX 3050 6GB + 16 GB RAM.
VIDEO_FRAMES = int(os.environ.get("VIDEO_FRAMES", "0"))  # 0 = auto (14 on CUDA, 25 on CPU)
VIDEO_STEPS = int(os.environ.get("VIDEO_STEPS", "0"))    # 0 = use pipeline default (~30)
VIDEO_FPS = int(os.environ.get("VIDEO_FPS", "7"))
VIDEO_WIDTH = int(os.environ.get("VIDEO_WIDTH", "0"))    # 0 = 1024 (model native)
VIDEO_HEIGHT = int(os.environ.get("VIDEO_HEIGHT", "0"))  # 0 = 576 (model native)
DECODE_CHUNKS = int(os.environ.get("DECODE_CHUNKS", "0"))  # 0 = auto

# ── Logging ───────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="[local-video-engine] %(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger("local-video-engine")

# ── Lazy model loading ────────────────────────────────────────────────

pipeline = None
model_info = {"model": MODEL_ID, "device": "unloaded", "vram": "N/A", "gpu_name": "N/A"}


def get_device():
    """Auto-detect best available device."""
    if DEVICE:
        return DEVICE
    try:
        import torch
        if torch.cuda.is_available():
            return "cuda"
        if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            return "mps"
    except ImportError:
        pass
    return "cpu"


def load_model():
    """Load the Stable Video Diffusion pipeline. Called once on first request."""
    global pipeline, model_info  # noqa: must be global so process_job can read device

    if pipeline is not None:
        return

    device = get_device()
    logger.info(f"Loading model on device: {device}")

    try:
        import torch
        from diffusers import StableVideoDiffusionPipeline
        from diffusers.utils import load_image

        dtype = torch.float16 if device in ("cuda", "mps") else torch.float32

        pipe_kwargs = {
            "torch_dtype": dtype,
            "variant": "fp16" if device == "cuda" else None,
        }
        if CACHE_DIR:
            pipe_kwargs["cache_dir"] = CACHE_DIR

        pipeline = StableVideoDiffusionPipeline.from_pretrained(
            MODEL_ID,
            **{k: v for k, v in pipe_kwargs.items() if v is not None},
        )

        # Use CPU offloading for low-VRAM GPUs (< 8GB) to avoid OOM.
        # Must be called BEFORE .to(device).
        if device == "cuda":
            try:
                total_mem = getattr(
                    torch.cuda.get_device_properties(0),
                    'total_memory',
                    getattr(torch.cuda.get_device_properties(0), 'total_mem', 0),
                )
                vram_gb = total_mem / (1024 ** 3)
                if vram_gb < 8.0:
                    logger.info(f"Low VRAM ({vram_gb:.1f} GB) — enabling CPU offload")
                    pipeline.enable_model_cpu_offload()
                else:
                    pipeline.to(device)
            except Exception as e:
                logger.warning(f"CPU offload setup failed, falling back to device move: {e}")
                pipeline.to(device)
        else:
            pipeline.to(device)

        gpu_name = "N/A"
        vram = "N/A"
        if device == "cuda" and torch.cuda.is_available():
            gpu_name = torch.cuda.get_device_name(0)
            total_mem = getattr(torch.cuda.get_device_properties(0), 'total_memory', getattr(torch.cuda.get_device_properties(0), 'total_mem', 0))
            vram = f"{total_mem / (1024**3):.1f} GB"
        elif device == "mps":
            gpu_name = "Apple Silicon (MPS)"
            vram = "Unified memory"

        # ── Apply memory/speed optimizations ──────────────────────
        # These reduce VRAM usage and can speed up inference on low-VRAM GPUs.
        try:
            pipeline.enable_attention_slicing()
            logger.info("Enabled attention slicing (reduces VRAM during denoising)")
        except Exception as e:
            logger.warning(f"Could not enable attention slicing: {e}")

        # Note: SVD pipeline does not support enable_vae_slicing()
        # VAE decoding is handled via decode_chunk_size parameter

        # Log effective generation settings
        effective_frames = VIDEO_FRAMES if VIDEO_FRAMES > 0 else (14 if device == 'cuda' else 25)
        effective_steps = VIDEO_STEPS if VIDEO_STEPS > 0 else 'default (~30)'
        effective_decode = DECODE_CHUNKS if DECODE_CHUNKS > 0 else (4 if device == 'cuda' else 8)
        logger.info(
            f"Generation config: frames={effective_frames}, steps={effective_steps}, "
            f"fps={VIDEO_FPS}, decode_chunks={effective_decode}, "
            f"resolution={VIDEO_WIDTH or 1024}x{VIDEO_HEIGHT or 576}"
        )

        model_info = {
            "model": MODEL_ID,
            "device": device,
            "vram": vram,
            "gpu_name": gpu_name,
            "frames": effective_frames,
            "steps": effective_steps,
            "fps": VIDEO_FPS,
            "decode_chunks": effective_decode,
        }
        logger.info(f"Model loaded: {model_info}")

    except ImportError as e:
        logger.error(f"Missing Python dependency: {e}")
        logger.error("Install: pip install torch diffusers transformers accelerate")
        raise
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        raise


# ── Job Store (in-memory) ────────────────────────────────────────────

@dataclass
class Job:
    job_id: str
    status: str = "queued"
    video_url: Optional[str] = None
    error: Optional[str] = None
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)
    cancelled: bool = False


jobs: dict[str, Job] = {}
jobs_lock = threading.Lock()

# ── Video Generation Worker ──────────────────────────────────────────

# ── Clip helpers ─────────────────────────────────────────────────────

def generate_single_clip(image, job_id, clip_index, gen_kwargs):
    """Generate one SVD clip, encode to MP4, return path. Raises on failure."""
    import torch
    import numpy as np
    import imageio
    import imageio_ffmpeg
    import tempfile

    ffmpeg_path = imageio_ffmpeg.get_ffmpeg_exe()
    os.environ["IMAGEIO_FFMPEG_EXE"] = ffmpeg_path

    generator = torch.Generator(device="cpu").manual_seed(42 + clip_index)
    gen_kwargs["generator"] = generator

    with torch.inference_mode():
        frames = pipeline(image, **gen_kwargs).frames[0]

    tmp_mp4 = os.path.join(tempfile.gettempdir(), f"svd_{job_id}_clip{clip_index}.mp4")
    writer = imageio.get_writer(tmp_mp4, format="ffmpeg", fps=VIDEO_FPS, codec="libx264")
    for frame in frames:
        writer.append_data(np.array(frame))
    writer.close()

    file_size = os.path.getsize(tmp_mp4)
    if file_size == 0:
        os.remove(tmp_mp4)
        raise Exception(f"Clip {clip_index} produced empty MP4")

    del frames
    return tmp_mp4, file_size


def concat_clips_with_ffmpeg(clip_paths, output_path):
    """Concatenate MP4 clips without re-encoding using FFmpeg concat demuxer."""
    import imageio_ffmpeg
    import subprocess
    import tempfile

    ffmpeg_path = imageio_ffmpeg.get_ffmpeg_exe()

    if len(clip_paths) == 1:
        # Single clip — just copy
        import shutil
        shutil.copy2(clip_paths[0], output_path)
        return

    # Create concat list file
    list_file = os.path.join(tempfile.gettempdir(), f"concat_{uuid.uuid4().hex[:8]}.txt")
    try:
        with open(list_file, "w") as f:
            for p in clip_paths:
                # FFmpeg concat demuxer requires forward slashes or escaped paths
                safe_path = p.replace("\\", "/")
                f.write(f"file '{safe_path}'\n")

        # Concat without re-encoding (stream copy)
        result = subprocess.run(
            [
                ffmpeg_path,
                "-y",
                "-f", "concat",
                "-safe", "0",
                "-i", list_file,
                "-c", "copy",
                output_path,
            ],
            capture_output=True,
            text=True,
            timeout=120,
        )

        if result.returncode != 0:
            logger.warning(f"FFmpeg concat stream-copy failed, retrying with re-encode: {result.stderr[:200]}")
            # Fallback: re-encode
            result = subprocess.run(
                [
                    ffmpeg_path,
                    "-y",
                    "-f", "concat",
                    "-safe", "0",
                    "-i", list_file,
                    "-c:v", "libx264",
                    "-pix_fmt", "yuv420p",
                    "-movflags", "+faststart",
                    output_path,
                ],
                capture_output=True,
                text=True,
                timeout=120,
            )
            if result.returncode != 0:
                raise Exception(f"FFmpeg concat failed: {result.stderr[:300]}")
    finally:
        try:
            os.remove(list_file)
        except OSError:
            pass


def process_job(job: Job, request_data: dict):
    """Run video generation in a background thread.

    Supports two modes:
    1. Single clip (no target_duration or target_duration <= clip_duration)
    2. Multi-clip (target_duration > clip_duration): generates multiple clips and concatenates.
    """
    global pipeline
    temp_files = []  # Track for cleanup

    try:
        with jobs_lock:
            job.status = "processing"
            job.updated_at = time.time()

        # Load model on first request
        load_model()

        if job.cancelled:
            with jobs_lock:
                job.status = "failed"
                job.error = "Job was cancelled"
                job.updated_at = time.time()
            return

        import torch
        from PIL import Image

        # Parse input image
        image = None
        image_data = request_data.get("image")
        if image_data and isinstance(image_data, str):
            if "," in image_data:
                header, b64data = image_data.split(",", 1)
                image_bytes = base64.b64decode(b64data)
            else:
                image_bytes = base64.b64decode(image_data)
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            image = image.resize((1024, 576), Image.LANCZOS)
        else:
            logger.warning("No input image provided. SVD requires an image. Using generated placeholder.")
            image = Image.new("RGB", (1024, 576), (30, 30, 40))

        prompt = request_data.get("prompt", "")

        # ── Determine clip parameters ──────────────────────────
        dev = model_info.get('device', 'cpu')
        num_frames = VIDEO_FRAMES if VIDEO_FRAMES > 0 else (14 if dev == 'cuda' else 25)
        decode_chunks = DECODE_CHUNKS if DECODE_CHUNKS > 0 else (4 if dev == 'cuda' else 8)
        num_steps = VIDEO_STEPS if VIDEO_STEPS > 0 else None

        clip_duration = num_frames / VIDEO_FPS  # e.g. 14/7 = 2.0s

        # Calculate number of clips needed
        target_duration = request_data.get("target_duration", 0)
        if target_duration and target_duration > clip_duration:
            num_clips = max(1, round(target_duration / clip_duration))
        else:
            num_clips = 1

        actual_duration = num_clips * clip_duration
        logger.info(
            f"Job {job.job_id}: {num_clips} clip(s), {clip_duration:.1f}s/clip, "
            f"target={target_duration or 'single'}s, actual={actual_duration:.1f}s, "
            f"frames={num_frames}, steps={num_steps or 'default'}"
        )

        gen_kwargs = {
            "num_frames": num_frames,
            "decode_chunk_size": decode_chunks,
        }
        if num_steps is not None:
            gen_kwargs["num_inference_steps"] = num_steps

        # ── Generate clip(s) ───────────────────────────────────
        t_total_start = time.time()
        clip_paths = []

        for clip_idx in range(num_clips):
            if job.cancelled:
                break

            logger.info(f"Generating clip {clip_idx + 1}/{num_clips}...")
            t_clip_start = time.time()

            # Update progress
            with jobs_lock:
                job.status = "processing"
                job.updated_at = time.time()
                # Store progress info as error field (hacky but visible to pollers)
                job.error = f"Clip {clip_idx + 1}/{num_clips}"

            clip_path, clip_size = generate_single_clip(image, job.job_id, clip_idx, gen_kwargs)
            clip_paths.append(clip_path)
            temp_files.append(clip_path)

            t_clip_end = time.time()
            logger.info(
                f"Clip {clip_idx + 1}/{num_clips} done: "
                f"{clip_duration:.1f}s video, {clip_size/1024:.0f} KB, "
                f"{t_clip_end - t_clip_start:.1f}s"
            )

            # Free GPU memory between clips
            if dev == 'cuda':
                torch.cuda.empty_cache()

            if job.cancelled:
                break

        if job.cancelled:
            with jobs_lock:
                job.status = "failed"
                job.error = "Job was cancelled"
                job.updated_at = time.time()
            return

        if not clip_paths:
            raise Exception("No clips were generated")

        # ── Concatenate clips ──────────────────────────────────
        if len(clip_paths) > 1:
            logger.info(f"Concatenating {len(clip_paths)} clips...")
            with jobs_lock:
                job.error = f"Combining {len(clip_paths)} clips"
                job.updated_at = time.time()

            final_path = os.path.join(
                tempfile.gettempdir(), f"svd_{job.job_id}_final.mp4"
            )
            concat_clips_with_ffmpeg(clip_paths, final_path)
            temp_files.append(final_path)
        else:
            final_path = clip_paths[0]

        # ── Read and return ────────────────────────────────────
        with open(final_path, "rb") as f:
            video_bytes = f.read()

        t_total_end = time.time()
        total_time = t_total_end - t_total_start

        if len(video_bytes) == 0:
            raise Exception("Final video is empty")

        video_b64 = base64.b64encode(video_bytes).decode("utf-8")
        video_url = f"data:video/mp4;base64,{video_b64}"

        logger.info(
            f"Job {job.job_id} completed: {len(clip_paths)} clip(s), "
            f"{actual_duration:.1f}s video, {len(video_bytes)/1024:.0f} KB, "
            f"total={total_time:.1f}s"
        )

        # Free GPU memory
        if dev == 'cuda':
            torch.cuda.empty_cache()

        with jobs_lock:
            job.status = "completed"
            job.video_url = video_url
            job.updated_at = time.time()

    except ImportError:
        logger.error("Missing Python dependency: pip install imageio imageio-ffmpeg")
        with jobs_lock:
            job.status = "failed"
            job.error = "Video encoding requires imageio. Install: pip install imageio imageio-ffmpeg"
            job.updated_at = time.time()

    except Exception as e:
        logger.error(f"Job {job.job_id} failed: {e}")
        with jobs_lock:
            job.status = "failed"
            job.error = str(e)
            job.updated_at = time.time()

    finally:
        # Clean up all temp files
        for f in temp_files:
            try:
                os.remove(f)
            except OSError:
                pass


# ── FastAPI Application ──────────────────────────────────────────────

try:
    from fastapi import FastAPI, HTTPException
    from fastapi.responses import JSONResponse
    import uvicorn

    app = FastAPI(
        title="PAT Orbit Local Video Engine",
        description="Local inference server for open-source video generation",
        version="1.0.0",
    )

    @app.get("/health")
    async def health_check():
        """Health check endpoint."""
        device = get_device()
        return {
            "status": "ok",
            **model_info,
            "device": device,
            "config": {
                "frames": model_info.get('frames', 'auto'),
                "steps": model_info.get('steps', 'default'),
                "fps": VIDEO_FPS,
                "width": VIDEO_WIDTH or 1024,
                "height": VIDEO_HEIGHT or 576,
                "decode_chunks": model_info.get('decode_chunks', 'auto'),
            },
            "jobs_active": sum(
                1 for j in jobs.values() if j.status in ("queued", "processing")
            ),
        }

    @app.post("/generate")
    async def generate_video(request_data: dict):
        """Start video generation. Returns a job_id for polling."""
        prompt = request_data.get("prompt", "")
        if not prompt or not isinstance(prompt, str) or not prompt.strip():
            raise HTTPException(status_code=400, detail="prompt is required")

        job_id = f"local-{uuid.uuid4().hex[:12]}"
        job = Job(job_id=job_id)

        with jobs_lock:
            jobs[job_id] = job

        # Start generation in background thread
        thread = threading.Thread(target=process_job, args=(job, request_data), daemon=True)
        thread.start()

        return {"job_id": job_id, "status": "queued"}

    @app.get("/status/{job_id}")
    async def get_status(job_id: str):
        """Poll job status."""
        with jobs_lock:
            job = jobs.get(job_id)

        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        return {
            "job_id": job.job_id,
            "status": job.status,
            "video_url": job.video_url,
            "error": job.error,
            "created_at": job.created_at,
            "updated_at": job.updated_at,
        }

    @app.post("/cancel/{job_id}")
    async def cancel_job(job_id: str):
        """Request job cancellation (best-effort)."""
        with jobs_lock:
            job = jobs.get(job_id)

        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        if job.status in ("completed", "failed"):
            return {"message": "Job already finished"}

        job.cancelled = True
        return {"message": "Cancellation requested"}

except ImportError:
    # FastAPI not installed — provide a clear error
    logger.error("FastAPI is not installed. Install: pip install fastapi uvicorn")
    app = None


# ── Main Entry Point ──────────────────────────────────────────────────

if __name__ == "__main__":
    if app is None:
        logger.error(
            "Cannot start server: FastAPI is not installed.\n"
            "Run: pip install fastapi uvicorn torch diffusers transformers accelerate pillow imageio imageio-ffmpeg"
        )
        exit(1)

    logger.info(f"Starting PAT Orbit Local Video Engine on port {PORT}")
    logger.info(f"Model: {MODEL_ID}")
    logger.info(f"Device: {get_device()}")
    uvicorn.run(app, host="0.0.0.0", port=PORT, log_level="info")
