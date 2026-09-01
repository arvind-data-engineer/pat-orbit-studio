# PAT Orbit — No-GPU Product Roadmap

**Date:** September 1, 2026  
**Baseline:** Commit 1c9d555  
**Hardware:** RTX 3050 6GB, 16GB RAM  

---

## Phase 1 — Critical Correctness

| # | File | Problem | User Impact | Fix | GPU? | Complexity |
|---|------|---------|-------------|-----|------|------------|
| 1.1 | page.tsx | Scene deletion has no confirmation — accidental click deletes scene + all generated assets | **Data loss** | Add confirmation dialog before delete | No | Low |
| 1.2 | page.tsx | Render has no cancel button — user stuck for minutes | **Stuck UI** | Add cancel render button + abort controller | No | Low |
| 1.3 | functions.ts | `generateMusicToneSync` is dead code — music generation moved to render-pipeline.ts | Code bloat | Remove dead function | No | Trivial |

## Phase 2 — User Experience

| # | File | Problem | User Impact | Fix | GPU? | Complexity |
|---|------|---------|-------------|-----|------|------------|
| 2.1 | page.tsx | No "Generate All Voice" batch button | Tedious 5-click process | Add batch voice button | No | Low |
| 2.2 | page.tsx | Batch generation has no per-scene progress | User sees nothing happening | Show batch progress counter | No | Medium |
| 2.3 | page.tsx | No render retry after failure | Must re-select all scenes | Add retry button after failed render | No | Low |
| 2.4 | page.tsx | No keyboard shortcut documentation visible | Users don't discover Ctrl+S, Ctrl+Enter, arrows | Add shortcuts tooltip in settings | No | Low |
| 2.5 | page.tsx | Settings dropdown is minimal — only toggles | Users can't see current values clearly | Improve settings display | No | Low |

## Phase 3 — Reliability

| # | File | Problem | User Impact | Fix | GPU? | Complexity |
|---|------|---------|-------------|-----|------|------------|
| 3.1 | render-pipeline.ts | Stale comment about caller cleanup after tempDir was moved | Confusing for maintainers | Fix comment | No | Trivial |
| 3.2 | page.tsx | Voice generation not deduplicated in batch mode | Duplicate API calls | Add dedup guard in batch loop | No | Low |
| 3.3 | page.tsx | Scene duration field accepts any string | Invalid durations cause render issues | Validate numeric input | No | Low |

## Phase 4 — Audio/Video Quality

| # | File | Problem | User Impact | Fix | GPU? | Complexity |
|---|------|---------|-------------|-----|------|------------|
| 4.1 | render-pipeline.ts | Music volume hardcoded at 0.15 | No user control | Add volume env var | No | Low |
| 4.2 | render-pipeline.ts | No handling for empty narration in caption filter | May produce empty captions | Skip empty narration | No | Low |

## Phase 5 — Performance (No New Hardware)

| # | File | Problem | User Impact | Fix | GPU? | Complexity |
|---|------|---------|-------------|-----|------|------------|
| 5.1 | page.tsx | Keyboard shortcut effect re-registers on every `sceneVideos` change | Minor: effect runs frequently | Use ref for sceneVideos check | No | Low |

## Phase 6 — Code Maintainability

| # | File | Problem | User Impact | Fix | GPU? | Complexity |
|---|------|---------|-------------|-----|------|------------|
| 6.1 | page.tsx | ~2930 lines in single component | Hard to maintain | Extract components (future) | No | High |

---

## Implementation Plan

### This Session (Highest Value)
1. Scene deletion confirmation (1.1)
2. Render cancel button (1.2)
3. Remove dead code (1.3)
4. Batch voice generation (2.1)
5. Batch progress display (2.2)
6. Render retry (2.3)
7. Voice batch dedup (3.2)
8. Fix stale comment (3.1)

### Future Sessions
- Keyboard shortcuts tooltip (2.4)
- Settings improvements (2.5)
- Scene duration validation (3.3)
- Music volume control (4.1)
- Caption empty narration handling (4.2)
- Component extraction (6.1)
