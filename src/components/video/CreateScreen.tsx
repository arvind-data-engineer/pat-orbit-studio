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
      {/* ── Hero area ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 sm:py-20">
        <div className="w-full max-w-2xl">
          {/* ── Headline ── */}
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
              Create your video
            </h1>
            <p className="mt-2.5 text-[14px] text-white/35 max-w-md mx-auto leading-relaxed">
              Describe what you want to see. PAT Orbit turns your idea into scenes, visuals, motion, and voice.
            </p>
          </div>

          {/* ── Creation form ── */}
          <div className={`rounded-xl border transition-colors duration-200 ${focused ? "border-white/[0.10]" : "border-white/[0.04]"} bg-[#0e1015]`}>
            {/* Textarea — the visual focal point */}
            <div className="p-5 pb-3">
              <textarea
                value={story}
                onChange={(e) => setStory(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="Describe your video..."
                rows={4}
                maxLength={1500}
                className="w-full resize-none rounded-lg border-0 bg-[#08090c] px-5 py-4 text-[16px] leading-relaxed text-white/90 outline-none placeholder:text-white/20 focus:ring-1 focus:ring-white/[0.06] transition-shadow"
              />
              {/* Suggestions */}
              {!story && (
                <div className="flex flex-wrap gap-2 mt-3 px-1">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => setStory(s)} className="rounded-lg border border-white/[0.04] bg-white/[0.015] px-3 py-1.5 text-[12px] text-white/30 transition-all hover:border-white/[0.08] hover:bg-white/[0.03] hover:text-white/50">
                      {s}
                    </button>
                  ))}
                </div>
              )}
              {story && (
                <div className="flex items-center justify-end mt-2 px-1">
                  <span className="text-[11px] text-white/15 tabular-nums">{story.length}/1500</span>
                </div>
              )}
            </div>

            {/* Settings — clean horizontal layout */}
            <div className="border-t border-white/[0.03] px-5 py-4">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                {/* Style */}
                <SettingGroup label="Style" value={style} onChange={setStyle} options={["Cinematic", "Anime", "Cartoon", "Realistic", "3D"]} />
                {/* Format */}
                <SettingGroup label="Format" value={aspectRatio} onChange={setAspectRatio} options={["16:9", "9:16", "1:1"]} />
                {/* Duration */}
                <SettingGroup label="Duration" value={duration} onChange={setDuration} options={["30s", "60s", "90s"]} />
                {/* Voice */}
                <SettingGroup label="Voice" value={voice} onChange={setVoice} options={["Natural", "Deep", "Soft"]} />
                {/* Language */}
                <SettingGroup label="Language" value={language} onChange={setLanguage} options={["English", "Hindi", "Hinglish"]} />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mx-5 mb-3 rounded-lg bg-red-500/[0.06] border border-red-500/[0.12] px-4 py-3 text-[13px] text-red-300/80">
                {error}
              </div>
            )}

            {/* Loading steps */}
            {loading && (
              <div className="mx-5 mb-4 space-y-2">
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
                    <span className={`text-[13px] font-medium ${step.done ? "text-white/20 line-through" : i === loadingStep + 1 ? "text-white/60" : "text-white/30"}`}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Create button */}
            <div className="border-t border-white/[0.03] px-5 py-4">
              <button
                onClick={onGenerate}
                disabled={!story.trim() || loading}
                className="flex w-full items-center justify-center gap-2.5 rounded-lg bg-white px-6 py-3.5 text-[15px] font-semibold text-[#08090c] transition-all hover:bg-white/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-20"
              >
                {loading ? (
                  <><Icon.Spinner className="h-4 w-4 animate-spin" />Creating your video...</>
                ) : (
                  <>Generate Video</>
                )}
              </button>
            </div>
          </div>

          {/* ── Quick start templates ── */}
          <div className="mt-10">
            <h2 className="text-[12px] font-semibold uppercase tracking-wider text-white/25 mb-3">Quick start</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.label}
                  onClick={() => { setStory(t.text); setStyle(t.style); setDuration(t.duration); setAspectRatio(t.aspectRatio); }}
                  className="group overflow-hidden rounded-lg border border-white/[0.04] bg-[#0e1015] text-left transition-all hover:border-white/[0.08] hover:bg-[#14161c]"
                >
                  <div className="p-3.5">
                    <div className="text-[13px] font-semibold text-white/65 group-hover:text-white/90 transition-colors">{t.label}</div>
                    <div className="mt-1 text-[11px] text-white/25 leading-snug line-clamp-2">{t.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ── Recent projects ── */}
          {projects.length > 0 && (
            <div className="mt-10">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[12px] font-semibold uppercase tracking-wider text-white/25">Recent projects</h2>
                <button onClick={onScrollToProjects} className="text-[12px] text-white/30 hover:text-white/50 transition-colors">
                  View all →
                </button>
              </div>
              <div className="space-y-1.5">
                {projects.slice(0, 3).map((p) => {
                  const sc = p.result?.scenes?.length || 0;
                  const firstImg = p.sceneImages ? Object.values(p.sceneImages)[0] : null;
                  return (
                    <button
                      key={p.id}
                      onClick={() => onLoadProject(p as never)}
                      className="flex w-full items-center gap-3.5 rounded-lg border border-white/[0.04] bg-[#0e1015] p-2.5 text-left transition-all hover:border-white/[0.08] hover:bg-[#14161c]"
                    >
                      <div className="h-10 w-16 flex-shrink-0 overflow-hidden rounded-md bg-[#08090c]">
                        {firstImg ? (
                          <img src={firstImg} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <Icon.Film className="h-4 w-4 text-white/10" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-medium text-white/65">{p.title || "Untitled"}</div>
                        <div className="mt-0.5 text-[11px] text-white/25">{sc} scenes</div>
                      </div>
                      <Icon.ArrowRight className="h-3.5 w-3.5 text-white/15 flex-shrink-0" />
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

/* ── Settings chip group ── */
function SettingGroup({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[12px] text-white/30 font-medium">{label}</span>
      <div className="flex gap-1">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`rounded-md px-2.5 py-1 text-[12px] font-medium transition-all ${
              value === opt
                ? "bg-white text-[#08090c]"
                : "text-white/40 hover:text-white/60 hover:bg-white/[0.04]"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
