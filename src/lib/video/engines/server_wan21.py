"""
PAT Orbit Video Engine — Wan 2.1 Local Inference Server

Runs Wan 2.1 T2V-1.3B (GGUF quantized) as a FastAPI service.
The Next.js adapter (wan21.ts) communicates with this server via HTTP.

Requirements:
    pip install torch diffusers transformers accelerate sentencepiece protobuf imageio[ffmpeg] fastapi uvicorn

Usage:
    python src/lib/video/engines/server_wan21.py

Environment variables:
    WAN21_PORT              — Server port (default: 8001)
    WAN21_DEVICE            — Inference device: "cuda", "mps", "cpu" (default: auto-detect)
    WAN21_MODEL_ID          — HuggingFace model ID (default: Wan-AI/Wan2.1-T2V-1.3B)
    WAN21_CACHE_DIR         — Model cache directory (default: ~/.cache/huggingface)
    WAN21_QUANT              — Quantization: "none", "gguf" (default: none)
    WAN21_GGUF_PATH         — Path to GGUF quantized weights (if quant=gguf)
    WAN21_MAX_FRAMES        — Max output frames (default: 33)
    WAN21_FPS               — Output FPS (default: 16)
"""

import os
import sys
import json
import uuid
import time
import base64
import threading
import traceback
from pathlib import Path

# ── Environment ──────────────────────────────────────────────────────

PORT = int(os.environ.get("WAN21_PORT", "8001"))
DEVICE = os.environ.get("WAN21_DEVICE", "")
MODEL_ID = os.environ.get("WAN21_MODEL_ID", "Wan-AI/Wan2.1-T2V-1.3B-Diffusers")
CACHE_DIR = os.environ.get("WAN21_CACHE_DIR", "")
QUANT = os.environ.get("WAN21_QUANT", "none")
GGUF_PATH = os.environ.get("WAN21_GGUF_PATH", "")
MAX_FRAMES = int(os.environ.get("WAN21_MAX_FRAMES", "33"))
FPS = int(os.environ.get("WAN21_FPS", "16"))

# ── Globals ──────────────────────────────────────────────────────────

pipeline = None
model_info = {
    "status": "unloaded",
    "model": MODEL_ID,
    "device": "unknown",
    "vram": "unknown",
    "gpu_name": "unknown",
    "loaded_at": None,
}

jobs = {}  # job_id -> { status, progress, video_url, error, created_at, updated_at }

# ── Model Loading ────────────────────────────────────────────────────

def detect_device():
    """Auto-detect the best available device."""
    import torch
    if DEVICE:
        return DEVICE
    if torch.cuda.is_available():
        return "cuda"
    if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return "mps"
    return "cpu"


def load_model():
    """Load Wan 2.1 T2V-1.3B model. Runs in a background thread on first request."""
    global pipeline, model_info

    import torch

    device = detect_device()
    print(f"[wan21] Loading model: {MODEL_ID} on {device}")

    t0 = time.time()

    try:
        from diffusers import WanPipeline

        # Determine dtype based on device
        dtype = torch.float16 if device == "cuda" else torch.float32

        # Check VRAM
        if device == "cuda":
            vram_gb = torch.cuda.get_device_properties(0).total_memory / 1e9
            gpu_name = torch.cuda.get_device_name(0)
            print(f"[wan21] GPU: {gpu_name}, VRAM: {vram_gb:.1f} GB")

            model_info["vram"] = f"{vram_gb:.1f} GB"
            model_info["gpu_name"] = gpu_name

            # Load model onto CPU first (safe), then use enable_model_cpu_offload
            # to dynamically move components to GPU during inference.
            # This is much safer than manual .to(device) for low VRAM.
            print(f"[wan21] Loading model on CPU, then enabling CPU offload for {vram_gb:.1f} GB VRAM")
            pipeline = WanPipeline.from_pretrained(
                MODEL_ID,
                torch_dtype=dtype,
                cache_dir=CACHE_DIR or None,
            )
            # Move to CPU first, then let offload handle GPU transfers
            pipeline.to("cpu")
            try:
                pipeline.enable_model_cpu_offload(device=device)
                print(f"[wan21] CPU offload enabled — components will move to GPU during inference")
            except Exception as e:
                print(f"[wan21] CPU offload failed ({e}), falling back to full CPU inference")
                device = "cpu"
                pipeline.to("cpu")
        else:
            print(f"[wan21] No CUDA — loading on CPU")
            pipeline = WanPipeline.from_pretrained(
                MODEL_ID,
                torch_dtype=dtype,
                cache_dir=CACHE_DIR or None,
            )
            pipeline.to("cpu")

        elapsed = time.time() - t0
        model_info.update({
            "status": "loaded",
            "device": device,
            "loaded_at": time.time(),
        })
        print(f"[wan21] Model loaded in {elapsed:.1f}s on {device}")

    except Exception as e:
        model_info["status"] = "error"
        model_info["error"] = str(e)
        print(f"[wan21] Failed to load model: {e}")
        traceback.print_exc()
        raise


def ensure_model_loaded():
    """Ensure model is loaded, loading in current thread if needed."""
    if model_info["status"] != "loaded":
        load_model()


# ── Generation ───────────────────────────────────────────────────────

def process_job(job_id: str, prompt: str, negative_prompt: str = ""):
    """Generate video for a job. Runs in a background thread."""
    global jobs

    try:
        jobs[job_id]["status"] = "processing"
        jobs[job_id]["updated_at"] = time.time()

        ensure_model_loaded()

        import torch
        import imageio

        print(f"[wan21] Generating: job={job_id}, frames={MAX_FRAMES}, fps={FPS}")
        t0 = time.time()

        # Build generation kwargs
        # Start with a small resolution to avoid OOM on 6GB VRAM
        # The user can override via WAN21_MAX_FRAMES and WAN21_FPS
        is_cpu_offload = model_info["device"] != "cpu" and hasattr(pipeline, 'offload_device') if pipeline else False
        gen_kwargs = {
            "prompt": prompt,
            "num_frames": min(MAX_FRAMES, 17),  # 17 frames is safer for low VRAM
            "num_inference_steps": 25,  # Reduced from 50 for speed on consumer GPU
            "guidance_scale": 5.0,
            "width": 480,
            "height": 480,  # Square 480x480 for minimum VRAM usage
        }

        if negative_prompt:
            gen_kwargs["negative_prompt"] = negative_prompt

        # Generate frames with OOM retry
        # Try progressively smaller settings on CUDA OOM
        resolutions = [
            (480, 480, 17),
            (256, 256, 9),
        ]
        frames = None
        last_error = None

        for width, height, num_frames in resolutions:
            gen_kwargs["width"] = width
            gen_kwargs["height"] = height
            gen_kwargs["num_frames"] = num_frames
            print(f"[wan21] Starting diffusion: {gen_kwargs['num_inference_steps']} steps at {width}x{height}, {num_frames} frames")
            try:
                with torch.no_grad():
                    result = pipeline(**gen_kwargs)
                frames = result.frames[0]  # List of PIL Images
                elapsed_gen = time.time() - t0
                print(f"[wan21] Diffusion complete: {len(frames)} frames in {elapsed_gen:.1f}s")
                break
            except (torch.cuda.OutOfMemoryError, RuntimeError) as e:
                last_error = e
                print(f"[wan21] OOM at {width}x{height}: {e}")
                # Clear GPU cache before retry
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
                # Try to move pipeline to CPU if on CUDA
                try:
                    pipeline.to("cpu")
                    if torch.cuda.is_available():
                        torch.cuda.empty_cache()
                except Exception:
                    pass
                continue

        if frames is None:
            raise RuntimeError(f"Video generation failed at all resolutions. Last error: {last_error}")

        # Encode to MP4
        output_dir = Path("tmp/wan21_output")
        output_dir.mkdir(parents=True, exist_ok=True)
        output_path = output_dir / f"{job_id}.mp4"

        writer = imageio.get_writer(str(output_path), fps=FPS, codec="libx264", quality=8)
        for frame in frames:
            writer.append_data(frame)
        writer.close()

        file_size = output_path.stat().st_size
        print(f"[wan21] MP4 written: {output_path} ({file_size} bytes)")

        # Read and base64 encode
        with open(output_path, "rb") as f:
            video_data = f.read()

        b64_data = base64.b64encode(video_data).decode("utf-8")
        video_url = f"data:video/mp4;base64,{b64_data}"

        total_elapsed = time.time() - t0
        print(f"[wan21] Job {job_id} completed in {total_elapsed:.1f}s")

        jobs[job_id].update({
            "status": "completed",
            "video_url": video_url,
            "updated_at": time.time(),
            "metadata": {
                "frames": len(frames),
                "width": gen_kwargs["width"],
                "height": gen_kwargs["height"],
                "fps": FPS,
                "generation_time": elapsed_gen,
                "total_time": total_elapsed,
                "file_size": file_size,
            },
        })

        # Cleanup temp file
        try:
            output_path.unlink()
        except Exception:
            pass

    except Exception as e:
        print(f"[wan21] Job {job_id} failed: {e}")
        traceback.print_exc()
        jobs[job_id].update({
            "status": "failed",
            "error": str(e),
            "updated_at": time.time(),
        })


# ── FastAPI Server ───────────────────────────────────────────────────

try:
    from fastapi import FastAPI, HTTPException
    from fastapi.responses import JSONResponse
    import uvicorn
except ImportError:
    print("[wan21] ERROR: FastAPI/Uvicorn not installed. Run:")
    print("  pip install fastapi uvicorn")
    sys.exit(1)

app = FastAPI(title="PAT Orbit Wan 2.1 Video Engine")


@app.get("/health")
async def health():
    """Health check endpoint."""
    import torch
    info = {
        "status": "ok" if model_info["status"] == "loaded" else model_info["status"],
        "engine": "wan21",
        "model": MODEL_ID,
        "device": model_info["device"],
        "gpu_name": model_info.get("gpu_name", "unknown"),
        "vram": model_info.get("vram", "unknown"),
        "max_frames": MAX_FRAMES,
        "fps": FPS,
        "quantization": QUANT,
    }
    if model_info["status"] == "error":
        info["error"] = model_info.get("error", "unknown")
    return info


@app.post("/generate")
async def generate(request_body: dict):
    """Start video generation. Returns a job_id for polling."""
    prompt = request_body.get("prompt", "")
    if not prompt:
        raise HTTPException(status_code=400, detail="prompt is required")

    # Build Wan-appropriate prompt from Director fields
    camera = request_body.get("camera", {})
    motion = request_body.get("motion", {})
    characters = request_body.get("characters", [])

    # Compose enhanced prompt for Wan
    enhanced_prompt = prompt
    if camera:
        cam_parts = []
        if camera.get("shotType"):
            cam_parts.append(camera["shotType"])
        if camera.get("movement"):
            cam_parts.append(f"{camera['movement']} camera movement")
        if cam_parts:
            enhanced_prompt += f". {', '.join(cam_parts)}"

    if motion:
        mov_parts = []
        if motion.get("subjectMovement"):
            mov_parts.append(motion["subjectMovement"])
        if motion.get("intensity"):
            mov_parts.append(f"{motion['intensity']} intensity")
        if mov_parts:
            enhanced_prompt += f". {', '.join(mov_parts)}"

    negative = "blurry, low quality, distorted, watermark, text overlay, static image"

    job_id = f"wan21-{uuid.uuid4().hex[:12]}"
    jobs[job_id] = {
        "status": "queued",
        "progress": 0,
        "video_url": None,
        "error": None,
        "created_at": time.time(),
        "updated_at": time.time(),
    }

    # Start generation in background thread
    thread = threading.Thread(
        target=process_job,
        args=(job_id, enhanced_prompt, negative),
        daemon=True,
    )
    thread.start()

    return {"job_id": job_id, "status": "queued"}


@app.get("/status/{job_id}")
async def get_status(job_id: str):
    """Poll job status."""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    job = jobs[job_id]
    return {
        "job_id": job_id,
        "status": job["status"],
        "progress": job.get("progress", 0),
        "video_url": job.get("video_url"),
        "error": job.get("error"),
        "metadata": job.get("metadata"),
    }


@app.post("/cancel/{job_id}")
async def cancel_job(job_id: str):
    """Best-effort job cancellation."""
    if job_id in jobs:
        jobs[job_id]["status"] = "cancelled"
        jobs[job_id]["updated_at"] = time.time()
    return {"status": "cancelled"}


@app.post("/preload")
async def preload():
    """Pre-load the model without generating."""
    try:
        load_model()
        return {"status": "loaded", "device": model_info["device"]}
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "error": str(e)},
        )


if __name__ == "__main__":
    print(f"[wan21] Starting Wan 2.1 server on port {PORT}")
    print(f"[wan21] Model: {MODEL_ID}")
    print(f"[wan21] Device: {DEVICE or 'auto-detect'}")
    print(f"[wan21] Quantization: {QUANT}")
    print(f"[wan21] Max frames: {MAX_FRAMES}, FPS: {FPS}")

    uvicorn.run(app, host="0.0.0.0", port=PORT, log_level="info")
