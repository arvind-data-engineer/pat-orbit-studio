#!/usr/bin/env python3
"""
PAT Orbit Local Video Inference Server

Runs Stable Video Diffusion (SVD-XT 1.1) via HuggingFace diffusers
and exposes a simple HTTP API for the Next.js application.

Requirements:
    pip install torch diffusers transformers accelerate fastapi uvicorn pillow imageio imageio-ffmpeg

Hardware:
    - GPU with 6+ GB VRAM (NVIDIA RTX 3050+ with CPU offload, or 8+ GB without)
    - 16+ GB system RAM
    - ~10 GB disk for model weights

Usage:
    python src/lib/video/engines/server.py

Environment variables:
    VIDEO_ENGINE_PORT      — Server port (default: 8000)
    VIDEO_ENGINE_DEVICE    — Inference device: "cuda", "mps", "cpu" (default: auto-detect)
    VIDEO_ENGINE_MODEL     — HuggingFace model ID
    VIDEO_ENGINE_CACHE_DIR — Model cache directory
    VIDEO_FRAMES           — Frames per clip (0 = auto)
    VIDEO_STEPS            — Denoising steps (0 = pipeline default)
    VIDEO_FPS              — Output FPS (default: 7)
    VIDEO_WIDTH            — Output width (0 = 1024)
    VIDEO_HEIGHT           — Output height (0 = 576)
    DECODE_CHUNKS          — VAE decode chunks (0 = auto)
    VIDEO_QUALITY          — "preview", "production", or "quality" (default: production)
                            preview: 8 frames, 3 steps (~6 min/clip, good for testing)
                            production: 14 frames, 10 steps (~20 min/clip, best practical quality)
                            quality: 14 frames, 20 steps (~40 min/clip, maximum quality)
                            Explicit VIDEO_FRAMES/VIDEO_STEPS override these defaults.

API:
    GET  /health           — Health check, model info, queue status
    POST /generate         — Start video generation (returns job_id)
    GET  /status/{job_id}  — Poll job status with progress info
    POST /cancel/{job_id}  — Cancel a job (best-effort)
"""

import os
import io
import uuid
import base64
import time
import tempfile
import threading
import shutil
import subprocess
import logging
from typing import Optional
from dataclasses import dataclass, field

# ── Temp Directory ───────────────────────────────────────────────────

def _get_temp_dir() -> str:
    """Return the temp directory for video generation files.
    Uses VIDEO_TEMP_DIR if set, otherwise falls back to system temp."""
    if VIDEO_TEMP_DIR:
        return VIDEO_TEMP_DIR
    return _get_temp_dir()


# ── Configuration ─────────────────────────────────────────────────────

PORT = int(os.environ.get("VIDEO_ENGINE_PORT", "8000"))
DEVICE = os.environ.get("VIDEO_ENGINE_DEVICE", "")
MODEL_ID = os.environ.get(
    "VIDEO_ENGINE_MODEL",
    "stabilityai/stable-video-diffusion-img2vid-xt",
)
CACHE_DIR = os.environ.get("VIDEO_ENGINE_CACHE_DIR", "")

# ── Quality Presets ───────────────────────────────────────────────────
# VIDEO_QUALITY provides simple presets; explicit VIDEO_FRAMES/VIDEO_STEPS override.

VIDEO_QUALITY = os.environ.get("VIDEO_QUALITY", "production").lower()

PRESETS = {
    "preview": {"frames": 8, "steps": 3},
    "production": {"frames": 14, "steps": 10},
    "quality": {"frames": 14, "steps": 20},
}

# Resolve effective frames/steps: explicit env > quality preset > auto
_raw_frames = int(os.environ.get("VIDEO_FRAMES", "0"))
_raw_steps = int(os.environ.get("VIDEO_STEPS", "0"))

if _raw_frames > 0:
    VIDEO_FRAMES = _raw_frames
elif VIDEO_QUALITY in PRESETS:
    VIDEO_FRAMES = PRESETS[VIDEO_QUALITY]["frames"]
else:
    VIDEO_FRAMES = 0  # auto (14 CUDA, 25 CPU)

if _raw_steps > 0:
    VIDEO_STEPS = _raw_steps
elif VIDEO_QUALITY in PRESETS:
    VIDEO_STEPS = PRESETS[VIDEO_QUALITY]["steps"]
else:
    VIDEO_STEPS = 0  # pipeline default (~30)

VIDEO_FPS = int(os.environ.get("VIDEO_FPS", "7"))
VIDEO_WIDTH = int(os.environ.get("VIDEO_WIDTH", "0"))
VIDEO_HEIGHT = int(os.environ.get("VIDEO_HEIGHT", "0"))
DECODE_CHUNKS = int(os.environ.get("DECODE_CHUNKS", "0"))

# Frame interpolation: "none" (default, keep raw FPS) or "ffmpeg" (minterpolate to target)
VIDEO_INTERPOLATION = os.environ.get("VIDEO_INTERPOLATION", "none").lower()
VIDEO_TARGET_FPS = int(os.environ.get("VIDEO_TARGET_FPS", "24"))  # Target FPS when interpolating

# OOM retry: retry once with reduced settings (8 frames, 3 steps) on CUDA OOM
VIDEO_OOM_RETRY = os.environ.get("VIDEO_OOM_RETRY", "true").lower() in ("true", "1", "yes")

# Temp directory for generated clips — default to system temp; set to D: on Windows
VIDEO_TEMP_DIR = os.environ.get("VIDEO_TEMP_DIR", "")
if VIDEO_TEMP_DIR:
    os.makedirs(VIDEO_TEMP_DIR, exist_ok=True)

# ── Logging ───────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="[local-video-engine] %(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger("local-video-engine")

# ── Server start time (for uptime reporting) ──────────────────────────

SERVER_START_TIME = time.time()

# ── Lazy model loading ────────────────────────────────────────────────

pipeline = None
model_info = {
    "model": MODEL_ID,
    "device": "unloaded",
    "vram": "N/A",
    "gpu_name": "N/A",
}

# ── GPU Lock ──────────────────────────────────────────────────────────
# Only one GPU generation may run at a time to prevent OOM and corruption.

gpu_lock = threading.Lock()
currently_processing: Optional[str] = None  # job_id of the active generation


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
    """Load the SVD pipeline. Called once on first request."""
    global pipeline, model_info

    if pipeline is not None:
        return

    device = get_device()
    logger.info(f"Loading model on device: {device}")

    try:
        import torch
        from diffusers import StableVideoDiffusionPipeline

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

        # CPU offloading for low-VRAM GPUs (< 8GB).
        if device == "cuda":
            try:
                total_mem = getattr(
                    torch.cuda.get_device_properties(0),
                    "total_memory",
                    getattr(torch.cuda.get_device_properties(0), "total_mem", 0),
                )
                vram_gb = total_mem / (1024 ** 3)
                if vram_gb < 8.0:
                    logger.info(f"Low VRAM ({vram_gb:.1f} GB) — enabling CPU offload")
                    pipeline.enable_model_cpu_offload()
                else:
                    pipeline.to(device)
            except Exception as e:
                logger.warning(f"CPU offload setup failed, falling back: {e}")
                pipeline.to(device)
        else:
            pipeline.to(device)

        gpu_name = "N/A"
        vram = "N/A"
        if device == "cuda" and torch.cuda.is_available():
            gpu_name = torch.cuda.get_device_name(0)
            total_mem = getattr(
                torch.cuda.get_device_properties(0),
                "total_memory",
                getattr(torch.cuda.get_device_properties(0), "total_mem", 0),
            )
            vram = f"{total_mem / (1024**3):.1f} GB"
        elif device == "mps":
            gpu_name = "Apple Silicon (MPS)"
            vram = "Unified memory"

        try:
            pipeline.enable_attention_slicing()
            logger.info("Enabled attention slicing")
        except Exception as e:
            logger.warning(f"Could not enable attention slicing: {e}")

        effective_frames = VIDEO_FRAMES if VIDEO_FRAMES > 0 else (14 if device == "cuda" else 25)
        effective_steps = VIDEO_STEPS if VIDEO_STEPS > 0 else "default (~30)"
        effective_decode = DECODE_CHUNKS if DECODE_CHUNKS > 0 else (4 if device == "cuda" else 8)

        model_info = {
            "model": MODEL_ID,
            "device": device,
            "vram": vram,
            "gpu_name": gpu_name,
            "frames": effective_frames,
            "steps": effective_steps,
            "fps": VIDEO_FPS,
            "decode_chunks": effective_decode,
            "quality_preset": VIDEO_QUALITY,
        }
        logger.info(f"Model loaded: {model_info}")

    except ImportError as e:
        logger.error(f"Missing dependency: {e}")
        raise
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        raise


# ── Input Validation ──────────────────────────────────────────────────

def validate_image_data(image_data: str) -> bool:
    """Validate that image_data is a decodable base64 image."""
    try:
        if "," in image_data:
            _, b64data = image_data.split(",", 1)
        else:
            b64data = image_data
        image_bytes = base64.b64decode(b64data)
        if len(image_bytes) < 100:
            return False
        from PIL import Image
        img = Image.open(io.BytesIO(image_bytes))
        img.verify()
        return True
    except Exception:
        return False


def validate_mp4_file(path: str) -> bool:
    """Validate that a file is a non-empty valid MP4."""
    try:
        size = os.path.getsize(path)
        if size < 1024:
            return False
        with open(path, "rb") as f:
            header = f.read(12)
        # Check for ftyp box (MP4 container signature)
        if len(header) >= 8 and header[4:8] == b"ftyp":
            return True
        # Also check for moov atom (some MP4s)
        with open(path, "rb") as f:
            data = f.read(min(size, 64 * 1024))
        if b"moov" in data or b"mdat" in data:
            return True
        return False
    except Exception:
        return False


# ── Job Store ─────────────────────────────────────────────────────────

@dataclass
class Job:
    job_id: str
    status: str = "queued"
    video_url: Optional[str] = None
    error: Optional[str] = None
    progress: Optional[str] = None  # Separate progress field (e.g. "Clip 2/3")
    duration: Optional[float] = None  # Actual output duration in seconds
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)
    cancelled: bool = False


jobs: dict[str, Job] = {}
jobs_lock = threading.Lock()


def _update_job(job: Job, **kwargs):
    """Thread-safe job update."""
    with jobs_lock:
        for k, v in kwargs.items():
            setattr(job, k, v)
        job.updated_at = time.time()


# ── Clip Helpers ──────────────────────────────────────────────────────

def extract_last_frame_from_frames(frames):
    """Extract the last frame from a list of PIL Image frames.
    
    This is the primary method for clip-to-clip continuity.
    Returns the last frame as a PIL Image, resized to the model's expected input.
    """
    try:
        from PIL import Image as _PILImage
        if not frames or len(frames) == 0:
            return None
        last_frame = frames[-1]
        # Convert numpy array to PIL Image if needed
        if not hasattr(last_frame, 'save'):
            import numpy as np
            last_frame = _PILImage.fromarray(np.array(last_frame))
        return last_frame.convert("RGB")
    except Exception as e:
        logger.warning(f"Failed to extract last frame from frames: {e}")
        return None


def extract_last_frame_from_video(video_path: str):
    """Extract the last frame from an MP4 clip as a PIL Image using FFmpeg.
    
    Fallback method: used only if extract_last_frame_from_frames fails.
    Seeks to near the end of the video and extracts one frame.
    """
    try:
        ffmpeg_path = None
        try:
            import imageio_ffmpeg
            ffmpeg_path = imageio_ffmpeg.get_ffmpeg_exe()
        except Exception:
            ffmpeg_path = shutil.which("ffmpeg")

        if not ffmpeg_path:
            return None

        # Get duration via ffprobe or ffmpeg
        ffprobe = ffmpeg_path.replace("ffmpeg", "ffprobe").replace("ffmpeg.exe", "ffprobe.exe")
        if not os.path.exists(ffprobe):
            ffprobe = shutil.which("ffprobe")

        duration = 2.0  # default
        if ffprobe:
            result = subprocess.run(
                [ffprobe, "-v", "quiet", "-show_entries", "format=duration",
                 "-of", "csv=p=0", video_path],
                capture_output=True, text=True, timeout=10,
            )
            if result.returncode == 0 and result.stdout.strip():
                duration = float(result.stdout.strip())

        # Seek to near end and extract one frame
        frame_path = os.path.join(_get_temp_dir(), f"svd_lastframe_{uuid.uuid4().hex[:8]}.png")
        seek_time = max(0, duration - 0.1)
        result = subprocess.run(
            [ffmpeg_path, "-y", "-i", video_path, "-ss", str(seek_time),
             "-frames:v", "1", frame_path],
            capture_output=True, text=True, timeout=30,
        )

        if result.returncode != 0 or not os.path.exists(frame_path):
            return None

        img = Image.open(frame_path).convert("RGB")
        try:
            os.remove(frame_path)
        except OSError:
            pass
        return img

    except Exception as e:
        logger.warning(f"Failed to extract last frame from video: {e}")
        return None


def generate_single_clip(image, job_id: str, clip_index: int, gen_kwargs: dict, fps: int,
                          start_image=None):
    """Generate one SVD clip, encode to MP4, return (path, size, duration). Raises on failure.
    
    If start_image is provided (PIL Image), it is used as the conditioning
    image instead of the original Director image. This enables clip-to-clip
    continuity where each clip starts from the last frame of the previous clip.
    """
    import torch
    import numpy as np
    import imageio
    import imageio_ffmpeg

    ffmpeg_path = imageio_ffmpeg.get_ffmpeg_exe()
    os.environ["IMAGEIO_FFMPEG_EXE"] = ffmpeg_path

    # Deterministic seed: base_seed + clip_index ensures different but reproducible clips
    generator = torch.Generator(device="cpu").manual_seed(42 + clip_index)
    gen_kwargs_copy = {**gen_kwargs, "generator": generator}

    # Use continuity image if provided, otherwise use the original Director image
    conditioning_image = start_image if start_image is not None else image

    with torch.inference_mode():
        frames = pipeline(conditioning_image, **gen_kwargs_copy).frames[0]

    num_frames = len(frames)
    clip_duration = num_frames / fps

    tmp_mp4 = os.path.join(_get_temp_dir(), f"svd_{job_id}_clip{clip_index}.mp4")
    writer = imageio.get_writer(tmp_mp4, format="ffmpeg", fps=fps, codec="libx264")
    for frame in frames:
        writer.append_data(np.array(frame))
    writer.close()

    file_size = os.path.getsize(tmp_mp4)
    if file_size == 0:
        os.remove(tmp_mp4)
        raise RuntimeError(f"Clip {clip_index} produced empty MP4")

    if not validate_mp4_file(tmp_mp4):
        os.remove(tmp_mp4)
        raise RuntimeError(f"Clip {clip_index} produced invalid MP4")

    # Extract last frame for continuity before freeing frames
    last_frame = extract_last_frame_from_frames(frames)
    del frames
    return tmp_mp4, file_size, clip_duration, last_frame


def concat_clips_with_ffmpeg(clip_paths: list, output_path: str):
    """Concatenate MP4 clips. Stream copy first, re-encode fallback."""
    ffmpeg_path = None
    try:
        import imageio_ffmpeg
        ffmpeg_path = imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        ffmpeg_path = shutil.which("ffmpeg")

    if not ffmpeg_path:
        raise RuntimeError("FFmpeg is not available. Install imageio-ffmpeg: pip install imageio-ffmpeg")

    if len(clip_paths) == 1:
        shutil.copy2(clip_paths[0], output_path)
        return

    list_file = os.path.join(_get_temp_dir(), f"concat_{uuid.uuid4().hex[:8]}.txt")
    try:
        with open(list_file, "w") as f:
            for p in clip_paths:
                safe_path = p.replace("\\", "/")
                f.write(f"file '{safe_path}'\n")

        # Stream copy (fast, no re-encode)
        result = subprocess.run(
            [
                ffmpeg_path, "-y",
                "-f", "concat", "-safe", "0",
                "-i", list_file,
                "-c", "copy",
                output_path,
            ],
            capture_output=True,
            text=True,
            timeout=120,
        )

        if result.returncode != 0:
            logger.warning(f"FFmpeg concat stream-copy failed, re-encoding: {result.stderr[:200]}")
            result = subprocess.run(
                [
                    ffmpeg_path, "-y",
                    "-f", "concat", "-safe", "0",
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
                raise RuntimeError(f"FFmpeg concat failed: {result.stderr[:300]}")
    finally:
        try:
            os.remove(list_file)
        except OSError:
            pass


def trim_video_ffmpeg(input_path: str, output_path: str, target_duration: float):
    """Trim video to exactly target_duration seconds using FFmpeg."""
    ffmpeg_path = None
    try:
        import imageio_ffmpeg
        ffmpeg_path = imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        ffmpeg_path = shutil.which("ffmpeg")

    if not ffmpeg_path:
        shutil.copy2(input_path, output_path)
        return

    result = subprocess.run(
        [
            ffmpeg_path, "-y",
            "-i", input_path,
            "-t", f"{target_duration:.2f}",
            "-c", "copy",
            "-avoid_negative_ts", "make_zero",
            output_path,
        ],
        capture_output=True,
        text=True,
        timeout=60,
    )

    if result.returncode != 0:
        logger.warning(f"FFmpeg trim failed, using untrimmed: {result.stderr[:200]}")
        shutil.copy2(input_path, output_path)


def get_video_duration(path: str) -> float:
    """Get video duration in seconds via ffprobe."""
    try:
        ffmpeg_path = None
        try:
            import imageio_ffmpeg
            ffmpeg_path = imageio_ffmpeg.get_ffmpeg_exe()
        except Exception:
            ffmpeg_path = shutil.which("ffmpeg")

        if not ffmpeg_path:
            return 0.0

        # Try ffprobe first
        ffprobe = ffmpeg_path.replace("ffmpeg", "ffprobe").replace("ffmpeg.exe", "ffprobe.exe")
        if not os.path.exists(ffprobe):
            ffprobe = shutil.which("ffprobe") or ffmpeg_path

        result = subprocess.run(
            [
                ffprobe,
                "-v", "quiet",
                "-show_entries", "format=duration",
                "-of", "csv=p=0",
                path,
            ],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if result.returncode == 0 and result.stdout.strip():
            return float(result.stdout.strip())
    except Exception:
        pass
    return 0.0


def interpolate_clip_ffmpeg(input_path: str, output_path: str, target_fps: int) -> bool:
    """Interpolate a video clip to a higher FPS using FFmpeg minterpolate.
    
    Uses motion interpolation to generate intermediate frames, producing
    smoother playback. This is CPU-intensive but runs after GPU work.
    
    Returns True on success, False on failure (caller should keep original).
    """
    ffmpeg_path = None
    try:
        import imageio_ffmpeg
        ffmpeg_path = imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        ffmpeg_path = shutil.which("ffmpeg")

    if not ffmpeg_path:
        logger.warning("FFmpeg not available for interpolation")
        return False

    try:
        result = subprocess.run(
            [
                ffmpeg_path, "-y",
                "-i", input_path,
                "-filter:v",
                f"minterpolate=fps={target_fps}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1",
                "-c:v", "libx264",
                "-preset", "fast",
                "-crf", "20",
                "-pix_fmt", "yuv420p",
                "-an",  # No audio to interpolate
                output_path,
            ],
            capture_output=True,
            text=True,
            timeout=300,  # 5 min max for a short clip
        )
        if result.returncode != 0:
            logger.warning(f"FFmpeg minterpolate failed: {result.stderr[:200]}")
            return False
        if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
            return False
        return True
    except subprocess.TimeoutExpired:
        logger.warning("FFmpeg interpolation timed out")
        return False
    except Exception as e:
        logger.warning(f"Interpolation error: {e}")
        return False


# ── Main Job Processor ───────────────────────────────────────────────

def process_job(job: Job, request_data: dict):
    """Run video generation in a background thread with GPU lock.

    Flow:
    1. Acquire GPU lock (only one generation at a time)
    2. Validate inputs
    3. Load model if needed
    4. Generate clip(s) sequentially
    5. Concatenate and trim
    6. Validate output MP4
    7. Return base64 video
    8. Release GPU lock in finally block
    """
    global currently_processing
    temp_files = []

    try:
        # ── Acquire GPU lock ──────────────────────────────────
        logger.info(f"Job {job.job_id}: waiting for GPU lock...")
        if not gpu_lock.acquire(timeout=10):
            _update_job(job, status="failed", error="GPU is busy. Another generation is in progress. Please wait.")
            return

        currently_processing = job.job_id
        _update_job(job, status="processing")

        try:
            _process_job_inner(job, request_data, temp_files)
        finally:
            currently_processing = None
            gpu_lock.release()

    except Exception as e:
        logger.error(f"Job {job.job_id} unexpected error: {e}")
        _update_job(job, status="failed", error=f"Unexpected error: {str(e)[:200]}")

    finally:
        # Clean up ALL temp files
        for f in temp_files:
            try:
                if os.path.exists(f):
                    os.remove(f)
            except OSError:
                pass


def _process_job_inner(job: Job, request_data: dict, temp_files: list):
    """Inner job processing (runs under GPU lock)."""
    # ── Load model ─────────────────────────────────────────────
    load_model()

    if job.cancelled:
        _update_job(job, status="failed", error="Job was cancelled")
        return

    # ── Validate input image ───────────────────────────────────
    image_data = request_data.get("image")
    image = None
    if image_data and isinstance(image_data, str):
        if not validate_image_data(image_data):
            _update_job(job, status="failed", error="Invalid input image. Please regenerate the scene image.")
            return

        try:
            if "," in image_data:
                _, b64data = image_data.split(",", 1)
            else:
                b64data = image_data
            image_bytes = base64.b64decode(b64data)
            from PIL import Image
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            target_w = VIDEO_WIDTH if VIDEO_WIDTH > 0 else 1024
            target_h = VIDEO_HEIGHT if VIDEO_HEIGHT > 0 else 576
            image = image.resize((target_w, target_h), Image.LANCZOS)
        except Exception as e:
            _update_job(job, status="failed", error=f"Failed to decode input image: {str(e)[:100]}")
            return
    else:
        logger.warning("No input image — using placeholder")
        target_w = VIDEO_WIDTH if VIDEO_WIDTH > 0 else 1024
        target_h = VIDEO_HEIGHT if VIDEO_HEIGHT > 0 else 576
        image = Image.new("RGB", (target_w, target_h), (30, 30, 40))

    # ── Determine clip parameters ──────────────────────────────
    dev = model_info.get("device", "cpu")
    num_frames = VIDEO_FRAMES if VIDEO_FRAMES > 0 else (14 if dev == "cuda" else 25)
    decode_chunks = DECODE_CHUNKS if DECODE_CHUNKS > 0 else (4 if dev == "cuda" else 8)
    num_steps = VIDEO_STEPS if VIDEO_STEPS > 0 else None

    clip_duration = num_frames / VIDEO_FPS

    # Calculate clips needed
    target_duration = request_data.get("target_duration", 0)
    if target_duration and isinstance(target_duration, (int, float)) and target_duration > clip_duration:
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

    # Continuity: enabled by default for multi-clip generation
    use_continuity = request_data.get("continuity", True) and num_clips > 1

    # ── Generate clip(s) with continuity ──────────────────────
    t_total_start = time.time()
    clip_paths = []
    continuity_image = None  # Last frame of previous clip (for continuity)

    for clip_idx in range(num_clips):
        if job.cancelled:
            break

        logger.info(f"Job {job.job_id}: generating clip {clip_idx + 1}/{num_clips}...")
        _update_job(job, progress=f"Clip {clip_idx + 1}/{num_clips}")
        t_clip_start = time.time()

        try:
            clip_path, clip_size, clip_dur, last_frame = generate_single_clip(
                image, job.job_id, clip_idx, gen_kwargs, VIDEO_FPS,
                start_image=continuity_image,
            )

            # ── Frame interpolation (optional, CPU-based) ──────────────
            if VIDEO_INTERPOLATION == "ffmpeg" and VIDEO_TARGET_FPS > VIDEO_FPS:
                interp_path = os.path.join(
                    _get_temp_dir(), f"svd_{job.job_id}_clip{clip_idx}_interp.mp4"
                )
                _update_job(job, progress=f"Clip {clip_idx + 1}/{num_clips} — interpolating to {VIDEO_TARGET_FPS} FPS")
                t_interp_start = time.time()
                if interpolate_clip_ffmpeg(clip_path, interp_path, VIDEO_TARGET_FPS):
                    # Replace original clip with interpolated version
                    try:
                        os.remove(clip_path)
                    except OSError:
                        pass
                    clip_path = interp_path
                    clip_size = os.path.getsize(interp_path)
                    logger.info(
                        f"Interpolated clip {clip_idx + 1}: {VIDEO_FPS} → {VIDEO_TARGET_FPS} FPS, "
                        f"{time.time() - t_interp_start:.1f}s, {clip_size/1024:.0f} KB"
                    )
                else:
                    logger.warning(f"Interpolation failed for clip {clip_idx + 1}, keeping original {VIDEO_FPS} FPS")
                    try:
                        os.remove(interp_path)
                    except OSError:
                        pass

            clip_paths.append(clip_path)
            temp_files.append(clip_path)
        except RuntimeError as e:
            error_msg = str(e)
            if "out of memory" in error_msg.lower() or "oom" in error_msg.lower():
                # Clean GPU memory
                try:
                    import torch
                    if torch.cuda.is_available():
                        torch.cuda.empty_cache()
                except Exception:
                    pass

                # Retry once with preview settings if enabled
                if VIDEO_OOM_RETRY and not getattr(job, '_oom_retried', False):
                    job._oom_retried = True
                    retry_kwargs = {
                        "num_frames": 8,
                        "num_inference_steps": 3,
                        "decode_chunk_size": gen_kwargs.get("decode_chunk_size", 4),
                    }
                    logger.warning(
                        f"Job {job.job_id}: OOM on clip {clip_idx + 1}, "
                        f"retrying with preview settings (8 frames, 3 steps)"
                    )
                    _update_job(job, progress=f"Clip {clip_idx + 1}/{num_clips} — retrying with less VRAM")
                    try:
                        clip_path, clip_size, clip_dur, last_frame = generate_single_clip(
                            image, job.job_id, clip_idx, retry_kwargs, VIDEO_FPS,
                            start_image=continuity_image,
                        )
                        clip_paths.append(clip_path)
                        temp_files.append(clip_path)
                    except RuntimeError as retry_err:
                        _update_job(
                            job,
                            status="failed",
                            error=f"GPU ran out of memory (even after retry): {str(retry_err)[:150]}",
                        )
                        return
                else:
                    _update_job(
                        job,
                        status="failed",
                        error="GPU ran out of memory. Try reducing VIDEO_FRAMES or VIDEO_STEPS.",
                    )
                    return
            else:
                raise

        t_clip_end = time.time()
        logger.info(
            f"Clip {clip_idx + 1}/{num_clips} done: "
            f"{clip_size/1024:.0f} KB, {t_clip_end - t_clip_start:.1f}s"
        )

        # Set up continuity for next clip (clip N+1 starts from clip N's final frame)
        if use_continuity and clip_idx < num_clips - 1:
            continuity_image = last_frame  # Primary: from pipeline output (fast, no FFmpeg)
            if continuity_image is None:
                # Fallback: extract from encoded MP4 (slower, uses FFmpeg)
                continuity_image = extract_last_frame_from_video(clip_path)
            if continuity_image is not None:
                logger.info(f"Continuity: clip {clip_idx + 2} will start from last frame of clip {clip_idx + 1}")
            else:
                logger.warning(f"Continuity: failed to extract last frame, clip {clip_idx + 2} will use original image")

        # Free GPU memory between clips
        if dev == "cuda":
            try:
                import torch
                torch.cuda.empty_cache()
            except Exception:
                pass

        if job.cancelled:
            break

    if job.cancelled:
        _update_job(job, status="failed", error="Job was cancelled")
        return

    if not clip_paths:
        _update_job(job, status="failed", error="No clips were generated")
        return

    # ── Concatenate clips ──────────────────────────────────────
    if len(clip_paths) > 1:
        logger.info(f"Job {job.job_id}: concatenating {len(clip_paths)} clips...")
        _update_job(job, progress=f"Combining {len(clip_paths)} clips")

        final_path = os.path.join(_get_temp_dir(), f"svd_{job.job_id}_final.mp4")
        try:
            concat_clips_with_ffmpeg(clip_paths, final_path)
            temp_files.append(final_path)
        except RuntimeError as e:
            _update_job(job, status="failed", error=f"Video concatenation failed: {str(e)[:200]}")
            return
    else:
        final_path = clip_paths[0]

    # ── Trim to target duration ────────────────────────────────
    trimmed_path = None
    if target_duration and isinstance(target_duration, (int, float)) and target_duration > 0:
        untrimmed_duration = get_video_duration(final_path)
        if untrimmed_duration > 0 and untrimmed_duration > target_duration + 0.1:
            trimmed_path = os.path.join(_get_temp_dir(), f"svd_{job.job_id}_trimmed.mp4")
            logger.info(f"Job {job.job_id}: trimming {untrimmed_duration:.1f}s → {target_duration:.1f}s")
            _update_job(job, progress="Trimming to target duration")
            try:
                trim_video_ffmpeg(final_path, trimmed_path, target_duration)
                if os.path.exists(trimmed_path) and os.path.getsize(trimmed_path) > 0:
                    temp_files.append(trimmed_path)
                    final_path = trimmed_path
                else:
                    logger.warning("Trim failed, using untrimmed output")
                    trimmed_path = None
            except Exception as e:
                logger.warning(f"Trim error: {e}, using untrimmed output")
                trimmed_path = None

    # ── Validate final MP4 ─────────────────────────────────────
    _update_job(job, progress="Validating output")
    if not validate_mp4_file(final_path):
        _update_job(job, status="failed", error="Generated video is not a valid MP4 file")
        return

    # ── Read and encode ────────────────────────────────────────
    with open(final_path, "rb") as f:
        video_bytes = f.read()

    t_total_end = time.time()
    total_time = t_total_end - t_total_start

    if len(video_bytes) == 0:
        _update_job(job, status="failed", error="Generated video is empty")
        return

    # Get actual duration
    actual_output_duration = get_video_duration(final_path)
    if actual_output_duration <= 0:
        actual_output_duration = actual_duration

    video_b64 = base64.b64encode(video_bytes).decode("utf-8")
    video_url = f"data:video/mp4;base64,{video_b64}"

    # Log timing breakdown
    t_total_end = time.time()
    total_time = t_total_end - t_total_start
    logger.info(
        f"Job {job.job_id} completed: {len(clip_paths)} clip(s), "
        f"{actual_output_duration:.1f}s video, {len(video_bytes)/1024:.0f} KB, "
        f"total={total_time:.1f}s ({total_time/60:.1f} min), "
        f"frames={num_frames}, steps={num_steps or 'default'}, "
        f"continuity={'on' if num_clips > 1 else 'n/a'}"
    )

    # Free GPU memory
    if dev == "cuda":
        try:
            import torch
            torch.cuda.empty_cache()
        except Exception:
            pass

    _update_job(
        job,
        status="completed",
        video_url=video_url,
        progress=None,
        duration=actual_output_duration,
    )


# ── FastAPI Application ──────────────────────────────────────────────

try:
    from fastapi import FastAPI, HTTPException
    from fastapi.responses import JSONResponse
    import uvicorn

    app = FastAPI(
        title="PAT Orbit Local Video Engine",
        description="Local inference server for open-source video generation",
        version="3.0.0",
    )

    @app.get("/health")
    async def health_check():
        """Comprehensive health check with diagnostics."""
        device = get_device()
        uptime = time.time() - SERVER_START_TIME

        # Check FFmpeg availability
        ffmpeg_ok = False
        try:
            import imageio_ffmpeg
            ffmpeg_path = imageio_ffmpeg.get_ffmpeg_exe()
            ffmpeg_ok = os.path.exists(ffmpeg_path)
        except Exception:
            ffmpeg_ok = shutil.which("ffmpeg") is not None

        # GPU memory (if available)
        gpu_mem_info = {}
        if device == "cuda":
            try:
                import torch
                if torch.cuda.is_available():
                    allocated = torch.cuda.memory_allocated(0) / (1024 ** 3)
                    reserved = torch.cuda.memory_reserved(0) / (1024 ** 3)
                    total = getattr(
                        torch.cuda.get_device_properties(0),
                        "total_memory",
                        getattr(torch.cuda.get_device_properties(0), "total_mem", 0),
                    ) / (1024 ** 3)
                    gpu_mem_info = {
                        "allocated_gb": round(allocated, 2),
                        "reserved_gb": round(reserved, 2),
                        "total_gb": round(total, 2),
                        "free_gb": round(total - allocated, 2),
                    }
            except Exception:
                pass

        return {
            "status": "ok",
            "version": "3.0.0",
            "engine": "svd-xt-1.1",
            "model": MODEL_ID,
            "device": model_info.get("device", device),
            "gpu_name": model_info.get("gpu_name", "N/A"),
            "vram": model_info.get("vram", "N/A"),
            "quality_preset": VIDEO_QUALITY,
            "config": {
                "frames": model_info.get("frames", "auto"),
                "steps": model_info.get("steps", "default"),
                "fps": VIDEO_FPS,
                "width": VIDEO_WIDTH or 1024,
                "height": VIDEO_HEIGHT or 576,
                "decode_chunks": model_info.get("decode_chunks", "auto"),
            },
            "interpolation": {
                "enabled": VIDEO_INTERPOLATION != "none",
                "method": VIDEO_INTERPOLATION,
                "target_fps": VIDEO_TARGET_FPS if VIDEO_INTERPOLATION != "none" else None,
            },
            "oom_retry": VIDEO_OOM_RETRY,
            "temp_dir": _get_temp_dir(),
            "gpu": gpu_mem_info,
            "ffmpeg_available": ffmpeg_ok,
            "model_loaded": pipeline is not None,
            "jobs": {
                "active": currently_processing,
                "total_tracked": len(jobs),
                "queued": sum(1 for j in jobs.values() if j.status == "queued"),
                "processing": sum(1 for j in jobs.values() if j.status == "processing"),
                "completed": sum(1 for j in jobs.values() if j.status == "completed"),
                "failed": sum(1 for j in jobs.values() if j.status == "failed"),
            },
            "uptime_seconds": round(uptime, 0),
        }

    @app.post("/generate")
    async def generate_video(request_data: dict):
        """Start video generation. Returns a job_id for polling."""
        prompt = request_data.get("prompt", "")
        if not prompt or not isinstance(prompt, str) or not prompt.strip():
            raise HTTPException(status_code=400, detail="prompt is required")

        # Quick server-side validation
        image_data = request_data.get("image")
        if image_data and isinstance(image_data, str):
            if not validate_image_data(image_data):
                raise HTTPException(
                    status_code=400,
                    detail="Invalid image data. Please regenerate the scene image.",
                )

        # Continuity: enabled by default for multi-clip, can be disabled
        continuity = request_data.get("continuity", True)

        # Check if GPU is already busy
        with jobs_lock:
            if currently_processing:
                # Allow queuing but warn
                logger.info(f"GPU busy ({currently_processing}), job will queue")

        job_id = f"local-{uuid.uuid4().hex[:12]}"
        job = Job(job_id=job_id)

        with jobs_lock:
            jobs[job_id] = job

        thread = threading.Thread(target=process_job, args=(job, request_data), daemon=True)
        thread.start()

        return {"job_id": job_id, "status": "queued"}

    @app.get("/status/{job_id}")
    async def get_status(job_id: str):
        """Poll job status with progress info."""
        with jobs_lock:
            job = jobs.get(job_id)

        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        result = {
            "job_id": job.job_id,
            "status": job.status,
            "video_url": job.video_url,
            "error": job.error,
            "progress": job.progress,
            "duration": job.duration,
            "created_at": job.created_at,
            "updated_at": job.updated_at,
        }
        return result

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

    logger.info("=" * 60)
    logger.info("PAT Orbit Local Video Engine v3.0.0")
    logger.info(f"Port: {PORT}")
    logger.info(f"Model: {MODEL_ID}")
    logger.info(f"Device: {get_device()}")
    logger.info(f"Quality: {VIDEO_QUALITY}")
    logger.info(f"Frames: {VIDEO_FRAMES or 'auto'}, Steps: {VIDEO_STEPS or 'auto'}, FPS: {VIDEO_FPS}")
    logger.info(f"Resolution: {VIDEO_WIDTH or 1024}x{VIDEO_HEIGHT or 576}")
    logger.info(f"Interpolation: {VIDEO_INTERPOLATION} (target: {VIDEO_TARGET_FPS} FPS)")
    logger.info(f"OOM retry: {VIDEO_OOM_RETRY}, Temp: {_get_temp_dir()}")
    logger.info("=" * 60)
    uvicorn.run(app, host="0.0.0.0", port=PORT, log_level="info")
