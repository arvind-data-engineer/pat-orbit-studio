# PAT Orbit — No-GPU Production Plan

**Date:** September 1, 2026
**Status:** Active
**GPU Required:** None (RTX 3050 6GB is sufficient)

---

## Current Architecture (Verified Working)

- Unified VideoEngine registry
- getActiveEngine() single selection mechanism
- Shared generateVideo() service
- VideoConditioning + PromptBuilder
- Shared render-pipeline.ts / executeRender()
- SVD local engine with multi-clip generation
- Veo cloud engine
- GPU locking + OOM retry
- Scene-level crossfade transitions
- Clip-level crossfade transitions
- Project auto-save / import / export / rename / duplicate
- Generation time estimation
- Scene deletion with confirmation
- Generation cancellation (image/video/render)
- Batch image/video/voice generation
- Render retry
- Keyboard shortcuts (Ctrl+S, Ctrl+Enter, arrows, Esc)
- Cross-tab synchronization
- Input validation on render API
- Storage abstraction

---

## Audit Findings

### CRITICAL
*None found — previous phases have addressed critical issues.*

### HIGH

| # | Issue | File | Impact |
|---|-------|------|--------|
| 1 | Project card completion check hardcodes `>= 5` scenes | page.tsx | Projects with <5 scenes never show "completed" |
| 2 | Project card progress bar shows `/5` regardless of scene count | page.tsx | Misleading progress display |
| 3 | Project filter completion check hardcodes `>= 5` | page.tsx | "Done" filter misses/over-matches projects |
| 4 | page.tsx is 2971 lines — no component extraction | page.tsx | Maintainability risk |

### MEDIUM

| # | Issue | File | Impact |
|---|-------|------|--------|
| 5 | No drag-and-drop scene reordering | page.tsx | Scenes only reorderable with arrow buttons |
| 6 | Scene moveScene uses timestamp-based IDs | page.tsx | Potential ID collision |
| 7 | No ARIA labels on many interactive elements | page.tsx | Accessibility |

### LOW

| # | Issue | File | Impact |
|---|-------|------|--------|
| 8 | Dead blank lines in Icon object | page.tsx | Cosmetic |
| 9 | No scene number display in timeline cards | page.tsx | Minor UX |

---

## Implementation Plan

### Phase 1 — Fix Hardcoded Scene Counts (HIGH)
Fix the three locations that hardcode scene count to 5:
1. Project card completion: `imageCount >= 5 && videoCount >= 5`
2. Project card progress: `{scenesReady}/5`
3. Project filter: `imageCount >= 5 && videoCount >= 5`

### Phase 2 — Extract Icon Component (HIGH)
Move the ~100-line Icon object to `src/components/icons.tsx`.

### Phase 3 — Extract ProjectCard (MEDIUM)
Create `src/components/ProjectCard.tsx` for the ~100-line project card.

### Phase 4 — Documentation (LOW)
Update production docs.

---

## Classification by GPU Requirement

### SAFE NOW — No GPU Required
- Fix hardcoded scene counts
- Extract components
- Dead code cleanup
- Accessibility improvements
- Documentation updates

### TESTABLE NOW — Verify with RTX 3050
- All build/typecheck tests
- Component extraction (behavioral verification)
- Project card rendering

### GPU REQUIRED — Defer
- Wan 2.2 TI2V-5B integration
- Higher resolution (720p+)
- Longer native clips
- RIFE frame interpolation

---

## Testing Checklist

- [ ] `npx tsc --noEmit`
- [ ] `npm run build`
- [ ] Project card shows correct completion for 1-scene project
- [ ] Project card shows correct completion for 5-scene project
- [ ] Project filter "Done" works correctly
- [ ] No behavior change in existing features

---

## Files Expected to Change

| File | Change |
|------|--------|
| `src/components/icons.tsx` | NEW — extracted Icon component |
| `src/components/ProjectCard.tsx` | NEW — extracted project card |
| `src/app/page.tsx` | Fix hardcoded scene counts, import new components |
| `docs/no-gpu-production-plan.md` | NEW — this document |

---

## What Requires GPU Upgrade

1. Wan 2.2 TI2V-5B text+image→video
2. 720p+ resolution
3. 5s+ native clips
4. Faster generation
5. Character consistency via text conditioning
