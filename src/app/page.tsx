"use client";

import { useEffect, useRef, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Scene = {
  id: number;
  title: string;
  narration: string;
  visual: string;
  beat?: string;
  sceneDuration?: string;
};

type StoryResult = {
  title: string;
  scenes: Scene[];
};

type Character = {
  name: string;
  description: string;
  appearance: string;
  role: string;
};

type Project = {
  id: string;
  title: string;
  story: string;
  language: string;
  style: string;
  duration: string;
  result: StoryResult;
  createdAt: string;
  sceneImages?: Record<number, string>;
  sceneVideos?: Record<number, string>;
  finalVideoUrl?: string | null;
  characters?: Character[];
  sceneCharacters?: Record<number, number[]>;
  aspectRatio?: string;
  voice?: string;
  captions?: boolean;
  music?: string;
};

/* ------------------------------------------------------------------ */
/*  SVG icons                                                          */
/* ------------------------------------------------------------------ */
const Icon = {
  ArrowLeft: (p: { className?: string }) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
  ),
  ArrowRight: (p: { className?: string }) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M5 12h14M12 5l7 7-7 7" /></svg>
  ),
  Settings: (p: { className?: string }) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
  ),
  Spinner: (p: { className?: string }) => (
    <svg className={p.className ?? "h-4 w-4 animate-spin"} viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
  ),
  Image: (p: { className?: string }) => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
  ),
  Play: (p: { className?: string }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={p.className}><polygon points="5 3 19 12 5 21 5 3" /></svg>
  ),
  Copy: (p: { className?: string }) => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
  ),
  Check: (p: { className?: string }) => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={p.className}><polyline points="20 6 9 17 4 12" /></svg>
  ),
  Trash: (p: { className?: string }) => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
  ),
  Folder: (p: { className?: string }) => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
  ),
  Download: (p: { className?: string }) => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
  ),
  Lightbulb: (p: { className?: string }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M9 18h6" /><path d="M10 22h4" /><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" /></svg>
  ),
  Film: (p: { className?: string }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={p.className}><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" /><line x1="7" y1="2" x2="7" y2="22" /><line x1="17" y1="2" x2="17" y2="22" /><line x1="2" y1="12" x2="22" y2="12" /><line x1="2" y1="7" x2="7" y2="7" /><line x1="2" y1="17" x2="7" y2="17" /><line x1="17" y1="17" x2="22" y2="17" /><line x1="17" y1="7" x2="22" y2="7" /></svg>
  ),
  Sparkles: (p: { className?: string }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" /></svg>
  ),
  Video: (p: { className?: string }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={p.className}><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>
  ),
  Music: (p: { className?: string }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
  ),
  Mic: (p: { className?: string }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
  ),
  FileText: (p: { className?: string }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
  ),
  Wand: (p: { className?: string }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M15 4V2" /><path d="M15 16v-2" /><path d="M8 9h2" /><path d="M20 9h2" /><path d="M17.8 11.8 19 13" /><path d="M15 9h0" /><path d="M17.8 6.2 19 5" /><path d="M3 21l9-9" /><path d="M12.2 6.2 11 5" /></svg>
  ),
  User: (p: { className?: string }) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
  ),
  Plus: (p: { className?: string }) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
  ),
  X: (p: { className?: string }) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
  ),
  Copy2: (p: { className?: string }) => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
  ),
};

const TEMPLATES = [
  { label: "Cinematic Story", desc: "Dramatic narrative with cinematic visuals", style: "Cinematic", duration: "60 sec", aspectRatio: "16:9", text: "A retired astronaut receives a mysterious signal from a distant planet. She must decide whether to return to space for one final mission that could change humanity's understanding of the universe." },
  { label: "YouTube Short", desc: "Fast-paced vertical short-form video", style: "Cinematic", duration: "30 sec", aspectRatio: "9:16", text: "A street magician performs an impossible trick in a crowded market. The camera follows the coin as it transforms into something nobody expected, leaving the audience in complete shock." },
  { label: "Horror", desc: "Suspenseful atmospheric horror story", style: "Cinematic", duration: "60 sec", aspectRatio: "9:16", text: "A family moves into an old Victorian house. On the first night, the youngest daughter whispers that someone else already lives here. Strange sounds begin echoing from the basement at exactly 3 AM." },
  { label: "Kids Adventure", desc: "Colorful animated adventure for all ages", style: "Cartoon", duration: "60 sec", aspectRatio: "16:9", text: "A brave little fox named Pip discovers a hidden garden where tiny magical creatures live. When a storm threatens to destroy their home, Pip must find the legendary Sun Stone to save them all." },
  { label: "Sci-Fi", desc: "Futuristic cinematic story", style: "Cinematic", duration: "60 sec", aspectRatio: "16:9", text: "In the year 2150, a city floats above the clouds. A young engineer discovers that the city's power source is slowly dying. She has 24 hours to find a solution before the entire city falls from the sky." },
  { label: "Motivational", desc: "Inspirational short video", style: "Cinematic", duration: "30 sec", aspectRatio: "9:16", text: "A young boxer trains alone in an empty gym at dawn. Through sweat and determination, we see the journey from struggle to triumph, ending with a powerful moment of victory." },
];

const MUSIC_DESCRIPTIONS: Record<string, string> = {
  None: "No background music",
  Ambient: "Soft, atmospheric background tones",
  Cinematic: "Dramatic orchestral-style score",
  Emotional: "Gentle, expressive melody",
};

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
  const [rendering, setRendering] = useState(false);

  const [result, setResult] = useState<StoryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [projects, setProjects] = useState<Project[]>([]);
  const [activeScene, setActiveScene] = useState(1);
  const [projectName, setProjectName] = useState("Untitled Video");
  const [saved, setSaved] = useState(false);

  const [sceneStatus, setSceneStatus] = useState<Record<number, "idle" | "image" | "video">>({});
  const [sceneImages, setSceneImages] = useState<Record<number, string>>({});
  const [sceneVideos, setSceneVideos] = useState<Record<number, string>>({});

  /* Voice state */
  const [voiceStatus, setVoiceStatus] = useState<Record<number, "idle" | "generating" | "ready">>({});
  const [voiceAudios, setVoiceAudios] = useState<Record<number, string>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);

  /* Character consistency */
  const [characters, setCharacters] = useState<Character[]>([]);
  const [showCharacters, setShowCharacters] = useState(false);
  const [sceneCharacters, setSceneCharacters] = useState<Record<number, number[]>>({});
  const [expandedPrompts, setExpandedPrompts] = useState(false);

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
  const [searchQuery, setSearchQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState<"all" | "completed" | "in-progress">("all");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  /* Abort controllers */
  const storyAbortRef = useRef<AbortController | null>(null);
  const imageAbortRef = useRef<Record<number, AbortController>>({});
  const videoAbortRef = useRef<Record<number, AbortController>>({});

  /* Polling intervals */
  const pollIntervalsRef = useRef<ReturnType<typeof setInterval>[]>([]);

  /* Cleanup polling on unmount */
  useEffect(() => {
    return () => {
      pollIntervalsRef.current.forEach(clearInterval);
      pollIntervalsRef.current = [];
    };
  }, []);

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

  /* Load projects from localStorage */
  useEffect(() => {
    try {
      const stored = localStorage.getItem("pat-orbit-projects");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter((p) => p && typeof p === 'object' && p.id && p.title);
          setProjects(valid);
        }
      }
    } catch {
      console.error("Could not load projects. Starting fresh.");
      localStorage.removeItem("pat-orbit-projects");
    }
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
        if (showCharacters) { setShowCharacters(false); return; }
      }

      if (isInput) return;

      if (result) {
        const currentIdx = result.scenes.findIndex((s) => s.id === activeScene);
        if (e.key === 'ArrowLeft' && currentIdx > 0) { e.preventDefault(); setActiveScene(result.scenes[currentIdx - 1].id); }
        if (e.key === 'ArrowRight' && currentIdx < result.scenes.length - 1) { e.preventDefault(); setActiveScene(result.scenes[currentIdx + 1].id); }
        if (e.key === 'Home') { e.preventDefault(); setActiveScene(result.scenes[0].id); }
        if (e.key === 'End') { e.preventDefault(); setActiveScene(result.scenes[result.scenes.length - 1].id); }
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (result) saveCurrentProject();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [result, activeScene, mobileNavOpen, settingsOpen, deleteConfirmId, showCharacters]);

  function saveProjects(nextProjects: Project[]) {
    setProjects(nextProjects);
    localStorage.setItem("pat-orbit-projects", JSON.stringify(nextProjects));
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
        body: JSON.stringify({ story, language, style, duration, contentType: "Story", characters: characters.length > 0 ? characters : undefined }),
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
    };
    const newScenes = [...result.scenes];
    newScenes.splice(idx + 1, 0, newScene);
    setResult({ ...result, scenes: newScenes });
    // Copy character assignments
    if (sceneCharacters[sceneId]) {
      setSceneCharacters((prev) => ({ ...prev, [newId]: [...(sceneCharacters[sceneId] || [])] }));
    }
    setActiveScene(newId);
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
  }, [result, projectName, story, language, style, duration, sceneImages, sceneVideos, finalVideo, characters, sceneCharacters]);

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
      };
      saveProjects([project, ...projects]);
      setCurrentProjectId(newId);
    }
    setSaved(true);
    setHasUnsavedChanges(false);
    setToast("Project saved");
    setTimeout(() => setToast(null), 2500);
  }

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
    setRendering(false);
    setRenderStage('');
    setRenderProgress(0);
    setActiveScene(1);
    setCurrentProjectId(project.id);
    setSaved(true);
    setToast("Project loaded");
    setTimeout(() => setToast(null), 2500);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteProject(id: string) {
    saveProjects(projects.filter((p) => p.id !== id));
  }

  function duplicateProject(project: Project) {
    const dup: Project = {
      ...project,
      id: crypto.randomUUID(),
      title: project.title + " (Copy)",
      createdAt: new Date().toISOString(),
      sceneImages: project.sceneImages ? { ...project.sceneImages } : undefined,
      sceneVideos: undefined,
      finalVideoUrl: null,
    };
    saveProjects([dup, ...projects]);
    setToast("Project duplicated");
    setTimeout(() => setToast(null), 2500);
  }

  /* ================================================================ */
  /*  IMAGE GENERATION                                                 */
  /* ================================================================ */

  async function startImageGeneration(sceneId: number) {
    if (!result) return;
    const scene = result.scenes.find((item) => item.id === sceneId);
    if (!scene) return;
    if (imageAbortRef.current[sceneId]) imageAbortRef.current[sceneId].abort();
    const controller = new AbortController();
    imageAbortRef.current[sceneId] = controller;

    setSceneStatus((c) => ({ ...c, [sceneId]: "image" }));
    setError("");
    try {
      // Build character data for this scene
      const sceneCharIndices = sceneCharacters[sceneId] || [];
      const sceneChars = sceneCharIndices
        .map((idx) => characters[idx])
        .filter((c): c is Character => !!c && !!c.name?.trim());

      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: scene.visual,
          characters: sceneChars.length > 0 ? sceneChars : undefined,
          sceneTitle: scene.title,
          style,
          sceneBeat: scene.beat,
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
    const scene = result.scenes.find((item) => item.id === sceneId);
    if (!scene) return;
    if (videoAbortRef.current[sceneId]) videoAbortRef.current[sceneId].abort();

    setSceneStatus((c) => ({ ...c, [sceneId]: "video" }));
    setError("");

    try {
      // Build character data for this scene
      const sceneCharIndices = sceneCharacters[sceneId] || [];
      const sceneChars = sceneCharIndices
        .map((idx) => characters[idx])
        .filter((c): c is Character => !!c && !!c.name?.trim());

      const body: Record<string, unknown> = {
        prompt: scene.visual,
        duration,
        aspectRatio,
        sceneId,
        sceneTitle: scene.title,
        characters: sceneChars.length > 0 ? sceneChars : undefined,
      };
      if (sceneImages[sceneId]) body.image = sceneImages[sceneId];

      const createResp = await fetch("/api/jobs/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const createData = await createResp.json();
      if (!createResp.ok) throw new Error(createData.error || "Failed to start video generation.");
      const { jobId } = createData;
      if (!jobId) throw new Error("No job ID returned.");

      const MAX_POLL = 120;
      const POLL_INTERVAL = 3000;

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
            reject(new Error("Video generation timed out. Please try again."));
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
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : "Failed to generate video.");
      setSceneStatus((c) => ({ ...c, [sceneId]: "idle" }));
    }
  }

  /* ================================================================ */
  /*  VOICE GENERATION (PER-SCENE)                                     */
  /* ================================================================ */

  async function startVoiceGeneration(sceneId: number) {
    if (!result) return;
    const scene = result.scenes.find((s) => s.id === sceneId);
    if (!scene || !scene.narration?.trim()) return;

    setVoiceStatus((c) => ({ ...c, [sceneId]: "generating" }));
    try {
      const resp = await fetch("/api/generate-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ narration: scene.narration, language, voice }),
      });
      const data = await resp.json();
      if (resp.ok && data.audio) {
        setVoiceAudios((c) => ({ ...c, [sceneId]: data.audio }));
        setVoiceStatus((c) => ({ ...c, [sceneId]: "ready" }));
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

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */

  const totalVideosGenerated = Object.keys(sceneVideos).length;
  const totalImagesGenerated = Object.keys(sceneImages).length;
  const totalVoiceReady = Object.values(voiceStatus).filter((s) => s === "ready").length;

  async function startRender() {
    if (!result || totalVideosGenerated < result.scenes.length) return;
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
              body: JSON.stringify({ narration: s.narration, language, voice }),
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
        body: JSON.stringify({ scenes: scenesPayload, aspectRatio, captions, music, voice, language, voiceAudios: renderVoiceAudios }),
      });
      const createData = await createResp.json();
      if (!createResp.ok) throw new Error(createData.error || "Failed to start render.");
      const { jobId } = createData;
      if (!jobId) throw new Error("No render job ID returned.");

      /* Poll for completion */
      setRenderStage("Mixing audio & rendering...");
      setRenderProgress(50);
      const MAX_POLL = 180;
      const POLL_MS = 3000;

      await new Promise<void>((resolve, reject) => {
        let attempts = 0;
        const interval = setInterval(async () => {
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
              if (attempts === 30) setRenderStage("Encoding with FFmpeg...");
              if (attempts === 80) setRenderStage("Uploading final video...");
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
    if (!finalVideo) return;
    const safeName = (projectName || "pat-orbit-video").replace(/[^a-zA-Z0-9\s\-_]/g, "").replace(/\s+/g, "-").toLowerCase();
    try {
      const response = await fetch(finalVideo);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${safeName}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      setToast("Video exported successfully");
      setTimeout(() => setToast(null), 2500);
    } catch {
      setError("Export failed. Please try again.");
    }
  }

  function copyToClipboard(text: string, fieldKey: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(fieldKey);
      setTimeout(() => setCopiedField(null), 1500);
    });
  }

  const currentScene = result?.scenes.find((s) => s.id === activeScene) || null;

  function getStatusLabel(sceneId: number) {
    const st = sceneStatus[sceneId];
    if (st === "image" || st === "video") return "Generating";
    if (sceneVideos[sceneId]) return "Video ready";
    if (sceneImages[sceneId]) return "Image ready";
    return "Not started";
  }

  function getStatusColor(sceneId: number) {
    const st = sceneStatus[sceneId];
    if (st === "image") return "bg-amber-500/15 text-amber-400";
    if (st === "video") return "bg-violet-500/15 text-violet-400";
    if (sceneVideos[sceneId]) return "bg-blue-500/15 text-blue-400";
    if (sceneImages[sceneId]) return "bg-emerald-500/15 text-emerald-400";
    return "bg-white/[0.06] text-white/55";
  }

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
    { label: "Building 5 scenes", done: loadingStep >= 2 },
    { label: "Writing narration", done: loadingStep >= 3 },
    { label: "Preparing visual prompts", done: loading },
  ];

  const renderReady = result && totalVideosGenerated >= result.scenes.length;
  const renderReadiness = result ? Math.round(((totalVideosGenerated / result.scenes.length) * 70) + (totalImagesGenerated > 0 ? 15 : 0) + (totalVoiceReady > 0 ? 15 : 0)) : 0;

  return (
    <main className="min-h-screen bg-[#08090c] text-white overflow-x-hidden">
      {/* ========== HEADER ========== */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#08090c]/80 backdrop-blur-2xl">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-white to-white/70 text-[11px] font-black text-black">
              P
              <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-[#08090c] bg-emerald-400" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[13px] font-semibold tracking-tight">PAT Orbit</span>
              <span className="text-[11px] text-white/50">Studio</span>
            </div>
          </div>

          <nav className="hidden items-center gap-0.5 md:flex">
            {!result ? (
              <span className="rounded-lg bg-white/[0.06] px-3 py-1.5 text-[12px] font-medium text-white/70">Create</span>
            ) : (
              <button onClick={() => { setResult(null); setCurrentProjectId(null); }} className="rounded-lg px-3 py-1.5 text-[12px] font-medium text-white/65 transition-colors hover:bg-white/[0.05] hover:text-white/70">Create</button>
            )}
            <button onClick={() => document.getElementById("projects")?.scrollIntoView({ behavior: "smooth" })} className="rounded-lg px-3 py-1.5 text-[12px] font-medium text-white/65 transition-colors hover:bg-white/[0.05] hover:text-white/70">Projects</button>
            {result && (
              <button onClick={() => document.getElementById("timeline")?.scrollIntoView({ behavior: "smooth" })} className="rounded-lg px-3 py-1.5 text-[12px] font-medium text-white/65 transition-colors hover:bg-white/[0.05] hover:text-white/70">Timeline</button>
            )}
          </nav>

          <div className="flex items-center gap-1.5">
            {result && (
              <>
                {hasUnsavedChanges && (
                  <span className="hidden text-[10px] font-medium text-amber-400/70 sm:block">Unsaved</span>
                )}
                <button onClick={saveCurrentProject} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors ${saved && !hasUnsavedChanges ? 'text-emerald-400/70' : 'text-white/65 hover:bg-white/[0.05] hover:text-white/80'}`}>
                  <Icon.Folder className="text-white/55" />
                  {saved && !hasUnsavedChanges ? "Saved" : "Save"}
                </button>
                <button onClick={finalVideo ? exportVideo : undefined} className="hidden sm:flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[12px] font-medium text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white/80">
                  <Icon.Download className="text-white/65" />
                  Export
                </button>
              </>
            )}
            <div ref={settingsRef} className="relative hidden sm:block">
              <button onClick={() => setSettingsOpen(!settingsOpen)} aria-label="Settings" className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-white/65 transition-colors hover:bg-white/[0.08] hover:text-white/60">
                <Icon.Settings />
              </button>
              {settingsOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-white/[0.08] bg-[#111218] p-1.5 shadow-2xl">
                  <div className="px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-wider text-white/50">Settings</div>
                  <button onClick={() => setAspectRatio(aspectRatio === '9:16' ? '16:9' : aspectRatio === '16:9' ? '1:1' : '9:16')} className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12px] transition-colors hover:bg-white/[0.05] ${aspectRatio !== '9:16' ? 'text-white/90' : 'text-white/50'}`}>Aspect ratio: {aspectRatio}</button>
                  <button onClick={() => setVoice(voice === "Natural" ? "Deep" : voice === "Deep" ? "Soft" : "Natural")} className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12px] transition-colors hover:bg-white/[0.05] ${voice !== "Natural" ? "text-white/90" : "text-white/50"}`}>Voice: {voice}</button>
                  <button onClick={() => setCaptions(!captions)} className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12px] transition-colors hover:bg-white/[0.05] ${captions ? "text-white/90" : "text-white/50"}`}>Captions: {captions ? "ON" : "OFF"}</button>
                  <button onClick={() => setMusic(music === "None" ? "Ambient" : music === "Ambient" ? "Cinematic" : music === "Cinematic" ? "Emotional" : "None")} className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12px] transition-colors hover:bg-white/[0.05] ${music !== "None" ? "text-white/90" : "text-white/50"}`}>Music: {music}</button>
                </div>
              )}
            </div>

            <button onClick={() => setMobileNavOpen(!mobileNavOpen)} aria-label="Menu" className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-white/65 transition-colors md:hidden">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
            </button>
          </div>
        </div>

        {mobileNavOpen && (
          <div className="border-t border-white/[0.06] bg-[#0c0d12] px-4 py-3 md:hidden">
            <div className="flex flex-col gap-1">
              {!result ? (
                <span className="rounded-lg bg-white/[0.06] px-3 py-2.5 text-[13px] font-medium text-white/80">Create</span>
              ) : (
                <button onClick={() => { setResult(null); setCurrentProjectId(null); setMobileNavOpen(false); }} className="rounded-lg px-3 py-2.5 text-left text-[13px] font-medium text-white/65 transition-colors hover:bg-white/[0.05] hover:text-white/80">Create</button>
              )}
              <button onClick={() => { document.getElementById("projects")?.scrollIntoView({ behavior: "smooth" }); setMobileNavOpen(false); }} className="rounded-lg px-3 py-2.5 text-left text-[13px] font-medium text-white/65 transition-colors hover:bg-white/[0.05] hover:text-white/80">Projects</button>
              {result && (
                <button onClick={() => { document.getElementById("timeline")?.scrollIntoView({ behavior: "smooth" }); setMobileNavOpen(false); }} className="rounded-lg px-3 py-2.5 text-left text-[13px] font-medium text-white/65 transition-colors hover:bg-white/[0.05] hover:text-white/80">Timeline</button>
              )}
              {result && (
                <button onClick={() => { finalVideo && exportVideo(); setMobileNavOpen(false); }} className="rounded-lg px-3 py-2.5 text-left text-[13px] font-medium text-white/65 transition-colors hover:bg-white/[0.05] hover:text-white/80">Export</button>
              )}
            </div>
          </div>
        )}
      </header>

      <section className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 sm:py-12">
        {!result ? (
          <>
            {/* ===== CREATE SCREEN ===== */}
            <div className="mx-auto max-w-3xl">
              {/* Hero - minimal */}
              <div className="relative mb-5 text-center">
                <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
                  <div className="absolute left-1/2 top-0 h-[200px] w-[300px] -translate-x-1/2 rounded-full bg-gradient-to-b from-emerald-500/[0.04] to-transparent blur-3xl" />
                </div>
                <h1 className="text-[28px] font-bold tracking-tight leading-tight sm:text-[34px] text-white">
                  Create your next video
                </h1>
                <p className="mt-2 text-[13px] text-white/50">
                  One idea. Full cinematic production. Story, scenes, visuals, voice and final video.
                </p>
              </div>



              {/* Main creation card */}
              <div className="rounded-2xl border border-white/[0.10] bg-gradient-to-b from-white/[0.04] to-white/[0.015] p-5 shadow-[0_0_60px_-15px_rgba(255,255,255,0.03)] sm:p-6">
                {/* Card header */}
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10">
                      <Icon.Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                    </div>
                    <div>
                      <h2 className="text-[14px] font-semibold text-white/90">What do you want to create?</h2>
                    </div>
                  </div>
                  <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-emerald-400/70">AI Powered</span>
                </div>

                {/* Textarea - the main focus */}
                <div className="relative group">
                  <div className="absolute -inset-px rounded-xl bg-gradient-to-b from-emerald-500/[0.08] to-transparent opacity-0 transition-opacity group-focus-within:opacity-100" />
                  <textarea
                    value={story}
                    onChange={(e) => { setStory(e.target.value); setError(""); }}
                    placeholder="Describe your video idea..."
                    rows={5}
                    className="relative w-full resize-none rounded-xl border border-white/[0.10] bg-[#0a0b0f] p-4 text-[15px] leading-7 text-white outline-none transition-all placeholder:text-white/30 focus:border-emerald-500/30 focus:shadow-[0_0_20px_-8px_rgba(52,211,153,0.1)]"
                  />
                  <div className="absolute bottom-2.5 right-3 flex items-center gap-2">
                    <span className="text-[10px] text-white/25 tabular-nums">{story.length}</span>
                  </div>
                </div>

                {/* Characters + Generate row */}
                <div className="mt-3 flex items-center justify-between">
                  <button onClick={() => setShowCharacters(true)} className="flex items-center gap-1.5 text-[11px] text-white/35 transition-colors hover:text-white/55">
                    <Icon.User className="h-3 w-3" />
                    Characters
                  </button>
                  <button onClick={generateStory} disabled={!story.trim() || loading} className="flex items-center gap-2 rounded-xl bg-gradient-to-b from-white to-white/90 px-6 py-2.5 text-[13px] font-semibold text-black shadow-[0_2px_16px_-4px_rgba(255,255,255,0.2)] transition-all hover:shadow-[0_4px_24px_-4px_rgba(255,255,255,0.3)] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none">
                    {loading ? (<><Icon.Spinner className="h-3.5 w-3.5 animate-spin" />Creating...</>) : (<><Icon.Sparkles className="h-3.5 w-3.5" />Create Video</>)}
                  </button>
                </div>

                {/* Loading stages */}
                {loading && (
                  <div className="mt-3 rounded-lg border border-white/[0.06] bg-[#0a0b0f] p-3">
                    <div className="space-y-1.5">
                      {loadingSteps.map((step, i) => (
                        <div key={i} className="flex items-center gap-2">
                          {step.done ? (
                            <span className="flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
                              <Icon.Check className="h-2 w-2 text-emerald-400" />
                            </span>
                          ) : (
                            <span className="flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-full bg-white/[0.04]">
                              <span className="h-0.5 w-0.5 rounded-full bg-white/20" />
                            </span>
                          )}
                          <span className={`text-[10px] ${step.done ? "text-white/35" : "text-white/55"}`}>{step.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Error */}
                {error && <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/[0.07] px-3 py-2 text-[12px] text-red-300/90">{error}</div>}

                {/* Settings - compact row */}
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/[0.04] pt-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-white/25">Lang</span>
                    <select value={language} onChange={(e) => setLanguage(e.target.value)} className="rounded border border-white/[0.06] bg-[#0a0b0f] px-1.5 py-0.5 text-[11px] font-medium text-white/65 outline-none">
                      <option>Hindi</option><option>Hinglish</option><option>English</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-white/25">Style</span>
                    <select value={style} onChange={(e) => setStyle(e.target.value)} className="rounded border border-white/[0.06] bg-[#0a0b0f] px-1.5 py-0.5 text-[11px] font-medium text-white/65 outline-none">
                      <option>Cartoon</option><option>Cinematic</option><option>Anime</option><option>Realistic</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-white/25">Duration</span>
                    <select value={duration} onChange={(e) => setDuration(e.target.value)} className="rounded border border-white/[0.06] bg-[#0a0b0f] px-1.5 py-0.5 text-[11px] font-medium text-white/65 outline-none">
                      <option>30s</option><option>60s</option><option>90s</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-white/25">Format</span>
                    <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="rounded border border-white/[0.06] bg-[#0a0b0f] px-1.5 py-0.5 text-[11px] font-medium text-white/65 outline-none">
                      <option value="9:16">9:16</option><option value="16:9">16:9</option><option value="1:1">1:1</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-white/25">Voice</span>
                    <select value={voice} onChange={(e) => setVoice(e.target.value)} className="rounded border border-white/[0.06] bg-[#0a0b0f] px-1.5 py-0.5 text-[11px] font-medium text-white/65 outline-none">
                      <option>Natural</option><option>Deep</option><option>Soft</option>
                    </select>
                  </div>
                  <button onClick={() => setCaptions(!captions)} className="flex items-center gap-1 text-[11px] text-white/40 transition-colors hover:text-white/55">
                    <span className={`h-2.5 w-2.5 rounded border ${captions ? 'border-emerald-500/40 bg-emerald-500/15' : 'border-white/15'}`}>{captions && <Icon.Check className="h-2 w-2 text-emerald-400 m-px" />}</span>
                    CC
                  </button>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-white/25">Music</span>
                    <select value={music} onChange={(e) => setMusic(e.target.value)} className="rounded border border-white/[0.06] bg-[#0a0b0f] px-1.5 py-0.5 text-[11px] font-medium text-white/65 outline-none">
                      <option>None</option><option>Ambient</option><option>Cinematic</option><option>Emotional</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Quick Start Cards */}
              <div className="mt-6">
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/35">Quick start</span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {TEMPLATES.map((t) => (
                    <button key={t.label} onClick={() => {
                      setStory(t.text);
                      setStyle(t.style);
                      setDuration(t.duration);
                      setAspectRatio(t.aspectRatio);
                      setError("");
                    }} className="group rounded-xl border border-white/[0.06] bg-white/[0.015] p-4 text-left transition-all hover:border-emerald-500/20 hover:bg-emerald-500/[0.03] hover:-translate-y-0.5">
                      <div className="text-[13px] font-semibold text-white/75 group-hover:text-white/90 transition-colors">{t.label}</div>
                      <div className="mt-1 text-[11px] text-white/40 group-hover:text-white/55 transition-colors leading-relaxed">{t.desc}</div>
                      <div className="mt-2.5 flex items-center gap-2 text-[9px] text-white/25">
                        <span>{t.style}</span>
                        <span>&middot;</span>
                        <span>{t.duration}</span>
                        <span>&middot;</span>
                        <span>{t.aspectRatio}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* ===== WORKSPACE ===== */}
            <div ref={workspaceRef}>
              {/* Workspace header */}
              <div className="mb-4">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="mb-2 flex items-center gap-1.5 text-[11px] text-white/50">
                      <button onClick={() => { setResult(null); setCurrentProjectId(null); }} className="transition-colors hover:text-white/70">PAT Orbit Studio</button>
                      <span className="text-white/30">/</span>
                      <span className="text-white/70 truncate max-w-[180px]">{projectName}</span>
                    </div>
                    <input value={projectName} onChange={(e) => { setProjectName(e.target.value); setSaved(false); }} className="w-full bg-transparent text-2xl font-bold tracking-tight outline-none sm:text-3xl text-white" />
                    <div className="mt-1 flex items-center gap-2">
                      <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400/70">Editing project</span>
                      {saved && !hasUnsavedChanges && <span className="text-[11px] text-white/40">Last saved just now</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={saveCurrentProject} className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-[12px] font-medium transition-all active:scale-[0.98] ${hasUnsavedChanges ? 'bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/25' : saved && !hasUnsavedChanges ? 'border border-white/[0.08] bg-white/[0.04] text-emerald-400/70' : 'border border-white/[0.08] bg-white/[0.04] text-white/60 hover:bg-white/[0.08] hover:text-white/80'}`}>
                      <Icon.Folder className="text-white/55" />{saved && !hasUnsavedChanges ? "Saved" : "Save"}
                    </button>
                    <button onClick={finalVideo ? exportVideo : undefined} className="flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-[12px] font-semibold text-black transition-all hover:bg-white/90 active:scale-[0.98]">
                      <Icon.Download className="text-black/60" />Export
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                {/* Production workflow indicator */}
                <div className="mb-3 flex items-center gap-0.5 overflow-x-auto">
                  {([
                    { label: "STORY", done: true },
                    { label: "SCENES", done: true },
                    { label: "VISUALS", done: totalImagesGenerated >= result.scenes.length },
                    { label: "MOTION", done: totalVideosGenerated >= result.scenes.length },
                    { label: "AUDIO", done: totalVoiceReady >= result.scenes.filter(s => s.narration?.trim()).length },
                    { label: "FINAL", done: !!finalVideo },
                  ] as const).map((step, i, arr) => (
                    <div key={step.label} className="flex items-center">
                      <div className={`flex items-center gap-1 rounded px-1.5 py-0.5 ${step.done ? 'bg-emerald-500/10 text-emerald-400/80' : 'bg-white/[0.03] text-white/30'}`}>
                        {step.done ? <Icon.Check className="h-2.5 w-2.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-white/15" />}
                        <span className="text-[8px] font-bold tracking-wider whitespace-nowrap">{step.label}</span>
                      </div>
                      {i < arr.length - 1 && <div className="mx-0.5 h-px w-1.5 bg-white/[0.06]" />}
                    </div>
                  ))}
                </div>

                {/* Scene circles */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-white/50">Scenes</span>
                  <div className="flex gap-1.5">
                    {result.scenes.map((scene, sceneIdx) => {
                      const hasVideo = !!sceneVideos[scene.id];
                      const hasImage = !!sceneImages[scene.id];
                      return (
                        <button key={scene.id} onClick={() => setActiveScene(scene.id)}
                          title={`Scene ${sceneIdx + 1}: ${hasVideo ? 'Video ready' : hasImage ? 'Image ready' : 'Not started'}`}
                          className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold transition-all duration-200 ${activeScene === scene.id ? 'ring-2 ring-emerald-400/50 ring-offset-1 ring-offset-[#08090c]' : ''} ${hasVideo ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : hasImage ? 'bg-emerald-500/10 text-emerald-400/60 border border-emerald-500/20' : 'bg-white/[0.04] text-white/50 border border-white/[0.06]'}`}>
                          {hasVideo ? <Icon.Check className="h-3 w-3" /> : String(sceneIdx + 1).padStart(2, '0')}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 3-Column Workspace */}
              <div className="grid gap-5 lg:grid-cols-[240px_1fr_300px]">
                {/* LEFT -- Scene Navigator */}
                <div className="hidden lg:block">
                  <div className="sticky top-20">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-[12px] font-semibold uppercase tracking-wider text-white/70">Scenes</span>
                      <span className="text-[11px] text-white/50">{result.scenes.length} total</span>
                    </div>
                    <div className="space-y-1">
                      {result.scenes.map((scene, sceneIdx) => {
                        const hasVideo = !!sceneVideos[scene.id];
                        const hasImage = !!sceneImages[scene.id];
                        const hasVoice = voiceStatus[scene.id] === 'ready';
                        const isGenerating = sceneStatus[scene.id] === 'image' || sceneStatus[scene.id] === 'video';
                        const sceneHasChars = (sceneCharacters[scene.id] || []).length > 0;
                        const isComplete = hasImage && hasVideo && hasVoice;
                        return (
                          <button key={scene.id} onClick={() => setActiveScene(scene.id)}
                            className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-all duration-150 ${activeScene === scene.id ? "bg-white/[0.08] border border-white/[0.12] shadow-[0_0_20px_-10px_rgba(255,255,255,0.06)]" : "border border-transparent hover:bg-white/[0.04]"}`}>
                            <div className="relative h-10 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-white/[0.04]">
                              {hasImage ? (
                                <img src={sceneImages[scene.id]} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full items-center justify-center">
                                  <span className="text-[9px] font-bold text-white/55">{String(sceneIdx + 1).padStart(2, '0')}</span>
                                </div>
                              )}
                              {hasVideo && (
                                <div className="absolute right-0.5 top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded bg-blue-500/90">
                                  <svg width="6" height="6" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                                </div>
                              )}
                              {isGenerating && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                  <Icon.Spinner className="h-3 w-3 animate-spin text-white" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-[12px] font-medium text-white/80">{scene.title}</div>
                              {scene.beat && <div className="mt-0.5 text-[9px] text-violet-400/50 truncate">{scene.beat}</div>}
                              <div className="mt-1 flex items-center gap-1">
                                <span className={`inline-block rounded px-1.5 py-0.5 text-[8px] font-bold tracking-wide ${getStatusColor(scene.id)}`}>{getStatusLabel(scene.id)}</span>
                              </div>
                              {/* Production mini-checklist */}
                              <div className="mt-1 flex items-center gap-1.5">
                                <span className={`text-[8px] font-medium ${hasImage ? 'text-emerald-400/70' : 'text-white/25'}`}>{hasImage ? 'IMG' : ''}</span>
                                <span className={`text-[8px] font-medium ${hasVideo ? 'text-blue-400/70' : 'text-white/25'}`}>{hasVideo ? 'VID' : ''}</span>
                                <span className={`text-[8px] font-medium ${hasVoice ? 'text-violet-400/70' : 'text-white/25'}`}>{hasVoice ? 'VOC' : ''}</span>
                                {isComplete && <span className="text-[8px] font-bold text-emerald-400/70">DONE</span>}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* CENTER -- Preview */}
                <div className="space-y-3">                   <div className="flex gap-1.5 overflow-x-auto pb-1 lg:hidden">
                    {result.scenes.map((scene, sceneIdx) => (
                      <button key={scene.id} onClick={() => setActiveScene(scene.id)}
                        className={`flex flex-shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-all ${activeScene === scene.id ? "bg-white/[0.1] text-white border border-white/[0.15]" : "bg-white/[0.03] text-white/65 border border-transparent"}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${getStatusDotColor(scene.id)}`} />
                        {String(sceneIdx + 1).padStart(2, '0')}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-bold uppercase tracking-wider text-white/70">Scene {String(activeScene).padStart(2, "0")}</span>
                      {currentScene?.beat && (<>
                        <span className="text-[11px] text-white/45">&middot;</span>
                        <span className="text-[11px] text-violet-400/60">{currentScene.beat}</span>
                      </>)}
                      {currentScene?.sceneDuration && (<>
                        <span className="text-[11px] text-white/45">&middot;</span>
                        <span className="text-[11px] text-blue-400/50">~{currentScene.sceneDuration}s</span>
                      </>)}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {currentScene && (
                        <>
                          {/* Production status badges */}
                          {(sceneCharacters[currentScene.id] || []).length > 0 && (
                            <span className="rounded bg-violet-500/10 px-1.5 py-0.5 text-[9px] font-bold text-violet-400/70">CHARS</span>
                          )}
                          {sceneStatus[currentScene.id] === 'image' && (
                            <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-400/70">GENERATING</span>
                          )}
                          {sceneImages[currentScene.id] && !sceneVideos[currentScene.id] && sceneStatus[currentScene.id] !== 'video' && (
                            <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400/70">IMAGE READY</span>
                          )}
                          {sceneStatus[currentScene.id] === 'video' && (
                            <span className="rounded bg-violet-500/10 px-1.5 py-0.5 text-[9px] font-bold text-violet-400/70">VIDEO GEN</span>
                          )}
                          {sceneVideos[currentScene.id] && (
                            <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-bold text-blue-400/70">VIDEO READY</span>
                          )}
                          {voiceStatus[currentScene.id] === 'ready' && (
                            <span className="rounded bg-violet-500/10 px-1.5 py-0.5 text-[9px] font-bold text-violet-400/70">VOICE</span>
                          )}
                          {/* Scene complete indicator */}
                          {sceneImages[currentScene.id] && sceneVideos[currentScene.id] && voiceStatus[currentScene.id] === 'ready' && (
                            <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">SCENE READY</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Preview card */}
                  <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0d12] shadow-[0_4px_40px_-12px_rgba(0,0,0,0.5)]">
                    {currentScene && sceneStatus[currentScene.id] === "image" ? (
                      <div className="flex aspect-video flex-col items-center justify-center bg-[#0c0d12]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)", backgroundSize: "24px 24px" }}>
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10">
                          <Icon.Spinner className="h-7 w-7 text-amber-400" />
                        </div>
                        <span className="text-[14px] font-semibold text-white/70">Creating cinematic scene...</span>
                        <span className="mt-1.5 text-[11px] text-white/40">Building visual composition for Scene {String(activeScene).padStart(2, '0')}</span>
                        {/* Skeleton grid effect */}
                        <div className="mt-5 flex gap-1.5">
                          {[0,1,2,3,4].map(n => (
                            <div key={n} className={`h-8 w-10 rounded border ${n === activeScene - 1 ? 'border-amber-500/30 bg-amber-500/[0.06] animate-pulse' : 'border-white/[0.04] bg-white/[0.01]'}`} />
                          ))}
                        </div>
                      </div>
                    ) : currentScene && sceneStatus[currentScene.id] === "video" ? (
                      <div className="flex aspect-video flex-col items-center justify-center bg-[#0c0d12]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)", backgroundSize: "24px 24px" }}>
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10">
                          <Icon.Spinner className="h-7 w-7 text-violet-400" />
                        </div>
                        <span className="text-[14px] font-semibold text-white/70">Creating cinematic motion...</span>
                        <span className="mt-1.5 text-[11px] text-white/40">Turning your visual into a moving scene</span>
                        {/* Image-to-video workflow indicator */}
                        <div className="mt-5 flex items-center gap-2">
                          <div className="flex h-8 w-10 items-center justify-center rounded border border-emerald-500/20 bg-emerald-500/[0.06]">
                            <Icon.Image className="h-3 w-3 text-emerald-400/70" />
                          </div>
                          <div className="flex items-center gap-0.5">
                            <div className="h-px w-3 bg-violet-400/30" />
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-violet-400/50"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                          </div>
                          <div className="flex h-8 w-10 items-center justify-center rounded border border-violet-500/20 bg-violet-500/[0.06] animate-pulse">
                            <Icon.Video className="h-3 w-3 text-violet-400/70" />
                          </div>
                        </div>
                      </div>
                    ) : currentScene && sceneVideos[currentScene.id] ? (
                      <div className="relative">
                        <video src={sceneVideos[currentScene.id]} controls className="aspect-video w-full object-cover bg-black" poster={sceneImages[currentScene.id]} />
                      </div>
                    ) : currentScene && sceneImages[currentScene.id] ? (
                      <div className="relative">
                        <img src={sceneImages[currentScene.id]} alt={currentScene.title} className="aspect-video w-full object-cover" />
                        {/* Image-to-video prompt overlay */}
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1.5">
                                <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">IMAGE READY</span>
                                <div className="flex items-center gap-0.5">
                                  <div className="h-px w-4 bg-white/20" />
                                  <Icon.ArrowRight className="h-2.5 w-2.5 text-white/30" />
                                </div>
                                <span className="text-[9px] font-medium text-white/50">Generate Motion</span>
                              </div>
                            </div>
                            <span className="text-[10px] text-white/40">Scene {String(activeScene).padStart(2, '0')}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex aspect-video flex-col items-center justify-center" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)", backgroundSize: "24px 24px" }}>
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03]">
                          <Icon.Image className="text-white/45" />
                        </div>
                        <span className="text-[14px] font-medium text-white/65">Your scene isn't visualized yet</span>
                        <span className="mt-1.5 max-w-xs text-center text-[12px] leading-5 text-white/40">Generate an image to create the visual for this scene, then create cinematic video from it.</span>
                        {/* Workflow pipeline visual */}
                        <div className="mt-6 flex items-center gap-2">
                          {['Scene', 'Image', 'Video'].map((step, i) => (
                            <div key={step} className="flex items-center gap-1.5">
                              <div className={`flex h-6 w-6 items-center justify-center rounded border ${i === 0 ? 'border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-400/80' : 'border-white/[0.06] bg-white/[0.02] text-white/25'}`}>
                                <span className="text-[8px] font-bold">{i === 0 ? '1' : i === 1 ? '2' : '3'}</span>
                              </div>
                              <span className={`text-[9px] font-medium ${i === 0 ? 'text-emerald-400/60' : 'text-white/25'}`}>{step}</span>
                              {i < 2 && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/15"><path d="M5 12h14M12 5l7 7-7 7" /></svg>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Generation actions */}
                  {currentScene && (
                    <div className="space-y-2">
                      {/* Image generation */}
                      <div className="flex items-center gap-2">
                        <button onClick={() => startImageGeneration(currentScene.id)} disabled={sceneStatus[currentScene.id] === "image" || sceneStatus[currentScene.id] === "video"}
                          className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-[12px] font-medium text-white/60 transition-all hover:bg-white/[0.08] hover:text-white/80 active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100">
                          {sceneStatus[currentScene.id] === "image" ? (<><Icon.Spinner className="h-3.5 w-3.5 animate-spin" />Generating...</>) : sceneImages[currentScene.id] ? (<>Regenerate Image</>) : (<>Generate Image</>)}
                        </button>
                        {sceneImages[currentScene.id] && !sceneVideos[currentScene.id] && sceneStatus[currentScene.id] !== 'video' && (
                          <span className="flex items-center gap-1 text-[10px] text-emerald-400/60"><Icon.Check className="h-3 w-3" />Ready</span>
                        )}
                      </div>

                      {/* Video generation - only show when image exists or video exists */}
                      {(sceneImages[currentScene.id] || sceneVideos[currentScene.id]) && (
                        <div className="flex items-center gap-2">
                          <button onClick={() => startVideoGeneration(currentScene.id)} disabled={sceneStatus[currentScene.id] === "video" || sceneStatus[currentScene.id] === "image"}
                            className="flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-[12px] font-semibold text-black transition-all hover:bg-white/90 active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100">
                            {sceneStatus[currentScene.id] === "video" ? (<><Icon.Spinner className="h-3.5 w-3.5 animate-spin" />Creating cinematic motion...</>) : sceneVideos[currentScene.id] ? "Regenerate Video" : "Generate Video"}
                          </button>
                          {sceneVideos[currentScene.id] && (
                            <span className="flex items-center gap-1 text-[10px] text-blue-400/60"><Icon.Check className="h-3 w-3" />Ready</span>
                          )}
                        </div>
                      )}

                      {/* Workflow visual when image exists but no video */}
                      {sceneImages[currentScene.id] && !sceneVideos[currentScene.id] && sceneStatus[currentScene.id] !== 'video' && sceneStatus[currentScene.id] !== 'image' && (
                        <div className="flex items-center justify-center gap-3 rounded-lg border border-white/[0.04] bg-white/[0.015] px-3 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">IMAGE</span>
                            <div className="flex items-center gap-0.5">
                              <div className="h-px w-4 bg-violet-400/30" />
                              <span className="text-[9px] text-white/30">Generate Motion</span>
                              <div className="h-px w-4 bg-violet-400/30" />
                            </div>
                            <span className="rounded bg-violet-500/15 px-1.5 py-0.5 text-[9px] font-bold text-violet-400/50">VIDEO</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Next-step guidance */}
                  {currentScene && !sceneStatus[currentScene.id] && (
                    <div className="rounded-lg border border-white/[0.04] bg-white/[0.015] px-3 py-2">
                      <p className="text-[11px] text-white/55">
                        {!sceneImages[currentScene.id] && !sceneVideos[currentScene.id] && "Start by generating the scene image, then create video from it."}
                        {sceneImages[currentScene.id] && !sceneVideos[currentScene.id] && "Image ready. Generate a video to complete this scene."}
                        {sceneVideos[currentScene.id] && "Scene complete. Navigate to the next scene or render your final video."}
                      </p>
                    </div>
                  )}

                  {/* Error card */}
                  {error && (
                    <div className="rounded-lg border border-red-500/20 bg-red-500/[0.07] px-4 py-3">
                      <div className="mb-1 text-[12px] font-semibold text-red-400">Generation failed</div>
                      <p className="text-[13px] text-red-300/80">{error}</p>
                      {currentScene && (
                        <div className="mt-2 flex gap-2">
                          {!sceneImages[currentScene.id] && (
                            <button onClick={() => startImageGeneration(currentScene.id)} className="rounded-md bg-red-500/10 px-3 py-1 text-[11px] font-medium text-red-400 transition-colors hover:bg-red-500/20">Try image again</button>
                          )}
                          {sceneImages[currentScene.id] && !sceneVideos[currentScene.id] && (
                            <button onClick={() => startVideoGeneration(currentScene.id)} className="rounded-md bg-red-500/10 px-3 py-1 text-[11px] font-medium text-red-400 transition-colors hover:bg-red-500/20">Try video again</button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* RIGHT -- Details + Settings */}
                <div className="space-y-3">
                  {currentScene && (<>
                    {/* Scene title */}
                    <div className="rounded-xl border border-white/[0.10] bg-white/[0.025] p-4">
                      <label className="mb-1.5 block text-[12px] font-medium text-white/80">Scene Title</label>
                      <input value={currentScene.title} onChange={(e) => updateScene(currentScene.id, "title", e.target.value)} className="w-full rounded-lg border border-white/[0.10] bg-[#0c0d12] px-3 py-2.5 text-[14px] font-medium text-white outline-none transition-all focus:border-white/[0.20]" />
                      {/* Scene metadata - editable */}
                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-violet-400/60" />
                          <input value={currentScene.beat || ''} onChange={(e) => updateScene(currentScene.id, 'beat', e.target.value)} placeholder="Beat" className="w-24 bg-transparent text-[10px] font-medium text-violet-400/70 outline-none placeholder:text-white/20" />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-400/60" />
                          <input value={currentScene.sceneDuration || ''} onChange={(e) => updateScene(currentScene.id, 'sceneDuration', e.target.value)} placeholder="10" className="w-10 bg-transparent text-[10px] font-medium text-blue-400/70 outline-none placeholder:text-white/20" />
                          <span className="text-[10px] text-blue-400/40">s</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/60" />
                          <span className="text-[10px] font-medium text-emerald-400/70">Scene {result.scenes.findIndex((s) => s.id === currentScene.id) + 1} of {result.scenes.length}</span>
                        </div>
                        <button onClick={() => duplicateScene(currentScene.id)} className="flex items-center gap-1 rounded border border-white/[0.06] px-2 py-0.5 text-[9px] text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/60">
                          <Icon.Copy2 />Duplicate
                        </button>
                      </div>
                    </div>

                    {/* Narration */}
                    <div className="rounded-xl border border-white/[0.10] bg-white/[0.025] p-4">
                      <div className="mb-1.5 flex items-center justify-between">
                        <label className="text-[12px] font-medium text-white/75">Narration</label>
                        <div className="flex items-center gap-1">
                          <button onClick={() => copyToClipboard(currentScene.narration, "narration")} aria-label="Copy narration" className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] text-white/45 transition-colors hover:bg-white/[0.06] hover:text-white/65">
                            {copiedField === "narration" ? <><Icon.Check className="text-emerald-400" /><span className="text-emerald-400">Copied</span></> : <><Icon.Copy /><span>Copy</span></>}
                          </button>
                        </div>
                      </div>
                      <textarea value={currentScene.narration} onChange={(e) => updateScene(currentScene.id, "narration", e.target.value)} rows={5} className="w-full resize-y rounded-lg border border-white/[0.10] bg-[#0c0d12] p-3 text-[14px] leading-7 text-white/80 outline-none transition-all focus:border-white/[0.20]" />
                      {/* Per-scene voice */}
                      <div className="mt-3 rounded-lg border border-white/[0.06] bg-[#0c0d12] p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Icon.Mic className="h-3 w-3 text-white/50" />
                            <span className="text-[11px] font-medium text-white/70">Voice Narration</span>
                          </div>
                          {voiceStatus[currentScene.id] === 'ready' && (
                            <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[8px] font-bold text-emerald-400/70">READY</span>
                          )}
                          {voiceStatus[currentScene.id] === 'generating' && (
                            <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[8px] font-bold text-amber-400/70">GENERATING</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => startVoiceGeneration(currentScene.id)} disabled={voiceStatus[currentScene.id] === "generating" || !currentScene.narration?.trim()}
                            className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-white/60 transition-all hover:bg-white/[0.08] hover:text-white/80 active:scale-[0.98] disabled:opacity-40">
                            {voiceStatus[currentScene.id] === "generating" ? (<><Icon.Spinner className="h-3 w-3 animate-spin" />Generating...</>) : voiceStatus[currentScene.id] === "ready" ? (<><Icon.Mic className="h-3 w-3 text-emerald-400" />Regenerate</>) : (<><Icon.Mic className="h-3 w-3" />Generate voice</>)}
                          </button>
                          {voiceStatus[currentScene.id] === "ready" && (
                            <button onClick={() => playVoice(currentScene.id)} className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-white/60 transition-all hover:bg-white/[0.08] hover:text-white/80">
                              <Icon.Play className="h-3 w-3" />Preview
                            </button>
                          )}
                          {voiceStatus[currentScene.id] === "ready" && (
                            <button onClick={stopVoice} className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-white/60 transition-all hover:bg-white/[0.08] hover:text-white/80">
                              <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>Stop
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Visual prompt */}
                    <div className="rounded-xl border border-white/[0.10] bg-white/[0.025] p-4">
                      <div className="mb-1.5 flex items-center justify-between">
                        <label className="text-[12px] font-medium text-white/75">Visual Prompt</label>
                        <button onClick={() => copyToClipboard(currentScene.visual, "visual")} aria-label="Copy visual prompt" className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] text-white/45 transition-colors hover:bg-white/[0.06] hover:text-white/65">
                          {copiedField === "visual" ? <><Icon.Check className="text-emerald-400" /><span className="text-emerald-400">Copied</span></> : <><Icon.Copy /><span>Copy</span></>}
                        </button>
                      </div>
                      <textarea value={currentScene.visual} onChange={(e) => updateScene(currentScene.id, "visual", e.target.value)} rows={4} className="w-full resize-y rounded-lg border border-white/[0.10] bg-[#0c0d12] p-3 text-[14px] leading-7 text-white/75 outline-none transition-all focus:border-white/[0.20]" />
                    </div>

                    {/* Characters - Per Scene Selection */}
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon.User className="text-white/60" />
                          <span className="text-[12px] font-semibold text-white/80">Characters in this scene</span>
                        </div>
                        <button onClick={() => setShowCharacters(!showCharacters)} className="text-[10px] text-white/45 hover:text-white/65 transition-colors">
                          {showCharacters ? "Hide" : "Edit"}
                        </button>
                      </div>
                      {characters.length > 0 ? (
                        <div className="space-y-1">
                          {characters.map((c, i) => {
                            if (!c.name?.trim()) return null;
                            const isSelected = (sceneCharacters[currentScene.id] || []).includes(i);
                            return (
                              <label key={i} className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[11px] cursor-pointer transition-all ${isSelected ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-white/[0.03] border border-transparent hover:bg-white/[0.05]'}`}>
                                <input type="checkbox" checked={isSelected} onChange={() => {
                                  const current = sceneCharacters[currentScene.id] || [];
                                  const next = isSelected ? current.filter((idx) => idx !== i) : [...current, i];
                                  setSceneCharacters((prev) => ({ ...prev, [currentScene.id]: next }));
                                  setSaved(false);
                                }} className="sr-only" />
                                <div className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border ${isSelected ? 'border-emerald-500 bg-emerald-500/20' : 'border-white/20 bg-transparent'}`}>
                                  {isSelected && <Icon.Check className="h-2.5 w-2.5 text-emerald-400" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <span className="font-medium text-white/75">{c.name}</span>
                                  {c.appearance && <span className="ml-1.5 text-white/40">{c.appearance}</span>}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-[11px] text-white/45">Add characters to keep visuals consistent across scenes.</p>
                      )}
                    </div>

                    {/* Character Consistency Summary */}
                    {characters.length > 0 && result && (
                      <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-4">
                        <div className="mb-2 text-[12px] font-semibold text-white/80">Character Consistency</div>
                        <div className="space-y-1.5">
                          {characters.filter((c) => c.name?.trim()).map((c, i) => {
                            const realIdx = characters.indexOf(c);
                            const usedInScenes = result.scenes.filter((s) => (sceneCharacters[s.id] || []).includes(realIdx));
                            return (
                              <div key={i} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-2.5 py-1.5">
                                <div className="min-w-0">
                                  <span className="text-[11px] font-medium text-white/70">{c.name}</span>
                                  {c.role && <span className="ml-1.5 text-[10px] text-white/40">{c.role}</span>}
                                </div>
                                <span className={`text-[10px] font-medium ${usedInScenes.length > 0 ? 'text-emerald-400/70' : 'text-white/35'}`}>
                                  {usedInScenes.length > 0 ? `Used in ${usedInScenes.length} scene${usedInScenes.length !== 1 ? 's' : ''}` : 'Not assigned'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        <button onClick={() => setShowCharacters(true)} className="mt-2 text-[10px] text-white/40 hover:text-white/60 transition-colors">
                          Edit characters
                        </button>
                      </div>
                    )}

                    {/* Visual Prompt Transparency */}
                    {currentScene && (
                      <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-4">
                        <button onClick={() => setExpandedPrompts(!expandedPrompts)} className="flex w-full items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon.Wand className="h-3.5 w-3.5 text-white/50" />
                            <span className="text-[12px] font-semibold text-white/80">AI Visual Prompt</span>
                          </div>
                          <span className="text-[10px] text-white/40">{expandedPrompts ? 'Hide' : 'Show full prompt'}</span>
                        </button>
                        {expandedPrompts && (
                          <div className="mt-3 rounded-lg border border-white/[0.06] bg-[#0c0d12] p-3">
                            <p className="text-[11px] leading-relaxed text-white/60 whitespace-pre-wrap break-words">
                              {(() => {
                                const sceneCharIndices = sceneCharacters[currentScene.id] || [];
                                const sceneChars = sceneCharIndices.map((idx) => characters[idx]).filter((c): c is Character => !!c?.name?.trim());
                                let fullPrompt = currentScene.visual.trim();
                                if (sceneChars.length > 0) {
                                  const charDesc = sceneChars.map((c) => {
                                    const parts = [c.name];
                                    if (c.appearance) parts.push(`Appearance: ${c.appearance}`);
                                    if (c.role) parts.push(`Role: ${c.role}`);
                                    if (c.description) parts.push(`Description: ${c.description}`);
                                    return parts.join(' - ');
                                  });
                                  fullPrompt = `Characters: ${charDesc.join('; ')}\n\nScene: ${fullPrompt}`;
                                }
                                if (currentScene.beat) fullPrompt += `\n\nEmotional tone: ${currentScene.beat}.`;
                                if (style) fullPrompt += `\n\nStyle: ${style}. Cinematic, high quality.`;
                                else fullPrompt += '\n\nCinematic, high quality.';
                                return fullPrompt;
                              })()}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Video Settings */}
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-4">
                      <div className="mb-3 text-[13px] font-semibold text-white/80">Video Settings</div>
                      <div className="space-y-3">
                        <div>
                          <label className="mb-1.5 block text-[11px] font-medium text-white/65">Aspect Ratio</label>
                          <div className="grid grid-cols-3 gap-1 rounded-lg bg-[#0c0d12] p-0.5">
                            {["9:16", "16:9", "1:1"].map((ratio) => (
                              <button key={ratio} onClick={() => setAspectRatio(ratio)} className={`rounded-md py-1.5 text-[10px] font-medium transition-all ${aspectRatio === ratio ? "bg-white text-black shadow-sm" : "text-white/55 hover:text-white/50"}`}>{ratio}</button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-[11px] font-medium text-white/65">Voice</label>
                          <div className="grid grid-cols-3 gap-1 rounded-lg bg-[#0c0d12] p-0.5">
                            {["Natural", "Deep", "Soft"].map((v) => (
                              <button key={v} onClick={() => setVoice(v)} className={`rounded-md py-1.5 text-[10px] font-medium transition-all ${voice === v ? "bg-white text-black shadow-sm" : "text-white/55 hover:text-white/50"}`}>{v}</button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-[11px] font-medium text-white/65">Captions</label>
                          <button onClick={() => setCaptions(!captions)} className="flex w-full items-center justify-between rounded-lg border border-white/[0.06] bg-[#0c0d12] px-3 py-2 text-[11px] transition-all hover:border-white/[0.1]">
                            <span className="text-white/75">Auto captions</span>
                            <span className={`rounded px-2 py-0.5 text-[9px] font-bold transition-colors ${captions ? "bg-white text-black" : "bg-white/[0.06] text-white/50"}`}>{captions ? "ON" : "OFF"}</span>
                          </button>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-[11px] font-medium text-white/65">Background Music</label>
                          <div className="grid grid-cols-2 gap-1 rounded-lg bg-[#0c0d12] p-0.5">
                            {["None", "Ambient", "Cinematic", "Emotional"].map((m) => (
                              <button key={m} onClick={() => setMusic(m)} className={`rounded-md py-1.5 text-[10px] font-medium transition-all ${music === m ? "bg-white text-black shadow-sm" : "text-white/55 hover:text-white/50"}`}>{m}</button>
                            ))}
                          </div>
                          <p className="mt-1 text-[10px] text-white/40">{MUSIC_DESCRIPTIONS[music]}</p>
                        </div>
                      </div>
                    </div>

                    {/* Render Panel */}
                    <div className="rounded-xl border border-white/[0.10] bg-white/[0.025] p-4">
                      <div className="mb-3">
                        <span className="text-[13px] font-semibold text-white/85">Final Video</span>
                      </div>

                      {/* Render readiness checklist */}
                      <div className="mb-3 space-y-2">
                        {/* Scenes */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {totalVideosGenerated >= result.scenes.length ? (
                              <Icon.Check className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-white/20">
                                <span className="text-[7px] font-bold text-white/40">{totalVideosGenerated}</span>
                              </span>
                            )}
                            <span className="text-[11px] font-medium text-white/70">Scenes</span>
                          </div>
                          <span className={`text-[11px] font-semibold ${totalVideosGenerated >= result.scenes.length ? 'text-emerald-400/80' : 'text-white/55'}`}>{totalVideosGenerated} / {result.scenes.length}</span>
                        </div>
                        {/* Voice */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {totalVoiceReady >= result.scenes.filter(s => s.narration?.trim()).length ? (
                              <Icon.Check className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-white/20">
                                <span className="text-[7px] font-bold text-white/40">{totalVoiceReady}</span>
                              </span>
                            )}
                            <span className="text-[11px] font-medium text-white/70">Voice</span>
                          </div>
                          <span className={`text-[11px] font-semibold ${totalVoiceReady >= result.scenes.filter(s => s.narration?.trim()).length ? 'text-emerald-400/80' : 'text-white/55'}`}>{totalVoiceReady} / {result.scenes.filter(s => s.narration?.trim()).length}</span>
                        </div>
                        {/* Music */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon.Check className="h-3.5 w-3.5 text-emerald-400" />
                            <span className="text-[11px] font-medium text-white/70">Music</span>
                          </div>
                          <span className="text-[11px] font-semibold text-white/55">{music}</span>
                        </div>
                        {/* Captions */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon.Check className="h-3.5 w-3.5 text-emerald-400" />
                            <span className="text-[11px] font-medium text-white/70">Captions</span>
                          </div>
                          <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${captions ? 'bg-white text-black' : 'bg-white/[0.06] text-white/50'}`}>{captions ? 'ON' : 'OFF'}</span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                        <div className={`h-full rounded-full transition-all duration-500 ${renderProgress === 100 ? 'bg-emerald-400' : rendering ? 'bg-blue-400' : renderReady ? 'bg-emerald-500/60' : 'bg-white/20'}`} style={{ width: `${rendering || finalVideo ? (renderProgress || (totalVideosGenerated / result.scenes.length) * 100) : (totalVideosGenerated / result.scenes.length) * 100}%` }} />
                      </div>

                      {/* Ready indicator */}
                      {renderReady && !rendering && !finalVideo && (
                        <div className="mb-3 flex items-center gap-2 rounded-lg border border-emerald-500/15 bg-emerald-500/[0.06] px-3 py-2">
                          <Icon.Check className="h-3.5 w-3.5 text-emerald-400" />
                          <span className="text-[11px] font-semibold text-emerald-400/90">Ready to render</span>
                        </div>
                      )}

                      {rendering && renderStage && (
                        <div className="mb-3 flex items-center gap-2 rounded-lg bg-blue-500/10 px-3 py-2">
                          <Icon.Spinner className="h-3 w-3 animate-spin text-blue-400" />
                          <span className="text-[11px] font-medium text-blue-400">{renderStage}</span>
                        </div>
                      )}

                      {finalVideo && !rendering && (
                        <div className="mb-3 flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2">
                          <Icon.Check className="h-3 w-3 text-emerald-400" />
                          <span className="text-[11px] font-medium text-emerald-400">Final video ready</span>
                        </div>
                      )}

                      <button onClick={finalVideo ? exportVideo : startRender} disabled={rendering || (!finalVideo && !renderReady)} className="w-full rounded-xl bg-gradient-to-b from-white to-white/90 px-4 py-3 text-[13px] font-semibold text-black shadow-[0_2px_16px_-4px_rgba(255,255,255,0.2)] transition-all hover:shadow-[0_4px_24px_-4px_rgba(255,255,255,0.3)] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none">
                        {rendering ? (
                          <span className="flex items-center justify-center gap-2"><Icon.Spinner className="h-3.5 w-3.5" />Rendering... {renderProgress}%</span>
                        ) : finalVideo ? (
                          <span className="flex items-center justify-center gap-2"><Icon.Download />Export Video</span>
                        ) : renderReady ? (
                          <span className="flex items-center justify-center gap-2"><Icon.Sparkles />Render Final Video</span>
                        ) : "Render Final Video"}
                      </button>

                      <p className="mt-2 text-center text-[11px] text-white/50">
                        {!renderReady ? `Generate videos for all ${result.scenes.length} scenes to render.` : finalVideo ? 'Export your final video as MP4.' : 'All scenes ready. Render your final video.'}
                      </p>
                    </div>
                  </>)}
                </div>
              </div>
            </div>

            {/* ===== FINAL VIDEO ===== */}
            {finalVideo && (
              <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.03] p-5">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Icon.Check className="h-4 w-4 text-emerald-400" />
                      <span className="text-[15px] font-semibold text-emerald-400">Your video is ready</span>
                    </div>
                    <p className="mt-1 text-[12px] text-white/55">Your complete AI-generated video is ready to export.</p>
                  </div>
                  <button onClick={exportVideo} className="flex items-center gap-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/20 px-4 py-2 text-[13px] font-semibold text-emerald-400 transition-all hover:bg-emerald-500/25 active:scale-[0.98]">
                    <Icon.Download />Export Video
                  </button>
                </div>
                <video src={finalVideo} controls className="w-full max-w-2xl rounded-xl bg-black" />
                <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-white/50">
                  <span>{result.scenes.length} scenes</span>
                  <span>&middot;</span>
                  <span>{duration}</span>
                  <span>&middot;</span>
                  <span>{aspectRatio}</span>
                  <span>&middot;</span>
                  <span>{voice}</span>
                  <span>&middot;</span>
                  <span>Captions {captions ? "ON" : "OFF"}</span>
                  <span>&middot;</span>
                  <span>{music}</span>
                </div>
              </div>
            )}

            {/* ===== TIMELINE ===== */}
            <div id="timeline" className="mt-6 rounded-xl border border-white/[0.10] bg-white/[0.025] p-4">
              {/* Timeline header */}
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-[13px] font-semibold text-white/85">Timeline</span>
                  <span className="text-[11px] text-white/45">{result.scenes.length} scenes</span>
                  <span className="rounded bg-white/[0.06] px-2 py-0.5 text-[11px] font-medium text-white/60">{totalDurationFormatted}</span>
                </div>
                <div className="flex items-center gap-3">
                  {/* Captions indicator */}
                  <div className="flex items-center gap-1.5">
                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${captions ? 'bg-white text-black' : 'bg-white/[0.06] text-white/40'}`}>{captions ? 'CAPTIONS ON' : 'CAPTIONS OFF'}</span>
                  </div>
                  {/* Music indicator */}
                  <div className="flex items-center gap-1.5">
                    <Icon.Music className="h-3 w-3 text-white/30" />
                    <span className="text-[10px] text-white/45">{music}</span>
                  </div>
                </div>
              </div>

              {/* Playhead track */}
              <div className="relative mb-3">
                <div className="h-px w-full bg-white/[0.06]">
                  <div className="absolute left-0 top-1/2 h-2 w-2 -translate-x-1 -translate-y-1/2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)] z-10" style={{ left: `${((result.scenes.findIndex((s) => s.id === activeScene) + 0.5) / result.scenes.length) * 100}%` }} />
                  <div className="absolute left-0 top-1/2 h-px bg-emerald-400/40" style={{ width: `${((result.scenes.findIndex((s) => s.id === activeScene) + 1) / result.scenes.length) * 100}%` }} />
                </div>
              </div>

              {/* Scene blocks */}
              <div className="space-y-2">
                {result.scenes.map((scene, sceneIdx) => {
                  const hasVideo = !!sceneVideos[scene.id];
                  const hasImage = !!sceneImages[scene.id];
                  const hasVoice = voiceStatus[scene.id] === 'ready';
                  const isComplete = hasImage && hasVideo;
                  const isActive = activeScene === scene.id;
                  const isFirst = sceneIdx === 0;
                  const isLast = sceneIdx === result.scenes.length - 1;

                  return (
                    <div key={scene.id}
                      onClick={() => setActiveScene(scene.id)}
                      className={`group relative flex items-stretch rounded-xl border transition-all duration-150 cursor-pointer ${isActive ? 'border-emerald-500/25 bg-emerald-500/[0.04] shadow-[0_0_20px_-8px_rgba(52,211,153,0.15)]' : isComplete ? 'border-emerald-500/8 bg-emerald-500/[0.015] hover:bg-emerald-500/[0.03]' : 'border-white/[0.06] bg-white/[0.01] hover:bg-white/[0.03]'}`}>

                      {/* Reorder controls */}
                      <div className="flex flex-col justify-center gap-0.5 border-r border-white/[0.04] px-1.5">
                        <button onClick={(e) => { e.stopPropagation(); moveScene(scene.id, -1); }} disabled={isFirst}
                          aria-label="Move scene left"
                          className="flex h-5 w-5 items-center justify-center rounded text-white/25 transition-colors hover:bg-white/[0.06] hover:text-white/60 disabled:opacity-20 disabled:cursor-not-allowed">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 15l-6-6-6 6" /></svg>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); moveScene(scene.id, 1); }} disabled={isLast}
                          aria-label="Move scene right"
                          className="flex h-5 w-5 items-center justify-center rounded text-white/25 transition-colors hover:bg-white/[0.06] hover:text-white/60 disabled:opacity-20 disabled:cursor-not-allowed">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" /></svg>
                        </button>
                      </div>

                      {/* Scene number */}
                      <div className="flex w-10 flex-shrink-0 items-center justify-center border-r border-white/[0.04]">
                        <span className={`text-[14px] font-bold ${isActive ? 'text-emerald-400/80' : 'text-white/30'}`}>{String(sceneIdx + 1).padStart(2, '0')}</span>
                      </div>

                      {/* Thumbnail */}
                      <div className="relative h-14 w-20 flex-shrink-0 overflow-hidden border-r border-white/[0.04]">
                        {hasImage ? (
                          <img src={sceneImages[scene.id]} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center bg-white/[0.02]">
                            <Icon.Image className="h-4 w-4 text-white/15" />
                          </div>
                        )}
                        {hasVideo && (
                          <div className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded bg-blue-500/90">
                            <svg width="7" height="7" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                          </div>
                        )}
                        {isActive && <div className="absolute inset-0 border-2 border-emerald-400/30" />}
                      </div>

                      {/* Scene info */}
                      <div className="flex-1 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-[13px] font-semibold ${isActive ? 'text-white/90' : 'text-white/75'}`}>{scene.title}</span>
                          {scene.beat && <span className="rounded bg-violet-500/10 px-1.5 py-0.5 text-[8px] font-bold text-violet-400/70">{scene.beat}</span>}
                        </div>
                        {scene.sceneDuration && (
                          <div className="mt-0.5 text-[10px] text-white/35">~{scene.sceneDuration}s</div>
                        )}
                      </div>

                      {/* Status indicators */}
                      <div className="flex items-center gap-2 border-l border-white/[0.04] px-3">
                        <div className="flex flex-col items-center gap-1">
                          <div className={`flex items-center gap-1 ${hasImage ? 'text-emerald-400/70' : 'text-white/20'}`}>
                            {hasImage ? <Icon.Check className="h-3 w-3" /> : <span className="h-3 w-3 rounded-full border border-current" />}
                            <span className="text-[9px] font-medium">IMG</span>
                          </div>
                          <div className={`flex items-center gap-1 ${hasVideo ? 'text-blue-400/70' : 'text-white/20'}`}>
                            {hasVideo ? <Icon.Check className="h-3 w-3" /> : <span className="h-3 w-3 rounded-full border border-current" />}
                            <span className="text-[9px] font-medium">VID</span>
                          </div>
                          <div className={`flex items-center gap-1 ${hasVoice ? 'text-violet-400/70' : 'text-white/20'}`}>
                            {hasVoice ? <Icon.Check className="h-3 w-3" /> : <span className="h-3 w-3 rounded-full border border-current" />}
                            <span className="text-[9px] font-medium">VOC</span>
                          </div>
                        </div>
                      </div>

                      {/* Complete badge */}
                      {isComplete && hasVoice && (
                        <div className="flex items-center border-l border-white/[0.04] px-3">
                          <span className="rounded bg-emerald-500/15 px-2 py-1 text-[9px] font-bold text-emerald-400">COMPLETE</span>
                        </div>
                      )}

                      {/* Duplicate button */}
                      <div className="flex items-center border-l border-white/[0.04] px-1.5">
                        <button onClick={(e) => { e.stopPropagation(); duplicateScene(scene.id); }}
                          aria-label="Duplicate scene"
                          className="flex h-6 w-6 items-center justify-center rounded text-white/20 transition-colors hover:bg-white/[0.06] hover:text-white/50">
                          <Icon.Copy2 />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Audio layer */}
              <div className="mt-3 border-t border-white/[0.04] pt-3">
                <div className="flex items-center gap-4">
                  {/* Voice layer */}
                  <div className="flex items-center gap-2">
                    <Icon.Mic className="h-3 w-3 text-white/30" />
                    <span className="text-[9px] font-bold uppercase tracking-wider text-white/40">Voice</span>
                    <div className="flex gap-1">
                      {result.scenes.map((scene) => {
                        const hasVoice = voiceStatus[scene.id] === 'ready';
                        return (
                          <div key={scene.id} className={`h-3 rounded-sm ${hasVoice ? 'w-8 bg-violet-500/30' : 'w-8 bg-white/[0.04]'}`} title={`Scene ${scene.id}: ${hasVoice ? 'Voice ready' : 'No voice'}`} />
                        );
                      })}
                    </div>
                    <span className="text-[9px] text-white/30">{Object.values(voiceStatus).filter((s) => s === 'ready').length}/{result.scenes.length}</span>
                  </div>
                  {/* Music layer */}
                  <div className="flex items-center gap-2">
                    <Icon.Music className="h-3 w-3 text-white/30" />
                    <span className="text-[9px] font-bold uppercase tracking-wider text-white/40">Music</span>
                    <div className="h-3 w-24 rounded-sm bg-white/[0.04]">
                      {music !== 'None' && <div className="h-full w-full rounded-sm bg-rose-500/20" />}
                    </div>
                    <span className="text-[9px] text-white/30">{music !== 'None' ? music : 'None'}</span>
                  </div>
                </div>
              </div>

              {/* Timeline footer */}
              <div className="mt-3 flex items-center justify-between border-t border-white/[0.04] pt-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-white/40">Active:</span>
                    <span className="text-[10px] font-medium text-white/60">Scene {String(activeScene).padStart(2, '0')}</span>
                  </div>
                  {(() => {
                    const activeIdx = result.scenes.findIndex((s) => s.id === activeScene);
                    const activeS = result.scenes[activeIdx];
                    if (!activeS) return null;
                    return (
                      <div className="flex items-center gap-2">
                        {activeS.beat && <span className="text-[10px] text-violet-400/50">{activeS.beat}</span>}
                        {activeS.sceneDuration && <span className="text-[10px] text-white/35">~{activeS.sceneDuration}s</span>}
                      </div>
                    );
                  })()}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { const idx = result.scenes.findIndex((s) => s.id === activeScene); if (idx > 0) setActiveScene(result.scenes[idx - 1].id); }} disabled={result.scenes.findIndex((s) => s.id === activeScene) <= 0}
                    className="flex h-6 w-6 items-center justify-center rounded border border-white/[0.06] text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/70 disabled:opacity-20">
                    <Icon.ArrowLeft className="h-3 w-3" />
                  </button>
                  <button onClick={() => { const idx = result.scenes.findIndex((s) => s.id === activeScene); if (idx < result.scenes.length - 1) setActiveScene(result.scenes[idx + 1].id); }} disabled={result.scenes.findIndex((s) => s.id === activeScene) >= result.scenes.length - 1}
                    className="flex h-6 w-6 items-center justify-center rounded border border-white/[0.06] text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/70 disabled:opacity-20">
                    <Icon.ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ===== PROJECTS ===== */}
        <div id="projects" className="mx-auto mt-14 max-w-5xl">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white">Projects</h2>
              <p className="mt-0.5 text-[13px] text-white/60">Your video projects</p>
            </div>
            <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="flex items-center gap-1.5 rounded-lg border border-white/[0.10] bg-white/[0.04] px-4 py-2 text-[12px] font-medium text-white/70 transition-all hover:bg-white/[0.08] hover:text-white/90 active:scale-[0.98]">
              <span className="text-[16px] leading-none">+</span> New Project
            </button>
          </div>

          {projects.length > 0 && (
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-2">
                {[
                  { label: "TOTAL", value: projects.length },
                  { label: "COMPLETED", value: projects.filter(p => (p.sceneImages ? Object.keys(p.sceneImages).length : 0) >= 5).length },
                  { label: "IN PROGRESS", value: projects.filter(p => (p.sceneImages ? Object.keys(p.sceneImages).length : 0) < 5).length },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-white/40">{stat.label}</div>
                    <div className="text-[14px] font-semibold text-white/80">{stat.value}</div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search projects..." className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[12px] text-white/80 outline-none placeholder:text-white/35 focus:border-white/[0.15]" />
                <div className="flex gap-1">
                  {(["all", "completed", "in-progress"] as const).map((f) => (
                    <button key={f} onClick={() => setProjectFilter(f)} className={`rounded-lg px-3 py-2 text-[11px] font-medium transition-all ${projectFilter === f ? "bg-white/[0.10] text-white/90" : "text-white/45 hover:text-white/65"}`}>{f === "all" ? "All" : f === "completed" ? "Completed" : "In Progress"}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {projects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.015] p-12 text-center sm:p-16">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.03]">
                <Icon.Film className="h-6 w-6 text-white/20" />
              </div>
              <div className="text-[15px] font-semibold text-white/65">No videos yet</div>
              <p className="mx-auto mt-1.5 max-w-xs text-[12px] text-white/40">Create your first AI video and it will appear here.</p>
              <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-white/[0.08] px-4 py-2 text-[12px] font-medium text-white/60 transition-all hover:bg-white/[0.12] hover:text-white/80 active:scale-[0.98]">
                <Icon.Plus className="h-3 w-3" />Create your first video
              </button>
            </div>
          ) : (() => {
            const filtered = projects.filter((p) => {
              const matchesSearch = !searchQuery || p.title.toLowerCase().includes(searchQuery.toLowerCase());
              const imageCount = p.sceneImages ? Object.keys(p.sceneImages).length : 0;
              const isComplete = imageCount >= 5;
              const matchesFilter = projectFilter === "all" || (projectFilter === "completed" && isComplete) || (projectFilter === "in-progress" && !isComplete);
              return matchesSearch && matchesFilter;
            });

            if (filtered.length === 0) {
              return (
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-10 text-center">
                  <div className="text-[14px] font-medium text-white/55">No projects found</div>
                  <button onClick={() => { setSearchQuery(""); setProjectFilter("all"); }} className="mt-3 text-[12px] text-emerald-400/70 hover:text-emerald-400">Clear search</button>
                </div>
              );
            }

            return (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((project) => {
                  const imageCount = project.sceneImages ? Object.keys(project.sceneImages).length : 0;
                  const videoCount = project.sceneVideos ? Object.keys(project.sceneVideos).length : 0;
                  const isComplete = imageCount >= 5;
                  const firstImage = project.sceneImages ? Object.values(project.sceneImages)[0] : null;
                  return (
                    <div key={project.id} className="group rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden transition-all duration-200 hover:border-white/[0.15] hover:bg-white/[0.03] hover:-translate-y-0.5 hover:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.5)]">
                      <button onClick={() => loadProject(project)} className="block w-full text-left">
                        <div className="relative overflow-hidden">
                          <div className="aspect-video bg-[#0c0d12]">
                            {firstImage ? (
                              <img src={firstImage} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
                            ) : (
                              <div className="flex h-full items-center justify-center">
                                <Icon.Play className="h-8 w-8 text-white/10" />
                              </div>
                            )}
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.08] opacity-0 transition-all group-hover:opacity-100 backdrop-blur-sm">
                              <Icon.Play className="ml-0.5 h-4 w-4 text-white/90" />
                            </div>
                          </div>
                          <div className="absolute right-2 top-2">
                            <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${isComplete ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>{isComplete ? "COMPLETED" : "IN PROGRESS"}</span>
                          </div>
                        </div>
                      </button>

                      <div className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <button onClick={() => loadProject(project)} className="block w-full text-left">
                              <div className="truncate text-[14px] font-semibold text-white/85 group-hover:text-white">{project.title}</div>
                            </button>
                            <div className="mt-1 flex items-center gap-2 text-[11px] text-white/50">
                              <span>{project.language}</span>
                              <span>&middot;</span>
                              <span>{project.style}</span>
                              <span>&middot;</span>
                              <span>{project.duration}</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3">
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-[10px] font-medium text-white/50">{imageCount} images, {videoCount} videos</span>
                            {project.createdAt && <span className="text-[10px] text-white/35">{new Date(project.createdAt).toLocaleDateString()}</span>}
                          </div>
                          <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
                            <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${(imageCount / 5) * 100}%` }} />
                          </div>
                        </div>

                        <div className="mt-3 flex items-center gap-2 border-t border-white/[0.06] pt-3">
                          <button onClick={() => loadProject(project)} className="flex items-center gap-1.5 rounded-lg bg-white/[0.08] px-3 py-1.5 text-[11px] font-medium text-white/70 transition-all hover:bg-white/[0.12] hover:text-white/90 active:scale-[0.98]">
                            <Icon.Folder className="text-white/50" />Open
                          </button>
                          <button onClick={() => duplicateProject(project)} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium text-white/40 transition-all hover:bg-white/[0.06] hover:text-white/65 active:scale-[0.98]">
                            <Icon.Copy2 />Duplicate
                          </button>
                          <button onClick={() => setDeleteConfirmId(project.id)} aria-label="Delete project" className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium text-white/40 transition-all hover:bg-red-500/10 hover:text-red-400/80 active:scale-[0.98]">
                            <Icon.Trash />Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* Character editor modal */}
        {showCharacters && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="mx-4 w-full max-w-lg rounded-2xl border border-white/[0.10] bg-[#111218] p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[16px] font-semibold text-white/90">Character Consistency</h3>
                <button onClick={() => setShowCharacters(false)} className="text-white/40 hover:text-white/70"><Icon.X /></button>
              </div>
              <p className="text-[12px] text-white/50 mb-4">Define characters to keep them visually consistent across scenes.</p>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {characters.map((c, i) => (
                  <div key={i} className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <input value={c.name} onChange={(e) => { const next = [...characters]; next[i] = { ...next[i], name: e.target.value }; setCharacters(next); setSaved(false); }} placeholder="Name" className="bg-transparent text-[13px] font-medium text-white/80 outline-none flex-1" />
                      <button onClick={() => { setCharacters(characters.filter((_, j) => j !== i)); setSaved(false); }} className="text-white/30 hover:text-red-400"><Icon.Trash /></button>
                    </div>
                    <input value={c.appearance} onChange={(e) => { const next = [...characters]; next[i] = { ...next[i], appearance: e.target.value }; setCharacters(next); setSaved(false); }} placeholder="Appearance (e.g. brown hair, green eyes)" className="w-full bg-transparent text-[12px] text-white/60 outline-none" />
                    <input value={c.role} onChange={(e) => { const next = [...characters]; next[i] = { ...next[i], role: e.target.value }; setCharacters(next); setSaved(false); }} placeholder="Role in story" className="w-full bg-transparent text-[12px] text-white/60 outline-none" />
                    <input value={c.description} onChange={(e) => { const next = [...characters]; next[i] = { ...next[i], description: e.target.value }; setCharacters(next); setSaved(false); }} placeholder="Additional description (optional)" className="w-full bg-transparent text-[12px] text-white/60 outline-none" />
                  </div>
                ))}
              </div>
              <button onClick={() => { setCharacters([...characters, { name: "", description: "", appearance: "", role: "" }]); setSaved(false); }} className="mt-4 flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[12px] font-medium text-white/60 transition-all hover:bg-white/[0.08] hover:text-white/80">
                <Icon.Plus />Add character
              </button>
              <button onClick={() => setShowCharacters(false)} className="mt-3 w-full rounded-lg bg-white/[0.08] px-4 py-2 text-[12px] font-medium text-white/70 transition-all hover:bg-white/[0.12] hover:text-white/90">Done</button>
            </div>
          </div>
        )}

        {/* Delete confirmation modal */}
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="mx-4 w-full max-w-sm rounded-2xl border border-white/[0.10] bg-[#111218] p-6 shadow-2xl">
              <h3 className="text-[16px] font-semibold text-white/90">Delete project?</h3>
              <p className="mt-2 text-[13px] text-white/55">This project will be removed from your saved projects.</p>
              <div className="mt-5 flex justify-end gap-2">
                <button onClick={() => setDeleteConfirmId(null)} className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-[12px] font-medium text-white/70 transition-all hover:bg-white/[0.08] hover:text-white/90 active:scale-[0.98]">Cancel</button>
                <button onClick={() => { if (deleteConfirmId) { deleteProject(deleteConfirmId); setDeleteConfirmId(null); } }} className="rounded-lg bg-red-500/20 border border-red-500/30 px-4 py-2 text-[12px] font-medium text-red-400 transition-all hover:bg-red-500/30 active:scale-[0.98]">Delete</button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-[#111218] px-4 py-2.5 shadow-2xl">
          <Icon.Check className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-[12px] font-medium text-white/70">{toast}</span>
        </div>
      )}
    </main>
  );
}
