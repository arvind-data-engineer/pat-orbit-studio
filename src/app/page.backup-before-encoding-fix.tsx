"use client";

import { useEffect, useState } from "react";

type Scene = {
  id: number;
  title: string;
  narration: string;
  visual: string;
  imageUrl?: string;
  videoUrl?: string;
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
};

export default function Home() {
  const [story, setStory] = useState("");
  const [language, setLanguage] = useState("Hindi");
  const [style, setStyle] = useState("Cartoon");
  const [duration, setDuration] = useState("60 sec");

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
    localStorage.setItem(
      "pat-orbit-projects",
      JSON.stringify(nextProjects)
    );
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          story,
          language,
          style,
          duration,
          contentType: "Story",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate story.");
      }

      if (!data.title || !Array.isArray(data.scenes)) {
        throw new Error("AI returned an invalid story.");
      }

      setResult(data);
      setProjectName(data.title);
      setActiveScene(1);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  function updateScene(
    sceneId: number,
    field: "title" | "narration" | "visual",
    value: string
  ) {
    if (!result) return;

    setResult({
      ...result,
      scenes: result.scenes.map((scene) =>
        scene.id === sceneId
          ? {
              ...scene,
              [field]: value,
            }
          : scene
      ),
    });

    setSaved(false);
  }

  function saveCurrentProject() {
    if (!result) return;

    const project: Project = {
      id: crypto.randomUUID(),
      title: projectName || result.title,
      story,
      language,
      style,
      duration,
      result,
      createdAt: new Date().toISOString(),
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
    setActiveScene(1);
    setSaved(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function deleteProject(id: string) {
    const next = projects.filter((project) => project.id !== id);
    saveProjects(next);
  }

  function startImageGeneration(sceneId: number) {
    setSceneStatus((current) => ({
      ...current,
      [sceneId]: "image",
    }));

    setTimeout(() => {
      setSceneStatus((current) => ({
        ...current,
        [sceneId]: "idle",
      }));
    }, 1500);
  }

  function startVideoGeneration(sceneId: number) {
    setSceneStatus((current) => ({
      ...current,
      [sceneId]: "video",
    }));

    setTimeout(() => {
      setSceneStatus((current) => ({
        ...current,
        [sceneId]: "idle",
      }));
    }, 1800);
  }

  const currentScene =
    result?.scenes.find((scene) => scene.id === activeScene) || null;

  return (
    <main className="min-h-screen bg-[#07080d] text-white">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#08090e]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white font-black text-black shadow-lg">
              P
            </div>

            <div>
              <div className="font-semibold tracking-tight">
                PAT Orbit
              </div>
              <div className="text-xs text-white/40">
                Studio
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                document
                  .getElementById("projects")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              className="rounded-lg px-4 py-2 text-sm text-white/60 transition hover:bg-white/5 hover:text-white"
            >
              Projects
            </button>

            <button className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm transition hover:bg-white/10">
              Sign in
            </button>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-6 sm:py-14">
        {!result ? (
          <>
            {/* HERO */}
            <div className="mx-auto mb-10 max-w-4xl text-center">
              <div className="mb-5 inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/60">
                ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¨ AI Video Creation Studio
              </div>

              <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
                Turn your ideas into
                <span className="block text-white/45">
                  amazing videos.
                </span>
              </h1>

              <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/45">
                Create narrated stories, cartoon videos and social
                media content with AI.
              </p>
            </div>

            {/* GENERATOR */}
            <div className="mx-auto max-w-5xl rounded-3xl border border-white/10 bg-white/[0.035] p-5 shadow-2xl sm:p-7">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">
                    Create a video
                  </h2>

                  <p className="mt-1 text-sm text-white/40">
                    Start with an idea and let AI build your story.
                  </p>
                </div>

                <div className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/40">
                  Beta
                </div>
              </div>

              <textarea
                value={story}
                onChange={(e) => {
                  setStory(e.target.value);
                  setError("");
                }}
                placeholder="Example: ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¢ ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â²ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¼ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¾ ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂªÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¨ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¥ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¡ ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂªÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¥ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¾ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¨ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¥ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¡ ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤ÃƒÆ’Ã¢â‚¬Â¹Ãƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â° ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â®ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¥ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¢ ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¹ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¥ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â®ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¥ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤ÃƒÆ’Ã¢â‚¬Â¹Ãƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¼ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¥ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¥ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¹ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¾ ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¹ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¥ÃƒÆ’Ã¢â‚¬Â¹ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â  ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¥ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¹ ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â®ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¯ ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¥ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¹ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¢ ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¥ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¹ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¥ÃƒÆ’Ã¢â‚¬Â¹ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ..."
                className="h-44 w-full resize-none rounded-2xl border border-white/10 bg-black/20 p-5 text-sm leading-7 outline-none transition placeholder:text-white/25 focus:border-white/30"
              />

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-xs text-white/40">
                    Language
                  </label>

                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#101117] px-4 py-3 text-sm outline-none"
                  >
                    <option>Hindi</option>
                    <option>Hinglish</option>
                    <option>English</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs text-white/40">
                    Visual style
                  </label>

                  <select
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#101117] px-4 py-3 text-sm outline-none"
                  >
                    <option>Cartoon</option>
                    <option>Cinematic</option>
                    <option>Anime</option>
                    <option>Realistic</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs text-white/40">
                    Duration
                  </label>

                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#101117] px-4 py-3 text-sm outline-none"
                  >
                    <option>30 sec</option>
                    <option>60 sec</option>
                    <option>90 sec</option>
                  </select>
                </div>
              </div>

              {error && (
                <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
                  {error}
                </div>
              )}

              <button
                onClick={generateStory}
                disabled={loading}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                    Generating Story...
                  </>
                ) : (
                  <>ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¨ Generate Story</>
                )}
              </button>

              <p className="mt-3 text-center text-xs text-white/25">
                AI will create 5 scenes with narration and visual
                prompts.
              </p>
            </div>
          </>
        ) : (
          <>
            {/* WORKSPACE HEADER */}
            <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <button
                  onClick={() => setResult(null)}
                  className="mb-4 text-sm text-white/40 transition hover:text-white"
                >
                  ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â Back to creator
                </button>

                <input
                  value={projectName}
                  onChange={(e) => {
                    setProjectName(e.target.value);
                    setSaved(false);
                  }}
                  className="w-full max-w-2xl bg-transparent text-3xl font-bold tracking-tight outline-none sm:text-4xl"
                />

                <p className="mt-2 text-sm text-white/40">
                  {result.scenes.length} scenes ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· {language} ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â·{" "}
                  {style} ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· {duration}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={saveCurrentProject}
                  className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm transition hover:bg-white/10"
                >
                  {saved ? "ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“ Saved" : "Save Project"}
                </button>

                <button className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90">
                  Export
                </button>
              </div>
            </div>

            {/* WORKSPACE */}
            <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
              {/* SCENES */}
              <div className="space-y-5">
                {result.scenes.map((scene) => (
                  <div
                    key={scene.id}
                    className={`overflow-hidden rounded-3xl border transition ${
                      activeScene === scene.id
                        ? "border-white/20 bg-white/[0.055]"
                        : "border-white/10 bg-white/[0.025]"
                    }`}
                  >
                    <button
                      onClick={() => setActiveScene(scene.id)}
                      className="flex w-full items-center justify-between border-b border-white/10 px-5 py-4 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-xs font-bold text-black">
                          {scene.id}
                        </div>

                        <div>
                          <div className="text-sm font-semibold">
                            Scene {scene.id}
                          </div>
                          <div className="text-xs text-white/35">
                            {scene.title}
                          </div>
                        </div>
                      </div>

                      <span className="text-xs text-white/30">
                        {sceneStatus[scene.id] === "image"
                          ? "Generating image..."
                          : sceneStatus[scene.id] === "video"
                            ? "Generating video..."
                            : "Ready"}
                      </span>
                    </button>

                    <div className="grid gap-5 p-5 lg:grid-cols-[220px_1fr]">
                      {/* PREVIEW */}
                      <div className="flex aspect-video items-center justify-center rounded-2xl border border-white/10 bg-[#111219]">
                        <div className="text-center">
                          <div className="mb-2 text-3xl">
                            ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â½ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬
                          </div>
                          <div className="text-xs text-white/30">
                            Scene preview
                          </div>
                        </div>
                      </div>

                      {/* CONTENT */}
                      <div>
                        <input
                          value={scene.title}
                          onChange={(e) =>
                            updateScene(
                              scene.id,
                              "title",
                              e.target.value
                            )
                          }
                          className="mb-4 w-full bg-transparent text-lg font-semibold outline-none"
                        />

                        <div className="mb-4">
                          <label className="mb-2 block text-xs font-medium text-white/40">
                            Narration
                          </label>

                          <textarea
                            value={scene.narration}
                            onChange={(e) =>
                              updateScene(
                                scene.id,
                                "narration",
                                e.target.value
                              )
                            }
                            className="min-h-28 w-full resize-y rounded-xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-white/75 outline-none focus:border-white/25"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-xs font-medium text-white/40">
                            Visual prompt
                          </label>

                          <textarea
                            value={scene.visual}
                            onChange={(e) =>
                              updateScene(
                                scene.id,
                                "visual",
                                e.target.value
                              )
                            }
                            className="min-h-24 w-full resize-y rounded-xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-white/55 outline-none focus:border-white/25"
                          />
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            onClick={() =>
                              startImageGeneration(scene.id)
                            }
                            disabled={
                              sceneStatus[scene.id] === "image"
                            }
                            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-medium transition hover:bg-white/10 disabled:opacity-50"
                          >
                            Generate Image
                          </button>

                          <button
                            onClick={() =>
                              startVideoGeneration(scene.id)
                            }
                            disabled={
                              sceneStatus[scene.id] === "video"
                            }
                            className="rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-black transition hover:bg-white/90 disabled:opacity-50"
                          >
                            Generate Video
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* RIGHT PANEL */}
              <aside className="h-fit rounded-3xl border border-white/10 bg-white/[0.035] p-5 xl:sticky xl:top-24">
                <div className="mb-5">
                  <div className="text-sm font-semibold">
                    Video settings
                  </div>

                  <div className="mt-1 text-xs text-white/35">
                    Configure your final video.
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-xs text-white/40">
                      Aspect ratio
                    </label>

                    <select
                      className="w-full rounded-xl border border-white/10 bg-[#101117] px-4 py-3 text-sm outline-none"
                    >
                      <option>9:16 Â· Shorts / Reels</option>
                      <option>16:9 Â· YouTube</option>
                      <option>1:1 Â· Social</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs text-white/40">
                      Voice
                    </label>

                    <select
                      className="w-full rounded-xl border border-white/10 bg-[#101117] px-4 py-3 text-sm outline-none"
                    >
                      <option>AI Voice Â· Natural</option>
                      <option>AI Voice Â· Deep</option>
                      <option>AI Voice Â· Soft</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs text-white/40">
                      Captions
                    </label>

                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-[#101117] px-4 py-3 text-sm transition hover:bg-white/5"
                    >
                      <span>Auto captions</span>

                      <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-black">
                        ON
                      </span>
                    </button>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs text-white/40">
                      Background music
                    </label>

                    <select
                      className="w-full rounded-xl border border-white/10 bg-[#101117] px-4 py-3 text-sm outline-none"
                    >
                      <option>None</option>
                      <option>Ambient</option>
                      <option>Cinematic</option>
                      <option>Emotional</option>
                    </select>
                  </div>
                </div>
                <div className="my-6 border-t border-white/10" />

                <div className="mb-4">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/40">
                      Scenes
                    </span>
                    <span>{result.scenes.length}/5</span>
                  </div>

                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-white"
                      style={{
                        width: `${
                          (result.scenes.length / 5) * 100
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <button className="w-full rounded-2xl bg-white px-5 py-4 font-semibold text-black transition hover:bg-white/90">
                  ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¨ Render Final Video
                </button>

                <p className="mt-3 text-center text-xs text-white/25">
                  Rendering will be enabled after media generation.
                </p>
              </aside>
            </div>

            {/* TIMELINE */}
            <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.035] p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">
                    Timeline
                  </div>

                  <div className="text-xs text-white/35">
                    Arrange your scenes.
                  </div>
                </div>

                <div className="text-xs text-white/30">
                  {duration}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-5">
                {result.scenes.map((scene) => (
                  <button
                    key={scene.id}
                    onClick={() => setActiveScene(scene.id)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      activeScene === scene.id
                        ? "border-white/30 bg-white/10"
                        : "border-white/10 bg-black/20 hover:bg-white/5"
                    }`}
                  >
                    <div className="mb-3 flex h-16 items-center justify-center rounded-xl bg-[#17181f] text-2xl">
                      ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â½ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¾ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â
                    </div>

                    <div className="text-xs font-semibold">
                      Scene {scene.id}
                    </div>

                    <div className="mt-1 truncate text-[11px] text-white/35">
                      {scene.title}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* ACTIVE SCENE QUICK VIEW */}
            {currentScene && (
              <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.025] p-6">
                <div className="text-xs uppercase tracking-widest text-white/30">
                  Active scene
                </div>

                <h3 className="mt-2 text-xl font-semibold">
                  {currentScene.title}
                </h3>

                <p className="mt-3 max-w-3xl text-sm leading-7 text-white/45">
                  {currentScene.narration}
                </p>
              </div>
            )}
          </>
        )}

        {/* PROJECTS */}
        <div id="projects" className="mx-auto mt-16 max-w-5xl">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">
                Recent projects
              </h2>

              <p className="mt-1 text-sm text-white/35">
                Your saved PAT Orbit Studio projects.
              </p>
            </div>

            {projects.length > 0 && (
              <span className="text-xs text-white/30">
                {projects.length} project
                {projects.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {projects.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
              <div className="text-3xl">ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â½ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬</div>

              <div className="mt-3 text-sm font-medium">
                No saved projects yet
              </div>

              <div className="mt-1 text-xs text-white/30">
                Generate a story and save it here.
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="group rounded-2xl border border-white/10 bg-white/[0.025] p-4 transition hover:border-white/20 hover:bg-white/[0.045]"
                >
                  <button
                    onClick={() => loadProject(project)}
                    className="w-full text-left"
                  >
                    <div className="flex aspect-video items-center justify-center rounded-xl bg-[#111219] text-3xl">
                      ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â½ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬
                    </div>

                    <div className="mt-4 truncate font-medium">
                      {project.title}
                    </div>

                    <div className="mt-1 text-xs text-white/35">
                      {project.language} ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· {project.style} ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â·{" "}
                      {project.duration}
                    </div>
                  </button>

                  <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
                    <button
                      onClick={() => loadProject(project)}
                      className="text-xs text-white/50 transition hover:text-white"
                    >
                      Open project
                    </button>

                    <button
                      onClick={() => deleteProject(project.id)}
                      className="text-xs text-red-400/60 transition hover:text-red-400"
                    >
                      Delete
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



