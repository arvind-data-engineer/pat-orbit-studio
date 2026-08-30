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
  ),  Copy2: (p: { className?: string }) => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
  ),
  Globe: (p: { className?: string }) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={p.className}><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
  ),
  Clock: (p: { className?: string }) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={p.className}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
  ),
  Square: (p: { className?: string }) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={p.className}><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /></svg>
  ),
  Zap: (p: { className?: string }) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={p.className}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
  ),
  Subtitles: (p: { className?: string }) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={p.className}><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="14" x2="23" y2="14" /></svg>
  ),

};

const TEMPLATES = [
  { icon: "\u{1F3AC}", label: "Cinematic Story", desc: "Dramatic narrative with cinematic visuals", style: "Cinematic", duration: "60 sec", aspectRatio: "16:9", text: "A retired astronaut receives a mysterious signal from a distant planet. She must decide whether to return to space for one final mission that could change humanity's understanding of the universe." },
  { icon: "\u{1F4F1}", label: "YouTube Short", desc: "Fast-paced vertical short-form video", style: "Cinematic", duration: "30 sec", aspectRatio: "9:16", text: "A street magician performs an impossible trick in a crowded market. The camera follows the coin as it transforms into something nobody expected, leaving the audience in complete shock." },
  { icon: "\u{1F47B}", label: "Horror", desc: "Suspenseful atmospheric horror story", style: "Cinematic", duration: "60 sec", aspectRatio: "9:16", text: "A family moves into an old Victorian house. On the first night, the youngest daughter whispers that someone else already lives here. Strange sounds begin echoing from the basement at exactly 3 AM." },
  { icon: "\u{1F9D2}", label: "Kids Adventure", desc: "Colorful animated adventure for all ages", style: "Cartoon", duration: "60 sec", aspectRatio: "16:9", text: "A brave little fox named Pip discovers a hidden garden where tiny magical creatures live. When a storm threatens to destroy their home, Pip must find the legendary Sun Stone to save them all." },
  { icon: "\u{1F680}", label: "Sci-Fi", desc: "Futuristic cinematic story", style: "Cinematic", duration: "60 sec", aspectRatio: "16:9", text: "In the year 2150, a city floats above the clouds. A young engineer discovers that the city's power source is slowly dying. She has 24 hours to find a solution before the entire city falls from the sky." },
  { icon: "\u{1F4A1}", label: "Motivational", desc: "Inspirational short video", style: "Cinematic", duration: "30 sec", aspectRatio: "9:16", text: "A young boxer trains alone in an empty gym at dawn. Through sweat and determination, we see the journey from struggle to triumph, ending with a powerful moment of victory." },
];

const MUSIC_DESCRIPTIONS: Record<string, string> = {
  None: "No background music",
  Ambient: "Soft, atmospheric background tones",
  Cinematic: "Dramatic orchestral-style score",
  Emotional: "Gentle, expressive melody",
};

/* ------------------------------------------------------------------ */
/*  Scene Character Picker                                             */
/* ------------------------------------------------------------------ */

function SceneCharacterPicker({ characters, sceneCharacters, sceneId, onToggle, onManage }: {
  characters: Character[];
  sceneCharacters: Record<number, number[]>;
  sceneId: number;
  onToggle: (idx: number) => void;
  onManage: () => void;
}) {
  const sceneChars = sceneCharacters[sceneId] || [];
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Characters</label>
        <button onClick={onManage} className="text-[9px] text-white/35 hover:text-white/55 transition-colors">
          Manage all
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {characters.map((c, i) => {
          if (!c.name?.trim()) return null;
          const isSelected = sceneChars.includes(i);
          const selectedCls = isSelected ? 'bg-emerald-500/15 border border-emerald-500/25 text-emerald-400/90' : 'bg-white/[0.03] border border-white/[0.06] text-white/50 hover:bg-white/[0.06] hover:text-white/65';
          const boxCls = isSelected ? 'border-emerald-500 bg-emerald-500/20' : 'border-white/15 bg-transparent';
          return (
            <button key={i} onClick={() => onToggle(i)} className={'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-all ' + selectedCls}>
              <span className={'flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded border ' + boxCls}>
                {isSelected && <Icon.Check className="h-2 w-2 text-emerald-400" />}
              </span>
              {c.name}
              {c.appearance ? <span className="hidden sm:inline text-white/30 truncate max-w-[80px]">{c.appearance}</span> : null}
            </button>
          );
        })}
      </div>
      <p className="mt-1 text-[9px] text-white/20">Selected characters are included in the AI image and video prompts</p>
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
        if (e.key === 'ArrowLeft' && currentIdx > 0) { e.preventDefault(); switchScene(result.scenes[currentIdx - 1].id); }
        if (e.key === 'ArrowRight' && currentIdx < result.scenes.length - 1) { e.preventDefault(); switchScene(result.scenes[currentIdx + 1].id); }
        if (e.key === 'Home') { e.preventDefault(); switchScene(result.scenes[0].id); }
        if (e.key === 'End') { e.preventDefault(); switchScene(result.scenes[result.scenes.length - 1].id); }
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (result) saveCurrentProject();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [result, activeScene, mobileNavOpen, settingsOpen, deleteConfirmId, showCharacters, isEditingScene]);

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
            <div className="relative">
              <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
                <div className="absolute left-1/2 top-0 h-[300px] w-[500px] -translate-x-1/2 rounded-full bg-gradient-to-b from-purple-500/[0.03] to-transparent blur-3xl" />
              </div>

              {/* Hero - compact */}
              <div className="mb-6 text-center">
                <h1 className="text-[32px] font-bold tracking-tight sm:text-[40px] text-white">
                  Create your next <span className="italic bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent">video</span>
                </h1>
                <p className="mt-1.5 text-[13px] text-white/40">Story, scenes, visuals, voice and final video.</p>
              </div>

              {/* Main layout */}
              <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[1fr_320px]">
                {/* LEFT */}
                <div className="space-y-3">

                  {/* Idea + Create CTA (primary flow, no scrolling needed) */}
                  <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-5">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-white/85">What do you want to create?</span>
                      <span className="ml-auto rounded-md bg-purple-500/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-purple-400/70">AI POWERED</span>
                    </div>
                    <div className="relative group">
                      <div className="absolute -inset-px rounded-xl bg-gradient-to-b from-purple-500/[0.08] to-transparent opacity-0 transition-opacity group-focus-within:opacity-100" />
                      <textarea
                        value={story}
                        onChange={(e) => { setStory(e.target.value); setError(""); }}
                        placeholder="A young boy discovers a mysterious portal beneath his school and enters a glowing world..."
                        rows={3}
                        maxLength={1500}
                        className="relative w-full resize-none rounded-xl border border-white/[0.10] bg-[#0a0b0f] p-4 text-[15px] leading-7 text-white outline-none transition-all placeholder:text-white/20 focus:border-purple-500/30 focus:shadow-[0_0_20px_-8px_rgba(139,92,246,0.1)]"
                      />
                      <div className="absolute bottom-2.5 right-3 text-[10px] text-white/20 tabular-nums">{story.length} / 1500</div>
                    </div>
                    {/* Idea chips */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <Icon.Lightbulb className="h-3 w-3 text-white/25" />
                      {["Magical adventure", "Detective mystery", "Robot becomes human", "Time travel story"].map((idea) => (
                        <button key={idea} onClick={() => { setStory(idea); setError(""); }} className="rounded-full border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 text-[10px] text-white/40 transition-all hover:border-purple-500/20 hover:bg-purple-500/[0.05] hover:text-white/60">
                          {idea}
                        </button>
                      ))}
                    </div>
                    {/* Create Video + loading in same card */}
                    <div className="mt-4">
                      <button onClick={generateStory} disabled={!story.trim() || loading} className="w-full rounded-xl bg-gradient-to-r from-purple-600 via-violet-600 to-fuchsia-600 px-6 py-3.5 text-[14px] font-semibold text-white shadow-[0_4px_20px_-4px_rgba(139,92,246,0.4)] transition-all hover:shadow-[0_8px_30px_-4px_rgba(139,92,246,0.5)] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none">
                        {loading ? (<span className="flex items-center justify-center gap-2"><Icon.Spinner className="h-4 w-4 animate-spin" />Creating...</span>) : (<span className="flex items-center justify-center gap-2"><Icon.Sparkles className="h-4 w-4" />Create Video</span>)}
                      </button>
                      <p className="mt-2 text-center text-[11px] text-white/25">AI will create your story, scenes, visuals, voice and video.</p>
                    </div>
                    {error && <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/[0.07] px-3 py-2 text-[12px] text-red-300/90">{error}</div>}
                    {loading && (
                      <div className="mt-3 space-y-1.5">
                        {loadingSteps.map((step, i) => (
                          <div key={i} className="flex items-center gap-2">
                            {step.done ? (<span className="flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20"><Icon.Check className="h-2 w-2 text-emerald-400" /></span>)
                            : i === loadingStep + 1 ? (<span className="flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center"><Icon.Spinner className="h-2.5 w-2.5 animate-spin text-purple-400/60" /></span>)
                            : (<span className="flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-full border border-white/[0.08]"><span className="h-0.5 w-0.5 rounded-full bg-white/[0.15]" /></span>)}
                            <span className={`text-[10px] ${step.done ? 'text-white/25' : i === loadingStep + 1 ? 'text-white/55' : 'text-white/35'}`}>{step.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Visual Style - compact row */}
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                    <div className="mb-2.5 flex items-center gap-2">
                      <Icon.Image className="h-3 w-3 text-white/35" />
                      <span className="text-[11px] font-semibold text-white/75">Visual Style</span>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {["Cinematic", "Cartoon", "Anime", "Realistic", "3D"].map((s) => {
                        const isActive = style === s;
                        const thumbGradients: Record<string, string> = {
                          Cinematic: "from-amber-800/40 via-orange-700/30 to-amber-900/40",
                          Cartoon: "from-emerald-700/40 via-teal-600/30 to-emerald-800/40",
                          Anime: "from-pink-700/40 via-rose-600/30 to-pink-800/40",
                          Realistic: "from-blue-800/40 via-slate-600/30 to-blue-900/40",
                          "3D": "from-violet-700/40 via-indigo-600/30 to-violet-800/40",
                        };
                        return (
                          <button key={s} onClick={() => setStyle(s)} className={`group relative overflow-hidden rounded-xl border transition-all ${isActive ? 'border-purple-500/40 shadow-[0_0_12px_-4px_rgba(139,92,246,0.3)]' : 'border-white/[0.06] hover:border-white/[0.12]'}`}>
                            <div className={`aspect-[4/3] bg-gradient-to-br ${thumbGradients[s] || thumbGradients.Cinematic} flex items-center justify-center`}>
                              {s === 'Cinematic' && <Icon.Film className="h-5 w-5 text-amber-300/50" />}
                              {s === 'Cartoon' && <Icon.Sparkles className="h-5 w-5 text-emerald-300/50" />}
                              {s === 'Anime' && <Icon.Wand className="h-5 w-5 text-pink-300/50" />}
                              {s === 'Realistic' && <Icon.Image className="h-5 w-5 text-blue-300/50" />}
                              {s === '3D' && <Icon.Video className="h-5 w-5 text-violet-300/50" />}
                            </div>
                            <div className={`px-1.5 py-1.5 text-center text-[9px] font-medium ${isActive ? 'bg-purple-500/10 text-white/90' : 'bg-white/[0.02] text-white/50'}`}>{s}</div>
                            {isActive && <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-purple-500 to-fuchsia-500" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Video Format - compact row */}
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                    <div className="mb-2.5 flex items-center gap-2">
                      <Icon.Square className="h-3 w-3 text-white/35" />
                      <span className="text-[11px] font-semibold text-white/75">Video Format</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { ratio: "9:16", label: "9:16", sub: "Shorts / Reels", frame: <div className="mx-auto h-10 w-6 rounded-sm border-2 border-white/20" /> },
                        { ratio: "16:9", label: "16:9", sub: "YouTube / Film", frame: <div className="mx-auto h-7 w-12 rounded-sm border-2 border-white/20" /> },
                        { ratio: "1:1", label: "1:1", sub: "Social / Square", frame: <div className="mx-auto h-9 w-9 rounded-sm border-2 border-white/20" /> },
                      ].map((f) => {
                        const isActive = aspectRatio === f.ratio;
                        return (
                          <button key={f.ratio} onClick={() => setAspectRatio(f.ratio)} className={`group rounded-xl border p-2.5 text-center transition-all ${isActive ? 'border-purple-500/40 bg-purple-500/10' : 'border-white/[0.06] hover:border-white/[0.12]'}`}>
                            {f.frame}
                            <div className={`mt-1.5 text-[10px] font-semibold ${isActive ? 'text-white/90' : 'text-white/50'}`}>{f.label}</div>
                            <div className="text-[7px] text-white/25">{f.sub}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Customize your video (collapsible) */}
                  {(() => {
                    const [customOpen, setCustomOpen] = useState(false);
                    return (
                      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02]">
                        <button onClick={() => setCustomOpen(!customOpen)} className="flex w-full items-center justify-between p-4 transition-colors hover:bg-white/[0.02]">
                          <div className="flex items-center gap-2">
                            <Icon.Settings className="h-3 w-3 text-white/35" />
                            <span className="text-[12px] font-semibold text-white/70">Customize your video</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-white/25">{language} / {duration} / {voice}</span>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-white/25 transition-transform ${customOpen ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6" /></svg>
                          </div>
                        </button>
                        {customOpen && (
                          <div className="border-t border-white/[0.04] p-4 pt-3 space-y-3">
                            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                              <div>
                                <label className="mb-1 text-[9px] font-bold uppercase tracking-wider text-white/30">Language</label>
                                <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full rounded-lg border border-white/[0.08] bg-[#0a0b0f] px-2 py-1.5 text-[11px] font-medium text-white/70 outline-none focus:border-white/[0.15]">
                                  <option>Hindi</option><option>Hinglish</option><option>English</option>
                                </select>
                              </div>
                              <div>
                                <label className="mb-1 text-[9px] font-bold uppercase tracking-wider text-white/30">Duration</label>
                                <select value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full rounded-lg border border-white/[0.08] bg-[#0a0b0f] px-2 py-1.5 text-[11px] font-medium text-white/70 outline-none focus:border-white/[0.15]">
                                  <option>30s</option><option>60s</option><option>90s</option>
                                </select>
                              </div>
                              <div>
                                <label className="mb-1 text-[9px] font-bold uppercase tracking-wider text-white/30">Voice</label>
                                <select value={voice} onChange={(e) => setVoice(e.target.value)} className="w-full rounded-lg border border-white/[0.08] bg-[#0a0b0f] px-2 py-1.5 text-[11px] font-medium text-white/70 outline-none focus:border-white/[0.15]">
                                  <option>Natural</option><option>Deep</option><option>Soft</option>
                                </select>
                              </div>
                              <div>
                                <label className="mb-1 text-[9px] font-bold uppercase tracking-wider text-white/30">Music</label>
                                <select value={music} onChange={(e) => setMusic(e.target.value)} className="w-full rounded-lg border border-white/[0.08] bg-[#0a0b0f] px-2 py-1.5 text-[11px] font-medium text-white/70 outline-none focus:border-white/[0.15]">
                                  <option>None</option><option>Ambient</option><option>Cinematic</option><option>Emotional</option>
                                </select>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <button onClick={() => setCaptions(!captions)} className="flex items-center gap-1.5 text-[11px] text-white/40 transition-colors hover:text-white/55">
                                <span className={`h-3 w-3 rounded border transition-colors ${captions ? 'border-emerald-500/40 bg-emerald-500/15' : 'border-white/15'}`}>{captions && <Icon.Check className="h-2 w-2 text-emerald-400 m-px" />}</span>
                                Captions
                                <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold ${captions ? 'bg-white text-black' : 'bg-white/[0.06] text-white/40'}`}>{captions ? 'ON' : 'OFF'}</span>
                              </button>
                              <button onClick={() => setShowCharacters(true)} className="flex items-center gap-1.5 text-[11px] text-white/40 transition-colors hover:text-violet-400/60">
                                <Icon.User className="h-3 w-3" />
                                Characters
                                <span className="text-[9px] text-white/20">(optional)</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Quick Start */}
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <Icon.Zap className="h-3 w-3 text-white/30" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white/35">Quick Start</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                      {TEMPLATES.map((t) => (
                        <button key={t.label} onClick={() => {
                          setStory(t.text);
                          setStyle(t.style);
                          setDuration(t.duration);
                          setAspectRatio(t.aspectRatio);
                          setError("");
                        }} className="group overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.015] text-left transition-all hover:border-purple-500/20 hover:bg-purple-500/[0.03] hover:-translate-y-0.5">
                          <div className="h-0.5 w-full bg-gradient-to-r from-purple-500/20 via-violet-500/20 to-fuchsia-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="p-2.5">
                            <div className="flex items-start gap-2">
                              <span className="text-[14px] leading-none">{t.icon}</span>
                              <div className="min-w-0 flex-1">
                                <div className="text-[11px] font-semibold text-white/75 group-hover:text-white/90 transition-colors">{t.label}</div>
                                <div className="mt-0.5 text-[9px] text-white/30 group-hover:text-white/45 transition-colors leading-snug">{t.desc}</div>
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* RIGHT - Live Preview Panel */}
                <div className="hidden lg:block">
                  <div className="sticky top-24 space-y-4">
                    {/* Live Preview */}
                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <Icon.Play className="h-3 w-3 text-white/35" />
                        <span className="text-[11px] font-semibold text-white/75">Preview</span>
                        <span className="ml-auto text-[9px] text-white/20">{style} / {aspectRatio}</span>
                      </div>
                      <div className="relative aspect-video overflow-hidden rounded-xl border border-white/[0.06] bg-[#0c0d12]">
                        <div className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br ${style === 'Cinematic' ? 'from-amber-900/20 to-orange-900/10' : style === 'Anime' ? 'from-pink-900/20 to-rose-900/10' : style === 'Realistic' ? 'from-blue-900/20 to-slate-900/10' : style === '3D' ? 'from-violet-900/20 to-indigo-900/10' : 'from-emerald-900/20 to-teal-900/10'}`}>
                          <div className="text-center">
                            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.08]">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="white" opacity="0.4"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                            </div>
                            <div className="text-[10px] text-white/20">Your video preview will appear here</div>
                          </div>
                        </div>
                        <div className="absolute inset-0 border border-white/[0.04]" />
                      </div>
                      <div className="mt-2.5 flex items-center gap-3">
                        {[{ l: "Visuals", i: <Icon.Image className="h-2 w-2" /> }, { l: "Voice", i: <Icon.Mic className="h-2 w-2" /> }, { l: "Music", i: <Icon.Music className="h-2 w-2" /> }].map((f) => (
                          <div key={f.l} className="flex items-center gap-1 text-[8px] text-white/25">{f.i}{f.l}</div>
                        ))}
                      </div>
                    </div>

                    {/* How it works - compact */}
                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                      <h3 className="mb-2.5 text-[11px] font-semibold text-white/65">How it works</h3>
                      <div className="flex items-center gap-1">
                        {[{ n: "1", label: "Story", color: "emerald" }, { n: "2", label: "Visuals", color: "blue" }, { n: "3", label: "Motion", color: "violet" }, { n: "4", label: "Voice", color: "amber" }, { n: "5", label: "Render", color: "emerald" }].map((s, i) => (
                          <div key={s.n} className="flex items-center gap-1 flex-1">
                            <div className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded ${s.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-400' : s.color === 'blue' ? 'bg-blue-500/10 text-blue-400' : s.color === 'violet' ? 'bg-violet-500/10 text-violet-400' : 'bg-amber-500/10 text-amber-400'} text-[8px] font-bold`}>{s.n}</div>
                            <span className="text-[9px] text-white/40 truncate">{s.label}</span>
                            {i < 4 && <div className="mx-0.5 h-px flex-1 bg-white/[0.06]" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
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
                      {hasUnsavedChanges && <span className="flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-400/70"><span className="h-1 w-1 rounded-full bg-amber-400 animate-pulse" />Unsaved changes</span>}
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
                {/* Workflow progress bar */}
                <div className="mb-4">
                  <div className="flex items-center gap-0">
                    {([
                      { label: "IDEA", done: true },
                      { label: "STORY", done: true },
                      { label: "SCENES", done: result.scenes.length > 0 },
                      { label: "VISUALS", done: totalImagesGenerated >= result.scenes.length },
                      { label: "MOTION", done: totalVideosGenerated >= result.scenes.length },
                      { label: "AUDIO", done: totalVoiceReady > 0 && totalVoiceReady >= result.scenes.filter((s: { narration?: string }) => s.narration?.trim()).length },
                      { label: "FINAL", done: !!finalVideo },
                    ] as const).map((step, i, arr) => {
                      const isActive = !step.done && (i === 0 || arr[i - 1].done);
                      return (
                        <div key={step.label} className="flex items-center flex-1 min-w-0">
                          <div className={`flex flex-1 items-center gap-1.5 ${step.done || isActive ? 'opacity-100' : 'opacity-35'}`}>
                            <div className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[9px] font-bold transition-all ${step.done ? 'bg-emerald-500/20 text-emerald-400' : isActive ? 'bg-emerald-500/10 text-emerald-400/70 animate-pulse' : 'bg-white/[0.06] text-white/30'}`}>
                              {step.done ? <Icon.Check className="h-2.5 w-2.5" /> : i + 1}
                            </div>
                            <span className={`text-[9px] font-semibold tracking-wide whitespace-nowrap ${step.done ? 'text-emerald-400/80' : isActive ? 'text-emerald-400/55' : 'text-white/30'}`}>{step.label}</span>
                          </div>
                          {i < arr.length - 1 && (
                            <div className={`mx-1 h-px flex-shrink-0 ${step.done ? 'bg-emerald-500/40' : 'bg-white/[0.08]'}`} style={{ width: '12px' }} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Scene circles */}
                <div className="flex items-center gap-3">
                  <div className="flex gap-2">
                    {result.scenes.map((scene, sceneIdx) => {
                      const hasVideo = !!sceneVideos[scene.id];
                      const hasImage = !!sceneImages[scene.id];
                      const hasVoice = voiceStatus[scene.id] === 'ready';
                      const isComplete = hasImage && hasVideo && hasVoice;
                      const isActive = activeScene === scene.id;
                      return (
                        <button key={scene.id} onClick={() => switchScene(scene.id)}
                          title={`Scene ${sceneIdx + 1}: ${scene.title} - ${isComplete ? 'Complete' : hasVideo ? 'Video ready' : hasImage ? 'Image ready' : 'Not started'}`}
                          className={`relative flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-medium transition-all duration-200 ${isActive ? 'bg-white/[0.08] text-white border border-white/[0.15] shadow-[0_0_12px_-4px_rgba(52,211,153,0.15)]' : 'bg-white/[0.03] text-white/50 border border-white/[0.06] hover:bg-white/[0.06]'}`}>
                          <span className={`flex h-4 w-4 items-center justify-center rounded text-[8px] font-bold ${isActive ? 'bg-emerald-500/20 text-emerald-400' : isComplete ? 'bg-emerald-500/10 text-emerald-400/60' : 'bg-white/[0.06] text-white/40'}`}>
                            {isComplete ? <Icon.Check className="h-2 w-2" /> : sceneIdx + 1}
                          </span>
                          <span className="hidden sm:inline truncate max-w-[80px] text-[10px]">{scene.title}</span>
                          {isActive && <div className="absolute -bottom-1.5 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-emerald-400" />}
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
                      <span className="text-[11px] font-bold uppercase tracking-widest text-white/60">Scenes</span>
                      <span className="rounded bg-white/[0.05] px-1.5 py-0.5 text-[9px] font-semibold text-white/40">{result.scenes.length}</span>
                    </div>
                    <div className="space-y-1">
                      {result.scenes.map((scene, sceneIdx) => {
                        const hasVideo = !!sceneVideos[scene.id];
                        const hasImage = !!sceneImages[scene.id];
                        const hasVoice = voiceStatus[scene.id] === 'ready';
                        const isGenerating = sceneStatus[scene.id] === 'image' || sceneStatus[scene.id] === 'video';
                        const isComplete = hasImage && hasVideo && hasVoice;
                        const isActive = activeScene === scene.id;
                        return (
                          <button key={scene.id} onClick={() => switchScene(scene.id)}
                            className={`group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-all duration-150 ${isActive ? "bg-white/[0.06] border border-white/[0.10] shadow-[0_2px_12px_-4px_rgba(0,0,0,0.3)]" : "border border-transparent hover:bg-white/[0.03]"}`}>
                            <div className="relative h-10 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-white/[0.04]">
                              {hasImage ? (
                                <img src={sceneImages[scene.id]} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full items-center justify-center">
                                  <span className="text-[10px] font-bold text-white/30">{String(sceneIdx + 1).padStart(2, '0')}</span>
                                </div>
                              )}
                              {isGenerating && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                                  <Icon.Spinner className="h-3.5 w-3.5 animate-spin text-white" />
                                </div>
                              )}
                              {isActive && <div className="absolute inset-0 border-2 border-emerald-400/40 rounded-lg" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[9px] font-bold ${isActive ? 'text-emerald-400' : 'text-white/25'}`}>{String(sceneIdx + 1).padStart(2, '0')}</span>
                                <span className={`truncate text-[11px] font-medium ${isActive ? 'text-white/90' : 'text-white/65'}`}>{scene.title}</span>
                              </div>
                              <div className="mt-1 flex items-center gap-1.5">
                                {hasImage && <span className="text-[7px] font-bold text-emerald-400/70">IMG</span>}
                                {!hasImage && <span className="text-[7px] text-white/15">IMG</span>}
                                {hasVideo && <span className="text-[7px] font-bold text-blue-400/70">VID</span>}
                                {!hasVideo && <span className="text-[7px] text-white/15">VID</span>}
                                {hasVoice && <span className="text-[7px] font-bold text-violet-400/70">VOC</span>}
                                {!hasVoice && <span className="text-[7px] text-white/15">VOC</span>}
                                {isComplete && <span className="ml-auto text-[7px] font-bold text-emerald-400/80">DONE</span>}
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
                    {result.scenes.map((scene, sceneIdx) => (                        <button key={scene.id} onClick={() => switchScene(scene.id)}
                        className={`flex flex-shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-all ${activeScene === scene.id ? "bg-white/[0.1] text-white border border-white/[0.15]" : "bg-white/[0.03] text-white/65 border border-transparent"}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${getStatusDotColor(scene.id)}`} />
                        {String(sceneIdx + 1).padStart(2, '0')}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-bold tracking-tight text-white/85">Scene {String(activeScene).padStart(2, "0")}</span>
                      <span className="text-[13px] text-white/40">&middot;</span>
                      <span className="text-[13px] font-medium text-white/65 truncate max-w-[200px]">{currentScene?.title}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {currentScene && (() => {
                        const hasImg = !!sceneImages[currentScene.id];
                        const hasVid = !!sceneVideos[currentScene.id];
                        const hasVoc = voiceStatus[currentScene.id] === 'ready';
                        const isGen = sceneStatus[currentScene.id] === 'image' || sceneStatus[currentScene.id] === 'video';
                        if (hasImg && hasVid && hasVoc) return <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold text-emerald-400">COMPLETE</span>;
                        if (isGen) return <span className="flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-[9px] font-bold text-amber-400"><Icon.Spinner className="h-2 w-2 animate-spin" />GENERATING</span>;
                        if (hasVid) return <span className="rounded-md bg-blue-500/15 px-2 py-0.5 text-[9px] font-bold text-blue-400">VIDEO READY</span>;
                        if (hasImg) return <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold text-emerald-400">IMAGE READY</span>;
                        return <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[9px] font-bold text-white/35">NOT STARTED</span>;
                      })()}
                    </div>
                  </div>

                  {/* Preview card */}
                  <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0d12] shadow-[0_4px_40px_-12px_rgba(0,0,0,0.5)]">
                    {currentScene && sceneStatus[currentScene.id] === "image" ? (
                      <div className="flex aspect-video flex-col items-center justify-center bg-[#0c0d12]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.02) 1px, transparent 0)", backgroundSize: "24px 24px" }}>
                        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10">
                          <Icon.Image className="h-6 w-6 text-amber-400 animate-pulse" />
                        </div>
                        <span className="text-[13px] font-semibold text-white/65">Creating visual...</span>
                        <span className="mt-1 text-[11px] text-white/35">Composing image for Scene {String(activeScene).padStart(2, "0")}</span>
                      </div>
                    ) : currentScene && sceneStatus[currentScene.id] === "video" ? (
                      <div className="flex aspect-video flex-col items-center justify-center bg-[#0c0d12]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.02) 1px, transparent 0)", backgroundSize: "24px 24px" }}>
                        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10">
                          <Icon.Video className="h-6 w-6 text-violet-400 animate-pulse" />
                        </div>
                        <span className="text-[13px] font-semibold text-white/65">Creating motion...</span>
                        <span className="mt-1 text-[11px] text-white/35">This may take a minute. You can navigate to other scenes.</span>
                      </div>
                    ) : currentScene && sceneVideos[currentScene.id] ? (
                      <div className="relative">
                        <video src={sceneVideos[currentScene.id]} controls className="aspect-video w-full object-cover bg-black" poster={sceneImages[currentScene.id]} />
                      </div>
                    ) : currentScene && sceneImages[currentScene.id] ? (
                      <div className="relative">
                        <img src={sceneImages[currentScene.id]} alt={currentScene.title} className="aspect-video w-full object-cover" />
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent p-4">
                          <div className="flex items-center gap-2">
                            <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-400">IMAGE READY</span>
                            <Icon.ArrowRight className="h-2.5 w-2.5 text-white/25" />
                            <span className="text-[10px] font-medium text-white/45">Generate motion below</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex aspect-video flex-col items-center justify-center" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.02) 1px, transparent 0)", backgroundSize: "24px 24px" }}>
                        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03]">
                          <Icon.Image className="h-6 w-6 text-white/20" />
                        </div>
                        <span className="text-[13px] font-semibold text-white/50">Scene {String(activeScene).padStart(2, "0")} — ready to visualize</span>
                        <span className="mt-1 max-w-xs text-center text-[11px] text-white/30">Generate an image to bring this scene to life.</span>
                        <div className="mt-4 flex items-center gap-1.5 text-[9px] text-white/20">
                          <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-emerald-400/50">1. Image</span>
                          <Icon.ArrowRight className="h-2 w-2" />
                          <span className="text-white/20">2. Video</span>
                          <Icon.ArrowRight className="h-2 w-2" />
                          <span className="text-white/20">3. Voice</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Generation actions */}
                  {currentScene && (() => {
                    const hasImg = !!sceneImages[currentScene.id];
                    const hasVid = !!sceneVideos[currentScene.id];
                    const isGenImg = sceneStatus[currentScene.id] === 'image';
                    const isGenVid = sceneStatus[currentScene.id] === 'video';
                    const isBusy = isGenImg || isGenVid;
                    const hasVoc = voiceStatus[currentScene.id] === 'ready';
                    const needsImage = !hasImg && !hasVid && !isBusy;
                    const needsVideo = hasImg && !hasVid && !isBusy;
                    const needsVoice = !hasVoc && currentScene.narration?.trim();
                    const isComplete = hasImg && hasVid && hasVoc;
                    return (
                      <div className="space-y-2">
                        {/* Image button */}
                        <button onClick={() => startImageGeneration(currentScene.id)} disabled={isBusy}
                          className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-[13px] font-semibold transition-all active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 ${needsImage ? 'bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/25 shadow-[0_2px_16px_-6px_rgba(52,211,153,0.25)]' : 'bg-white/[0.05] border border-white/[0.08] text-white/60 hover:bg-white/[0.08] hover:text-white/75'}`}>
                          {isGenImg ? (<><Icon.Spinner className="h-4 w-4 animate-spin" />Creating visual...</>) : hasImg ? (<><Icon.Image className="h-4 w-4" />Regenerate Image</>) : (<><Icon.Image className="h-4 w-4" />Generate Image</>)}
                        </button>
                        {!hasImg && !isBusy && <p className="text-center text-[10px] text-white/30">Start here - generate the scene image first</p>}

                        {/* Video button - only when image exists or video exists */}
                        {(hasImg || hasVid) && (
                          <button onClick={() => startVideoGeneration(currentScene.id)} disabled={isBusy || !hasImg}
                            className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-[13px] font-semibold transition-all active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 ${needsVideo ? 'bg-gradient-to-b from-violet-500 to-violet-600 text-white shadow-[0_4px_20px_-4px_rgba(139,92,246,0.45)] hover:shadow-[0_6px_28px_-4px_rgba(139,92,246,0.55)]' : 'bg-white/[0.05] border border-white/[0.08] text-white/60 hover:bg-white/[0.08] hover:text-white/75'}`}>
                          {isGenVid ? (<><Icon.Spinner className="h-4 w-4 animate-spin" />Creating motion...</>) : hasVid ? (<><Icon.Video className="h-4 w-4" />Regenerate Video</>) : (<><Icon.Video className="h-4 w-4" />Generate Video</>)}
                        </button>
                      )}
                      {hasImg && !hasVid && !isBusy && <p className="text-center text-[10px] text-white/30">Image is ready - generate video next</p>}

                        {/* Voice button */}
                        {currentScene.narration?.trim() && (
                          <div className="flex gap-2">
                            <button onClick={() => startVoiceGeneration(currentScene.id)} disabled={voiceStatus[currentScene.id] === 'generating'}
                              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-[12px] font-medium text-white/60 transition-all hover:bg-white/[0.08] hover:text-white/80 active:scale-[0.98] disabled:opacity-40">
                              {voiceStatus[currentScene.id] === 'generating' ? (<><Icon.Spinner className="h-3.5 w-3.5 animate-spin" />Generating...</>) : hasVoc ? (<><Icon.Mic className="h-3.5 w-3.5 text-emerald-400" />Regenerate Voice</>) : (<><Icon.Mic className="h-3.5 w-3.5" />Generate Voice</>)}
                            </button>
                            {hasVoc && (
                              <button onClick={() => playVoice(currentScene.id)} className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-[12px] font-medium text-white/60 transition-all hover:bg-white/[0.08] hover:text-white/80">
                                <Icon.Play className="h-3.5 w-3.5" />Preview
                              </button>
                            )}
                          </div>
                        )}

                        {/* Next-step hint */}
                        {needsImage && !isBusy && (
                          <div className="flex items-center justify-center gap-2 rounded-lg border border-emerald-500/[0.08] bg-emerald-500/[0.03] px-3 py-2">
                            <Icon.Sparkles className="h-3 w-3 text-emerald-400/50" />
                            <span className="text-[10px] font-medium text-emerald-400/60">Recommended: Generate image for this scene</span>
                          </div>
                        )}
                        {needsVideo && !isBusy && (
                          <div className="flex items-center justify-center gap-2 rounded-lg border border-violet-500/[0.08] bg-violet-500/[0.03] px-3 py-2">
                            <Icon.Video className="h-3 w-3 text-violet-400/50" />
                            <span className="text-[10px] font-medium text-violet-400/60">Recommended: Generate video from this scene image</span>
                          </div>
                        )}
                        {isComplete && (
                          <div className="flex items-center justify-center gap-2 rounded-lg border border-emerald-500/[0.08] bg-emerald-500/[0.03] px-3 py-2">
                            <Icon.Check className="h-3 w-3 text-emerald-400/60" />
                            <span className="text-[10px] font-medium text-emerald-400/60">Scene complete - move to next scene or render</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}



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
                    {/* Scene editor panel */}
                    <div className="rounded-xl border border-white/[0.10] bg-white/[0.025] overflow-hidden">
                      {/* Header */}
                      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/[0.06] text-[10px] font-bold text-white/50">{String(result.scenes.findIndex((s) => s.id === currentScene.id) + 1).padStart(2, '0')}</span>
                          <span className="text-[12px] font-semibold text-white/80">Scene Editor</span>
                          {isEditingScene && <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[8px] font-bold text-amber-400">EDITING</span>}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => duplicateScene(currentScene.id)} className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-[10px] font-medium text-white/50 transition-colors hover:bg-white/[0.08] hover:text-white/70">
                            <Icon.Copy2 />Duplicate
                          </button>
                          {!isEditingScene && (
                            <button onClick={() => beginEditScene(currentScene)} className="flex items-center gap-1 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.08] px-2.5 py-1.5 text-[10px] font-medium text-emerald-400/80 transition-colors hover:bg-emerald-500/[0.15]">
                              <Icon.Wand className="h-3 w-3" />Edit Scene
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="p-4 space-y-4">
                        {/* Title */}
                        <div>
                          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-white/40">Title</label>
                          {isEditingScene ? (
                            <input value={sceneDraft?.title ?? ''} onChange={(e) => updateDraft('title', e.target.value)} className="w-full rounded-lg border border-white/[0.12] bg-[#0c0d12] px-3 py-2.5 text-[14px] font-medium text-white outline-none transition-all focus:border-emerald-500/30" />
                          ) : (
                            <div className="rounded-lg border border-white/[0.06] bg-[#0c0d12] px-3 py-2.5 text-[14px] font-medium text-white/80">{currentScene.title}</div>
                          )}
                        </div>

                        {/* Beat + Duration */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-white/40">Emotional Beat</label>
                            {isEditingScene ? (
                              <input value={sceneDraft?.beat ?? ''} onChange={(e) => updateDraft('beat', e.target.value)} placeholder="e.g. Curiosity, Tension" className="w-full rounded-lg border border-white/[0.12] bg-[#0c0d12] px-3 py-2 text-[12px] text-violet-400/80 outline-none transition-all focus:border-violet-500/30 placeholder:text-white/20" />
                            ) : (
                              <div className="rounded-lg border border-white/[0.06] bg-[#0c0d12] px-3 py-2 text-[12px] text-violet-400/70">{currentScene.beat || <span className="text-white/20">Not set</span>}</div>
                            )}
                          </div>
                          <div>
                            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-white/40">Duration (sec)</label>
                            {isEditingScene ? (
                              <input value={sceneDraft?.sceneDuration ?? ''} onChange={(e) => updateDraft('sceneDuration', e.target.value)} placeholder="10" className="w-full rounded-lg border border-white/[0.12] bg-[#0c0d12] px-3 py-2 text-[12px] text-blue-400/80 outline-none transition-all focus:border-blue-500/30 placeholder:text-white/20" />
                            ) : (
                              <div className="rounded-lg border border-white/[0.06] bg-[#0c0d12] px-3 py-2 text-[12px] text-blue-400/70">{currentScene.sceneDuration ? `~${currentScene.sceneDuration}s` : <span className="text-white/20">Not set</span>}</div>
                            )}
                          </div>
                        </div>

                        {/* Narration */}
                        <div>
                          <div className="mb-1.5 flex items-center justify-between">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Narration</label>
                            {!isEditingScene && (
                              <button onClick={() => copyToClipboard(currentScene.narration, 'narration')} aria-label="Copy narration" className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/60">
                                {copiedField === 'narration' ? <><Icon.Check className="text-emerald-400" /><span className="text-emerald-400">Copied</span></> : <><Icon.Copy /><span>Copy</span></>}
                              </button>
                            )}
                          </div>
                          {isEditingScene ? (
                            <textarea value={sceneDraft?.narration ?? ''} onChange={(e) => updateDraft('narration', e.target.value)} rows={4} className="w-full resize-y rounded-lg border border-white/[0.12] bg-[#0c0d12] p-3 text-[13px] leading-6 text-white/80 outline-none transition-all focus:border-emerald-500/30" />
                          ) : (
                            <div className="rounded-lg border border-white/[0.06] bg-[#0c0d12] p-3 text-[13px] leading-6 text-white/70 whitespace-pre-wrap max-h-40 overflow-y-auto">{currentScene.narration || <span className="text-white/20">No narration</span>}</div>
                          )}
                          {/* Voice controls */}
                          <div className="mt-2 flex items-center gap-2">
                            <button onClick={() => startVoiceGeneration(currentScene.id)} disabled={voiceStatus[currentScene.id] === 'generating' || !currentScene.narration?.trim()}
                              className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-white/60 transition-all hover:bg-white/[0.08] hover:text-white/80 active:scale-[0.98] disabled:opacity-40">
                              {voiceStatus[currentScene.id] === 'generating' ? (<><Icon.Spinner className="h-3 w-3 animate-spin" />Generating...</>) : voiceStatus[currentScene.id] === 'ready' ? (<><Icon.Mic className="h-3 w-3 text-emerald-400" />Regenerate</>) : (<><Icon.Mic className="h-3 w-3" />Generate voice</>)}
                            </button>
                            {voiceStatus[currentScene.id] === 'ready' && (<>
                              <button onClick={() => playVoice(currentScene.id)} className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-white/60 transition-all hover:bg-white/[0.08] hover:text-white/80">
                                <Icon.Play className="h-3 w-3" />Preview
                              </button>
                              <button onClick={stopVoice} className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-white/60 transition-all hover:bg-white/[0.08] hover:text-white/80">
                                <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>Stop
                              </button>
                            </>)}
                            {voiceStatus[currentScene.id] === 'ready' && <span className="ml-auto rounded bg-emerald-500/10 px-1.5 py-0.5 text-[8px] font-bold text-emerald-400/70">VOICE READY</span>}
                          </div>
                        </div>

                        {/* Visual Prompt */}
                        <div>
                          <div className="mb-1.5 flex items-center justify-between">
                            <div>
                              <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Visual Prompt</label>
                              <p className="text-[9px] text-white/25 mt-0.5">Controls the generated image and video for this scene</p>
                            </div>
                            {!isEditingScene && (
                              <button onClick={() => copyToClipboard(currentScene.visual, 'visual')} aria-label="Copy visual prompt" className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/60">
                                {copiedField === 'visual' ? <><Icon.Check className="text-emerald-400" /><span className="text-emerald-400">Copied</span></> : <><Icon.Copy /><span>Copy</span></>}
                              </button>
                            )}
                          </div>
                          {isEditingScene ? (
                            <textarea value={sceneDraft?.visual ?? ''} onChange={(e) => updateDraft('visual', e.target.value)} rows={3} className="w-full resize-y rounded-lg border border-white/[0.12] bg-[#0c0d12] p-3 text-[13px] leading-6 text-white/75 outline-none transition-all focus:border-emerald-500/30" />
                          ) : (
                            <div className="rounded-lg border border-white/[0.06] bg-[#0c0d12] p-3 text-[13px] leading-6 text-white/65 whitespace-pre-wrap max-h-32 overflow-y-auto">{currentScene.visual || <span className="text-white/20">No visual prompt</span>}</div>
                          )}
                          {/* AI Visual Prompt Preview toggle */}
                          <button onClick={() => setExpandedPrompts(!expandedPrompts)} className="mt-1.5 flex items-center gap-1.5 text-[9px] text-white/30 transition-colors hover:text-white/50">
                            <Icon.Wand className="h-2.5 w-2.5" />
                            {expandedPrompts ? 'Hide' : 'Show'} full AI prompt with characters & style
                          </button>
                          {expandedPrompts && (
                            <div className="mt-2 rounded-lg border border-white/[0.06] bg-[#0c0d12] p-3">
                              <p className="text-[10px] leading-relaxed text-white/50 whitespace-pre-wrap break-words">
                                {(() => {
                                  const sceneCharIndices = sceneCharacters[currentScene.id] || [];
                                  const sceneChars = sceneCharIndices.map((idx) => characters[idx]).filter((c) => !!c?.name?.trim());
                                  let fullPrompt = (isEditingScene ? sceneDraft?.visual : currentScene.visual) || '';
                                  if (sceneChars.length > 0) {
                                    const charDesc = sceneChars.map((c) => {
                                      const parts = [c.name];
                                      if (c.appearance) parts.push(`Appearance: ${c.appearance}`);
                                      if (c.role) parts.push(`Role: ${c.role}`);
                                      return parts.join(' - ');
                                    });
                                    fullPrompt = `Characters: ${charDesc.join('; ')}\n\nScene: ${fullPrompt}`;
                                  }
                                  const beat = isEditingScene ? sceneDraft?.beat : currentScene.beat;
                                  if (beat) fullPrompt += `\n\nEmotional tone: ${beat}.`;
                                  if (style) fullPrompt += `\n\nStyle: ${style}. Cinematic, high quality.`;
                                  else fullPrompt += '\n\nCinematic, high quality.';
                                  return fullPrompt;
                                })()}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Characters in this scene */}
                        {characters.length > 0 && (
                          <SceneCharacterPicker
                            characters={characters}
                            sceneCharacters={sceneCharacters}
                            sceneId={currentScene.id}
                            onToggle={(idx) => {
                              const current = sceneCharacters[currentScene.id] || [];
                              const isSelected = current.includes(idx);
                              const next = isSelected ? current.filter((i) => i !== idx) : [...current, idx];
                              setSceneCharacters((prev) => ({ ...prev, [currentScene.id]: next }));
                              setSaved(false);
                            }}
                            onManage={() => setShowCharacters(!showCharacters)}
                          />
                        )}

                        {/* Stale asset warning */}
                        {isEditingScene && hasStaleAssets(currentScene.id) && (
                          <div className="rounded-lg border border-amber-500/15 bg-amber-500/[0.05] px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <span className="text-amber-400/80">!</span>
                              <span className="text-[11px] font-medium text-amber-400/80">Existing image/video may not match your updated prompt</span>
                            </div>
                            <p className="mt-1 ml-5 text-[10px] text-white/35">Regenerate image and video after saving to reflect changes.</p>
                          </div>
                        )}
                      </div>

                      {/* Save/Cancel bar */}
                      {isEditingScene && (
                        <div className="flex items-center justify-between border-t border-white/[0.06] bg-white/[0.015] px-4 py-2.5">
                          <span className="text-[10px] text-white/35">Changes are local until saved</span>
                          <div className="flex items-center gap-2">
                            <button onClick={cancelEditScene} className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-white/55 transition-colors hover:bg-white/[0.08] hover:text-white/75">
                              Cancel
                            </button>
                            <button onClick={saveEditScene} className="rounded-lg bg-emerald-500/15 border border-emerald-500/25 px-4 py-1.5 text-[11px] font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/25 active:scale-[0.98]">
                              Save Changes
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Character Consistency Summary */}
                    {characters.length > 0 && result && (
                      <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-white/65">Characters</span>
                          <button onClick={() => setShowCharacters(true)} className="text-[9px] text-white/35 hover:text-white/55 transition-colors">Edit</button>
                        </div>
                        <div className="space-y-1">
                          {characters.filter((c) => c.name?.trim()).map((c, i) => {
                            const realIdx = characters.indexOf(c);
                            const usedInScenes = result.scenes.filter((s) => (sceneCharacters[s.id] || []).includes(realIdx));
                            return (
                              <div key={i} className="flex items-center justify-between rounded-lg bg-white/[0.02] px-2 py-1.5">
                                <span className="text-[11px] font-medium text-white/60 truncate">{c.name}</span>
                                <span className={`text-[9px] font-medium ${usedInScenes.length > 0 ? 'text-emerald-400/60' : 'text-white/25'}`}>
                                  {usedInScenes.length > 0 ? `${usedInScenes.length}s` : '--'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
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
                      <div className="mb-3 flex items-center gap-2">
                        <Icon.Sparkles className="h-3.5 w-3.5 text-white/50" />
                        <span className="text-[13px] font-semibold text-white/85">Final Video</span>
                      </div>

                      {/* Readiness checklist */}
                      <div className="mb-3 grid grid-cols-2 gap-2">
                        <div className="rounded-lg bg-white/[0.03] px-2.5 py-2">
                          <div className="text-[9px] font-bold uppercase tracking-wider text-white/35">Scenes</div>
                          <div className={`mt-0.5 text-[13px] font-semibold ${totalVideosGenerated >= result.scenes.length ? 'text-emerald-400' : 'text-white/60'}`}>{totalVideosGenerated} / {result.scenes.length}</div>
                        </div>
                        <div className="rounded-lg bg-white/[0.03] px-2.5 py-2">
                          <div className="text-[9px] font-bold uppercase tracking-wider text-white/35">Voice</div>
                          <div className={`mt-0.5 text-[13px] font-semibold ${totalVoiceReady >= result.scenes.filter(s => s.narration?.trim()).length ? 'text-emerald-400' : 'text-white/60'}`}>{totalVoiceReady} / {result.scenes.filter(s => s.narration?.trim()).length}</div>
                        </div>
                      </div>
                      <div className="mb-3 flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-white/40">Music:</span>
                          <span className="text-[10px] font-medium text-white/60">{music}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-white/40">Captions:</span>
                          <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${captions ? 'bg-white text-black' : 'bg-white/[0.06] text-white/40'}`}>{captions ? 'ON' : 'OFF'}</span>
                        </div>
                      </div>

                      {/* Status-specific display */}
                      {rendering && renderStage ? (
                        <div className="mb-3 rounded-lg border border-blue-500/20 bg-blue-500/[0.06] px-3 py-3">
                          <div className="flex items-center gap-2">
                            <Icon.Spinner className="h-3.5 w-3.5 animate-spin text-blue-400" />
                            <span className="text-[12px] font-medium text-blue-400">{renderStage}</span>
                          </div>
                          {renderProgress > 0 && renderProgress < 100 && (
                            <div className="mt-2">
                              <div className="h-1.5 overflow-hidden rounded-full bg-blue-500/10">
                                <div className="h-full rounded-full bg-blue-400 transition-all duration-500" style={{ width: `${renderProgress}%` }} />
                              </div>
                              <span className="mt-1 block text-[10px] text-white/35">{renderProgress}% complete</span>
                            </div>
                          )}
                        </div>
                      ) : finalVideo ? (
                        <div className="mb-3 flex items-center gap-2 rounded-lg border border-emerald-500/15 bg-emerald-500/[0.06] px-3 py-2.5">
                          <Icon.Check className="h-3.5 w-3.5 text-emerald-400" />
                          <div>
                            <span className="text-[11px] font-semibold text-emerald-400/90">Final video ready</span>
                            <p className="text-[10px] text-white/40">Export your MP4</p>
                          </div>
                        </div>
                      ) : renderReady ? (
                        <div className="mb-3 flex items-center gap-2 rounded-lg border border-emerald-500/15 bg-emerald-500/[0.06] px-3 py-2.5">
                          <Icon.Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                          <span className="text-[11px] font-semibold text-emerald-400/90">All scene videos ready</span>
                        </div>
                      ) : (
                        <div className="mb-3">
                          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                            <div className="h-full rounded-full bg-white/20 transition-all" style={{ width: `${(totalVideosGenerated / result.scenes.length) * 100}%` }} />
                          </div>
                        </div>
                      )}

                      <button onClick={finalVideo ? exportVideo : startRender} disabled={rendering || (!finalVideo && !renderReady)} className="w-full rounded-xl bg-gradient-to-b from-white to-white/90 px-4 py-3 text-[13px] font-semibold text-black shadow-[0_2px_16px_-4px_rgba(255,255,255,0.2)] transition-all hover:shadow-[0_4px_24px_-4px_rgba(255,255,255,0.3)] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none">
                        {rendering ? (
                          <span className="flex items-center justify-center gap-2"><Icon.Spinner className="h-3.5 w-3.5" />Rendering... {renderProgress}%</span>
                        ) : finalVideo ? (
                          <span className="flex items-center justify-center gap-2"><Icon.Download />Export Video</span>
                        ) : renderReady ? (
                          <span className="flex items-center justify-center gap-2"><Icon.Sparkles />Render Final Video</span>
                        ) : "Render Final Video"}
                      </button>

                      {!renderReady && !rendering && !finalVideo && (
                        <p className="mt-2 text-center text-[11px] text-white/35">
                          Generate all {result.scenes.length} scene videos to render.
                        </p>
                      )}
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
                  <span className="text-[12px] font-bold uppercase tracking-wider text-white/70">Timeline</span>
                  <span className="text-[11px] text-white/40">{result.scenes.length} scenes</span>
                  <span className="rounded bg-white/[0.05] px-2 py-0.5 text-[11px] font-semibold text-white/55">{totalDurationFormatted}</span>
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
              <div className="space-y-1">
                {result.scenes.map((scene, sceneIdx) => {
                  const hasVideo = !!sceneVideos[scene.id];
                  const hasImage = !!sceneImages[scene.id];
                  const hasVoice = voiceStatus[scene.id] === 'ready';
                  const isComplete = hasImage && hasVideo && hasVoice;
                  const isActive = activeScene === scene.id;
                  const isFirst = sceneIdx === 0;
                  const isLast = sceneIdx === result.scenes.length - 1;

                  return (
                    <div key={scene.id}
                      onClick={() => switchScene(scene.id)}
                      className={`group relative flex items-center rounded-xl border transition-all duration-150 cursor-pointer overflow-hidden ${isActive ? 'border-emerald-500/25 bg-emerald-500/[0.04] shadow-[0_2px_16px_-6px_rgba(0,0,0,0.3)]' : isComplete ? 'border-white/[0.06] bg-white/[0.015] hover:bg-white/[0.025]' : 'border-white/[0.05] bg-white/[0.01] hover:bg-white/[0.025]'}`}>

                      {/* Scene number */}
                      <div className="flex w-10 flex-shrink-0 items-center justify-center">
                        <span className={`text-[12px] font-bold ${isActive ? 'text-emerald-400' : 'text-white/25'}`}>{String(sceneIdx + 1).padStart(2, '0')}</span>
                      </div>

                      {/* Thumbnail */}
                      <div className="relative h-10 w-14 flex-shrink-0 overflow-hidden rounded-md">
                        {hasImage ? (
                          <img src={sceneImages[scene.id]} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center bg-white/[0.04]">
                            <Icon.Image className="h-3.5 w-3.5 text-white/15" />
                          </div>
                        )}
                        {hasVideo && (
                          <div className="absolute right-0.5 top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded bg-blue-500/90">
                            <svg width="6" height="6" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                          </div>
                        )}
                      </div>

                      {/* Scene info */}
                      <div className="flex-1 px-3 py-1.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`truncate text-[12px] font-semibold ${isActive ? 'text-white/90' : 'text-white/65'}`}>{scene.title}</span>
                          {scene.beat && <span className="hidden sm:inline-flex rounded bg-violet-500/10 px-1.5 py-0.5 text-[8px] font-bold text-violet-400/60 flex-shrink-0">{scene.beat}</span>}
                        </div>
                      </div>

                      {/* Status indicators */}
                      <div className="flex items-center gap-1.5 border-l border-white/[0.04] px-3">
                        <span className={`text-[8px] font-bold ${hasImage ? 'text-emerald-400/70' : 'text-white/15'}`}>IMG</span>
                        <span className={`text-[8px] font-bold ${hasVideo ? 'text-blue-400/70' : 'text-white/15'}`}>VID</span>
                        <span className={`text-[8px] font-bold ${hasVoice ? 'text-violet-400/70' : 'text-white/15'}`}>VOC</span>
                      </div>

                      {/* Reorder + duplicate */}
                      <div className="flex items-center gap-0.5 border-l border-white/[0.04] px-1.5">
                        <button onClick={(e) => { e.stopPropagation(); moveScene(scene.id, -1); }} disabled={isFirst}
                          aria-label="Move up" className="flex h-5 w-5 items-center justify-center rounded text-white/20 transition-colors hover:bg-white/[0.06] hover:text-white/50 disabled:opacity-15">
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 15l-6-6-6 6" /></svg>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); moveScene(scene.id, 1); }} disabled={isLast}
                          aria-label="Move down" className="flex h-5 w-5 items-center justify-center rounded text-white/20 transition-colors hover:bg-white/[0.06] hover:text-white/50 disabled:opacity-15">
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" /></svg>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); duplicateScene(scene.id); }} aria-label="Duplicate"
                          className="flex h-5 w-5 items-center justify-center rounded text-white/15 transition-colors hover:bg-white/[0.06] hover:text-white/40">
                          <Icon.Copy2 />
                        </button>
                      </div>

                      {/* Complete indicator */}
                      {isComplete && (
                        <div className="border-l border-white/[0.04] px-2">
                          <Icon.Check className="h-3 w-3 text-emerald-400/70" />
                        </div>
                      )}
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
                  <button onClick={() => { const idx = result.scenes.findIndex((s) => s.id === activeScene); if (idx > 0) switchScene(result.scenes[idx - 1].id); }} disabled={result.scenes.findIndex((s) => s.id === activeScene) <= 0}
                    className="flex h-6 w-6 items-center justify-center rounded border border-white/[0.06] text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/70 disabled:opacity-20">
                    <Icon.ArrowLeft className="h-3 w-3" />
                  </button>
                  <button onClick={() => { const idx = result.scenes.findIndex((s) => s.id === activeScene); if (idx < result.scenes.length - 1) switchScene(result.scenes[idx + 1].id); }} disabled={result.scenes.findIndex((s) => s.id === activeScene) >= result.scenes.length - 1}
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
            <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.02] to-transparent p-16 text-center sm:p-20">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03]">
                <Icon.Film className="h-7 w-7 text-white/25" />
              </div>
              <h3 className="text-[16px] font-semibold text-white/70">No videos yet</h3>
              <p className="mx-auto mt-2 max-w-[280px] text-[13px] leading-relaxed text-white/40">Create your first AI video and it will appear here. Start with a story idea.</p>
              <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="mt-6 inline-flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.08] px-5 py-2.5 text-[13px] font-medium text-emerald-400/90 transition-all hover:bg-emerald-500/[0.14] hover:text-emerald-300 active:scale-[0.98]">
                <Icon.Plus className="h-3.5 w-3.5" />Create your first video
              </button>
            </div>
          ) : (() => {
            const filtered = projects.filter((p) => {
              const matchesSearch = !searchQuery || p.title.toLowerCase().includes(searchQuery.toLowerCase());
              const imageCount = p.sceneImages ? Object.keys(p.sceneImages).length : 0;
              const videoCount = p.sceneVideos ? Object.keys(p.sceneVideos).length : 0;
              const isComplete = imageCount >= 5 && videoCount >= 5;
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
                  const scenes = project.result?.scenes || [];
                  const sceneCount = scenes.length || 5;
                  const hasFinalVideo = !!project.finalVideoUrl;
                  const isComplete = imageCount >= 5 && videoCount >= 5;
                  const firstImage = project.sceneImages ? Object.values(project.sceneImages)[0] : null;
                  const totalDur = scenes.reduce((sum: number, s: { sceneDuration?: string }) => sum + (parseInt(s.sceneDuration || "10") || 10), 0) || 50;
                  return (
                    <div key={project.id} className="group rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden transition-all duration-200 hover:border-white/[0.15] hover:bg-white/[0.03] hover:-translate-y-0.5 hover:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.5)]">
                      <button onClick={() => loadProject(project)} className="block w-full text-left">
                        <div className="relative overflow-hidden">
                          <div className="aspect-video bg-[#0c0d12]">
                            {firstImage ? (
                              <img src={firstImage} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
                            ) : (
                              <div className="flex h-full items-center justify-center">
                                <Icon.Film className="h-8 w-8 text-white/10" />
                              </div>
                            )}
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.10] opacity-0 transition-all group-hover:opacity-100 backdrop-blur-sm">
                              <Icon.Play className="ml-0.5 h-4 w-4 text-white/90" />
                            </div>
                          </div>
                          <div className="absolute left-2 top-2">
                            <span className={`rounded-md px-2 py-0.5 text-[9px] font-bold tracking-wide ${isComplete ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/20 text-amber-400 border border-amber-500/20"}`}>{isComplete ? "COMPLETED" : "IN PROGRESS"}</span>
                          </div>
                          {hasFinalVideo && (
                            <div className="absolute right-2 top-2">
                              <span className="rounded-md bg-violet-500/20 border border-violet-500/20 px-2 py-0.5 text-[9px] font-bold tracking-wide text-violet-400">FINAL VIDEO</span>
                            </div>
                          )}
                        </div>
                      </button>

                      <div className="p-4">
                        <button onClick={() => loadProject(project)} className="block w-full text-left">
                          <div className="truncate text-[14px] font-semibold text-white/85 group-hover:text-white">{project.title}</div>
                        </button>
                        <div className="mt-1.5 flex items-center gap-2 text-[11px] text-white/45">
                          <span>{project.style}</span>
                          <span className="text-white/20">|</span>
                          <span>{totalDur}s</span>
                          <span className="text-white/20">|</span>
                          <span>{project.language}</span>
                        </div>

                        <div className="mt-3 flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400/70" />
                            <span className="text-[10px] text-white/50">{imageCount} img</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="h-1.5 w-1.5 rounded-full bg-blue-400/70" />
                            <span className="text-[10px] text-white/50">{videoCount} vid</span>
                          </div>
                          <div className="ml-auto text-[10px] text-white/35">{sceneCount} scenes</div>
                        </div>

                        <div className="mt-2.5">
                          <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
                            <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${((imageCount + videoCount) / 10) * 100}%` }} />
                          </div>
                        </div>

                        <div className="mt-3 flex items-center gap-2 border-t border-white/[0.06] pt-3">
                          <button onClick={() => loadProject(project)} className="flex items-center gap-1.5 rounded-lg bg-white/[0.08] px-3 py-1.5 text-[11px] font-medium text-white/70 transition-all hover:bg-white/[0.12] hover:text-white/90 active:scale-[0.98]">
                            <Icon.Folder className="text-white/50" />Open
                          </button>
                          <button onClick={() => duplicateProject(project)} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium text-white/40 transition-all hover:bg-white/[0.06] hover:text-white/65 active:scale-[0.98]">
                            <Icon.Copy2 />Duplicate
                          </button>
                          <div className="ml-auto">
                            {project.createdAt && <span className="text-[10px] text-white/30">{new Date(project.createdAt).toLocaleDateString()}</span>}
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(project.id); }} aria-label="Delete project" className="flex h-6 w-6 items-center justify-center rounded-md text-white/30 transition-all hover:bg-red-500/10 hover:text-red-400/80">
                            <Icon.Trash />
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
