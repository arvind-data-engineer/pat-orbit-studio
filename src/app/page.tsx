"use client";

import { useEffect, useRef, useState } from "react";

type Scene = {
  id: number;
  title: string;
  narration: string;
  visual: string;
};

type StoryResult = {
  title: string;
  scenes: Scene[];
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
};

/* ------------------------------------------------------------------ */
/*  SVG icons — emoji-free, encoding-safe                              */
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
  /* New icons for the visual UX upgrade */
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
};

const EXAMPLE_PROMPTS = [
  { label: "Mystery adventure", text: "A young boy discovers a mysterious room inside his grandfather's abandoned house. The room is filled with glowing artifacts and ancient maps that hint at a hidden treasure beneath the city." },
  { label: "Motivational story", text: "An underdog athlete trains for years in silence while everyone doubts them. On the day of the championship, they deliver a performance that leaves the entire stadium in shock." },
  { label: "Sci-fi short", text: "In the year 2187, a lone astronaut receives a signal from deep space that appears to be a message from their future self. They must decide whether to follow the instructions or trust their own instincts." },
];

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

  const [sceneStatus, setSceneStatus] = useState<
    Record<number, "idle" | "image" | "video">
  >({});

  const [sceneImages, setSceneImages] = useState<Record<number, string>>({});
  const [sceneVideos, setSceneVideos] = useState<Record<number, string>>({});

  /* Render state */
  const [finalVideo, setFinalVideo] = useState<string | null>(null);
  const [renderStage, setRenderStage] = useState("");
  const [renderProgress, setRenderProgress] = useState(0);

  /* UI-only state */
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const [loadingStep, setLoadingStep] = useState(0);

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

  useEffect(() => {
    try {
      const stored = localStorage.getItem("pat-orbit-projects");
      if (stored) {
        setProjects(JSON.parse(stored));
      }
    } catch {
      console.error("Could not load projects.");
    }
  }, []);

  /* Loading step animation during story generation */
  useEffect(() => {
    if (!loading) { setLoadingStep(0); return; }
    const steps = [0, 1, 2, 3];
    let idx = 0;
    const timers: NodeJS.Timeout[] = [];
    for (let i = 1; i <= 3; i++) {
      timers.push(setTimeout(() => { setLoadingStep(i); }, i * 2000));
    }
    return () => timers.forEach(clearTimeout);
  }, [loading]);

  function saveProjects(nextProjects: Project[]) {
    setProjects(nextProjects);
    localStorage.setItem("pat-orbit-projects", JSON.stringify(nextProjects));
  }

  async function generateStory() {
    if (!story.trim()) {
      setError("Please enter a story idea first.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    setSaved(false);
    try {
      const response = await fetch("/api/generate-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ story, language, style, duration, contentType: "Story" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to generate story.");
      if (!data.title || !Array.isArray(data.scenes)) throw new Error("AI returned an invalid story.");
      setResult(data);
      setProjectName(data.title);
      setSceneImages({});
      setSceneVideos({});
      setSceneStatus({});
      setActiveScene(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function updateScene(sceneId: number, field: "title" | "narration" | "visual", value: string) {
    if (!result) return;
    setResult({
      ...result,
      scenes: result.scenes.map((scene) =>
        scene.id === sceneId ? { ...scene, [field]: value } : scene
      ),
    });
    setSaved(false);
  }

  function saveCurrentProject() {
    if (!result) return;
    const project: Project = {
      id: crypto.randomUUID(),
      title: projectName || result.title,
      story, language, style, duration, result,
      createdAt: new Date().toISOString(),
      sceneImages: { ...sceneImages },
    };
    saveProjects([project, ...projects]);
    setSaved(true);
  }

  function loadProject(project: Project) {
    setStory(project.story);
    setLanguage(project.language);
    setStyle(project.style);
    setDuration(project.duration);
    setResult(project.result);
    setProjectName(project.title);
    setSceneImages(project.sceneImages ?? {});
    setSceneVideos({});
    setSceneStatus({});
    setActiveScene(1);
    setSaved(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteProject(id: string) {
    saveProjects(projects.filter((p) => p.id !== id));
  }

  async function startImageGeneration(sceneId: number) {
    if (!result) return;
    const scene = result.scenes.find((item) => item.id === sceneId);
    if (!scene) return;
    setSceneStatus((c) => ({ ...c, [sceneId]: "image" }));
    setError("");
    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: scene.visual }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to generate image.");
      if (!data.image) throw new Error("No image was returned.");
      setSceneImages((c) => ({ ...c, [sceneId]: data.image }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate image.");
    } finally {
      setSceneStatus((c) => ({ ...c, [sceneId]: "idle" }));
    }
  }

  async function startVideoGeneration(sceneId: number) {
    if (!result) return;
    const scene = result.scenes.find((item) => item.id === sceneId);
    if (!scene) return;
    setSceneStatus((c) => ({ ...c, [sceneId]: "video" }));
    setError("");
    try {
      const body: Record<string, unknown> = {
        prompt: scene.visual,
        duration,
        aspectRatio,
      };
      if (sceneImages[sceneId]) {
        body.image = sceneImages[sceneId];
      }
      const response = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to generate video.");
      if (data.video) {
        setSceneVideos((c) => ({ ...c, [sceneId]: data.video }));
      } else if (data.videoUri) {
        setSceneVideos((c) => ({ ...c, [sceneId]: data.videoUri }));
      } else {
        throw new Error("No video was returned.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate video.");
    } finally {
      setSceneStatus((c) => ({ ...c, [sceneId]: "idle" }));
    }
  }

  const totalVideosGenerated = Object.keys(sceneVideos).length;

  async function startRender() {
    if (!result || totalVideosGenerated < result.scenes.length) return;
    setRendering(true);
    setRenderStage("Preparing scenes...");
    setRenderProgress(5);
    setError("");
    setFinalVideo(null);
    try {
      setRenderStage("Generating voice...");
      setRenderProgress(10);
      const voiceAudios: Record<number, string> = {};
      const totalScenes = result.scenes.length;
      for (let i = 0; i < totalScenes; i++) {
        const s = result.scenes[i];
        if (s.narration && s.narration.trim()) {
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
              voiceAudios[s.id] = voiceData.audio;
            }
          } catch { /* Non-fatal */ }
        }
      }
      setRenderStage("Preparing captions...");
      setRenderProgress(40);
      const scenesPayload = result.scenes.map((s) => ({
        id: s.id,
        video: sceneVideos[s.id] || "",
        narration: captions ? s.narration : undefined,
      }));
      setRenderStage("Mixing audio & rendering...");
      setRenderProgress(50);
      const response = await fetch("/api/render-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenes: scenesPayload, aspectRatio, captions, music, voiceAudios }),
      });
      setRenderStage("Finalizing...");
      setRenderProgress(90);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to render video.");
      if (!data.video) throw new Error("No video was returned from render.");
      setFinalVideo(data.video);
      setRenderStage("Complete");
      setRenderProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to render video.");
      setRenderStage("Render failed");
      setRenderProgress(0);
    } finally {
      setRendering(false);
    }
  }

  function exportVideo() {
    if (!finalVideo) return;
    const link = document.createElement("a");
    link.href = finalVideo;
    const safeName = (projectName || "pat-orbit-video").replace(/[^a-zA-Z0-9\s\-_]/g, "").replace(/\s+/g, "-").toLowerCase();
    link.download = `${safeName}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    return "Ready";
  }

  function getStatusColor(sceneId: number) {
    const st = sceneStatus[sceneId];
    if (st === "image") return "bg-amber-500/15 text-amber-400";
    if (st === "video") return "bg-violet-500/15 text-violet-400";
    if (sceneVideos[sceneId]) return "bg-blue-500/15 text-blue-400";
    if (sceneImages[sceneId]) return "bg-emerald-500/15 text-emerald-400";
    return "bg-white/[0.06] text-white/30";
  }

  function getStatusDotColor(sceneId: number) {
    const st = sceneStatus[sceneId];
    if (st === "image") return "bg-amber-400";
    if (st === "video") return "bg-violet-400";
    if (sceneVideos[sceneId]) return "bg-blue-400";
    if (sceneImages[sceneId]) return "bg-emerald-400";
    return "bg-white/20";
  }

  const totalImagesGenerated = Object.keys(sceneImages).length;

  const loadingSteps = [
    { label: "Analyzing idea", done: loadingStep >= 1 },
    { label: "Building 5 scenes", done: loadingStep >= 2 },
    { label: "Writing narration", done: loadingStep >= 3 },
    { label: "Preparing visual prompts", done: loading },
  ];

  return (
    <main className="min-h-screen bg-[#08090c] text-white">
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
              <span className="text-[11px] text-white/25">Studio</span>
            </div>
          </div>
          <nav className="hidden items-center gap-0.5 md:flex">
            {!result ? (
              <span className="rounded-lg bg-white/[0.06] px-3 py-1.5 text-[12px] font-medium text-white/70">Create</span>
            ) : (
              <button onClick={() => setResult(null)} className="rounded-lg px-3 py-1.5 text-[12px] font-medium text-white/40 transition-colors hover:bg-white/[0.05] hover:text-white/70">Create</button>
            )}
            <button onClick={() => document.getElementById("projects")?.scrollIntoView({ behavior: "smooth" })} className="rounded-lg px-3 py-1.5 text-[12px] font-medium text-white/40 transition-colors hover:bg-white/[0.05] hover:text-white/70">Projects</button>
            {result && (
              <button onClick={() => document.getElementById("timeline")?.scrollIntoView({ behavior: "smooth" })} className="rounded-lg px-3 py-1.5 text-[12px] font-medium text-white/40 transition-colors hover:bg-white/[0.05] hover:text-white/70">Timeline</button>
            )}
          </nav>
          <div className="flex items-center gap-1.5">
            {result && (
              <>
                <button onClick={saveCurrentProject} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium text-white/50 transition-colors hover:bg-white/[0.05] hover:text-white/70">
                  <Icon.Folder className="text-white/30" />
                  {saved ? "Saved" : "Save"}
                </button>
                <button onClick={finalVideo ? exportVideo : undefined} className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[12px] font-medium text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white/80">
                  <Icon.Download className="text-white/40" />
                  Export
                </button>
              </>
            )}
            <div ref={settingsRef} className="relative">
              <button onClick={() => setSettingsOpen(!settingsOpen)} aria-label="Settings" className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-white/40 transition-colors hover:bg-white/[0.08] hover:text-white/60">
                <Icon.Settings />
              </button>
              {settingsOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-white/[0.08] bg-[#111218] p-1.5 shadow-2xl">
                  <div className="px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-wider text-white/25">Settings</div>
                  <button className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12px] text-white/50 transition-colors hover:bg-white/[0.05] hover:text-white/70">Aspect ratio: {aspectRatio}</button>
                  <button className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12px] text-white/50 transition-colors hover:bg-white/[0.05] hover:text-white/70">Voice: {voice}</button>
                  <button className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12px] text-white/50 transition-colors hover:bg-white/[0.05] hover:text-white/70">Captions: {captions ? "ON" : "OFF"}</button>
                  <button className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12px] text-white/50 transition-colors hover:bg-white/[0.05] hover:text-white/70">Music: {music}</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 sm:py-12">
        {!result ? (
          <>
            {/* ===== HERO ===== */}
            <div className="mx-auto mb-8 max-w-3xl text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-1.5 text-[11px] font-medium uppercase tracking-widest text-white/40">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                AI Video Creator
              </div>
              <h1 className="text-4xl font-bold tracking-tight leading-[1.1] sm:text-5xl lg:text-6xl">
                Turn your idea into<br />
                <span className="bg-gradient-to-r from-white via-white/80 to-white/40 bg-clip-text text-transparent">a video.</span>
              </h1>
              <p className="mx-auto mt-6 max-w-xl text-[15px] leading-7 text-white/35">
                Generate stories, scenes and visuals with AI &mdash; all from one creative workspace.
              </p>
            </div>

            {/* ===== WORKFLOW INDICATOR ===== */}
            <div className="mx-auto mb-10 flex max-w-2xl items-center justify-center gap-2 sm:gap-3">
              {[
                { icon: <Icon.Lightbulb className="text-amber-400/70" />, label: "Idea", desc: "Your story concept" },
                { icon: <Icon.Film className="text-blue-400/70" />, label: "Scenes", desc: "5 scenes created" },
                { icon: <Icon.Image className="text-emerald-400/70" />, label: "Visuals", desc: "AI images & video" },
                { icon: <Icon.Video className="text-violet-400/70" />, label: "Video", desc: "Final 60 sec video" },
              ].map((step, i) => (
                <div key={step.label} className="flex items-center gap-2 sm:gap-3">
                  <div className="group flex flex-col items-center gap-1.5 transition-transform hover:-translate-y-0.5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] transition-colors group-hover:border-white/[0.15] group-hover:bg-white/[0.06]">
                      {step.icon}
                    </div>
                    <span className="text-[11px] font-medium text-white/50">{step.label}</span>
                  </div>
                  {i < 3 && (
                    <div className="relative mb-5 hidden h-px w-6 sm:block lg:w-10">
                      <div className="absolute inset-0 bg-white/[0.08]" />
                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/30 via-emerald-400/50 to-emerald-500/30 animate-[shimmer_3s_ease-in-out_infinite]" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* ===== DEMO PRODUCT PREVIEW ===== */}
            <div className="mx-auto mb-12 max-w-5xl overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a0b10] shadow-[0_0_80px_-20px_rgba(255,255,255,0.04)]">
              <div className="grid lg:grid-cols-[200px_1fr_240px]">
                {/* Demo scene list */}
                <div className="hidden border-r border-white/[0.06] bg-white/[0.01] p-4 lg:block">
                  <div className="mb-3 text-[10px] font-medium uppercase tracking-wider text-white/25">Scenes</div>
                  {["Old House", "Hidden Door", "Strange Room", "Magical Discovery", "New Life"].map((title, i) => (
                    <div key={i} className={`mb-1 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${i === 0 ? "bg-white/[0.06] border border-white/[0.1]" : "border border-transparent"}`}>
                      <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-[10px] font-bold ${i === 0 ? "bg-white text-black" : "bg-white/[0.06] text-white/30"}`}>{i + 1}</span>
                      <span className={`truncate text-[11px] ${i === 0 ? "text-white/80" : "text-white/35"}`}>{title}</span>
                    </div>
                  ))}
                </div>
                {/* Demo preview */}
                <div className="relative">
                  <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5">
                    <span className="rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white/50 backdrop-blur-sm">SCENE 01</span>
                    <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-medium text-emerald-400/70 backdrop-blur-sm">AI GENERATED</span>
                  </div>
                  {/* Cinematic gradient scene */}
                  <div className="relative flex aspect-video items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-[#0d0f1a] via-[#0a1628] to-[#050810]" />
                    {/* Atmospheric glow */}
                    <div className="absolute left-1/2 top-1/2 h-48 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-b from-amber-500/15 via-orange-500/8 to-transparent blur-2xl" />
                    <div className="absolute left-1/2 top-[40%] h-64 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-b from-amber-400/10 via-transparent to-transparent blur-3xl" />
                    {/* Doorway shape */}
                    <div className="relative z-10 flex h-36 w-20 flex-col items-center justify-end overflow-hidden rounded-t-full border border-amber-500/20 bg-gradient-to-b from-amber-500/10 to-transparent shadow-[0_0_60px_-10px_rgba(245,158,11,0.15)]">
                      <div className="h-4 w-4 rounded-full bg-amber-400/30 blur-sm" />
                    </div>
                    {/* Floor reflection */}
                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/40 to-transparent" />
                    {/* Play button */}
                    <div className="absolute z-20 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-white/10 backdrop-blur-sm transition-all hover:scale-105 hover:bg-white/15 border border-white/10">
                      <Icon.Play className="ml-0.5 text-white/80" />
                    </div>
                  </div>
                </div>
                {/* Demo scene info */}
                <div className="hidden border-l border-white/[0.06] bg-white/[0.01] p-4 lg:block">
                  <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-white/50">Old House</div>
                  <p className="mb-4 text-[11px] leading-relaxed text-white/30">10-year-old Rohan explores his great-grandfather&apos;s abandoned house on the outskirts of the city.</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      <span className="text-[10px] font-medium text-emerald-400/70">IMAGE READY</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                      <span className="text-[10px] font-medium text-blue-400/70">VIDEO READY</span>
                    </div>
                  </div>
                  <div className="mt-5 space-y-1.5">
                    <div className="text-[9px] font-medium uppercase tracking-wider text-white/20">Settings</div>
                    <div className="text-[10px] text-white/25">9:16 &middot; Natural &middot; Cinematic</div>
                  </div>
                </div>
              </div>
              {/* Demo timeline */}
              <div className="border-t border-white/[0.06] bg-white/[0.01] px-4 py-3">
                <div className="mb-2 flex items-center justify-between text-[10px] text-white/20">
                  <span>00:00</span>
                  <span className="text-[10px] text-white/30">Timeline</span>
                  <span>01:00</span>
                </div>
                <div className="relative h-px w-full bg-white/[0.06]">
                  <div className="absolute left-0 top-1/2 h-2 w-2 -translate-x-1 -translate-y-1/2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                  <div className="absolute left-0 top-1/2 h-px w-1/5 -translate-y-1/2 bg-emerald-400/40" />
                </div>
                <div className="mt-2 flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <div key={n} className={`flex-1 rounded-md border p-2 text-center transition-all ${n === 1 ? "border-white/[0.15] bg-white/[0.06]" : "border-white/[0.06] bg-white/[0.02]"}`}>
                      <div className="text-[9px] font-medium text-white/30">Scene {n}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ===== CREATE FORM ===== */}
            <div className="mx-auto max-w-3xl rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 shadow-[0_0_80px_-20px_rgba(255,255,255,0.03)] sm:p-8">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <div className="mb-1 text-[10px] font-medium uppercase tracking-widest text-emerald-400/60">Create your video</div>
                  <h2 className="text-lg font-semibold tracking-tight">Start with a story</h2>
                  <p className="mt-0.5 text-[13px] text-white/30">Describe an idea, concept or script and let AI build your video.</p>
                </div>
                <span className="rounded-md bg-white/[0.05] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/30">Beta</span>
              </div>

              <div className="relative group">
                <div className="absolute -inset-px rounded-xl bg-gradient-to-b from-white/[0.06] to-transparent opacity-0 transition-opacity group-focus-within:opacity-100" />
                <textarea
                  value={story}
                  onChange={(e) => { setStory(e.target.value); setError(""); }}
                  placeholder="Example: A young boy discovers a mysterious room inside his grandfather's abandoned house, filled with glowing artifacts and ancient maps..."
                  rows={6}
                  className="relative w-full resize-none rounded-xl border border-white/[0.08] bg-[#0c0d12] p-5 text-[14px] leading-relaxed text-white/80 outline-none transition-all placeholder:text-white/20 focus:border-white/[0.18] focus:shadow-[0_0_30px_-10px_rgba(255,255,255,0.08)]"
                />
                <span className="absolute bottom-3 right-4 text-[11px] text-white/15 tabular-nums">{story.length}</span>
              </div>

              {/* Example prompts */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {EXAMPLE_PROMPTS.map((ep) => (
                  <button
                    key={ep.label}
                    onClick={() => { setStory(ep.text); setError(""); }}
                    className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-[11px] text-white/35 transition-all hover:border-white/[0.12] hover:bg-white/[0.05] hover:text-white/60 active:scale-[0.98]"
                  >
                    {ep.label}
                  </button>
                ))}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-white/30">Language</label>
                  <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full rounded-lg border border-white/[0.08] bg-[#0c0d12] px-3 py-2.5 text-[13px] text-white/70 outline-none transition focus:border-white/[0.15]">
                    <option>Hindi</option><option>Hinglish</option><option>English</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-white/30">Visual style</label>
                  <select value={style} onChange={(e) => setStyle(e.target.value)} className="w-full rounded-lg border border-white/[0.08] bg-[#0c0d12] px-3 py-2.5 text-[13px] text-white/70 outline-none transition focus:border-white/[0.15]">
                    <option>Cartoon</option><option>Cinematic</option><option>Anime</option><option>Realistic</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-white/30">Duration</label>
                  <select value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full rounded-lg border border-white/[0.08] bg-[#0c0d12] px-3 py-2.5 text-[13px] text-white/70 outline-none transition focus:border-white/[0.15]">
                    <option>30 sec</option><option>60 sec</option><option>90 sec</option>
                  </select>
                </div>
              </div>

              {error && <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/[0.07] px-4 py-3 text-[13px] text-red-300/90">{error}</div>}

              {loading ? (
                <div className="mt-5 rounded-xl border border-white/[0.08] bg-[#0c0d12] p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <Icon.Spinner className="h-4 w-4 text-emerald-400" />
                    <span className="text-[13px] font-semibold text-white/80">Creating your story</span>
                  </div>
                  <div className="space-y-2.5">
                    {loadingSteps.map((step, i) => (
                      <div key={i} className="flex items-center gap-3">
                        {step.done ? (
                          <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
                            <Icon.Check className="h-3 w-3 text-emerald-400" />
                          </span>
                        ) : (
                          <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-white/[0.06]">
                            <span className="h-1.5 w-1.5 rounded-full bg-white/20" />
                          </span>
                        )}
                        <span className={`text-[12px] ${step.done ? "text-white/50" : i === loadingSteps.findIndex(s => !s.done) ? "text-white/70" : "text-white/25"}`}>{step.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <button onClick={generateStory} disabled={loading} className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-b from-white to-white/90 px-6 py-3.5 text-[14px] font-semibold text-black shadow-[0_2px_20px_-4px_rgba(255,255,255,0.25)] transition-all hover:shadow-[0_4px_30px_-4px_rgba(255,255,255,0.35)] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none">
                  Generate Story
                </button>
              )}
              <p className="mt-3 text-center text-[11px] text-white/20">AI will create 5 scenes with narration and visual prompts.</p>
            </div>

            {/* ===== FEATURE CARDS ===== */}
            <div className="mx-auto mt-16 max-w-5xl">
              <div className="mb-8 text-center">
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">From idea to finished video.</h2>
                <p className="mt-3 text-[14px] text-white/35">Everything you need to turn a simple idea into a complete AI video.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { step: "01", icon: <Icon.FileText className="h-6 w-6 text-amber-400/70" />, title: "Write", desc: "Describe your idea in plain words. A concept, a story, anything." },
                  { step: "02", icon: <Icon.Sparkles className="h-6 w-6 text-blue-400/70" />, title: "Build", desc: "AI creates your story with 5 scenes, narration and visual prompts." },
                  { step: "03", icon: <Icon.Wand className="h-6 w-6 text-emerald-400/70" />, title: "Create", desc: "Generate cinematic AI images and video for each scene." },
                  { step: "04", icon: <Icon.Music className="h-6 w-6 text-violet-400/70" />, title: "Render", desc: "Add voice, captions and music. Export a complete MP4 video." },
                ].map((card) => (
                  <div key={card.step} className="group rounded-2xl border border-white/[0.06] bg-white/[0.015] p-6 transition-all duration-200 hover:border-white/[0.12] hover:bg-white/[0.03] hover:-translate-y-0.5">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] transition-colors group-hover:border-white/[0.12]">{card.icon}</div>
                      <span className="text-[11px] font-bold text-white/15">{card.step}</span>
                    </div>
                    <h3 className="mb-1.5 text-[15px] font-semibold text-white/80">{card.title}</h3>
                    <p className="text-[12px] leading-relaxed text-white/30">{card.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* ===== WORKSPACE HEADER ===== */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <button onClick={() => setResult(null)} className="mb-3 flex items-center gap-1.5 text-[12px] text-white/30 transition-colors hover:text-white/60">
                  <Icon.ArrowLeft />
                  Back to creator
                </button>
                <input value={projectName} onChange={(e) => { setProjectName(e.target.value); setSaved(false); }} className="w-full bg-transparent text-2xl font-bold tracking-tight outline-none sm:text-3xl" />
                <p className="mt-1.5 text-[13px] text-white/30">{result.scenes.length} scenes &middot; {language} &middot; {style} &middot; {duration}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={saveCurrentProject} className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-[13px] text-white/50 transition-all hover:bg-white/[0.08] hover:text-white/70 active:scale-[0.98]">{saved ? "Saved" : "Save Project"}</button>
                <button onClick={finalVideo ? exportVideo : undefined} className="rounded-lg bg-white px-4 py-2 text-[13px] font-semibold text-black transition-all hover:bg-white/90 active:scale-[0.98]">Export</button>
              </div>
            </div>

            {/* ===== PROGRESS SUMMARY ===== */}
            <div className="mb-5 flex flex-wrap gap-2">
              {[
                { label: "STORY", done: true },
                { label: `IMAGES ${totalImagesGenerated}/${result.scenes.length}`, done: totalImagesGenerated === result.scenes.length },
                { label: `VIDEOS ${totalVideosGenerated}/${result.scenes.length}`, done: totalVideosGenerated === result.scenes.length },
                { label: "FINAL", done: !!finalVideo, extra: finalVideo ? "Rendered" : "Not rendered" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-1.5">
                  {item.done ? (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/20">
                      <Icon.Check className="h-2.5 w-2.5 text-emerald-400" />
                    </span>
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-white/15" />
                  )}
                  <span className={`text-[10px] font-medium tracking-wider ${item.done ? "text-white/50" : "text-white/25"}`}>{item.label}</span>
                </div>
              ))}
            </div>

            {/* ===== 3-COLUMN WORKSPACE ===== */}
            <div className="grid gap-5 lg:grid-cols-[240px_1fr_300px]">
              {/* LEFT -- Scene Navigator */}
              <div className="hidden lg:block">
                <div className="sticky top-20">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[12px] font-medium text-white/40">Scenes</span>
                    <span className="text-[11px] text-white/25">{result.scenes.length}/5</span>
                  </div>
                  <div className="space-y-1">
                    {result.scenes.map((scene) => (
                      <button key={scene.id} onClick={() => setActiveScene(scene.id)}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-150 ${activeScene === scene.id ? "bg-white/[0.08] border border-white/[0.12] shadow-[0_0_20px_-10px_rgba(255,255,255,0.06)]" : "border border-transparent hover:bg-white/[0.04]"}`}>
                        <div className="relative flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-[11px] font-bold">
                          <div className={`absolute inset-0 rounded-md transition-colors ${activeScene === scene.id ? "bg-white" : "bg-white/[0.08]"}`} />
                          <span className={`relative z-10 ${activeScene === scene.id ? "text-black" : "text-white/40"}`}>{scene.id}</span>
                          <span className={`absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-[#08090c] transition-colors ${getStatusDotColor(scene.id)}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[12px] font-medium text-white/70">{scene.title}</div>
                          <div className="mt-0.5">
                            <span className={`inline-block rounded px-1.5 py-0.5 text-[9px] font-medium ${getStatusColor(scene.id)}`}>{getStatusLabel(scene.id)}</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* CENTER -- Preview + Actions */}
              <div className="space-y-4">
                {/* Mobile scene tabs */}
                <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
                  {result.scenes.map((scene) => (
                    <button key={scene.id} onClick={() => setActiveScene(scene.id)}
                      className={`flex flex-shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-medium transition-all ${activeScene === scene.id ? "bg-white/[0.1] text-white border border-white/[0.15]" : "bg-white/[0.03] text-white/40 border border-transparent"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${getStatusDotColor(scene.id)}`} />
                      {scene.id}
                    </button>
                  ))}
                </div>

                {/* Preview card */}
                <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0d12] shadow-[0_4px_40px_-12px_rgba(0,0,0,0.5)]">
                  <div className="absolute left-4 top-4 z-10 flex items-center gap-2">
                    <span className="rounded-md bg-black/60 px-2 py-1 text-[10px] font-medium text-white/50 backdrop-blur-sm">Scene {String(activeScene).padStart(2, "0")}</span>
                    <span className="rounded-md bg-black/60 px-2 py-1 text-[10px] font-medium text-white/50 backdrop-blur-sm">Preview</span>
                  </div>

                  {/* Image/video generation overlay */}
                  {currentScene && sceneStatus[currentScene.id] === "image" ? (
                    <div className="flex aspect-video flex-col items-center justify-center bg-[#0c0d12]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)", backgroundSize: "24px 24px" }}>
                      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10">
                        <Icon.Spinner className="h-6 w-6 text-amber-400" />
                      </div>
                      <span className="text-[12px] font-semibold text-white/60">Creating visual</span>
                      <span className="mt-1 text-[11px] text-white/25">Scene {String(activeScene).padStart(2, "0")} &middot; Building cinematic composition...</span>
                    </div>
                  ) : currentScene && sceneStatus[currentScene.id] === "video" ? (
                    <div className="flex aspect-video flex-col items-center justify-center bg-[#0c0d12]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)", backgroundSize: "24px 24px" }}>
                      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10">
                        <Icon.Spinner className="h-6 w-6 text-violet-400" />
                      </div>
                      <span className="text-[12px] font-semibold text-white/60">Generating video</span>
                      <span className="mt-1 text-[11px] text-white/25">Scene {String(activeScene).padStart(2, "0")} &middot; Turning your visual into motion...</span>
                    </div>
                  ) : currentScene && sceneVideos[currentScene.id] ? (
                    <video
                      src={sceneVideos[currentScene.id]}
                      controls
                      className="aspect-video w-full object-cover bg-black"
                      poster={sceneImages[currentScene.id]}
                    />
                  ) : currentScene && sceneImages[currentScene.id] ? (
                    <img src={sceneImages[currentScene.id]} alt={currentScene.title} className="aspect-video w-full object-cover" />
                  ) : (
                    <div className="flex aspect-video flex-col items-center justify-center" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)", backgroundSize: "24px 24px" }}>
                      <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03]">
                        <Icon.Image className="text-white/15" />
                      </div>
                      <span className="text-[13px] font-medium text-white/35">Generate a visual for this scene</span>
                      <span className="mt-1.5 text-[11px] text-white/20">Turn the scene description into a cinematic visual.</span>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                {currentScene && (
                  <div className="flex gap-2">
                    <button onClick={() => startImageGeneration(currentScene.id)} disabled={sceneStatus[currentScene.id] === "image"}
                      className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-[12px] font-medium text-white/60 transition-all hover:bg-white/[0.08] hover:text-white/80 active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100">
                      {sceneStatus[currentScene.id] === "image" ? (<><Icon.Spinner className="h-3.5 w-3.5 animate-spin" />Generating image...</>) : sceneImages[currentScene.id] ? "Regenerate Image" : "Generate Image"}
                    </button>
                    <button onClick={() => startVideoGeneration(currentScene.id)} disabled={sceneStatus[currentScene.id] === "video"}
                      className="flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-[12px] font-semibold text-black transition-all hover:bg-white/90 active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100">
                      {sceneStatus[currentScene.id] === "video" ? (<><Icon.Spinner className="h-3.5 w-3.5 animate-spin" />Generating video...</>) : sceneVideos[currentScene.id] ? "Regenerate Video" : "Generate Video"}
                    </button>
                  </div>
                )}

                {error && <div className="rounded-lg border border-red-500/20 bg-red-500/[0.07] px-4 py-3 text-[13px] text-red-300/90">{error}</div>}
              </div>

              {/* RIGHT -- Scene Details + Settings */}
              <div className="space-y-4">
                {currentScene && (<>
                  {/* Scene title */}
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                    <div className="mb-2 flex items-center justify-between">
                      <label className="text-[11px] font-medium uppercase tracking-wider text-white/30">Scene title</label>
                    </div>
                    <input value={currentScene.title} onChange={(e) => updateScene(currentScene.id, "title", e.target.value)} className="w-full rounded-lg border border-white/[0.08] bg-[#0c0d12] px-3 py-2.5 text-[14px] font-medium text-white/80 outline-none transition-all focus:border-white/[0.18]" />
                  </div>

                  {/* Narration */}
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                    <div className="mb-2 flex items-center justify-between">
                      <label className="text-[11px] font-medium uppercase tracking-wider text-white/30">Narration</label>
                      <button onClick={() => copyToClipboard(currentScene.narration, "narration")} aria-label="Copy narration" className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-white/25 transition-colors hover:bg-white/[0.06] hover:text-white/50">
                        {copiedField === "narration" ? <><Icon.Check className="text-emerald-400" /><span className="text-emerald-400">Copied</span></> : <><Icon.Copy /><span>Copy</span></>}
                      </button>
                    </div>
                    <textarea value={currentScene.narration} onChange={(e) => updateScene(currentScene.id, "narration", e.target.value)} rows={5} className="w-full resize-y rounded-lg border border-white/[0.08] bg-[#0c0d12] p-3 text-[13px] leading-relaxed text-white/60 outline-none transition-all focus:border-white/[0.18]" />
                  </div>

                  {/* Visual prompt */}
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                    <div className="mb-2 flex items-center justify-between">
                      <label className="text-[11px] font-medium uppercase tracking-wider text-white/30">Visual prompt</label>
                      <button onClick={() => copyToClipboard(currentScene.visual, "visual")} aria-label="Copy visual prompt" className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-white/25 transition-colors hover:bg-white/[0.06] hover:text-white/50">
                        {copiedField === "visual" ? <><Icon.Check className="text-emerald-400" /><span className="text-emerald-400">Copied</span></> : <><Icon.Copy /><span>Copy</span></>}
                      </button>
                    </div>
                    <textarea value={currentScene.visual} onChange={(e) => updateScene(currentScene.id, "visual", e.target.value)} rows={4} className="w-full resize-y rounded-lg border border-white/[0.08] bg-[#0c0d12] p-3 text-[13px] leading-relaxed text-white/45 outline-none transition-all focus:border-white/[0.18]" />
                  </div>

                  {/* Video Settings */}
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                    <div className="mb-4">
                      <div className="text-[13px] font-medium text-white/70">Video settings</div>
                      <div className="mt-0.5 text-[11px] text-white/25">Configure your final video.</div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-white/30">Aspect Ratio</label>
                        <div className="grid grid-cols-3 gap-1 rounded-lg bg-[#0c0d12] p-1">
                          {["9:16", "16:9", "1:1"].map((ratio) => (
                            <button key={ratio} onClick={() => setAspectRatio(ratio)} className={`rounded-md py-1.5 text-[11px] font-medium transition-all ${aspectRatio === ratio ? "bg-white text-black shadow-sm" : "text-white/30 hover:text-white/50"}`}>{ratio}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-white/30">Voice</label>
                        <div className="grid grid-cols-3 gap-1 rounded-lg bg-[#0c0d12] p-1">
                          {["Natural", "Deep", "Soft"].map((v) => (
                            <button key={v} onClick={() => setVoice(v)} className={`rounded-md py-1.5 text-[11px] font-medium transition-all ${voice === v ? "bg-white text-black shadow-sm" : "text-white/30 hover:text-white/50"}`}>{v}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-white/30">Captions</label>
                        <button onClick={() => setCaptions(!captions)} className="flex w-full items-center justify-between rounded-lg border border-white/[0.08] bg-[#0c0d12] px-3 py-2.5 text-[12px] transition-all hover:border-white/[0.12]">
                          <span className="text-white/50">Auto captions</span>
                          <span className={`rounded px-2 py-0.5 text-[10px] font-bold transition-colors ${captions ? "bg-white text-black" : "bg-white/[0.08] text-white/30"}`}>{captions ? "ON" : "OFF"}</span>
                        </button>
                      </div>
                      <div>
                        <label className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-white/30">Background Music</label>
                        <div className="grid grid-cols-2 gap-1 rounded-lg bg-[#0c0d12] p-1">
                          {["None", "Ambient", "Cinematic", "Emotional"].map((m) => (
                            <button key={m} onClick={() => setMusic(m)} className={`rounded-md py-1.5 text-[11px] font-medium transition-all ${music === m ? "bg-white text-black shadow-sm" : "text-white/30 hover:text-white/50"}`}>{m}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Render Panel */}
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-[11px] font-medium uppercase tracking-wider text-white/30">Render</span>
                      <span className="text-[12px] text-white/40">{totalVideosGenerated}/{result.scenes.length} videos</span>
                    </div>
                    <div className="mb-4 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${renderProgress === 100 ? "bg-emerald-400" : rendering ? "bg-blue-400" : "bg-white/40"}`}
                        style={{ width: `${rendering || finalVideo ? (renderProgress || (totalVideosGenerated / result.scenes.length) * 100) : (totalVideosGenerated / result.scenes.length) * 100}%` }}
                      />
                    </div>
                    <div className="mb-3 flex items-center justify-between text-[11px] text-white/25">
                      <span>Duration: {duration}</span>
                      <span>{totalImagesGenerated} image{totalImagesGenerated !== 1 ? "s" : ""} ready</span>
                    </div>

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

                    <button
                      onClick={finalVideo ? exportVideo : startRender}
                      disabled={rendering || (!finalVideo && totalVideosGenerated < result.scenes.length)}
                      className="w-full rounded-xl bg-gradient-to-b from-white to-white/90 px-4 py-3 text-[13px] font-semibold text-black shadow-[0_2px_16px_-4px_rgba(255,255,255,0.2)] transition-all hover:shadow-[0_4px_24px_-4px_rgba(255,255,255,0.3)] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                    >
                      {rendering ? (
                        <span className="flex items-center justify-center gap-2">
                          <Icon.Spinner className="h-4 w-4" />Rendering... {renderProgress}%
                        </span>
                      ) : finalVideo ? (
                        <span className="flex items-center justify-center gap-2">
                          <Icon.Download />Export Video
                        </span>
                      ) : (
                        "Render Final Video"
                      )}
                    </button>

                    <p className="mt-2.5 text-center text-[11px] text-white/20">
                      {totalVideosGenerated === 0
                        ? "Generate videos for all scenes to enable rendering."
                        : totalVideosGenerated < result.scenes.length
                          ? `${result.scenes.length - totalVideosGenerated} scene${result.scenes.length - totalVideosGenerated !== 1 ? "s" : ""} need${result.scenes.length - totalVideosGenerated === 1 ? "s" : ""} video generation.`
                          : finalVideo
                            ? "Click to download your final video."
                            : "All scenes ready. Click to render."
                      }
                    </p>
                  </div>
                </>)}
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
                    <p className="mt-1 text-[12px] text-white/30">Your complete AI-generated video is ready to export.</p>
                  </div>
                  <button onClick={exportVideo} className="flex items-center gap-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/20 px-4 py-2 text-[13px] font-semibold text-emerald-400 transition-all hover:bg-emerald-500/25 active:scale-[0.98]">
                    <Icon.Download />Export Video
                  </button>
                </div>
                <video src={finalVideo} controls className="w-full max-w-2xl rounded-xl bg-black" />
                <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-white/25">
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
            <div id="timeline" className="mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-[13px] font-medium text-white/60">Timeline</div>
                  <div className="mt-0.5 text-[11px] text-white/25">Arrange your scenes.</div>
                </div>
                <div className="text-[12px] text-white/30">{duration}</div>
              </div>
              <div className="relative mb-3 h-px w-full bg-white/[0.06]">
                <div className="absolute left-0 top-1/2 h-2 w-2 -translate-x-1 -translate-y-1/2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                <div className="absolute left-0 top-1/2 h-px w-1/5 -translate-y-1/2 bg-emerald-400/40" />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-5">
                {result.scenes.map((scene) => (
                  <button key={scene.id} onClick={() => setActiveScene(scene.id)}
                    className={`flex-shrink-0 rounded-xl border p-3 text-left transition-all duration-150 sm:flex-shrink ${activeScene === scene.id ? "border-white/[0.2] bg-white/[0.08] shadow-[0_0_20px_-8px_rgba(255,255,255,0.08)]" : "border-white/[0.06] bg-[#0c0d12] hover:bg-white/[0.04]"}`}>
                    <div className="relative mb-2 flex h-12 items-center justify-center overflow-hidden rounded-lg bg-white/[0.04]">
                      {sceneImages[scene.id] ? (
                        <img src={sceneImages[scene.id]} alt={scene.title} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-[10px] font-medium text-white/20">Scene {scene.id}</span>
                      )}
                      {sceneVideos[scene.id] && (
                        <div className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded bg-blue-500/80">
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                        </div>
                      )}
                    </div>
                    <div className="truncate text-[11px] font-medium text-white/60">{scene.title}</div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ===== PROJECTS ===== */}
        <div id="projects" className="mx-auto mt-14 max-w-5xl">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Your projects</h2>
              <p className="mt-0.5 text-[13px] text-white/30">Continue working on your videos.</p>
            </div>
            <div className="flex items-center gap-3">
              {projects.length > 0 && <span className="text-[11px] text-white/25">{projects.length} project{projects.length !== 1 ? "s" : ""}</span>}
              <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-white/50 transition-all hover:bg-white/[0.08] hover:text-white/70 active:scale-[0.98]">
                <span className="text-[14px] leading-none">+</span> New project
              </button>
            </div>
          </div>
          {projects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.015] p-12 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03]">
                <Icon.Play className="text-white/20" />
              </div>
              <div className="text-[14px] font-medium text-white/40">Your next video starts here.</div>
              <div className="mt-1.5 text-[12px] text-white/25">Generate a story and save your projects to build your creative library.</div>
              <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="mt-5 rounded-lg bg-white/[0.06] px-4 py-2 text-[12px] font-medium text-white/50 transition-all hover:bg-white/[0.1] hover:text-white/70 active:scale-[0.98]">Create New Project</button>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <div key={project.id} className="group rounded-xl border border-white/[0.06] bg-white/[0.015] p-4 transition-all duration-200 hover:border-white/[0.12] hover:bg-white/[0.03] hover:shadow-[0_4px_30px_-12px_rgba(0,0,0,0.4)]">
                  <button onClick={() => loadProject(project)} className="w-full text-left">
                    <div className="flex aspect-video items-center justify-center rounded-lg bg-[#0c0d12]">
                      <Icon.Play className="text-white/10" />
                    </div>
                    <div className="mt-3 truncate text-[13px] font-medium text-white/70">{project.title}</div>
                    <div className="mt-1 text-[11px] text-white/30">{project.language} &middot; {project.style} &middot; {project.duration}</div>
                    {project.createdAt && <div className="mt-1 text-[10px] text-white/20">{new Date(project.createdAt).toLocaleDateString()}</div>}
                  </button>
                  <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-3">
                    <button onClick={() => loadProject(project)} className="flex items-center gap-1 text-[11px] text-white/35 transition-colors hover:text-white/60">
                      <Icon.Folder className="text-white/25" />Open
                    </button>
                    <button onClick={() => deleteProject(project.id)} aria-label="Delete project" className="flex items-center gap-1 text-[11px] text-white/25 transition-colors hover:text-red-400/70">
                      <Icon.Trash />Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
