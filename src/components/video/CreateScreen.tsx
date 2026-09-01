"use client";

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
  projects: { id: string; title?: string; result: StoryResult }[];
  onGenerate: () => void;
  onLoadProject: (p: { id: string; result: StoryResult; [k: string]: unknown }) => void;
  onScrollToProjects: () => void;
}

export function CreateScreen({
  story, setStory, style, setStyle, duration, setDuration,
  aspectRatio, setAspectRatio, voice, setVoice, language, setLanguage,
  loading, error, loadingStep, result, projects,
  onGenerate, onLoadProject, onScrollToProjects,
}: CreateScreenProps) {
  const loadingSteps = [
    { label: "Analyzing your idea", done: loadingStep >= 1 },
    { label: "Building scenes", done: loadingStep >= 2 },
    { label: "Writing narration", done: loadingStep >= 3 },
    { label: "Preparing visual prompts", done: loading },
  ];

  return (
    <div className="relative min-h-screen bg-[#0a0b0e]">
      {/* ── Cinematic background ── */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0b0e] via-[#0d0e14] to-[#0a0b0e]" />
        {/* Subtle radial glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-[radial-gradient(ellipse_at_center,_rgba(99,102,241,0.04)_0%,_transparent_70%)]" />
        {/* Film grain overlay */}
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`, backgroundSize: '200px 200px' }} />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl px-4 pt-12 pb-24 sm:pt-20">
        {/* ── Brand ── */}
        <div className="mb-10 sm:mb-14">
          <div className="flex items-center gap-3 mb-8">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-[12px] font-black text-white shadow-lg shadow-indigo-500/20">
              P
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0a0b0e] bg-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-[15px] font-bold tracking-tight text-white">PAT Orbit</span>
              <span className="text-[12px] font-medium text-white/30">Studio</span>
            </div>
          </div>

          {/* ── Headline ── */}
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-[1.15]">
            What are you making?
          </h1>
          <p className="mt-3 text-[15px] text-white/40 max-w-lg leading-relaxed">
            Describe your idea and PAT Orbit will create a cinematic video with scenes, visuals, motion, and voice.
          </p>
        </div>

        {/* ── Creation Form ── */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm">
          {/* Textarea */}
          <div className="p-5 pb-3">
            <textarea
              value={story}
              onChange={(e) => { setStory(e.target.value); }}
              placeholder="A cinematic story about..."
              rows={4}
              maxLength={1500}
              className="w-full resize-none rounded-lg border border-white/[0.06] bg-[#08090c] px-4 py-3.5 text-[15px] leading-relaxed text-white outline-none transition-all placeholder:text-white/20 focus:border-indigo-500/30 focus:ring-1 focus:ring-indigo-500/10"
            />
            <div className="flex items-center justify-between mt-2 px-1">
              <div className="flex gap-1.5">
                {["Magical adventure", "Detective mystery", "Robot becomes human", "Time travel"].map((idea) => (
                  <button key={idea} onClick={() => setStory(idea)} className="whitespace-nowrap rounded-md border border-white/[0.04] bg-white/[0.02] px-2.5 py-1 text-[11px] text-white/30 transition-all hover:border-white/[0.08] hover:bg-white/[0.04] hover:text-white/50">
                    {idea}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-white/15 tabular-nums">{story.length}/1500</span>
            </div>
          </div>

          {/* Settings row */}
          <div className="border-t border-white/[0.04] px-5 py-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {/* Style */}
              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-white/25">Style</label>
                <div className="flex flex-wrap gap-1">
                  {["Cinematic", "Anime", "Cartoon", "Realistic", "3D"].map((s) => (
                    <button key={s} onClick={() => setStyle(s)} className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-all ${style === s ? "bg-white text-[#0a0b0e]" : "bg-white/[0.04] text-white/45 hover:bg-white/[0.06] hover:text-white/60"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              {/* Aspect Ratio */}
              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-white/25">Format</label>
                <div className="flex gap-1">
                  {["9:16", "16:9", "1:1"].map((r) => (
                    <button key={r} onClick={() => setAspectRatio(r)} className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-all ${aspectRatio === r ? "bg-white text-[#0a0b0e]" : "bg-white/[0.04] text-white/45 hover:bg-white/[0.06] hover:text-white/60"}`}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              {/* Duration */}
              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-white/25">Duration</label>
                <div className="flex gap-1">
                  {["30s", "60s", "90s"].map((d) => (
                    <button key={d} onClick={() => setDuration(d)} className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-all ${duration === d ? "bg-white text-[#0a0b0e]" : "bg-white/[0.04] text-white/45 hover:bg-white/[0.06] hover:text-white/60"}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              {/* Voice */}
              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-white/25">Voice</label>
                <div className="flex gap-1">
                  {["Natural", "Deep", "Soft"].map((v) => (
                    <button key={v} onClick={() => setVoice(v)} className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-all ${voice === v ? "bg-white text-[#0a0b0e]" : "bg-white/[0.04] text-white/45 hover:bg-white/[0.06] hover:text-white/60"}`}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Language (compact) */}
            <div className="mt-3 flex items-center gap-3">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-white/25">Language</label>
              <div className="flex gap-1">
                {["Hindi", "English", "Hinglish"].map((l) => (
                  <button key={l} onClick={() => setLanguage(l)} className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-all ${language === l ? "bg-white text-[#0a0b0e]" : "bg-white/[0.04] text-white/45 hover:bg-white/[0.06] hover:text-white/60"}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mx-5 mb-3 rounded-lg border border-red-500/15 bg-red-500/[0.05] px-4 py-2.5 text-[12px] text-red-300/80">
              {error}
            </div>
          )}

          {/* Loading steps */}
          {loading && (
            <div className="mx-5 mb-4 space-y-1.5">
              {loadingSteps.map((step, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  {step.done ? (
                    <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
                      <Icon.Check className="h-2 w-2 text-emerald-400" />
                    </span>
                  ) : i === loadingStep + 1 ? (
                    <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center">
                      <Icon.Spinner className="h-3 w-3 animate-spin text-indigo-400/60" />
                    </span>
                  ) : (
                    <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border border-white/[0.06]">
                      <span className="h-0.5 w-0.5 rounded-full bg-white/10" />
                    </span>
                  )}
                  <span className={`text-[11px] ${step.done ? "text-white/15" : i === loadingStep + 1 ? "text-white/50" : "text-white/25"}`}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Create button */}
          <div className="border-t border-white/[0.04] px-5 py-4">
            <button
              onClick={onGenerate}
              disabled={!story.trim() || loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 text-[14px] font-semibold text-[#0a0b0e] transition-all hover:bg-white/90 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-25"
            >
              {loading ? (
                <><Icon.Spinner className="h-4 w-4 animate-spin" />Creating...</>
              ) : (
                <><Icon.Sparkles className="h-4 w-4" />Generate Video</>
              )}
            </button>
          </div>
        </div>

        {/* ── Production Pipeline ── */}
        <div className="mt-8 flex items-center justify-center gap-1 text-[10px] text-white/20">
          {["IDEA", "STORY", "SCENES", "VISUALS", "MOTION", "AUDIO", "FINAL"].map((stage, i, arr) => (
            <span key={stage} className="flex items-center gap-1">
              <span className="font-medium tracking-wide">{stage}</span>
              {i < arr.length - 1 && <span className="text-white/8">→</span>}
            </span>
          ))}
        </div>

        {/* ── Templates ── */}
        <div className="mt-12">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[13px] font-semibold text-white/60">Quick start</h2>
            <span className="text-[10px] text-white/20">{TEMPLATES.length} templates</span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {TEMPLATES.map((t) => (
              <button
                key={t.label}
                onClick={() => { setStory(t.text); setStyle(t.style); setDuration(t.duration); setAspectRatio(t.aspectRatio); }}
                className="group overflow-hidden rounded-lg border border-white/[0.04] bg-white/[0.015] text-left transition-all hover:border-white/[0.08] hover:bg-white/[0.03]"
              >
                <div className="p-3">
                  <div className="flex items-start gap-2.5">
                    <span className="text-[16px] leading-none mt-0.5">{t.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] font-semibold text-white/70 group-hover:text-white/90 transition-colors">{t.label}</div>
                      <div className="mt-0.5 text-[10px] text-white/25 leading-snug">{t.desc}</div>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Recent Projects ── */}
        {projects.length > 0 && (
          <div className="mt-12">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[13px] font-semibold text-white/60">Recent projects</h2>
              <button onClick={onScrollToProjects} className="text-[11px] text-white/25 hover:text-white/40 transition-colors">
                View all
              </button>
            </div>
            <div className="space-y-1.5">
              {projects.slice(0, 3).map((p) => {
                const sc = p.result?.scenes?.length || 0;
                const imgs = p.result?.scenes?.length || 0;
                return (
                  <button
                    key={p.id}
                    onClick={() => onLoadProject(p as never)}
                    className="flex w-full items-center gap-3 rounded-lg border border-white/[0.04] bg-white/[0.015] p-3 text-left transition-all hover:border-white/[0.08] hover:bg-white/[0.03]"
                  >
                    {/* Thumbnail placeholder */}
                    <div className="h-10 w-16 flex-shrink-0 overflow-hidden rounded-md bg-white/[0.04]">
                      <div className="flex h-full items-center justify-center">
                        <Icon.Film className="h-4 w-4 text-white/15" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] font-medium text-white/70">{p.title || "Untitled"}</div>
                      <div className="mt-0.5 text-[10px] text-white/25">{sc} scenes</div>
                    </div>
                    <Icon.ArrowRight className="h-3 w-3 text-white/15 flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
