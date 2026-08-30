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
    global pipeline, model_info

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
        pipeline.to(device)

        # Memory-efficient attention if available
        if device == "cuda":
            try:
                pipeline.enable_model_cpu_offload()
            except Exception:
                pass

        gpu_name = "N/A"
        vram = "N/A"
        if device == "cuda" and torch.cuda.is_available():
            gpu_name = torch.cuda.get_device_name(0)
            total_mem = torch.cuda.get_device_properties(0).total_mem
            vram = f"{total_mem / (1024**3):.1f} GB"
        elif device == "mps":
            gpu_name = "Apple Silicon (MPS)"
            vram = "Unified memory"

        model_info = {
            "model": MODEL_ID,
            "device": device,
            "vram": vram,
            "gpu_name": gpu_name,
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

def process_job(job: Job, request_data: dict):
    """Run video generation in a background thread."""
    global pipeline

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
            # Parse data URI
            if "," in image_data:
                header, b64data = image_data.split(",", 1)
                image_bytes = base64.b64decode(b64data)
            else:
                image_bytes = base64.b64decode(image_data)
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            # Resize to model input size
            image = image.resize((1024, 576), Image.LANCZOS)
        else:
            # Generate from prompt only — use a blank canvas as fallback
            logger.warning("No input image provided. SVD requires an image. Using generated placeholder.")
            image = Image.new("RGB", (1024, 576), (30, 30, 40))

        # Build the generation prompt
        prompt = request_data.get("prompt", "")

        # Generate video frames
        seed = 42
        generator = torch.Generator(device=pipeline.device).manual_seed(seed)

        with torch.no_grad():
            frames = pipeline(
                image,
                prompt=prompt,
                num_frames=25,  # SVD-XT produces 25 frames
                decode_chunk_size=8,
                generator=generator,
            ).frames[0]

        if job.cancelled:
            with jobs_lock:
                job.status = "failed"
                job.error = "Job was cancelled during encoding"
                job.updated_at = time.time()
            return

        # Encode frames to MP4 using imageio
        try:
            import numpy as np
            import imageio

            video_buffer = io.BytesIO()
            writer = imageio.get_writer(video_buffer, format="ffmpeg", fps=14, codec="libx264")

            for frame in frames:
                arr = np.array(frame)
                writer.append_data(arr)
            writer.close()

            # Save to temp file and upload to a local path
            # For now, encode as base64 MP4 and store in the job
            video_b64 = base64.b64encode(video_buffer.getvalue()).decode("utf-8")
            video_url = f"data:video/mp4;base64,{video_b64}"

            with jobs_lock:
                job.status = "completed"
                job.video_url = video_url
                job.updated_at = time.time()

            logger.info(f"Job {job.job_id} completed successfully")

        except ImportError:
            # Fallback: save frames as individual images
            logger.warning("imageio not available. Saving raw frames.")
            import numpy as np
            frames_np = [np.array(f) for f in frames]
            # Store as base64 JPEG of first frame as a placeholder
            first_frame = Image.fromarray(frames_np[0])
            buf = io.BytesIO()
            first_frame.save(buf, format="JPEG", quality=90)
            preview_b64 = base64.b64encode(buf.getvalue()).decode("utf-8")

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
