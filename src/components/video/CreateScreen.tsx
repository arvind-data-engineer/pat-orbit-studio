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

  return (
    <div className="min-h-[calc(100vh-48px)] flex flex-col">
      {/* ── Hero — fullscreen cinematic creation ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 py-10 sm:py-16">
        <div className="w-full max-w-3xl animate-fade-in">
          {/* ── Brand mark + headline ── */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.04] bg-white/[0.02] px-4 py-1.5 mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="text-[11px] font-medium text-white/35 tracking-wide uppercase">AI Video Creation</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-bold tracking-tight text-white leading-[1.1]">
              Create your video
            </h1>
            <p className="mt-4 text-[15px] sm:text-[17px] text-white/30 max-w-lg mx-auto leading-relaxed">
              Describe a scene. PAT Orbit turns your idea into visuals, motion, and voice.
            </p>
          </div>

          {/* ── Prompt composer — the visual focal point ── */}
          <div className={`relative rounded-2xl border transition-all duration-300 ${focused ? "border-white/[0.12] shadow-[0_0_40px_rgba(99,102,241,0.04)]" : "border-white/[0.05]"} bg-[#0e1015]`}>
            {/* Textarea */}
            <div className="px-6 pt-6 pb-2">
              <textarea
                value={story}
                onChange={(e) => setStory(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="Describe the video you want to create..."
                rows={4}
                maxLength={1500}
                className="prompt-input"
              />
            </div>

            {/* Suggestions */}
            {!story && !loading && (
              <div className="px-6 pb-4 flex flex-wrap gap-2 stagger-children">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setStory(s); setFocused(true); }}
                    className="rounded-lg border border-white/[0.04] bg-white/[0.015] px-3 py-1.5 text-[13px] text-white/30 transition-all hover:border-white/[0.08] hover:bg-white/[0.03] hover:text-white/50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Character count */}
            {story && (
              <div className="px-6 pb-2 flex justify-end">
                <span className="text-[11px] text-white/12 tabular-nums">{story.length}/1500</span>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mx-6 mb-3 rounded-xl bg-red-500/[0.06] border border-red-500/[0.10] px-4 py-3 text-[13px] text-red-300/80">
                {error}
              </div>
            )}

            {/* Loading steps */}
            {loading && (
              <div className="mx-6 mb-4 space-y-2.5 animate-fade-in">
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

            {/* Settings + Generate row */}
            <div className="border-t border-white/[0.04] px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
              {/* Compact settings */}
              <div className="flex items-center gap-4 flex-wrap">
                <CompactSelect value={style} onChange={setStyle} options={["Cinematic", "Anime", "Cartoon", "Realistic", "3D"]} />
                <CompactSelect value={aspectRatio} onChange={setAspectRatio} options={["16:9", "9:16", "1:1"]} />
                <CompactSelect value={duration} onChange={setDuration} options={["30s", "60s", "90s"]} />
                <CompactSelect value={voice} onChange={setVoice} options={["Natural", "Deep", "Soft"]} />
                <CompactSelect value={language} onChange={setLanguage} options={["English", "Hindi", "Hinglish"]} />
              </div>

              {/* Generate button */}
              <button
                onClick={onGenerate}
                disabled={!story.trim() || loading}
                className="flex items-center gap-2.5 rounded-xl bg-white px-6 py-3 text-[15px] font-semibold text-[#0a0b0f] transition-all hover:bg-white/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-15 whitespace-nowrap"
              >
                {loading ? (
                  <><Icon.Spinner className="h-4 w-4 animate-spin" />Creating...</>
                ) : (
                  <><Icon.Video className="h-4 w-4" />Generate</>
                )}
              </button>
            </div>
          </div>

          {/* ── Templates — visual inspiration ── */}
          <div className="mt-14">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/20 mb-4">Start with a template</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 stagger-children">
              {TEMPLATES.map((t) => (
                <button
                  key={t.label}
                  onClick={() => { setStory(t.text); setStyle(t.style); setDuration(t.duration); setAspectRatio(t.aspectRatio); }}
                  className="group relative overflow-hidden rounded-xl border border-white/[0.04] bg-[#0e1015] text-left transition-all hover:border-white/[0.08] hover:bg-[#13141c]"
                >
                  {/* Cinematic gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative p-5">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl leading-none mt-0.5">{t.icon}</span>
                      <div className="min-w-0">
                        <div className="text-[14px] font-semibold text-white/65 group-hover:text-white/90 transition-colors">{t.label}</div>
                        <div className="mt-1 text-[12px] text-white/25 leading-relaxed">{t.desc}</div>
                        <div className="mt-2 flex items-center gap-2 text-[10px] text-white/15">
                          <span>{t.style}</span>
                          <span>·</span>
                          <span>{t.duration}</span>
                          <span>·</span>
                          <span>{t.aspectRatio}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ── Recent projects ── */}
          {projects.length > 0 && (
            <div className="mt-14 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/20">Recent projects</h2>
                <button onClick={onScrollToProjects} className="text-[12px] text-white/25 hover:text-white/50 transition-colors">
                  View all →
                </button>
              </div>
              <div className="space-y-2">
                {projects.slice(0, 3).map((p) => {
                  const sc = p.result?.scenes?.length || 0;
                  const firstImg = p.sceneImages ? Object.values(p.sceneImages)[0] : null;
                  return (
                    <button
                      key={p.id}
                      onClick={() => onLoadProject(p as never)}
                      className="flex w-full items-center gap-4 rounded-xl border border-white/[0.04] bg-[#0e1015] p-3 text-left transition-all hover:border-white/[0.08] hover:bg-[#13141c]"
                    >
                      <div className="h-12 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-[#08090c]">
                        {firstImg ? (
                          <img src={firstImg} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <Icon.Film className="h-5 w-5 text-white/[0.08]" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[14px] font-medium text-white/60">{p.title || "Untitled"}</div>
                        <div className="mt-0.5 text-[12px] text-white/20">{sc} scenes</div>
                      </div>
                      <Icon.ArrowRight className="h-4 w-4 text-white/10 flex-shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Compact inline select ── */
function CompactSelect({ value, onChange, options }: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="flex items-center gap-1.5">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-transparent text-[12px] font-medium text-white/45 outline-none cursor-pointer hover:text-white/65 transition-colors border-none pr-4"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5' fill='none'%3E%3Cpath d='M1 1.5l3 3 3-3' stroke='rgba(255,255,255,0.25)' stroke-width='1.2' stroke-linecap='round'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 0 center" }}
      >
        {options.map((opt) => (
          <option key={opt} value={opt} className="bg-[#111218] text-white">{opt}</option>
        ))}
      </select>
    </div>
  );
}
