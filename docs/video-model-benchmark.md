# PAT Orbit Video Model Benchmark

> **Date:** August 31, 2026
> **Current Baseline:** Stable Video Diffusion (SVD-XT 1.1) — 55 min/2s clip on RTX 3050 6GB
> **Goal:** Find faster, higher-quality open-source models for local video generation

---

## Candidates Evaluated

### 1. Stable Video Diffusion (SVD-XT 1.1) — Current Baseline

| Property | Value |
|----------|-------|
| Provider | Stability AI |
| Model | `stabilityai/stable-video-diffusion-img2vid-xt` |
| Parameters | ~2.4B |
| Image-to-video | ✅ Native (image-in, video-out) |
| Text-to-video | ❌ No text prompt support |
| Min VRAM | 8 GB (CUDA), 6 GB with CPU offload |
| RTX 3050 6GB | ✅ Works with `enable_model_cpu_offload()` |
| Output frames | 14–25 |
| Output resolution | 1024×576 (16:9) |
| FPS | 7–14 |
| Duration | ~1.8–3.5 seconds |
| Quality | Decent motion, limited temporal coherence |
| License | Stability AI Community License |
| HuggingFace | `stabilityai/stable-video-diffusion-img2vid-xt` |
| Generation speed (RTX 3050 6GB) | **~55 minutes** (CPU offload, 14 frames) |
| Generation speed (RTX 4090 24GB) | ~30–60 seconds |

**Pros:** Works on 6GB VRAM. Mature, stable, well-documented. Pure image-to-video.
**Cons:** Very slow on low VRAM. No text prompt control. Only ~2 seconds of video. Low motion complexity.

---

### 2. Wan 2.1 T2V-1.3B (GGUF Q4)

| Property | Value |
|----------|-------|
| Provider | Alibaba (Wan-AI) |
| Model | `Wan-AI/Wan2.1-T2V-1.3B` (GGUF quantized) |
| Parameters | 1.3B (+ 9.4B T5-XXL text encoder, offloaded to CPU) |
| Image-to-video | ⚠️ Not natively — T2V only. I2V possible via VACE extension or img2vid workflow |
| Text-to-video | ✅ Native |
| Min VRAM | 4–6 GB (GGUF Q4) |
| RTX 3050 6GB | ✅ Fits in 6 GB with T5 CPU offload |
| Output frames | Up to 81 frames |
| Output resolution | 480p (native), 720p possible |
| FPS | 16 |
| Duration | Up to 5 seconds at 480p |
| Quality | Good motion, decent coherence for its size. Much better than SVD at motion quality. |
| License | Apache 2.0 |
| HuggingFace | `Wan-AI/Wan2.1-T2V-1.3B` |
| Generation speed (RTX 3050 6GB) | **Estimated 10–30 minutes** for 4s at 480p (GGUF Q4 + T5 CPU offload) |
| Generation speed (RTX 4090 24GB) | ~4 minutes for 5s at 480p |

**Pros:** Apache 2.0 license. Text-prompt-driven. Active development (Wan 2.2 improvements). Works on 6GB. Produces 480p video up to 5 seconds.
**Cons:** No native image-to-video (would need VACE or separate I2V adapter). GGUF Q4 quality is reduced vs FP16. T5 encoder needs 24+ GB system RAM for CPU offload. 1.3B is the weakest variant.

---

### 3. Wan 2.1/2.2 TI2V-5B (Image-to-Video)

| Property | Value |
|----------|-------|
| Provider | Alibaba (Wan-AI) |
| Model | `Wan-AI/Wan2.2-TI2V-5B` |
| Parameters | 5B (+ 4.7B text encoder) |
| Image-to-video | ✅ Native (text + image → video) |
| Text-to-video | ✅ Native |
| Min VRAM | 8–12 GB (FP8), 6–8 GB (FP8 + CPU offload) |
| RTX 3050 6GB | ⚠️ Marginal — possible with aggressive CPU offload, but generation would be very slow |
| RTX 3060 12GB | ✅ Good fit with FP8 |
| Output frames | Up to 81 frames |
| Output resolution | 480p–720p |
| FPS | 16 |
| Duration | Up to 5 seconds |
| Quality | Strong — significant improvement over 1.3B |
| License | Apache 2.0 |
| HuggingFace | `Wan-AI/Wan2.2-TI2V-5B` |
| Generation speed (RTX 3060 12GB) | **Estimated 5–15 minutes** for 4s at 480p |
| Generation speed (RTX 4090 24GB) | ~60–120 seconds |

**Pros:** Native image-to-video. Text-prompt control. Apache 2.0. Best quality-to-size ratio. This is the ideal target for a GPU upgrade.
**Cons:** Too slow/VRAM-heavy for RTX 3050 6GB as primary engine. Needs 12+ GB for practical use.

---

### 4. Wan 2.1/2.2 14B (GGUF Q4/Q5 + T5 CPU offload)

| Property | Value |
|----------|-------|
| Provider | Alibaba (Wan-AI) |
| Model | `Wan-AI/Wan2.2-14B` (GGUF quantized) |
| Parameters | 14B (+ 9.4B T5-XXL) |
| Image-to-video | ⚠️ T2V only (I2V via VACE) |
| Text-to-video | ✅ Native |
| Min VRAM | 6–10 GB (GGUF Q4/Q5 + T5 CPU offload) |
| RTX 3050 6GB | ⚠️ Tight — GGUF Q4 at 480p only, very slow |
| RTX 3060 12GB | ✅ GGUF Q5 at 480p works well |
| Output resolution | 480p (6GB), 720p (12GB+) |
| Quality | Excellent — the flagship open-source video model |
| License | Apache 2.0 |
| Generation speed (RTX 3060 12GB) | **Estimated 10–20 minutes** for 4s at 480p |
| Generation speed (RTX 4090 24GB) | 60–120 seconds at 720p |

**Pros:** Best quality among open-source models. Apache 2.0. Massive community support. The gold standard for open video generation.
**Cons:** Still T2V (not I2V without VACE). Very slow on 6GB. Requires 32+ GB system RAM for T5 offload.

---

### 5. LTX-Video 2B

| Property | Value |
|----------|-------|
| Provider | Lightricks |
| Model | `Lightricks/LTX-Video` |
| Parameters | 2B |
| Image-to-video | ✅ Native |
| Text-to-video | ✅ Native |
| Min VRAM | 12 GB (FP16) |
| RTX 3050 6GB | ❌ Too low VRAM |
| RTX 3060 12GB | ⚠️ Possible at lower resolution |
| Output resolution | 768×512 at 25 frames |
| Quality | Good — DiT-based, smooth motion |
| License | Apache 2.0 |
| HuggingFace | `Lightricks/LTX-Video` |
| Generation speed (RTX 3060 12GB) | **Estimated 3–8 minutes** |

**Pros:** Native image-to-video. Compact architecture. Good quality for its size.
**Cons:** 12 GB minimum VRAM rules out RTX 3050 6GB. Slower development pace vs Wan.

---

### 6. LTX-Video 2.3+

| Property | Value |
|----------|-------|
| Provider | Lightricks |
| Model | Latest LTX variants |
| Min VRAM | 24–32 GB (distilled), 48+ GB (full) |
| RTX 3050 6GB | ❌ Cannot run |
| RTX 3060 12GB | ❌ Cannot run |
| Quality | Excellent — 4K native, 50 FPS |
| License | Apache 2.0 |

**Pros:** State-of-the-art when hardware allows.
**Cons:** Completely out of reach for consumer GPUs under 24 GB. Not viable for PAT Orbit's current hardware.

---

### 7. HunyuanVideo 1.5

| Property | Value |
|----------|-------|
| Provider | Tencent |
| Model | `Tencent-Hunyuan/HunyuanVideo-1.5` |
| Parameters | 8.3B |
| Image-to-video | ⚠️ Limited — primarily T2V |
| Text-to-video | ✅ Native |
| Min VRAM | 14 GB (FP8 + offload), 24 GB (FP8 on GPU) |
| RTX 3050 6GB | ❌ Cannot run |
| RTX 3060 12GB | ❌ Too low |
| Quality | Excellent — considered best open-source quality |
| License | Tencent Hunyuan Community License |
| Generation speed (RTX 4090 24GB) | ~3–5 minutes |

**Pros:** Highest quality open-source video model. Strong temporal coherence.
**Cons:** 14+ GB minimum. Not accessible for current hardware. Primarily T2V, not I2V.

---

### 8. CogVideoX 5B

| Property | Value |
|----------|-------|
| Provider | Zhipu AI |
| Model | `THUDM/CogVideoX-5B` |
| Parameters | 5B |
| Image-to-video | ✅ CogVideoX1.5-5B-I2V variant |
| Text-to-video | ✅ Native |
| Min VRAM | 5–8 GB (optimized) |
| RTX 3050 6GB | ⚠️ Possible at low resolution with optimization |
| Output resolution | 1360px native (1.5 variant), 480p (base) |
| Duration | Up to 10 seconds (1.5 variant) |
| Quality | Good — smooth motion, good coherence |
| License | Apache 2.0 |
| HuggingFace | `THUDM/CogVideoX-5B` |
| Generation speed (RTX 3050 6GB) | **Estimated 15–45 minutes** for 6s |

**Pros:** Native image-to-video in I2V variant. Apache 2.0. Up to 10 seconds. Works on 5+ GB with optimizations.
**Cons:** Older architecture, slower than Wan. Less active development. Quality below Wan 2.2.

---

## Comparison Matrix

| Model | I2V | T2V | 6GB RTX 3050 | 12GB RTX 3060 | Speed (6GB) | Speed (12GB) | Quality | Duration | License |
|-------|-----|-----|-------------|---------------|-------------|--------------|---------|----------|---------|
| **SVD-XT** | ✅ | ❌ | ✅ | ✅ | 55 min/2s | 10 min/2s | ★★☆☆☆ | 2s | Stability AI |
| **Wan 1.3B** | ❌* | ✅ | ✅ | ✅ | 10–30 min/4s | 5–10 min/4s | ★★★☆☆ | 5s | Apache 2.0 |
| **Wan TI2V-5B** | ✅ | ✅ | ⚠️ | ✅ | 30–60 min/4s | 5–15 min/4s | ★★★★☆ | 5s | Apache 2.0 |
| **Wan 14B** | ❌* | ✅ | ⚠️ | ✅ | Very slow | 10–20 min/4s | ★★★★★ | 5s | Apache 2.0 |
| **LTX-Video 2B** | ✅ | ✅ | ❌ | ⚠️ | N/A | 3–8 min/3s | ★★★☆☆ | 3s | Apache 2.0 |
| **CogVideoX 5B** | ✅ | ✅ | ⚠️ | ✅ | 15–45 min/6s | 5–15 min/6s | ★★★☆☆ | 6s–10s | Apache 2.0 |
| **HunyuanVideo 1.5** | ⚠️ | ✅ | ❌ | ❌ | N/A | N/A | ★★★★★ | 5s | Tencent |

\* T2V only; I2V possible via VACE extension

---

## Recommendations

### 1. Best Model for RTX 3050 6GB

**🏆 Wan 2.1 T2V-1.3B GGUF Q4**

- **Why:** It actually fits in 6 GB VRAM. Apache 2.0. Produces 480p video up to 5 seconds. While it's T2V-only, PAT Orbit can combine it with existing Gemini-generated images to create video prompts.
- **Speed:** ~10–30 minutes per 4s clip (vs 55 minutes for SVD's 2-second clip)
- **Quality:** Significantly better motion and temporal coherence than SVD
- **Trade-off:** T2V-only means no direct image-to-video. Would need to combine text prompts with image description rather than feeding the image directly.
- **Alternative:** CogVideoX 5B with aggressive optimization, but slower and less community support.

### 2. Best Model if We Later Buy a 12–16GB GPU

**🏆 Wan 2.2 TI2V-5B (FP8)**

- **Why:** Native image-to-video with text control. 5B parameters produce dramatically better results than 1.3B. Fits comfortably in 12 GB VRAM.
- **Speed:** ~5–15 minutes per 4s clip at 480p on an RTX 3060 12GB
- **Quality:** ★★★★☆ — smooth motion, good character consistency, text-controlled
- **This is the target for PAT Orbit's next video engine.**

### 3. Best Overall Model for PAT Orbit

**🏆 Wan 2.2 TI2V-5B**

- **Why:** It's the intersection of quality, speed, I2V support, license, and accessibility. Apache 2.0. Native image-to-video. Runs on 12 GB. Active development. Massive community.
- **If hardware allows later:** Wan 2.2 14B GGUF would provide flagship quality.

### 4. Which Model to Implement Next

**🏆 Wan 2.1 T2V-1.3B GGUF Q4** (for current RTX 3050 6GB)

**OR**

**🏆 Wan 2.2 TI2V-5B** (if a GPU upgrade to 12 GB is planned)

**Recommended path:**
1. **Immediate:** Implement Wan 2.1 1.3B GGUF as a second engine alongside SVD. This gives a quality upgrade on current hardware.
2. **Next step:** When hardware is upgraded to 12+ GB, implement Wan 2.2 TI2V-5B. This is the primary long-term engine.
3. **Future:** Wan 2.2 14B GGUF as the flagship engine when 12–24 GB VRAM is available.

---

## Technical Integration Notes

All models can integrate through the existing `VideoEngine` interface:

```
src/lib/video/types.ts      → VideoGenerationRequest, VideoGenerationResult
src/lib/video/engine.ts     → Provider registry
src/lib/video/engines/      → Provider implementations
```

Each model needs:
- A Python inference server (like `server.py` for SVD)
- A TypeScript adapter implementing `VideoEngine`
- Environment variable for provider selection (`VIDEO_ENGINE=wan-1.3b`, `VIDEO_ENGINE=wan-5b`, etc.)

**Key differences from SVD:**
- Wan models use T5-XXL text encoder (9.4B params for 14B variant, 4.7B for 5B) — needs CPU offload and 24+ GB system RAM
- Wan TI2V-5B accepts both image AND text input — perfect for PAT Orbit's Director pipeline
- CogVideoX 5B I2V also accepts image + text — viable alternative

---

## License Summary

| Model | License | Commercial Use |
|-------|---------|----------------|
| SVD-XT | Stability AI Community | Yes (non-commercial needs approval) |
| Wan 2.1/2.2 (all) | Apache 2.0 | ✅ Yes |
| LTX-Video | Apache 2.0 | ✅ Yes |
| CogVideoX | Apache 2.0 | ✅ Yes |
| HunyuanVideo | Tencent Community | Yes (with conditions) |

Apache 2.0 is the most permissive. Wan 2.1/2.2 is the clear winner for commercial flexibility.

---

## Hardware Upgrade Path

| Current Hardware | Recommended Upgrade | Expected Improvement |
|------------------|--------------------|--------------------|
| RTX 3050 6GB | RTX 3060 12GB (~$200 used) | Wan 1.3B → fast, Wan TI2V-5B → feasible |
| RTX 3050 6GB | RTX 4060 Ti 16GB (~$400) | Wan 14B GGUF at 720p, Wan TI2V-5B fast |
| RTX 3050 6GB | RTX 4090 24GB (~$1500) | Wan 14B FP8 at 720p, 60–120s/clip |

**Best value upgrade:** RTX 3060 12GB — unlocks Wan TI2V-5B (native I2V), the ideal engine for PAT Orbit.
