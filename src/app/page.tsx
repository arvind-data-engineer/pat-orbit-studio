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
/*  Small reusable SVG icons (keeps things emoji-free & encoding-safe) */
/* ------------------------------------------------------------------ */
const Icon = {
  ArrowLeft: (p: { className?: string }) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
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
};

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

  /* New UI-only state */
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

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
    setSceneVideos({}); /* Videos are session-only — too large for localStorage */
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

      /* Pass the scene image as visual reference if available */
      if (sceneImages[sceneId]) {
        body.image = sceneImages[sceneId];
      }

      const response = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate video.");
      }

      if (data.video) {
        /* Inline base64 video */
        setSceneVideos((c) => ({ ...c, [sceneId]: data.video }));
      } else if (data.videoUri) {
        /* URI-based video */
        setSceneVideos((c) => ({ ...c, [sceneId]: data.videoUri }));
      } else {
        throw new Error("No video was returned.");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate video."
      );
    } finally {
      setSceneStatus((c) => ({ ...c, [sceneId]: "idle" }));
    }
  }

  /* ---- Render Final Video ---- */
  const totalVideosGenerated = Object.keys(sceneVideos).length;

  async function startRender() {
    if (!result || totalVideosGenerated < result.scenes.length) return;

    setRendering(true);
    setRenderStage("Preparing scenes...");
    setRenderProgress(5);
    setError("");
    setFinalVideo(null);

    try {
      /* ---- Stage 1: Generate voice audio for each scene ---- */
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
              body: JSON.stringify({
                narration: s.narration,
                language,
                voice,
              }),
            });

            const voiceData = await voiceResp.json();
            if (voiceResp.ok && voiceData.audio) {
              voiceAudios[s.id] = voiceData.audio;
            }
          } catch {
            /* Voice generation failure is non-fatal; continue without voice */
          }
        }
      }

      /* ---- Stage 2: Prepare captions data ---- */
      setRenderStage("Preparing captions...");
      setRenderProgress(40);

      const scenesPayload = result.scenes.map((s) => ({
        id: s.id,
        video: sceneVideos[s.id] || "",
        narration: captions ? s.narration : undefined,
      }));

      /* ---- Stage 3: Render with FFmpeg ---- */
      setRenderStage("Mixing audio & rendering...");
      setRenderProgress(50);

      const response = await fetch("/api/render-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenes: scenesPayload,
          aspectRatio,
          captions,
          music,
          voiceAudios,
        }),
      });

      setRenderStage("Finalizing...");
      setRenderProgress(90);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to render video.");
      }

      if (!data.video) {
        throw new Error("No video was returned from render.");
      }

      setFinalVideo(data.video);
      setRenderStage("Complete");
      setRenderProgress(100);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to render video."
      );
      setRenderStage("Render failed");
      setRenderProgress(0);
    } finally {
      setRendering(false);
    }
  }

  /* ---- Export / Download ---- */
  function exportVideo() {
    if (!finalVideo) return;

    const link = document.createElement("a");
    link.href = finalVideo;

    /* Sanitize project name for filename */
    const safeName = (projectName || "pat-orbit-video")
      .replace(/[^a-zA-Z0-9\s\-_]/g, "")
      .replace(/\s+/g, "-")
      .toLowerCase();
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

  return (
    <main className="min-h-screen bg-[#08090c] text-white">
      {/* ========== HEADER ========== */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#08090c]/80 backdrop-blur-2xl">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-4 sm:px-6">
          {/* Logo */}
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

          {/* Center nav */}
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

          {/* Right actions */}
          <div className="flex items-center gap-1.5">
            {result && (
              <>
                <button onClick={saveCurrentProject} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium text-white/50 transition-colors hover:bg-white/[0.05] hover:text-white/70">
                  <Icon.Folder className="text-white/30" />
                  {saved ? "Saved" : "Save"}
                </button>
                <button className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[12px] font-medium text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white/80">
                  <Icon.Download className="text-white/40" />
                  Export
                </button>
              </>
            )}

            {/* Settings dropdown */}
            <div ref={settingsRef} className="relative">
              <button
                onClick={() => setSettingsOpen(!settingsOpen)}
                aria-label="Settings"
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-white/40 transition-colors hover:bg-white/[0.08] hover:text-white/60"
              >
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
            <div className="mx-auto mb-12 max-w-3xl text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-1.5 text-[11px] font-medium uppercase tracking-widest text-white/40">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
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

            {/* ===== CREATE CARD ===== */}
            <div className="mx-auto max-w-3xl rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 shadow-[0_0_80px_-20px_rgba(255,255,255,0.03)] sm:p-8">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">Create a video</h2>
                  <p className="mt-0.5 text-[13px] text-white/30">Start with an idea and let AI build your story.</p>
                </div>
                <span className="rounded-md bg-white/[0.05] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/30">Beta</span>
              </div>

              {/* Textarea with glow */}
              <div className="relative group">
                <div className="absolute -inset-px rounded-xl bg-gradient-to-b from-white/[0.06] to-transparent opacity-0 transition-opacity group-focus-within:opacity-100" />
                <textarea
                  value={story}
                  onChange={(e) => { setStory(e.target.value); setError(""); }}
                  placeholder="Describe your video idea..."
                  rows={6}
                  className="relative w-full resize-none rounded-xl border border-white/[0.08] bg-[#0c0d12] p-5 text-[14px] leading-relaxed text-white/80 outline-none transition-all placeholder:text-white/20 focus:border-white/[0.18] focus:shadow-[0_0_30px_-10px_rgba(255,255,255,0.08)]"
                />
                <span className="absolute bottom-3 right-4 text-[11px] text-white/15 tabular-nums">{story.length}</span>
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

              <button onClick={generateStory} disabled={loading} className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-b from-white to-white/90 px-6 py-3.5 text-[14px] font-semibold text-black shadow-[0_2px_20px_-4px_rgba(255,255,255,0.25)] transition-all hover:shadow-[0_4px_30px_-4px_rgba(255,255,255,0.35)] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none">
                {loading ? (<><Icon.Spinner />Generating story...</>) : "Generate Story"}
              </button>
              <p className="mt-3 text-center text-[11px] text-white/20">AI will create 5 scenes with narration and visual prompts.</p>
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

                  {currentScene && sceneVideos[currentScene.id] ? (
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
                      <span className="text-[13px] font-medium text-white/25">Scene preview</span>
                      <span className="mt-1 text-[11px] text-white/15">Generate an image to visualize this scene</span>
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

                    {/* Render stage indicator */}
                    {rendering && renderStage && (
                      <div className="mb-3 flex items-center gap-2 rounded-lg bg-blue-500/10 px-3 py-2">
                        <Icon.Spinner className="h-3 w-3 animate-spin text-blue-400" />
                        <span className="text-[11px] font-medium text-blue-400">{renderStage}</span>
                      </div>
                    )}

                    {/* Final video ready indicator */}
                    {finalVideo && !rendering && (
                      <div className="mb-3 flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><polyline points="20 6 9 17 4 12" /></svg>
                        <span className="text-[11px] font-medium text-emerald-400">Final video ready</span>
                      </div>
                    )}

                    {/* Render button */}
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

            {/* ===== FINAL VIDEO PREVIEW ===== */}
            {finalVideo && (
              <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.03] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                    <span className="text-[13px] font-medium text-emerald-400">Final Video</span>
                  </div>
                  <button onClick={exportVideo} className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-medium text-emerald-400 transition-all hover:bg-emerald-500/20">
                    <Icon.Download className="text-emerald-400" />Download
                  </button>
                </div>
                <video
                  src={finalVideo}
                  controls
                  className="w-full max-w-2xl rounded-xl bg-black"
                />
                <p className="mt-2 text-center text-[11px] text-white/25">
                  {result.scenes.length} scenes combined &middot; {duration}
                </p>
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
              {/* Playhead indicator */}
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
              <h2 className="text-lg font-semibold tracking-tight">Recent projects</h2>
              <p className="mt-0.5 text-[13px] text-white/30">Continue working on your videos.</p>
            </div>
            {projects.length > 0 && <span className="text-[11px] text-white/25">{projects.length} project{projects.length !== 1 ? "s" : ""}</span>}
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
