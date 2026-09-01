# PAT Orbit — Product Completion Audit

**Date:** September 1, 2026  
**Baseline:** Commit 660b45c  

---

## Priority Table

| # | Severity | File | Problem | User Impact | Fix | GPU? |
|---|----------|------|---------|-------------|-----|------|
| 1 | **CRITICAL** | page.tsx | No scene deletion — users cannot remove unwanted scenes | Cannot clean up AI-generated mistakes | Add deleteScene function + UI | No |
| 2 | **HIGH** | page.tsx | No cancel button for ongoing generation — abort controllers exist but no UI | Users stuck waiting for generation they don't want | Add cancel button during generation | No |
| 3 | **HIGH** | page.tsx | Toast timeouts not cleaned up on unmount — stale setToast(null) fires after navigation | Minor: toast may flash after leaving page | Track timeouts in ref, clear on unmount | No |
| 4 | **MEDIUM** | page.tsx | Dead imports: `RegenerationTarget`, `useCallback` | Code cleanliness | Remove unused imports | No |
| 5 | **MEDIUM** | page.tsx | `loadProjects` useEffect only runs on mount — no cross-tab sync | Changes in another tab not reflected | Add storage event listener | No |
| 6 | **MEDIUM** | page.tsx | No "Generate All Images" batch button | Tedious to generate 5 scenes one-by-one | Add batch generation button | No |
| 7 | **LOW** | page.tsx | No keyboard shortcut for render (Ctrl+Enter) | Power users must click | Add shortcut | No |
| 8 | **LOW** | page.tsx | `sceneDuration` field defaults to "10" but is stored as string — parseInt can silently fail | Confusing duration behavior | Validate on input | No |

---

## Audit Summary

### Project Lifecycle ✅
- Create, rename, duplicate, delete all work
- Auto-save with 2s debounce works
- Import/export with schema validation works
- Unsaved changes tracked correctly
- Legacy format migration works

### Scene Workflow ⚠️
- Duplicate and reorder work
- **Missing: scene deletion**
- Scene editing with Director metadata works
- Generated asset state tracking works

### Generation UX ⚠️
- Dedup guards prevent double-clicks
- Progress reporting from server works
- **Missing: cancel button for ongoing generation**
- Error messages are user-friendly

### Render Pipeline ✅
- Crossfade + captions now work (bug fixed in last commit)
- Transition duration validated and auto-clamped
- Both sync and Inngest paths use shared pipeline

### Storage ✅
- localStorage abstraction clean
- Auto-save reliable
- Import/export validated
- Quota monitoring present

### Error Handling ✅
- API failures show useful messages
- OOM retry exists
- Local server unavailable shows clear error
- Render failures handled gracefully

### Security ✅
- No secrets in client code
- Local server on localhost
- FFmpeg arguments safely constructed
- Input validation present
