"use client";

import { useEffect, useRef, useState } from "react";
import { analyzeRegenerationRequest } from "@/lib/ai/regeneration";
import type { DirectorScene, ProductionPlan } from "@/lib/ai/director-schema";
import { loadProjects, saveProjects as storageSaveProjects, createAutoSave, getStorageInfo } from "@/lib/storage";
import { downloadProjectFile, importProject, readFileAsText } from "@/lib/project-serialization";
import { getQuickEstimate } from "@/lib/generation-estimator";
import { Icon } from "@/components/icons";
import { CreateScreen } from "@/components/video/CreateScreen";
import { WorkspaceView } from "@/components/video/WorkspaceView";
import { ProjectGrid } from "@/components/video/ProjectGrid";
import type { Scene, StoryResult, Character, Project } from "@/components/video/types";
import { TEMPLATES, MUSIC_DESCRIPTIONS, getInitials, CHAR_COLORS } from "@/components/video/types";



/* ------------------------------------------------------------------ */
/*  Regeneration helpers                                               */
/* ------------------------------------------------------------------ */

/** Map the page.tsx Scene type to DirectorScene for the regeneration planner. */
function sceneToDirectorScene(scene: Scene, sceneIdx: number, style: string): DirectorScene {
  return {
    id: `scene-${scene.id}`,
    title: scene.title,
    purpose: sceneIdx === 0 ? "hook" : sceneIdx === 1 ? "development" : sceneIdx === 2 ? "turning-point" : sceneIdx === 3 ? "climax" : "resolution",
    beat: scene.beat || "",
    duration: parseInt(scene.sceneDuration || "10", 10) || 10,
    narration: scene.narration,
    characters: [],
    visual: {
      subject: scene.visual,
      environment: "",
      action: "",
      lighting: "",
      composition: "",
      visualStyle: style,
    },
    camera: scene.directorCamera ? { ...scene.directorCamera } : { shotType: "medium", angle: "eye-level", movement: "static", framing: "centered" },
    motion: scene.directorMotion ? { ...scene.directorMotion, intensity: scene.directorMotion.intensity as "subtle" | "moderate" | "dramatic" } : { subjectMovement: "none", environmentMovement: "none", intensity: "subtle" as const },
    voice: scene.directorVoice ? { ...scene.directorVoice, voice: scene.directorVoice.voice as "Natural" | "Deep" | "Soft", pace: scene.directorVoice.pace as "slow" | "moderate" | "fast" } : { voice: "Natural" as const, emotion: "neutral", pace: "moderate" as const, emphasis: "" },
    continuityBefore: scene.directorContinuityBefore as DirectorScene["continuityBefore"],
    continuityAfter: scene.directorContinuityAfter as DirectorScene["continuityAfter"],
  };
}

/** Build a minimal ProductionPlan from available page state for the regeneration planner. */
function buildMinimalPlan(scenes: Scene[], characters: Character[], style: string): ProductionPlan {
  return {
    project: { title: "", genre: style, tone: "", duration: 60, aspectRatio: "16:9", visualStyle: style },
    characters: characters.map((c) => ({ name: c.name, role: c.role, appearance: c.appearance, description: c.description })),
    scenes: scenes.map((s, i) => sceneToDirectorScene(s, i, style)),
    music: { style: "Cinematic", mood: "cinematic", intensity: "medium" },
  };
}




function SceneCharacterPicker({ characters, sceneCharacters, sceneId, result, onToggle, onManage }: {
  characters: Character[];
  sceneCharacters: Record<number, number[]>;
  sceneId: number;
  result: StoryResult | null;
  onToggle: (idx: number) => void;
  onManage: () => void;
}) {
  const sceneChars = sceneCharacters[sceneId] || [];
  const namedChars = characters.filter((c) => c.name?.trim());
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Characters in this scene</label>
        <button onClick={onManage} className="text-[9px] text-white/35 hover:text-white/55 transition-colors">
          {namedChars.length > 0 ? 'Manage' : 'Add characters'}
        </button>
      </div>
      {namedChars.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {namedChars.map((c, i) => {
            const realIdx = characters.indexOf(c);
            const isSelected = sceneChars.includes(realIdx);
            const usedCount = result ? result.scenes.filter((s) => (sceneCharacters[s.id] || []).includes(realIdx)).length : 0;
            const colorCls = CHAR_COLORS[realIdx % CHAR_COLORS.length];
            const selectedCls = isSelected ? 'bg-emerald-500/15 border border-emerald-500/25 text-emerald-400/90' : 'bg-white/[0.03] border border-white/[0.06] text-white/50 hover:bg-white/[0.06] hover:text-white/65';
            return (
              <button key={i} onClick={() => onToggle(realIdx)} className={'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-all ' + selectedCls}>
                <span className={'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md text-[8px] font-bold ' + colorCls}>
                  {getInitials(c.name)}
                </span>
                <div className="text-left">
                  <div className="leading-tight">{c.name}</div>
                  {c.role ? <div className="text-[8px] text-white/25 leading-tight">{c.role}</div> : null}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <button onClick={onManage} className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/[0.10] bg-white/[0.02] px-3 py-3 text-[11px] text-white/40 transition-colors hover:border-violet-500/20 hover:bg-violet-500/[0.03] hover:text-white/55">
          <Icon.Plus className="h-3 w-3" />
          Add characters to keep appearance consistent
        </button>
      )}
      <p className="mt-1.5 text-[9px] text-white/20">Characters help keep visual appearance consistent across scenes</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function Home() {
  const [story, setStory] = useState("");
  const [language, setLanguage] = useState("Hindi");
  const [style, setStyle] = useState("Cartoon");
  const [duration, setDuration] = useState("60 sec");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [voice, setVoice] = useState("Natural");
  const [captions, setCaptions] = useState(true);
  const [music, setMusic] = useState("None");
  const [renderTransition, setRenderTransition] = useState("none");
  const [renderTransitionDuration, setRenderTransitionDuration] = useState("0.5");
  const [rendering, setRendering] = useState(false);

  const [result, setResult] = useState<StoryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [projects, setProjects] = useState<Project[]>([]);
  const [activeScene, setActiveScene] = useState(1);
  const [projectName, setProjectName] = useState("Untitled Video");
  const [saved, setSaved] = useState(false);

  const [sceneStatus, setSceneStatus] = useState<Record<number, string>>({});
  const [sceneImages, setSceneImages] = useState<Record<number, string>>({});
  const [sceneVideos, setSceneVideos] = useState<Record<number, string>>({});

  /* Voice state */
  const [voiceStatus, setVoiceStatus] = useState<Record<number, "idle" | "generating" | "ready">>({});
  const [voiceAudios, setVoiceAudios] = useState<Record<number, string>>({});
  const [voiceGenerated, setVoiceGenerated] = useState<Record<number, boolean>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);

  /* Character consistency */
  const [characters, setCharacters] = useState<Character[]>([]);
  const [showCharacters, setShowCharacters] = useState(false);
  const [sceneCharacters, setSceneCharacters] = useState<Record<number, number[]>>({});
  const [expandedPrompts, setExpandedPrompts] = useState(false);
  const [showContinuity, setShowContinuity] = useState(false);

  /* Scene editing state */
  const [isEditingScene, setIsEditingScene] = useState(false);
  const [sceneDraft, setSceneDraft] = useState<{ title: string; narration: string; visual: string; beat: string; sceneDuration: string } | null>(null);

  function beginEditScene(scene: Scene) {
    setSceneDraft({ title: scene.title, narration: scene.narration, visual: scene.visual, beat: scene.beat || '', sceneDuration: scene.sceneDuration || '' });
    setIsEditingScene(true);
  }

  function saveEditScene() {
    if (!sceneDraft || !currentScene) return;
    updateScene(currentScene.id, 'title', sceneDraft.title);
    updateScene(currentScene.id, 'narration', sceneDraft.narration);
    updateScene(currentScene.id, 'visual', sceneDraft.visual);
    updateScene(currentScene.id, 'beat', sceneDraft.beat);
    updateScene(currentScene.id, 'sceneDuration', sceneDraft.sceneDuration);
    setIsEditingScene(false);
    setSceneDraft(null);
  }

  function cancelEditScene() {
    setIsEditingScene(false);
    setSceneDraft(null);
  }

  function updateDraft(field: string, value: string) {
    if (!sceneDraft) return;
    setSceneDraft({ ...sceneDraft, [field]: value });
  }

  /* Check if scene has stale generated assets */
  function hasStaleAssets(sceneId: number): boolean {
    if (!sceneDraft) return false;
    const orig = result?.scenes.find(s => s.id === sceneId);
    if (!orig) return false;
    const visualChanged = orig.visual !== sceneDraft.visual;
    const beatChanged = (orig.beat || '') !== sceneDraft.beat;
    return (visualChanged || beatChanged) && (!!sceneImages[sceneId] || !!sceneVideos[sceneId]);
  }


  /* Render state */
  const [finalVideo, setFinalVideo] = useState<string | null>(null);
  const [renderStage, setRenderStage] = useState("");
  const [renderProgress, setRenderProgress] = useState(0);

  /* UI-only state */
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(msg: string, durationMs = 2500) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(msg);
    toastTimerRef.current = setTimeout(() => { setToast(null); toastTimerRef.current = null; }, durationMs);
  }
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const importFileRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState<"all" | "completed" | "in-progress">("all");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteSceneConfirmId, setDeleteSceneConfirmId] = useState<number | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"main" | "projects">("main");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const saveProjectRef = useRef<() => void>(() => {});

  /* Latest-state refs — used by async functions to avoid stale closures */
  const resultRef = useRef(result);
  const sceneImagesRef = useRef(sceneImages);
  const sceneCharactersRef = useRef(sceneCharacters);
  const charactersRef = useRef(characters);
  const styleRef = useRef(style);

  /* Abort controllers */
  const storyAbortRef = useRef<AbortController | null>(null);
  const imageAbortRef = useRef<Record<number, AbortController>>({});
  const videoAbortRef = useRef<Record<number, AbortController>>({});

  /* Polling intervals */
  const pollIntervalsRef = useRef<ReturnType<typeof setInterval>[]>([]);

  /* Render abort controller */
  const renderAbortRef = useRef<AbortController | null>(null);

  /* Cleanup polling and toast timer on unmount */
  useEffect(() => {
    return () => {
      pollIntervalsRef.current.forEach(clearInterval);
      pollIntervalsRef.current = [];
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  /* Keep latest-state refs in sync for async functions */
  useEffect(() => {
    resultRef.current = result;
    sceneImagesRef.current = sceneImages;
    sceneCharactersRef.current = sceneCharacters;
    charactersRef.current = characters;
    styleRef.current = style;
  });

  /* Close settings dropdown on outside click */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  /* Load projects from storage abstraction */
  useEffect(() => {
    setProjects(loadProjects().map((p) => ({ ...p, result: p.result as StoryResult })) as Project[]);

    // Sync projects when another tab changes localStorage
    function handleStorageChange(e: StorageEvent) {
      if (e.key === 'pat-orbit-projects') {
        setProjects(loadProjects().map((p) => ({ ...p, result: p.result as StoryResult })) as Project[]);
      }
    }
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  /* Loading step animation */
  useEffect(() => {
    if (!loading) { setLoadingStep(0); return; }
    const timers: NodeJS.Timeout[] = [];
    for (let i = 1; i <= 3; i++) {
      timers.push(setTimeout(() => { setLoadingStep(i); }, i * 2000));
    }
    return () => timers.forEach(clearTimeout);
  }, [loading]);

  /* Keyboard shortcuts */
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable;

      if (e.key === 'Escape') {
        if (mobileNavOpen) { setMobileNavOpen(false); return; }
        if (settingsOpen) { setSettingsOpen(false); return; }
        if (deleteConfirmId) { setDeleteConfirmId(null); return; }
        if (deleteSceneConfirmId) { setDeleteSceneConfirmId(null); return; }
        if (showCharacters) { setShowCharacters(false); return; }
      }

      if (isInput) return;

      if (result) {
        const currentIdx = result.scenes.findIndex((s) => s.id === activeScene);
        if (e.key === 'ArrowLeft' && currentIdx > 0) { e.preventDefault(); switchScene(result.scenes[currentIdx - 1].id); }
        if (e.key === 'ArrowRight' && currentIdx < result.scenes.length - 1) { e.preventDefault(); switchScene(result.scenes[currentIdx + 1].id); }
        if (e.key === 'Home') { e.preventDefault(); switchScene(result.scenes[0].id); }
        if (e.key === 'End') { e.preventDefault(); switchScene(result.scenes[result.scenes.length - 1].id); }
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (result) saveProjectRef.current();
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (result && !rendering) {
          const allVidsReady = Object.keys(sceneVideos).length >= result.scenes.length;
          if (allVidsReady) startRender();
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [result, activeScene, mobileNavOpen, settingsOpen, deleteConfirmId, deleteSceneConfirmId, showCharacters, isEditingScene, rendering, sceneVideos]);

  function saveProjects(nextProjects: Project[]) {
    setProjects(nextProjects);
    storageSaveProjects(nextProjects);
  }

  /* ================================================================ */
  /*  STORY GENERATION                                                 */
  /* ================================================================ */

  async function generateStory() {
    if (!story.trim()) {
      setError("Please enter a story idea first.");
      return;
    }
    if (storyAbortRef.current) storyAbortRef.current.abort();
    const controller = new AbortController();
    storyAbortRef.current = controller;

    setLoading(true);
    setError("");
    setResult(null);
    setCurrentProjectId(null);
    setSaved(false);
    try {
      const response = await fetch("/api/generate-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ story, language, style, duration, aspectRatio, characters: characters.length > 0 ? characters : undefined }),
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to generate story.");
      if (!data.title || !Array.isArray(data.scenes)) throw new Error("AI returned an invalid story.");
      setResult(data);
      setProjectName(data.title);
      setSceneImages({});
      setSceneVideos({});
      setSceneStatus({});
      setVoiceStatus({});
      setVoiceAudios({});
      setActiveScene(1);
      setSceneCharacters({});

      /* Auto-detect characters from generated story (only if no pre-defined characters) */
      if (characters.length === 0) {
        try {
          const allText = [
            data.title || '',
            ...data.scenes.map((s: Scene) => `${s.title} ${s.narration} ${s.visual}`),
          ].join(' ');
          const detectedNames = new Set<string>();
          const nameRegex = /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\b/g;
          let match;
          while ((match = nameRegex.exec(allText)) !== null) {
            const name = match[1];
            const stopwords = ['The', 'This', 'When', 'Then', 'Scene', 'Inside', 'Through', 'Beyond', 'Under', 'Over', 'Before', 'After', 'While', 'Where', 'What', 'How', 'Every', 'Each', 'Some', 'From', 'With', 'Into', 'About', 'Between', 'Around', 'Behind', 'Near', 'Across', 'Along', 'Toward', 'Until', 'Since', 'During', 'Without', 'Within', 'Against', 'Among', 'There', 'Here', 'Their', 'These', 'Those', 'Another', 'Suddenly', 'Finally', 'Together', 'Discover', 'Reveals', 'Creates', 'Appears', 'Turns', 'Begins', 'Looks', 'Finds', 'Enters', 'Walks', 'Sees', 'Takes', 'Makes', 'Says', 'Calls', 'Moves', 'Races', 'Grows', 'Starts', 'Lands', 'Stops', 'Waits', 'Goes', 'Runs', 'Faces', 'Holds', 'Keeps', 'Lets', 'Puts', 'Sets', 'Rises', 'Falls', 'Heard', 'Felt', 'Saw', 'Knew', 'Woke', 'Pat', 'Orbit', 'Studio', 'NARRATION', 'VISUAL', 'TITLE'];
            if (!stopwords.includes(name) && name.length > 1 && !detectedNames.has(name)) {
              detectedNames.add(name);
            }
          }
          if (detectedNames.size > 0) {
            const autoChars: Character[] = Array.from(detectedNames).slice(0, 6).map((name) => ({
              name,
              description: '',
              appearance: '',
              role: '',
            }));
            setCharacters(autoChars);
            const autoSceneChars: Record<number, number[]> = {};
            for (const scene of data.scenes) {
              const sceneText = `${scene.title} ${scene.narration} ${scene.visual}`;
              const assignedIndices: number[] = [];
              autoChars.forEach((char, idx) => {
                if (sceneText.toLowerCase().includes(char.name.toLowerCase())) {
                  assignedIndices.push(idx);
                }
              });
              if (assignedIndices.length > 0) autoSceneChars[scene.id] = assignedIndices;
            }
            setSceneCharacters(autoSceneChars);
          }
        } catch { /* Character detection is best-effort */ }
      }

      /* Auto-scroll to workspace */
      setTimeout(() => workspaceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 200);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function switchScene(sceneId: number) {
    if (isEditingScene) cancelEditScene();
    setActiveScene(sceneId);
  }

  function moveScene(sceneId: number, direction: -1 | 1) {
    if (!result) return;
    const idx = result.scenes.findIndex((s) => s.id === sceneId);
    if (idx < 0) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= result.scenes.length) return;
    const newScenes = [...result.scenes];
    [newScenes[idx], newScenes[newIdx]] = [newScenes[newIdx], newScenes[idx]];
    setResult({ ...result, scenes: newScenes });
    setSaved(false);
  }

  function duplicateScene(sceneId: number) {
    if (!result) return;
    const scene = result.scenes.find((s) => s.id === sceneId);
    if (!scene) return;
    const newId = Date.now();
    const idx = result.scenes.findIndex((s) => s.id === sceneId);
    const newScene: Scene = {
      id: newId,
      title: scene.title + ' (Copy)',
      narration: scene.narration,
      visual: scene.visual,
      beat: scene.beat,
      sceneDuration: scene.sceneDuration,
      directorCamera: scene.directorCamera ? { ...scene.directorCamera } : undefined,
      directorMotion: scene.directorMotion ? { ...scene.directorMotion } : undefined,
      directorVoice: scene.directorVoice ? { ...scene.directorVoice } : undefined,
      directorContinuityBefore: scene.directorContinuityBefore ? { ...scene.directorContinuityBefore } : undefined,
      directorContinuityAfter: scene.directorContinuityAfter ? { ...scene.directorContinuityAfter } : undefined,
    };
    const newScenes = [...result.scenes];
    newScenes.splice(idx + 1, 0, newScene);
    setResult({ ...result, scenes: newScenes });
    // Copy character assignments
    if (sceneCharacters[sceneId]) {
      setSceneCharacters((prev) => ({ ...prev, [newId]: [...(sceneCharacters[sceneId] || [])] }));
    }
    // Copy voice generation status so duplicate doesn't needlessly regenerate
    if (voiceGenerated[sceneId]) {
      setVoiceGenerated((prev) => ({ ...prev, [newId]: true }));
    }
    setActiveScene(newId);
    setSaved(false);
  }

  function deleteScene(sceneId: number) {
    if (!result || result.scenes.length <= 1) return; // Don't delete the last scene
    const idx = result.scenes.findIndex((s) => s.id === sceneId);
    if (idx < 0) return;
    const newScenes = result.scenes.filter((s) => s.id !== sceneId);
    setResult({ ...result, scenes: newScenes });
    // Clean up associated state
    setSceneImages((prev) => { const n = { ...prev }; delete n[sceneId]; return n; });
    setSceneVideos((prev) => { const n = { ...prev }; delete n[sceneId]; return n; });
    setVoiceAudios((prev) => { const n = { ...prev }; delete n[sceneId]; return n; });
    setVoiceStatus((prev) => { const n = { ...prev }; delete n[sceneId]; return n; });
    setVoiceGenerated((prev) => { const n = { ...prev }; delete n[sceneId]; return n; });
    setSceneCharacters((prev) => { const n = { ...prev }; delete n[sceneId]; return n; });
    setSceneStatus((prev) => { const n = { ...prev }; delete n[sceneId]; return n; });
    // Move to the next scene or the previous one
    if (activeScene === sceneId) {
      const nextIdx = Math.min(idx, newScenes.length - 1);
      setActiveScene(newScenes[nextIdx].id);
    }
    setSaved(false);
  }

  /* Total duration calculation */
  const totalDurationSec = result?.scenes.reduce((sum, s) => {
    const d = parseInt(s.sceneDuration || '10', 10);
    return sum + (isNaN(d) ? 10 : d);
  }, 0) || 0;
  const totalDurationFormatted = `${String(Math.floor(totalDurationSec / 60)).padStart(2, '0')}:${String(totalDurationSec % 60).padStart(2, '0')}`;

  function updateScene(sceneId: number, field: "title" | "narration" | "visual" | "beat" | "sceneDuration", value: string) {
    if (!result) return;
    setResult({
      ...result,
      scenes: result.scenes.map((scene) =>
        scene.id === sceneId ? { ...scene, [field]: value } : scene
      ),
    });
    setSaved(false);
  }

  /* ================================================================ */
  /*  UNSAVED CHANGES                                                  */
  /* ================================================================ */

  useEffect(() => {
    if (result && !saved) {
      setHasUnsavedChanges(true);
    } else {
      setHasUnsavedChanges(false);
    }
  }, [saved, result, projectName, story, language, style, duration, sceneImages, sceneVideos, finalVideo, characters, sceneCharacters]);

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  /* ── Auto-save setup ─────────────────────────────────────────────── */
  const autoSaveRef = useRef<ReturnType<typeof createAutoSave> | null>(null);
  useEffect(() => {
    autoSaveRef.current = createAutoSave(
      () => projects,
      (status) => setSaveStatus(status)
    );
    return () => autoSaveRef.current?.cancel();
  }, []);

  /* Trigger auto-save when project state changes */
  useEffect(() => {
    if (result && hasUnsavedChanges && autoSaveRef.current) {
      autoSaveRef.current.save();
    }
  }, [result, hasUnsavedChanges, projectName, sceneImages, sceneVideos, finalVideo, characters, sceneCharacters, voiceGenerated]);

  /* ================================================================ */
  /*  PROJECT PERSISTENCE                                              */
  /* ================================================================ */

  function saveCurrentProject() {
    if (!result) return;
    if (currentProjectId) {
      // Update existing project
      const updated = projects.map((p) => {
        if (p.id !== currentProjectId) return p;
        return {
          ...p,
          title: projectName || result.title,
          story, language, style, duration, result,
          sceneImages: { ...sceneImages },
          sceneVideos: { ...sceneVideos },
          finalVideoUrl: finalVideo,
          characters: characters.length > 0 ? [...characters] : undefined,
          sceneCharacters: Object.keys(sceneCharacters).length > 0 ? { ...sceneCharacters } : undefined,
          aspectRatio, voice, captions, music,
          voiceGenerated: Object.keys(voiceGenerated).length > 0 ? { ...voiceGenerated } : undefined,
        };
      });
      saveProjects(updated);
    } else {
      // Create new project
      const newId = crypto.randomUUID();
      const project: Project = {
        id: newId,
        title: projectName || result.title,
        story, language, style, duration, result,
        createdAt: new Date().toISOString(),
        sceneImages: { ...sceneImages },
        sceneVideos: { ...sceneVideos },
        finalVideoUrl: finalVideo,
        characters: characters.length > 0 ? [...characters] : undefined,
        sceneCharacters: Object.keys(sceneCharacters).length > 0 ? { ...sceneCharacters } : undefined,
        aspectRatio, voice, captions, music,
        voiceGenerated: Object.keys(voiceGenerated).length > 0 ? { ...voiceGenerated } : undefined,
      };
      saveProjects([project, ...projects]);
      setCurrentProjectId(newId);
    }
    setSaved(true);
    setHasUnsavedChanges(false);
    // Check storage quota
    const info = getStorageInfo();
    if (info.percentUsed > 90) {
      showToast(`Project saved — storage ${info.percentUsed}% full`);
    } else {
      showToast("Project saved");
    }
  }

  // Keep the keyboard shortcut ref in sync with the latest save function.
  useEffect(() => {
    saveProjectRef.current = saveCurrentProject;
  });

  function loadProject(project: Project) {
    setStory(project.story || '');
    setLanguage(project.language || 'Hindi');
    setStyle(project.style || 'Cartoon');
    setDuration(project.duration || '60 sec');
    setResult(project.result || { title: 'Untitled', scenes: [] });
    setProjectName(project.title || 'Untitled Video');
    setSceneImages(project.sceneImages && typeof project.sceneImages === 'object' ? project.sceneImages : {});
    setSceneVideos(project.sceneVideos && typeof project.sceneVideos === 'object' ? project.sceneVideos : {});
    setFinalVideo(typeof project.finalVideoUrl === 'string' ? project.finalVideoUrl : null);
    setCharacters(Array.isArray(project.characters) ? project.characters : []);
    setSceneCharacters(project.sceneCharacters && typeof project.sceneCharacters === 'object' ? project.sceneCharacters : {});
    setAspectRatio(project.aspectRatio || '9:16');
    setVoice(project.voice || 'Natural');
    setCaptions(typeof project.captions === 'boolean' ? project.captions : true);
    setMusic(project.music || 'None');
    setSceneStatus({});
    setVoiceStatus({});
    setVoiceAudios({});
    const vg = project.voiceGenerated && typeof project.voiceGenerated === 'object' ? project.voiceGenerated : {};
    setVoiceGenerated(vg);
    // Restore voice status for scenes that had voice generated previously
    const restoredVoiceStatus: Record<number, "idle" | "generating" | "ready"> = {};
    for (const [idStr, generated] of Object.entries(vg)) {
      if (generated) restoredVoiceStatus[Number(idStr)] = "ready";
    }
    setVoiceStatus(restoredVoiceStatus);
    setRendering(false);
    setRenderStage('');
    setRenderProgress(0);
    setActiveScene(1);
    setCurrentProjectId(project.id);
    setSaved(true);
    showToast("Project loaded");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteProject(id: string) {
    saveProjects(projects.filter((p) => p.id !== id));
  }

  function duplicateProject(project: Project) {
    const dup: Project = {
      id: crypto.randomUUID(),
      title: project.title + " (Copy)",
      story: project.story,
      language: project.language,
      style: project.style,
      duration: project.duration,
      result: {
        ...project.result,
        scenes: project.result.scenes.map((s) => ({ ...s })),
      },
      createdAt: new Date().toISOString(),
      sceneImages: project.sceneImages ? { ...project.sceneImages } : undefined,
      sceneVideos: project.sceneVideos ? { ...project.sceneVideos } : undefined,
      finalVideoUrl: project.finalVideoUrl ?? null,
      characters: project.characters ? project.characters.map((c) => ({ ...c })) : undefined,
      sceneCharacters: project.sceneCharacters ? { ...project.sceneCharacters } : undefined,
      aspectRatio: project.aspectRatio,
      voice: project.voice,
      captions: project.captions,
      music: project.music,
      voiceGenerated: project.voiceGenerated ? { ...project.voiceGenerated } : undefined,
    };
    saveProjects([dup, ...projects]);
    showToast("Project duplicated");
  }

  /* ── Export ────────────────────────────────────────────────────── */
  function handleExport() {
    if (!result || !currentProjectId) {
      showToast("No project to export");
      return;
    }
    const project = projects.find((p) => p.id === currentProjectId);
    if (!project) {
      showToast("Project not found");
      return;
    }
    try {
      downloadProjectFile(project);
      showToast("Project exported");
    } catch {
      showToast("Export failed");
    }
  }

  /* ── Import ────────────────────────────────────────────────────── */
  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      const result = importProject(text);
      if (!result.success || !result.project) {
        showToast(result.error || "Import failed", 3000);
        return;
      }
      // Add the imported project and load it
      const imported = { ...result.project, result: result.project!.result as StoryResult } as Project;
      saveProjects([imported, ...projects]);
      loadProject(imported);
      showToast(`Imported: ${result.project.title}`);
    } catch {
      showToast("Failed to read import file");
    }
    // Reset file input so the same file can be re-imported
    if (importFileRef.current) importFileRef.current.value = "";
  }

  /* ================================================================ */
  /*  IMAGE GENERATION                                                 */
  /* ================================================================ */

  async function startImageGeneration(sceneId: number) {
    if (!result) return;
    // Prevent duplicate generation requests
    if (sceneStatus[sceneId] === "image") return;
    if (imageAbortRef.current[sceneId]) imageAbortRef.current[sceneId].abort();
    const controller = new AbortController();
    imageAbortRef.current[sceneId] = controller;

    setSceneStatus((c) => ({ ...c, [sceneId]: "image" }));
    setError("");
    try {
      // Use latest-state refs to avoid stale closures.
      const currentResult = resultRef.current;
      if (!currentResult) return;
      const scene = currentResult.scenes.find((s) => s.id === sceneId);
      if (!scene) return;
      const sceneCharIndices = sceneCharactersRef.current[sceneId] || [];
      const sceneChars = sceneCharIndices
        .map((idx) => charactersRef.current[idx])
        .filter((c): c is Character => !!c && !!c.name?.trim());
      const currentStyle = styleRef.current;

      // Ask the Director regeneration planner what to preserve/change.
      let prompt = scene.visual;
      try {
        const sceneIdx = currentResult.scenes.findIndex((s) => s.id === sceneId);
        const plan = buildMinimalPlan(currentResult.scenes, charactersRef.current, currentStyle);
        const dirScene = sceneToDirectorScene(scene, sceneIdx, currentStyle);
        const regen = await analyzeRegenerationRequest({
          scene: dirScene,
          plan,
          target: "image",
          feedback: "Improve the current result while preserving scene continuity.",
        });
        console.log(`[Regeneration] target=image reason=${regen.reason}`);
        if (regen.revisedPrompt) prompt = regen.revisedPrompt;
      } catch {
        // Planner is best-effort — continue with original prompt.
      }

      // Re-read latest scene data after async planner call.
      const latestScene = resultRef.current?.scenes.find((s) => s.id === sceneId) ?? scene;
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          characters: sceneChars.length > 0 ? sceneChars : undefined,
          sceneTitle: latestScene.title,
          style: currentStyle,
          sceneBeat: latestScene.beat,
          camera: latestScene.directorCamera,
          motion: latestScene.directorMotion,
          continuityBefore: latestScene.directorContinuityBefore,
        }),
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to generate image.");
      if (!data.image) throw new Error("No image was returned.");
      setSceneImages((c) => ({ ...c, [sceneId]: data.image }));
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : "Failed to generate image.");
    } finally {
      setSceneStatus((c) => ({ ...c, [sceneId]: "idle" }));
    }
  }

  /* ================================================================ */
  /*  VIDEO GENERATION (ASYNC JOBS)                                    */
  /* ================================================================ */

  async function startVideoGeneration(sceneId: number) {
    if (!result) return;
    // Prevent duplicate generation requests
    if (sceneStatus[sceneId] === "video" || sceneStatus[sceneId]?.startsWith("video:")) return;
    if (videoAbortRef.current[sceneId]) videoAbortRef.current[sceneId].abort();

    setSceneStatus((c) => ({ ...c, [sceneId]: "video" }));
    setError("");

    try {
      // Snapshot current state at call time for character/planner data.
      const currentResult = resultRef.current;
      if (!currentResult) return;
      const scene = currentResult.scenes.find((s) => s.id === sceneId);
      if (!scene) return;
      const sceneCharIndices = sceneCharactersRef.current[sceneId] || [];
      const sceneChars = sceneCharIndices
        .map((idx) => charactersRef.current[idx])
        .filter((c): c is Character => !!c && !!c.name?.trim());
      const currentStyle = styleRef.current;

      // Ask the Director regeneration planner what to preserve/change.
      let prompt = scene.visual;
      try {
        const sceneIdx = currentResult.scenes.findIndex((s) => s.id === sceneId);
        const plan = buildMinimalPlan(currentResult.scenes, charactersRef.current, currentStyle);
        const dirScene = sceneToDirectorScene(scene, sceneIdx, currentStyle);
        const regen = await analyzeRegenerationRequest({
          scene: dirScene,
          plan,
          target: "video",
          feedback: "Improve the current result while preserving scene continuity.",
        });
        console.log(`[Regeneration] target=video reason=${regen.reason}`);
        if (regen.revisedPrompt) prompt = regen.revisedPrompt;
      } catch {
        // Planner is best-effort — continue with original prompt.
      }

      // Read the LATEST scene + image from refs AFTER the async planner call.
      // This ensures user edits or image regeneration during planning are picked up.
      const latestResult = resultRef.current ?? currentResult;
      const latestScene = latestResult.scenes.find((s) => s.id === sceneId) ?? scene;
      const latestImage = sceneImagesRef.current[sceneId];
      const body: Record<string, unknown> = {
        prompt,
        duration,
        aspectRatio,
        sceneId,
        sceneTitle: latestScene.title,
        characters: sceneChars.length > 0 ? sceneChars : undefined,
        camera: latestScene.directorCamera,
        motion: latestScene.directorMotion,
        continuityBefore: latestScene.directorContinuityBefore,
      };
      if (latestImage) body.image = latestImage;

      const createResp = await fetch("/api/jobs/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const createData = await createResp.json();
      if (!createResp.ok) throw new Error(createData.error || "Failed to start video generation.");
      const { jobId } = createData;
      if (!jobId) throw new Error("No job ID returned.");

      // Multi-clip generation can take 15+ min. Poll for up to 20 minutes.
      const MAX_POLL = 240;
      const POLL_INTERVAL = 5000;

      await new Promise<void>((resolve, reject) => {
        let attempts = 0;
        let cancelled = false;
        const controller = new AbortController();
        videoAbortRef.current[sceneId] = controller;

        const interval = setInterval(async () => {
          if (cancelled) return;
          attempts++;
          if (attempts > MAX_POLL) {
            clearInterval(interval);
            reject(new Error("Video generation timed out after 20 minutes. The local engine may still be processing."));
            return;
          }
          try {
            const resp = await fetch(`/api/jobs/video?jobId=${jobId}`, { signal: controller.signal });
            if (!resp.ok) return;
            const data = await resp.json();
            if (data.status === "completed" && data.videoUrl) {
              clearInterval(interval);
              setSceneVideos((c) => ({ ...c, [sceneId]: data.videoUrl }));
              setSceneStatus((c) => ({ ...c, [sceneId]: "idle" }));
              resolve();
            } else if (data.status === "failed") {
              clearInterval(interval);
              reject(new Error(data.error || "Video generation failed."));
            } else if (data.progress) {
              // Update status display with progress from the server
              setSceneStatus((c) => ({ ...c, [sceneId]: `video:${data.progress}` }));
            }
          } catch (err) {
            if (err instanceof Error && err.name === "AbortError") {
              clearInterval(interval);
              resolve();
              return;
            }
          }
        }, POLL_INTERVAL);

        pollIntervalsRef.current.push(interval);

        controller.signal.addEventListener("abort", () => {
          cancelled = true;
          clearInterval(interval);
          resolve();
        });
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setSceneStatus((c) => ({ ...c, [sceneId]: "idle" }));
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to generate video.");
      setSceneStatus((c) => ({ ...c, [sceneId]: "idle" }));
    }
  }

  /* ================================================================ */
  /*  VOICE GENERATION (PER-SCENE)                                     */
  /* ================================================================ */

  async function startVoiceGeneration(sceneId: number) {
    if (!result) return;
    // Prevent duplicate generation requests
    if (voiceStatus[sceneId] === 'generating') return;
    const scene = result.scenes.find((s) => s.id === sceneId);
    if (!scene || !scene.narration?.trim()) return;

    setVoiceStatus((c) => ({ ...c, [sceneId]: "generating" }));
    try {
      // Ask the Director regeneration planner what to preserve/change.
      let voicePlan = scene.directorVoice;
      try {
        const sceneIdx = result.scenes.findIndex((s) => s.id === sceneId);
        const plan = buildMinimalPlan(result.scenes, characters, style);
        const dirScene = sceneToDirectorScene(scene, sceneIdx, style);
        const regen = await analyzeRegenerationRequest({
          scene: dirScene,
          plan,
          target: "voice",
          feedback: "Improve the current result while preserving scene continuity.",
        });
        console.log(`[Regeneration] target=voice reason=${regen.reason}`);
        // Merge voiceAdjustment into the voicePlan — never rewrite narration.
        if (regen.voiceAdjustment) {
          voicePlan = {
            ...(voicePlan || { voice: "Natural", emotion: "", pace: "", emphasis: "" }),
            ...(regen.voiceAdjustment.emotion && { emotion: regen.voiceAdjustment.emotion }),
            ...(regen.voiceAdjustment.pace && { pace: regen.voiceAdjustment.pace }),
            ...(regen.voiceAdjustment.emphasis && { emphasis: regen.voiceAdjustment.emphasis }),
            ...(regen.voiceAdjustment.voice && { voice: regen.voiceAdjustment.voice as "Natural" | "Deep" | "Soft" }),
          };
        }
      } catch {
        // Planner is best-effort — continue with original voicePlan.
      }

      const resp = await fetch("/api/generate-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ narration: scene.narration, language, voice, voicePlan }),
      });
      const data = await resp.json();
      if (resp.ok && data.audio) {
        setVoiceAudios((c) => ({ ...c, [sceneId]: data.audio }));
        setVoiceStatus((c) => ({ ...c, [sceneId]: "ready" }));
        setVoiceGenerated((c) => ({ ...c, [sceneId]: true }));
      } else {
        throw new Error(data.error || "Voice generation failed.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate voice.");
      setVoiceStatus((c) => ({ ...c, [sceneId]: "idle" }));
    }
  }

  function playVoice(sceneId: number) {
    const audio = voiceAudios[sceneId];
    if (!audio) return;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    const a = new Audio(audio);
    audioRef.current = a;
    a.play().catch(() => {});
  }

  function stopVoice() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }

  function cancelGeneration(sceneId: number) {
    // Cancel image generation
    if (imageAbortRef.current[sceneId]) {
      imageAbortRef.current[sceneId].abort();
      delete imageAbortRef.current[sceneId];
    }
    // Cancel video generation
    if (videoAbortRef.current[sceneId]) {
      videoAbortRef.current[sceneId].abort();
      delete videoAbortRef.current[sceneId];
    }
    setSceneStatus((c) => ({ ...c, [sceneId]: "idle" }));
  }

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */

  const totalVideosGenerated = Object.keys(sceneVideos).length;
  const totalImagesGenerated = Object.keys(sceneImages).length;
  const totalVoiceReady = Object.values(voiceStatus).filter((s) => s === "ready").length;
  const totalScenes = result?.scenes.length ?? 0;

  async function startRender() {
    if (!result || totalVideosGenerated < result.scenes.length) return;
    // Cancel any existing render
    if (renderAbortRef.current) renderAbortRef.current.abort();
    const controller = new AbortController();
    renderAbortRef.current = controller;
    setRendering(true);
    setRenderStage("Preparing scenes...");
    setRenderProgress(5);
    setError("");
    setFinalVideo(null);
    try {
      /* Generate voice for scenes that don't have it yet */
      setRenderStage("Generating voice...");
      setRenderProgress(10);
      const renderVoiceAudios: Record<number, string> = { ...voiceAudios };
      const totalScenes = result.scenes.length;
      for (let i = 0; i < totalScenes; i++) {
        const s = result.scenes[i];
        if (s.narration && s.narration.trim() && !renderVoiceAudios[s.id]) {
          setRenderStage(`Generating voice ${i + 1}/${totalScenes}...`);
          setRenderProgress(10 + Math.round((i / totalScenes) * 25));
          try {
            const voiceResp = await fetch("/api/generate-voice", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ narration: s.narration, language, voice, voicePlan: s.directorVoice }),
            });
            const voiceData = await voiceResp.json();
            if (voiceResp.ok && voiceData.audio) {
              renderVoiceAudios[s.id] = voiceData.audio;
              setVoiceAudios((c) => ({ ...c, [s.id]: voiceData.audio }));
              setVoiceStatus((c) => ({ ...c, [s.id]: "ready" }));
            }
          } catch { /* Non-fatal */ }
        }
      }

      /* Submit render job */
      setRenderStage("Submitting render job...");
      setRenderProgress(40);
      const scenesPayload = result.scenes.map((s) => ({
        id: s.id,
        video: sceneVideos[s.id] || "",
        narration: captions ? s.narration : undefined,
      }));

      const createResp = await fetch("/api/jobs/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenes: scenesPayload, aspectRatio, captions, music, voice, language, voiceAudios: renderVoiceAudios, transition: renderTransition, transitionDuration: parseFloat(renderTransitionDuration) }),
      });
      const createData = await createResp.json();
      if (!createResp.ok) throw new Error(createData.error || "Failed to start render.");
      const { jobId } = createData;
      if (!jobId) throw new Error("No render job ID returned.");

      /* Poll for completion */
      setRenderStage("Mixing audio & rendering...");
      setRenderProgress(50);
      const MAX_POLL = 360;
      const POLL_MS = 3000;

      await new Promise<void>((resolve, reject) => {
        let attempts = 0;
        const interval = setInterval(async () => {
          if (controller.signal.aborted) {
            clearInterval(interval);
            resolve();
            return;
          }
          attempts++;
          if (attempts > MAX_POLL) {
            clearInterval(interval);
            reject(new Error("Render timed out. Please try again."));
            return;
          }
          try {
            const resp = await fetch(`/api/jobs/render?jobId=${jobId}`);
            if (!resp.ok) return;
            const data = await resp.json();
            if (data.status === "completed" && data.videoUrl) {
              clearInterval(interval);
              setFinalVideo(data.videoUrl);
              setRenderStage("Complete");
              setRenderProgress(100);
              resolve();
            } else if (data.status === "failed") {
              clearInterval(interval);
              reject(new Error(data.error || "Render failed."));
            } else {
              const pct = Math.min(50 + Math.round((attempts / MAX_POLL) * 45), 95);
              setRenderProgress(pct);
              if (attempts <= 10) setRenderStage("Downloading scene videos...");
              else if (attempts <= 30) setRenderStage("Mixing audio...");
              else if (attempts <= 70) setRenderStage("Encoding with FFmpeg...");
              else setRenderStage("Finalizing...");
            }
          } catch { /* Keep polling */ }
        }, POLL_MS);
        pollIntervalsRef.current.push(interval);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to render video.");
      setRenderStage("Render failed");
      setRenderProgress(0);
    } finally {
      setRendering(false);
    }
  }

  async function exportVideo() {
    if (!finalVideo) {
      setError("No video to export. Render a final video first.");
      return;
    }
    const safeName = (projectName || "pat-orbit-video").replace(/[^a-zA-Z0-9\s\-_]/g, "").replace(/\s+/g, "-").toLowerCase();
    try {
      const response = await fetch(finalVideo);
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}. The video URL may have expired.`);
      }
      const contentType = response.headers.get("content-type") || "";
      const blob = await response.blob();
      // Validate we got actual video data, not an error page
      if (blob.size < 1024 && !contentType.includes("video")) {
        throw new Error("Downloaded file is not a valid video. The video URL may have expired.");
      }
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${safeName}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      showToast("Video exported successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed. Please try again.");
    }
  }

  function copyToClipboard(text: string, fieldKey: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(fieldKey);
      setTimeout(() => setCopiedField(null), 1500);
    });
  }

  const currentScene = result?.scenes.find((s) => s.id === activeScene) || null;

  function getStatusDotColor(sceneId: number) {
    const st = sceneStatus[sceneId];
    if (st === "image") return "bg-amber-400";
    if (st === "video") return "bg-violet-400";
    if (sceneVideos[sceneId]) return "bg-blue-400";
    if (sceneImages[sceneId]) return "bg-emerald-400";
    return "bg-white/20";
  }

  const loadingSteps = [
    { label: "Analyzing idea", done: loadingStep >= 1 },
    { label: "Building scenes", done: loadingStep >= 2 },
    { label: "Writing narration", done: loadingStep >= 3 },
    { label: "Preparing visual prompts", done: loading },
  ];

  const renderReady = result && totalVideosGenerated >= result.scenes.length;

  const onLoadProjectRef = useRef<(p: Project) => void>(() => {});
  onLoadProjectRef.current = loadProject;

  return (
    <main className="min-h-screen bg-[#08090c] text-white overflow-x-hidden">
      {/* ── Top navigation bar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-12 flex items-center justify-between px-5 border-b border-white/[0.04] bg-[#0a0b0f]/80 backdrop-blur-xl">
        <div className="flex items-center gap-6">
          <button onClick={() => { setViewMode('main'); if (!result) window.scrollTo({ top: 0 }); }} className="flex items-center gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white text-[9px] font-black text-[#08090c]">P</div>
            <span className="text-[13px] font-bold tracking-tight text-white/90">PAT Orbit</span>
          </button>
          <div className="flex items-center gap-1">
            <button onClick={() => setViewMode('main')} className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition-all ${viewMode === 'main' ? 'bg-white/[0.06] text-white/90' : 'text-white/35 hover:text-white/55 hover:bg-white/[0.03]'}`}>
              {result ? 'Editor' : 'Create'}
            </button>
            <button onClick={() => setViewMode('projects')} className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition-all ${viewMode === 'projects' ? 'bg-white/[0.06] text-white/90' : 'text-white/35 hover:text-white/55 hover:bg-white/[0.03]'}`}>
              Projects
              {projects.length > 0 && <span className="ml-1.5 text-[10px] text-white/20">{projects.length}</span>}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setResult(null); setViewMode('main'); setSceneImages({}); setSceneVideos({}); setVoiceStatus({}); setVoiceAudios({}); setFinalVideo(null); setCharacters([]); setSceneCharacters({}); setCurrentProjectId(null); setSaved(false); }} className="rounded-md px-3 py-1.5 text-[12px] font-medium text-white/35 hover:text-white/55 hover:bg-white/[0.03] transition-all">
            + New
          </button>
        </div>
      </nav>

      {/* ── Main content area ── */}
      <div className="pt-12">
        {viewMode === 'projects' ? (
          <ProjectGrid
            projects={projects}
            searchQuery={searchQuery} setSearchQuery={setSearchQuery}
            projectFilter={projectFilter} setProjectFilter={setProjectFilter}
            onLoadProject={(p) => { loadProject(p as Project); setViewMode('main'); }}
            onDuplicateProject={(p) => duplicateProject(p as Project)}
            onDeleteProject={deleteProject}
            onImport={handleImportFile}
            importRef={importFileRef}
            onNewVideo={() => { setResult(null); setViewMode('main'); }}
          />
        ) : !result ? (
          <CreateScreen
            story={story} setStory={setStory}
            style={style} setStyle={setStyle}
            duration={duration} setDuration={setDuration}
            aspectRatio={aspectRatio} setAspectRatio={setAspectRatio}
            voice={voice} setVoice={setVoice}
            language={language} setLanguage={setLanguage}
            loading={loading} error={error} loadingStep={loadingStep}
            result={result} projects={projects}
            onGenerate={generateStory}
            onLoadProject={(p) => { loadProject(p as Project); setViewMode('main'); }}
            onScrollToProjects={() => setViewMode('projects')}
          />
        ) : (
          <WorkspaceView
            result={result} activeScene={activeScene}
            projectName={projectName} setProjectName={setProjectName}
            sceneImages={sceneImages} sceneVideos={sceneVideos}
            sceneStatus={sceneStatus} voiceStatus={voiceStatus}
            voiceAudios={voiceAudios} characters={characters}
            sceneCharacters={sceneCharacters} currentScene={currentScene}
            totalImagesGenerated={totalImagesGenerated}
            totalVideosGenerated={totalVideosGenerated}
            totalVoiceReady={totalVoiceReady}
            totalDurationFormatted={totalDurationFormatted}
            rendering={rendering} renderStage={renderStage}
            finalVideo={finalVideo} saved={saved}
            hasUnsavedChanges={hasUnsavedChanges}
            saveStatus={saveStatus} music={music} captions={captions}
            onSwitchScene={switchScene}
            onStartImage={startImageGeneration}
            onStartVideo={startVideoGeneration}
            onStartVoice={startVoiceGeneration}
            onPlayVoice={playVoice} onStopVoice={stopVoice}
            onCancelGeneration={cancelGeneration}
            onStartRender={startRender}
            onExportVideo={exportVideo}
            onSaveProject={saveCurrentProject}
            onDuplicateScene={duplicateScene}
            onDeleteScene={deleteScene}
            onMoveScene={moveScene}
            onSetDeleteSceneConfirm={setDeleteSceneConfirmId}
            deleteSceneConfirmId={deleteSceneConfirmId}
          />
        )}
      </div>

      {/* Character editor modal */}
      {showCharacters && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-lg rounded-xl border border-white/[0.06] bg-[#111218] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.04] px-5 py-4">
              <div>
                <h3 className="text-[14px] font-semibold text-white/85">Characters</h3>
                <p className="mt-0.5 text-[11px] text-white/35">Keep visual appearance consistent across scenes.</p>
              </div>
              <button onClick={() => setShowCharacters(false)} aria-label="Close" className="flex h-7 w-7 items-center justify-center rounded-lg text-white/40 hover:bg-white/[0.06] hover:text-white/70 transition-colors"><Icon.X /></button>
            </div>
            <div className="max-h-[55vh] overflow-y-auto px-5 py-4 space-y-2">
              {characters.length === 0 && (
                <div className="rounded-lg border border-dashed border-white/[0.06] bg-white/[0.015] py-8 text-center">
                  <Icon.User className="h-6 w-6 text-white/15 mx-auto mb-2" />
                  <p className="text-[12px] text-white/40">No characters yet</p>
                </div>
              )}
              {characters.map((c, i) => {
                const realIdx = i;
                const colorCls = CHAR_COLORS[realIdx % CHAR_COLORS.length];
                return (
                  <div key={i} className="rounded-lg border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-3">
                      <span className={'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ' + colorCls}>
                        {c.name?.trim() ? getInitials(c.name) : <Icon.User className="h-3.5 w-3.5 text-white/25" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <input value={c.name} onChange={(e) => { const next = [...characters]; next[i] = { ...next[i], name: e.target.value }; setCharacters(next); setSaved(false); }} placeholder="Character name" className="w-full bg-transparent text-[12px] font-semibold text-white/80 outline-none placeholder:text-white/20" />
                      </div>
                      <button onClick={() => { setCharacters(characters.filter((_, j) => j !== i)); setSaved(false); }} className="flex h-6 w-6 items-center justify-center rounded text-white/20 hover:bg-red-500/10 hover:text-red-400/70"><Icon.Trash /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 border-t border-white/[0.03] px-4 py-2.5">
                      <div>
                        <label className="mb-1 block text-[8px] font-semibold uppercase tracking-wider text-white/20">Role</label>
                        <input value={c.role} onChange={(e) => { const next = [...characters]; next[i] = { ...next[i], role: e.target.value }; setCharacters(next); setSaved(false); }} placeholder="e.g. Explorer" className="w-full rounded border border-white/[0.04] bg-[#0c0d12] px-2 py-1.5 text-[10px] text-white/60 outline-none placeholder:text-white/12" />
                      </div>
                      <div>
                        <label className="mb-1 block text-[8px] font-semibold uppercase tracking-wider text-white/20">Appearance</label>
                        <input value={c.appearance} onChange={(e) => { const next = [...characters]; next[i] = { ...next[i], appearance: e.target.value }; setCharacters(next); setSaved(false); }} placeholder="e.g. Brown hair" className="w-full rounded border border-white/[0.04] bg-[#0c0d12] px-2 py-1.5 text-[10px] text-white/60 outline-none placeholder:text-white/12" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-white/[0.04] px-5 py-3">
              <button onClick={() => { setCharacters([...characters, { name: "", description: "", appearance: "", role: "" }]); setSaved(false); }} className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/[0.06] bg-white/[0.015] px-4 py-2.5 text-[11px] font-medium text-white/40 hover:border-indigo-500/15 hover:text-white/55 transition-all">
                <Icon.Plus className="h-3 w-3" />Add character
              </button>
              <button onClick={() => setShowCharacters(false)} className="mt-2 w-full rounded-lg bg-white/[0.06] px-4 py-2.5 text-[11px] font-medium text-white/65 hover:bg-white/[0.10] transition-all">Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-xl border border-white/[0.06] bg-[#111218] p-5 shadow-2xl">
            <h3 className="text-[15px] font-semibold text-white/85">Delete project?</h3>
            <p className="mt-1.5 text-[12px] text-white/40">This project will be removed from your saved projects.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setDeleteConfirmId(null)} className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-4 py-2 text-[11px] font-medium text-white/60 hover:bg-white/[0.06] transition-all">Cancel</button>
              <button onClick={() => { if (deleteConfirmId) { deleteProject(deleteConfirmId); setDeleteConfirmId(null); } }} className="rounded-lg bg-red-500/15 border border-red-500/20 px-4 py-2 text-[11px] font-medium text-red-400 hover:bg-red-500/25 transition-all">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg border border-emerald-500/15 bg-[#111218] px-4 py-2.5 shadow-2xl">
          <Icon.Check className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-[12px] font-medium text-white/65">{toast}</span>
        </div>
      )}
    </main>
  );
}
