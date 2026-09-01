"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import { TEMPLATES, type StoryResult } from "./types";

interface CreateScreenProps {
  story: string;
  setStory: (v: string) => void;
  style: string;
  setStyle: (v: string) => void;
  duration: string;
  setDuration: (v: string) => void;
  aspectRatio: string;
  setAspectRatio: (v: string) => void;
  voice: string;
  setVoice: (v: string) => void;
  language: string;
  setLanguage: (v: string) => void;
  loading: boolean;
  error: string;
  loadingStep: number;
  result: StoryResult | null;
  projects: { id: string; title?: string; result: StoryResult; sceneImages?: Record<number, string> }[];
  onGenerate: () => void;
  onLoadProject: (p: { id: string; result: StoryResult; [k: string]: unknown }) => void;
  onScrollToProjects: () => void;
}

const SUGGESTIONS = [
  "A cinematic night drive through Tokyo in the rain",
  "An astronaut discovers an abandoned city on Mars",
  "A street magician performs an impossible trick",
  "Two strangers meet at a train station in winter",
];

/* Cinematic gradient frames for empty state — no fake images, just visual framing */
const CINEMATIC_FRAMES = [
  { gradient: "from-indigo-900/40 via-slate-900/60 to-black", label: "The Arrival", aspect: "16/9" },
  { gradient: "from-amber-900/30 via-stone-900/50 to-black", label: "Golden Hour", aspect: "9/16" },
  { gradient: "from-cyan-900/30 via-slate-900/50 to-black", label: "Deep Blue", aspect: "16/9" },
  { gradient: "from-rose-900/30 via-slate-900/50 to-black", label: "Last Light", aspect: "16/9" },
  { gradient: "from-emerald-900/30 via-slate-900/50 to-black", label: "Into the Wild", aspect: "16/9" },
  { gradient: "from-violet-900/30 via-slate-900/50 to-black", label: "Neon Dreams", aspect: "9/16" },
];

export function CreateScreen({
  story, setStory, style, setStyle, duration, setDuration,
  aspectRatio, setAspectRatio, voice, setVoice, language, setLanguage,
  loading, error, loadingStep, result, projects,
  onGenerate, onLoadProject, onScrollToProjects,
}: CreateScreenProps) {
  const [focused, setFocused] = useState(false);

  const loadingSteps = [
    { label: "Analyzing your idea", done: loadingStep >= 1 },
    { label: "Building scenes", done: loadingStep >= 2 },
    { label: "Writing narration", done: loadingStep >= 3 },
    { label: "Preparing visual prompts", done: loading },
  ];

  /* Collect all generated images from existing projects for the visual gallery */
  const projectImages = projects
    .flatMap((p) => {
      if (!p.sceneImages) return [];
      return Object.values(p.sceneImages).slice(0, 2);
    })
    .slice(0, 8);

  const hasVisualContent = projectImages.length > 0;

  return (
    <div className="min-h-[calc(100vh-48px)] flex flex-col">
      {/* ── Visual gallery strip — shows what this product creates ── */}
      {hasVisualContent && (
        <div className="w-full border-b border-white/[0.03] bg-[#060709]">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 py-4">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {projectImages.map((img, i) => (
                <div key={i} className="relative flex-shrink-0 w-40 sm:w-56 aspect-video rounded-lg overflow-hidden bg-[#0a0b0f]">
                  <img src={img} alt="" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Visual showcase — above the fold, tells user this is video ── */}
      {!hasVisualContent && (
        <div className="w-full border-b border-white/[0.03] bg-[#060709]">
          <div className="mx-auto max-w-5xl px-5 sm:px-8 py-5">
            <div className="flex gap-2 sm:gap-3 justify-center">
              {CINEMATIC_FRAMES.slice(0, 5).map((frame, i) => (
                <div
                  key={i}
                  className={`relative flex-shrink-0 rounded-lg overflow-hidden bg-gradient-to-b ${frame.gradient} ${
                    i % 3 === 1 ? "w-16 sm:w-24 aspect-[9/16]" : "w-24 sm:w-40 aspect-video"
                  }`}
                >
                  <div className="absolute inset-0 border border-white/[0.04] rounded-lg" />
                  <div className="absolute bottom-0 inset-x-0 p-1.5 sm:p-2">
                    <span className="text-[8px] sm:text-[9px] font-medium text-white/18">{frame.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Hero area ── */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-5 sm:px-8 py-12 sm:py-20">
          <div className="w-full max-w-3xl">
            {/* ── Headline — cinematic, not generic ── */}
            <div className="text-center mb-10">
              <h1 className="text-4xl sm:text-5xl lg:text-[60px] font-bold tracking-tight text-white/95 leading-[1.08]">
                Turn your idea into
                <br />
                <span className="text-white">a video</span>
              </h1>
              <p className="mt-4 text-[15px] sm:text-[17px] text-white/28 max-w-md mx-auto leading-relaxed">
                Describe a scene. We create visuals, motion, and voice.
              </p>
            </div>

            {/* ── Prompt composer — the dominant visual element ── */}
            <div className={`relative rounded-2xl border transition-all duration-300 ${focused ? "border-white/[0.12] shadow-[0_0_60px_rgba(255,255,255,0.02)]" : "border-white/[0.05]"} bg-[#0d0e13]`}>
              {/* Textarea — large and dominant */}
              <div className="px-6 sm:px-8 pt-7 pb-3">
                <textarea
                  value={story}
                  onChange={(e) => setStory(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder="Describe the video you want to create..."
                  rows={5}
                  maxLength={1500}
                  className="prompt-input"
                />
              </div>

              {/* Suggestions — appear when empty */}
              {!story && !loading && (
                <div className="px-6 sm:px-8 pb-5 flex flex-wrap gap-2 stagger-children">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => { setStory(s); setFocused(true); }}
                      className="rounded-lg border border-white/[0.04] bg-white/[0.012] px-3.5 py-2 text-[13px] text-white/28 transition-all hover:border-white/[0.08] hover:bg-white/[0.03] hover:text-white/50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {/* Character count */}
              {story && (
                <div className="px-6 sm:px-8 pb-2 flex justify-end">
                  <span className="text-[11px] text-white/10 tabular-nums">{story.length}/1500</span>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="mx-6 sm:mx-8 mb-3 rounded-xl bg-red-500/[0.06] border border-red-500/[0.10] px-4 py-3 text-[13px] text-red-300/80">
                  {error}
                </div>
              )}

              {/* Loading steps */}
              {loading && (
                <div className="mx-6 sm:mx-8 mb-5 space-y-2.5 animate-fade-in">
                  {loadingSteps.map((step, i) => (
                    <div key={i} className="flex items-center gap-3">
                      {step.done ? (
                        <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
                          <Icon.Check className="h-2.5 w-2.5 text-emerald-400" />
                        </span>
                      ) : i === loadingStep + 1 ? (
                        <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center">
                          <Icon.Spinner className="h-3.5 w-3.5 animate-spin text-white/40" />
                        </span>
                      ) : (
                        <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-white/[0.06]">
                          <span className="h-0.5 w-0.5 rounded-full bg-white/10" />
                        </span>
                      )}
                      <span className={`text-[13px] font-medium transition-colors ${step.done ? "text-white/15 line-through" : i === loadingStep + 1 ? "text-white/60" : "text-white/25"}`}>
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Bottom bar: settings + Generate */}
              <div className="border-t border-white/[0.03] px-6 sm:px-8 py-4 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
                {/* Minimal inline settings */}
                <div className="flex items-center gap-4 flex-wrap">
                  <InlineSelect value={style} onChange={setStyle} options={["Cinematic", "Anime", "Cartoon", "Realistic", "3D"]} />
                  <InlineSelect value={duration} onChange={setDuration} options={["30s", "60s", "90s"]} />
                  <InlineSelect value={aspectRatio} onChange={setAspectRatio} options={["16:9", "9:16", "1:1"]} />
                </div>

                {/* Generate button — full width on mobile, dominant */}
                <button
                  onClick={onGenerate}
                  disabled={!story.trim() || loading}
                  className="flex items-center justify-center gap-2.5 rounded-xl bg-white px-7 py-3 text-[15px] font-semibold text-[#0a0b0f] transition-all hover:bg-white/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-15 w-full sm:w-auto"
                >
                  {loading ? (
                    <><Icon.Spinner className="h-4 w-4 animate-spin" />Creating...</>
                  ) : (
                    <>Generate video</>
                  )}
                </button>
              </div>
            </div>



            {/* ── Templates — shown below visual showcase ── */}
            <div className="mt-10">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/18 mb-4">Start with a template</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 stagger-children">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.label}
                    onClick={() => { setStory(t.text); setStyle(t.style); setDuration(t.duration); setAspectRatio(t.aspectRatio); }}
                    className="group text-left rounded-xl border border-white/[0.04] bg-[#0d0e13] p-4 transition-all hover:border-white/[0.08] hover:bg-[#12131a]"
                  >
                    <div className="text-xl mb-2">{t.icon}</div>
                    <div className="text-[13px] font-semibold text-white/60 group-hover:text-white/85 transition-colors">{t.label}</div>
                    <div className="mt-1 text-[11px] text-white/22 leading-relaxed line-clamp-2">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Recent projects ── */}
            {projects.length > 0 && (
              <div className="mt-14 mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/18">Recent projects</h2>
                  <button onClick={onScrollToProjects} className="text-[12px] text-white/25 hover:text-white/50 transition-colors">
                    View all →
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {projects.slice(0, 3).map((p) => {
                    const sc = p.result?.scenes?.length || 0;
                    const firstImg = p.sceneImages ? Object.values(p.sceneImages)[0] : null;
                    return (
                      <button
                        key={p.id}
                        onClick={() => onLoadProject(p as never)}
                        className="group rounded-xl border border-white/[0.04] bg-[#0d0e13] overflow-hidden text-left transition-all hover:border-white/[0.08]"
                      >
                        <div className="relative aspect-video bg-[#08090c]">
                          {firstImg ? (
                            <img src={firstImg} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <Icon.Film className="h-8 w-8 text-white/[0.06]" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="p-3">
                          <div className="truncate text-[13px] font-semibold text-white/65 group-hover:text-white transition-colors">{p.title || "Untitled"}</div>
                          <div className="mt-0.5 text-[11px] text-white/20">{sc} scenes</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Inline select — minimal, not native dropdown ── */
function InlineSelect({ value, onChange, options }: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-transparent text-[12px] font-medium text-white/40 outline-none cursor-pointer hover:text-white/60 transition-colors border-none pr-5"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='6' height='4' fill='none'%3E%3Cpath d='M1 1l2 2 2-2' stroke='rgba(255,255,255,0.2)' stroke-width='1' stroke-linecap='round'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 0 center" }}
      >
        {options.map((opt) => (
          <option key={opt} value={opt} className="bg-[#111218] text-white">{opt}</option>
        ))}
      </select>
    </div>
  );
}
