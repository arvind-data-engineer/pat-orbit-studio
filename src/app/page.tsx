"use client";

import { useEffect, useRef, useState } from "react";
import { analyzeRegenerationRequest } from "@/lib/ai/regeneration";
import type { DirectorScene, ProductionPlan } from "@/lib/ai/director-schema";
import { loadProjects, saveProjects as storageSaveProjects, createAutoSave, getStorageInfo } from "@/lib/storage";
import { downloadProjectFile, importProject, readFileAsText } from "@/lib/project-serialization";
import { getQuickEstimate } from "@/lib/generation-estimator";

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
  // Director plan fields (optional for backward compatibility with old projects)
  directorCamera?: { shotType: string; angle: string; movement: string; framing: string };
  directorMotion?: { subjectMovement: string; environmentMovement: string; intensity: string };
  directorVoice?: { voice: string; emotion: string; pace: string; emphasis: string };
  directorContinuityBefore?: { characters: { name: string; appearance: string }[]; location: string; timeOfDay: string; weather: string; importantObjects: string[]; previousSceneEnding: string };
  directorContinuityAfter?: { characters: { name: string; appearance: string }[]; location: string; timeOfDay: string; weather: string; importantObjects: string[]; previousSceneEnding: string };
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
  voiceGenerated?: Record<number, boolean>;
};

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

function getInitials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

const CHAR_COLORS = [
  'bg-emerald-500/20 text-emerald-400',
  'bg-violet-500/20 text-violet-400',
  'bg-amber-500/20 text-amber-400',
  'bg-blue-500/20 text-blue-400',
  'bg-rose-500/20 text-rose-400',
  'bg-cyan-500/20 text-cyan-400',
];

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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
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
  }, [result, activeScene, mobileNavOpen, settingsOpen, deleteConfirmId, showCharacters, isEditingScene, rendering, sceneVideos]);

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
                {saveStatus === 'saving' && (
                  <span className="hidden text-[10px] font-medium text-amber-400/70 sm:block">Saving...</span>
                )}
                {saveStatus === 'error' && (
                  <span className="hidden text-[10px] font-medium text-red-400/70 sm:block">Save failed</span>
                )}
                {hasUnsavedChanges && saveStatus !== 'saving' && (
                  <span className="hidden text-[10px] font-medium text-amber-400/70 sm:block">Unsaved</span>
                )}
                <button onClick={saveCurrentProject} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors ${saved && !hasUnsavedChanges ? 'text-emerald-400/70' : 'text-white/65 hover:bg-white/[0.05] hover:text-white/80'}`}>
                  <Icon.Folder className="text-white/55" />
                  {saved && !hasUnsavedChanges ? "Saved" : "Save"}
                </button>
                <button onClick={handleExport} className="hidden sm:flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[12px] font-medium text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white/80">
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
                  <div className="mx-2.5 my-1 border-t border-white/[0.06]" />
                  <div className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-white/30">Transitions</div>
                  <button onClick={() => setRenderTransition(renderTransition === "none" ? "crossfade" : "none")} className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12px] transition-colors hover:bg-white/[0.05] ${renderTransition !== "none" ? "text-white/90" : "text-white/50"}`}>Scene transition: {renderTransition === "none" ? "None" : "Crossfade"}</button>
                  {renderTransition !== "none" && (
                    <button onClick={() => setRenderTransitionDuration(renderTransitionDuration === "0.5" ? "1.0" : renderTransitionDuration === "1.0" ? "0.25" : "0.5")} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12px] transition-colors hover:bg-white/[0.05] text-white/90">Duration: {renderTransitionDuration}s</button>
                  )}
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
              {result && finalVideo && (
                <button onClick={() => { exportVideo(); setMobileNavOpen(false); }} className="rounded-lg px-3 py-2.5 text-left text-[13px] font-medium text-white/65 transition-colors hover:bg-white/[0.05] hover:text-white/80">Export</button>
              )}
            </div>
          </div>
        )}
      </header>

      <section className={!result ? '' : 'mx-auto max-w-[1400px] px-4 py-8 sm:px-6 sm:py-12'}>
        {!result ? (
          <>
            {/* ===== CREATE SCREEN ===== */}

            {/* ── VIDEO-FIRST HERO ────────────────────────────────────── */}
            <div className="relative -mx-4 sm:-mx-6 -mt-8 sm:-mt-12">
              {/* Demo video — fills the first viewport */}
              <div className="relative w-full aspect-video max-h-[75vh] overflow-hidden bg-black">
                {/* Real autoplay video with fallback gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-950/40 via-violet-950/30 to-fuchsia-950/40">
                  <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-purple-800/10 via-transparent to-fuchsia-800/10" style={{ animationDuration: '6s' }} />
                </div>
                <video
                  autoPlay loop muted playsInline preload="auto"
                  poster=""
                  className="absolute inset-0 h-full w-full object-cover"
                  onError={(e) => { (e.target as HTMLVideoElement).style.display = 'none'; }}
                >
                  <source src="https://cdn.coverr.co/videos/coverr-aerial-shot-of-a-forest-1573/1080p.mp4" type="video/mp4" />
                  <source src="https://cdn.coverr.co/videos/coverr-time-lapse-of-city-traffic-8610/1080p.mp4" type="video/mp4" />
                </video>
                {/* Cinematic vignette overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/60" />
                <div className="absolute inset-0 shadow-[inset_0_0_120px_40px_rgba(0,0,0,0.5)]" />
                {/* Film-grain texture */}
                <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)%25\'/%3E%3C/svg%3E")', backgroundSize: '128px 128px' }} />
                {/* Film-strip perforations top */}
                <div className="absolute inset-x-0 top-0 z-10 h-6 bg-gradient-to-b from-black/70 to-transparent">
                  <div className="flex items-center gap-2 px-6 pt-1.5">
                    {Array.from({length: 16}).map((_, i) => (
                      <div key={i} className="h-2 w-3 rounded-[1px] bg-white/[0.07]" />
                    ))}
                  </div>
                </div>
                {/* Film-strip perforations bottom */}
                <div className="absolute inset-x-0 bottom-0 z-10 h-6 bg-gradient-to-t from-black/70 to-transparent">
                  <div className="flex items-center gap-2 px-6 pb-1.5">
                    {Array.from({length: 16}).map((_, i) => (
                      <div key={i} className="h-2 w-3 rounded-[1px] bg-white/[0.07]" />
                    ))}
                  </div>
                </div>
                {/* Brand watermark top-left */}
                <div className="absolute left-5 top-8 z-10 flex items-center gap-2">
                  <span className="text-[11px] font-bold tracking-[0.25em] text-white/20 uppercase">PAT Orbit Studio</span>
                </div>
                {/* Floating tag top-right */}
                <div className="absolute right-5 top-8 z-10">
                  <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[10px] font-medium text-white/30 backdrop-blur-sm">AI Generated</span>
                </div>
              </div>
            </div>

            {/* ── CREATION INPUT BAR ──────────────────────────────────── */}
            <div className="relative z-10 mx-auto -mt-10 max-w-3xl px-4 sm:px-6 sm:max-w-3xl">
              <div className="overflow-hidden rounded-2xl border border-white/[0.10] bg-[#0c0d12]/90 shadow-[0_8px_40px_-8px_rgba(0,0,0,0.6)] backdrop-blur-xl">
                {/* Textarea */}
                <div className="relative px-5 pt-5 pb-0">
                  <div className="relative group">
                    <textarea
                      value={story}
                      onChange={(e) => { setStory(e.target.value); setError(""); }}
                      placeholder="Describe your video idea..."
                      rows={3}
                      maxLength={1500}
                      className="w-full resize-none rounded-xl border border-white/[0.08] bg-[#08090c] px-4 py-3.5 text-[15px] leading-6 text-white outline-none transition-all placeholder:text-white/25 focus:border-purple-500/30 focus:shadow-[0_0_24px_-8px_rgba(139,92,246,0.12)]"
                    />
                    <div className="absolute bottom-2 right-3 text-[10px] text-white/15 tabular-nums">{story.length}/1500</div>
                  </div>
                </div>
                {/* Chips + Create row */}
                <div className="flex items-center gap-2 px-5 pb-4 pt-1">
                  <div className="flex flex-1 flex-wrap items-center gap-1.5 overflow-hidden">
                    <Icon.Lightbulb className="h-3 w-3 flex-shrink-0 text-white/20" />
                    {["Magical adventure", "Detective mystery", "Robot becomes human", "Time travel"].map((idea) => (
                      <button key={idea} onClick={() => { setStory(idea); setError(""); }} className="whitespace-nowrap rounded-full border border-white/[0.05] bg-white/[0.03] px-2 py-0.5 text-[10px] text-white/35 transition-all hover:border-purple-500/20 hover:bg-purple-500/[0.05] hover:text-white/55">
                        {idea}
                      </button>
                    ))}
                  </div>
                  <button onClick={generateStory} disabled={!story.trim() || loading} className="flex flex-shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 via-violet-600 to-fuchsia-600 px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_4px_20px_-4px_rgba(139,92,246,0.35)] transition-all hover:shadow-[0_6px_28px_-4px_rgba(139,92,246,0.5)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-35 disabled:shadow-none">
                    {loading ? (<><Icon.Spinner className="h-3.5 w-3.5 animate-spin" />Creating</>) : (<><Icon.Sparkles className="h-3.5 w-3.5" />Create Video</>)}
                  </button>
                </div>
                {error && <div className="mx-5 mb-4 rounded-lg border border-red-500/20 bg-red-500/[0.07] px-3 py-2 text-[12px] text-red-300/90">{error}</div>}
                {loading && (
                  <div className="mx-5 mb-4 space-y-1">
                    {loadingSteps.map((step, i) => (
                      <div key={i} className="flex items-center gap-2">
                        {step.done ? (<span className="flex h-3 w-3 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20"><Icon.Check className="h-1.5 w-1.5 text-emerald-400" /></span>)
                        : i === loadingStep + 1 ? (<span className="flex h-3 w-3 flex-shrink-0 items-center justify-center"><Icon.Spinner className="h-2.5 w-2.5 animate-spin text-purple-400/60" /></span>)
                        : (<span className="flex h-3 w-3 flex-shrink-0 items-center justify-center rounded-full border border-white/[0.08]"><span className="h-0.5 w-0.5 rounded-full bg-white/[0.12]" /></span>)}
                        <span className={`text-[10px] ${step.done ? 'text-white/20' : i === loadingStep + 1 ? 'text-white/50' : 'text-white/30'}`}>{step.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── SETTINGS + QUICK START (below fold) ──────────────── */}
            <div className="mx-auto mt-8 max-w-3xl">
              {/* Settings row */}
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <label className="mb-1 text-[9px] font-bold uppercase tracking-wider text-white/25">Language</label>
                    <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full rounded-lg border border-white/[0.08] bg-[#0a0b0f] px-2 py-1.5 text-[11px] font-medium text-white/60 outline-none focus:border-white/[0.15]">
                      <option>Hindi</option><option>Hinglish</option><option>English</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 text-[9px] font-bold uppercase tracking-wider text-white/25">Style</label>
                    <select value={style} onChange={(e) => setStyle(e.target.value)} className="w-full rounded-lg border border-white/[0.08] bg-[#0a0b0f] px-2 py-1.5 text-[11px] font-medium text-white/60 outline-none focus:border-white/[0.15]">
                      <option>Cinematic</option><option>Cartoon</option><option>Anime</option><option>Realistic</option><option>3D</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 text-[9px] font-bold uppercase tracking-wider text-white/25">Duration</label>
                    <select value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full rounded-lg border border-white/[0.08] bg-[#0a0b0f] px-2 py-1.5 text-[11px] font-medium text-white/60 outline-none focus:border-white/[0.15]">
                      <option>30s</option><option>60s</option><option>90s</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 text-[9px] font-bold uppercase tracking-wider text-white/25">Voice</label>
                    <select value={voice} onChange={(e) => setVoice(e.target.value)} className="w-full rounded-lg border border-white/[0.08] bg-[#0a0b0f] px-2 py-1.5 text-[11px] font-medium text-white/60 outline-none focus:border-white/[0.15]">
                      <option>Natural</option><option>Deep</option><option>Soft</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Quick Start templates */}
              <div className="mt-4">
                <div className="mb-2 flex items-center gap-2">
                  <Icon.Zap className="h-3 w-3 text-white/25" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/30">Quick Start</span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
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
                    <button onClick={exportVideo} disabled={!finalVideo} className="flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-[12px] font-semibold text-black transition-all hover:bg-white/90 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none">
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
                      { label: "SCENES", done: totalScenes > 0 },
                      { label: "VISUALS", done: totalImagesGenerated >= totalScenes },
                      { label: "MOTION", done: totalVideosGenerated >= totalScenes },
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
                        const isGenerating = sceneStatus[scene.id]?.startsWith('image') || sceneStatus[scene.id]?.startsWith('video');
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
                        const isGen = sceneStatus[currentScene.id]?.startsWith('image') || sceneStatus[currentScene.id]?.startsWith('video');
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
                        <span className="text-[13px] font-semibold text-white/65">Creating visual for {currentScene.title}</span>
                        <span className="mt-1.5 text-[11px] text-white/35">Preparing composition and generating your scene image...</span>
                        <div className="mt-4 flex items-center gap-2 text-[9px]">
                          <span className="text-emerald-400/60">Scene</span>
                          <Icon.ArrowRight className="h-2 w-2 text-white/15" />
                          <span className="text-amber-400/60">Image</span>
                          <Icon.ArrowRight className="h-2 w-2 text-white/15" />
                          <span className="text-white/20">Video</span>
                        </div>
                      </div>
                    ) : currentScene && sceneStatus[currentScene.id]?.startsWith("video") ? (
                      <div className="flex aspect-video flex-col items-center justify-center bg-[#0c0d12]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.02) 1px, transparent 0)", backgroundSize: "24px 24px" }}>
                        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10">
                          <Icon.Video className="h-6 w-6 text-violet-400 animate-pulse" />
                        </div>
                        <span className="text-[13px] font-semibold text-white/65">Creating motion for {currentScene.title}</span>
                        <span className="mt-1.5 text-[11px] text-white/35">Video generation takes longer than image generation.</span>
                        <span className="mt-0.5 text-[11px] text-white/25">This may take a few minutes. You can navigate to other scenes.</span>
                        {sceneImages[currentScene.id] && (
                          <div className="mt-4 flex items-center gap-2 text-[9px]">
                            <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-emerald-400/60">Image</span>
                            <Icon.ArrowRight className="h-2 w-2 text-white/15" />
                            <span className="rounded bg-violet-500/15 px-1.5 py-0.5 text-violet-400/60">Video</span>
                            <Icon.ArrowRight className="h-2 w-2 text-white/15" />
                            <span className="text-white/20">Voice</span>
                          </div>
                        )}
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
                    const isGenVid = sceneStatus[currentScene.id]?.startsWith('video');
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
                          {isGenImg ? (<><Icon.Spinner className="h-4 w-4 animate-spin" />Generating image...</>) : hasImg ? (<><Icon.Image className="h-4 w-4" />Regenerate Image</>) : (<><Icon.Image className="h-4 w-4" />Generate Image</>)}
                        </button>
                        {isGenImg && (
                          <button onClick={() => cancelGeneration(currentScene.id)} className="w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-[11px] font-medium text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/60">
                            Cancel
                          </button>
                        )}
                        {!hasImg && !isBusy && <p className="text-center text-[10px] text-white/30">Start here - generate the scene image first</p>}

                        {/* Video button - only when image exists or video exists */}
                        {(hasImg || hasVid) && (
                          <div>
                            <button onClick={() => startVideoGeneration(currentScene.id)} disabled={isBusy || !hasImg}
                              className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-[13px] font-semibold transition-all active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 ${needsVideo ? 'bg-gradient-to-b from-violet-500 to-violet-600 text-white shadow-[0_4px_20px_-4px_rgba(139,92,246,0.45)] hover:shadow-[0_6px_28px_-4px_rgba(139,92,246,0.55)]' : 'bg-white/[0.05] border border-white/[0.08] text-white/60 hover:bg-white/[0.08] hover:text-white/75'}`}>
                              {isGenVid ? (() => { const prog = sceneStatus[currentScene.id]?.replace('video:', ''); return (<><Icon.Spinner className="h-4 w-4 animate-spin" />{prog && prog !== 'video' ? prog : `Generating video for ${currentScene.title}`}</>); })() : hasVid ? (<><Icon.Video className="h-4 w-4" />Regenerate Video</>) : (<><Icon.Video className="h-4 w-4" />Generate Video</>)}
                            </button>
                            {isGenVid && <>
                              <p className="mt-1 text-center text-[10px] text-white/25">{(() => { const prog = sceneStatus[currentScene.id]?.replace('video:', ''); return prog && prog !== 'video' ? `${prog} — this may take several minutes` : 'Generating video — this may take several minutes'; })()}</p>
                              <button onClick={() => cancelGeneration(currentScene.id)} className="w-full mt-1 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-[11px] font-medium text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/60">
                                Cancel generation
                              </button>
                            </>}
                            {!isGenVid && !hasVid && needsVideo && (() => {
                              const sceneDur = parseInt(currentScene.sceneDuration || '10', 10) || 10;
                              const est = getQuickEstimate('local', 'production', sceneDur);
                              return est ? <p className="mt-1 text-center text-[10px] text-white/25">{est}</p> : null;
                            })()}
                          </div>
                      )}
                      {hasImg && !hasVid && !isBusy && <p className="text-center text-[10px] text-white/30">Image is ready - generate video next</p>}

                        {/* Voice button */}
                        {currentScene.narration?.trim() && (
                          <div>
                            <div className="flex gap-2">
                              <button onClick={() => startVoiceGeneration(currentScene.id)} disabled={voiceStatus[currentScene.id] === 'generating'}
                                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-[12px] font-medium text-white/60 transition-all hover:bg-white/[0.08] hover:text-white/80 active:scale-[0.98] disabled:opacity-40">
                                {voiceStatus[currentScene.id] === 'generating' ? (<><Icon.Spinner className="h-3.5 w-3.5 animate-spin" />Generating voice...</>) : hasVoc ? (<><Icon.Mic className="h-3.5 w-3.5 text-emerald-400" />Regenerate Voice</>) : (<><Icon.Mic className="h-3.5 w-3.5" />Generate Voice</>)}
                              </button>
                              {hasVoc && (
                                <button onClick={() => playVoice(currentScene.id)} className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-[12px] font-medium text-white/60 transition-all hover:bg-white/[0.08] hover:text-white/80">
                                  <Icon.Play className="h-3.5 w-3.5" />Preview
                                </button>
                              )}
                            </div>
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
                    <div className="rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-[12px] font-semibold text-red-400">Something went wrong</span>
                      </div>
                      <p className="text-[12px] text-red-300/70">{error}</p>
                      {currentScene && (
                        <div className="mt-2.5 flex flex-wrap gap-2">
                          <button onClick={() => setError('')} className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-[11px] font-medium text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white/70">
                            Dismiss
                          </button>
                          {!sceneImages[currentScene.id] && (
                            <button onClick={() => { setError(''); startImageGeneration(currentScene.id); }} className="rounded-lg bg-red-500/10 border border-red-500/15 px-3 py-1.5 text-[11px] font-medium text-red-400 transition-colors hover:bg-red-500/20">
                              Try image again
                            </button>
                          )}
                          {sceneImages[currentScene.id] && !sceneVideos[currentScene.id] && (
                            <button onClick={() => { setError(''); startVideoGeneration(currentScene.id); }} className="rounded-lg bg-red-500/10 border border-red-500/15 px-3 py-1.5 text-[11px] font-medium text-red-400 transition-colors hover:bg-red-500/20">
                              Try video again
                            </button>
                          )}
                          {currentScene.narration?.trim() && voiceStatus[currentScene.id] !== 'ready' && (
                            <button onClick={() => { setError(''); startVoiceGeneration(currentScene.id); }} className="rounded-lg bg-red-500/10 border border-red-500/15 px-3 py-1.5 text-[11px] font-medium text-red-400 transition-colors hover:bg-red-500/20">
                              Try voice again
                            </button>
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
                            <>
                              <button onClick={() => beginEditScene(currentScene)} className="flex items-center gap-1 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.08] px-2.5 py-1.5 text-[10px] font-medium text-emerald-400/80 transition-colors hover:bg-emerald-500/[0.15]">
                                <Icon.Wand className="h-3 w-3" />Edit Scene
                              </button>
                              {result.scenes.length > 1 && (
                                <button onClick={() => deleteScene(currentScene.id)} className="flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/[0.08] px-2.5 py-1.5 text-[10px] font-medium text-red-400/80 transition-colors hover:bg-red-500/[0.15]">
                                  <Icon.Trash className="h-3 w-3" />Delete
                                </button>
                              )}
                            </>
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
                        {characters.length > 0 && (                           <SceneCharacterPicker
                             characters={characters}
                             sceneCharacters={sceneCharacters}
                             sceneId={currentScene.id}
                             result={result}
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

                        {/* Continuity section */}
                        {currentScene.directorContinuityBefore && (
                          <div className="mt-1">
                            <button onClick={() => setShowContinuity(!showContinuity)} className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-white/30 transition-colors hover:text-white/50">
                              <Icon.Film className="h-2.5 w-2.5" />
                              Continuity {showContinuity ? '\u25B2' : '\u25BC'}
                            </button>
                            {showContinuity && (
                              <div className="mt-2 space-y-2 rounded-lg border border-white/[0.06] bg-[#0c0d12] p-3">
                                {currentScene.directorContinuityBefore!.location && (
                                  <div><span className="text-[9px] font-bold uppercase tracking-wider text-white/25">Location</span><p className="text-[11px] text-white/55">{currentScene.directorContinuityBefore!.location}</p></div>
                                )}
                                {currentScene.directorContinuityBefore!.timeOfDay && (
                                  <div><span className="text-[9px] font-bold uppercase tracking-wider text-white/25">Time of Day</span><p className="text-[11px] text-white/55">{currentScene.directorContinuityBefore!.timeOfDay}</p></div>
                                )}
                                {currentScene.directorContinuityBefore!.weather && (
                                  <div><span className="text-[9px] font-bold uppercase tracking-wider text-white/25">Weather</span><p className="text-[11px] text-white/55">{currentScene.directorContinuityBefore!.weather}</p></div>
                                )}
                                {currentScene.directorContinuityBefore!.importantObjects.length > 0 && (
                                  <div><span className="text-[9px] font-bold uppercase tracking-wider text-white/25">Important Objects</span><div className="mt-1 flex flex-wrap gap-1">{currentScene.directorContinuityBefore!.importantObjects.map((obj) => (<span key={obj} className="rounded bg-white/[0.05] px-1.5 py-0.5 text-[9px] text-white/45">{obj}</span>))}</div></div>
                                )}
                                {currentScene.directorContinuityBefore!.previousSceneEnding && (
                                  <div><span className="text-[9px] font-bold uppercase tracking-wider text-white/25">Previous Scene</span><p className="text-[10px] text-white/40 italic">{currentScene.directorContinuityBefore!.previousSceneEnding}</p></div>
                                )}
                                {currentScene.directorContinuityBefore!.characters.length > 0 && (
                                  <div><span className="text-[9px] font-bold uppercase tracking-wider text-white/25">Characters</span><div className="mt-1 space-y-1">{currentScene.directorContinuityBefore!.characters.map((c) => (<div key={c.name} className="text-[10px]"><span className="font-medium text-white/55">{c.name}:</span> <span className="text-white/35">{c.appearance}</span></div>))}</div></div>
                                )}
                              </div>
                            )}
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
                          <button onClick={() => setShowCharacters(true)} className="text-[9px] text-white/35 hover:text-white/55 transition-colors">Manage</button>
                        </div>
                        <div className="space-y-1">
                          {characters.filter((c) => c.name?.trim()).map((c, i) => {
                            const realIdx = characters.indexOf(c);
                            const usedInScenes = result.scenes.filter((s) => (sceneCharacters[s.id] || []).includes(realIdx));
                            const colorCls = CHAR_COLORS[realIdx % CHAR_COLORS.length];
                            return (
                              <div key={i} className="flex items-center gap-2 rounded-lg bg-white/[0.02] px-2.5 py-1.5">
                                <span className={'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md text-[8px] font-bold ' + colorCls}>
                                  {getInitials(c.name)}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <span className="text-[11px] font-medium text-white/65 truncate block">{c.name}</span>
                                  {c.role ? <span className="text-[9px] text-white/30 truncate block">{c.role}</span> : null}
                                </div>
                                <span className={`text-[9px] font-medium ${usedInScenes.length > 0 ? 'text-emerald-400/60' : 'text-white/20'}`}>
                                  {usedInScenes.length > 0 ? `${usedInScenes.length} scene${usedInScenes.length !== 1 ? 's' : ''}` : 'unused'}
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

                    {/* Batch Generation */}
                    {(() => {
                      const missingImages = result.scenes.filter((s) => !sceneImages[s.id]).length;
                      const missingVideos = result.scenes.filter((s) => !sceneVideos[s.id] && sceneImages[s.id]).length;
                      const anyGenerating = Object.values(sceneStatus).some((s) => s !== 'idle');
                      if (missingImages === 0 && missingVideos === 0) return null;
                      return (
                        <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-4">
                          <div className="mb-2 flex items-center gap-2">
                            <Icon.Zap className="h-3.5 w-3.5 text-white/50" />
                            <span className="text-[12px] font-semibold text-white/75">Batch Actions</span>
                          </div>
                          <div className="flex gap-2">
                            {missingImages > 0 && (
                              <button onClick={() => { for (const s of result.scenes) { if (!sceneImages[s.id]) startImageGeneration(s.id); } }} disabled={anyGenerating}
                                className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[11px] font-medium text-white/60 transition-all hover:bg-white/[0.08] hover:text-white/80 disabled:opacity-40">
                                Generate {missingImages} image{missingImages !== 1 ? 's' : ''}
                              </button>
                            )}
                            {missingVideos > 0 && (
                              <button onClick={() => { for (const s of result.scenes) { if (!sceneVideos[s.id] && sceneImages[s.id]) startVideoGeneration(s.id); } }} disabled={anyGenerating}
                                className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[11px] font-medium text-white/60 transition-all hover:bg-white/[0.08] hover:text-white/80 disabled:opacity-40">
                                Generate {missingVideos} video{missingVideos !== 1 ? 's' : ''}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Render Panel */}
                    {(() => {
                      const narrationScenes = result.scenes.filter((s) => s.narration?.trim()).length;
                      const allVideosReady = totalVideosGenerated >= result.scenes.length;
                      const allVoiceReady = totalVoiceReady >= narrationScenes;
                      const missingItems: string[] = [];
                      if (!allVideosReady) missingItems.push(`${result.scenes.length - totalVideosGenerated} scene video${result.scenes.length - totalVideosGenerated !== 1 ? 's' : ''}`);
                      if (!allVoiceReady && narrationScenes > 0) missingItems.push(`${narrationScenes - totalVoiceReady} voice narration${narrationScenes - totalVoiceReady !== 1 ? 's' : ''}`);
                      const renderFullyReady = allVideosReady && allVoiceReady;

                      /* Stage-specific rendering display */
                      if (rendering && renderStage) {
                        return (
                          <div className="rounded-xl border border-blue-500/20 bg-blue-500/[0.04] p-4">
                            <div className="mb-3 flex items-center gap-2">
                              <Icon.Sparkles className="h-3.5 w-3.5 text-blue-400" />
                              <span className="text-[13px] font-semibold text-white/85">Rendering Final Video</span>
                            </div>
                            <div className="rounded-lg border border-blue-500/15 bg-[#0c0d12] px-4 py-4">
                              <div className="flex items-center gap-3">
                                <Icon.Spinner className="h-5 w-5 animate-spin text-blue-400" />
                                <div>
                                  <div className="text-[13px] font-medium text-blue-400">{renderStage}</div>
                                  <div className="mt-0.5 text-[11px] text-white/35">Scene {String(activeScene).padStart(2, '0')} &middot; {aspectRatio}</div>
                                </div>
                              </div>
                              {renderProgress > 0 && renderProgress < 100 && (
                                <div className="mt-4">
                                  <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-[10px] text-white/35">Progress</span>
                                    <span className="text-[10px] font-semibold text-blue-400/80">{renderProgress}%</span>
                                  </div>
                                  <div className="h-2 overflow-hidden rounded-full bg-blue-500/10">
                                    <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-700" style={{ width: `${renderProgress}%` }} />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }

                      /* Complete — final video ready */
                      if (finalVideo && !rendering) {
                        return (
                          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
                            <div className="mb-3 flex items-center gap-2">
                              <Icon.Check className="h-3.5 w-3.5 text-emerald-400" />
                              <span className="text-[13px] font-semibold text-emerald-400">Final Video Ready</span>
                            </div>
                            <video src={finalVideo} controls className="w-full rounded-lg bg-black" />
                            <div className="mt-3 flex items-center gap-3">
                              <button onClick={exportVideo} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 px-4 py-3 text-[13px] font-semibold text-white shadow-[0_4px_20px_-4px_rgba(52,211,153,0.4)] transition-all hover:shadow-[0_6px_28px_-4px_rgba(52,211,153,0.5)] active:scale-[0.985]">
                                <Icon.Download />Export Video
                              </button>
                              <button onClick={startRender} className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-[13px] font-medium text-white/60 transition-all hover:bg-white/[0.08] hover:text-white/80 active:scale-[0.985]">
                                Re-render
                              </button>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-white/35">
                              <span>{result.scenes.length} scenes</span>
                              <span>&middot;</span>
                              <span>{duration}</span>
                              <span>&middot;</span>
                              <span>{aspectRatio}</span>
                              <span>&middot;</span>
                              <span>{voice}</span>
                              <span>&middot;</span>
                              <span>{captions ? 'Captions ON' : 'Captions OFF'}</span>
                              <span>&middot;</span>
                              <span>{music}</span>
                            </div>
                          </div>
                        );
                      }

                      /* Default — readiness checklist + CTA */
                      return (
                        <div className="rounded-xl border border-white/[0.10] bg-white/[0.025] p-4">
                          <div className="mb-3 flex items-center gap-2">
                            <Icon.Sparkles className="h-3.5 w-3.5 text-white/50" />
                            <span className="text-[13px] font-semibold text-white/85">Final Video</span>
                            {renderFullyReady && <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[8px] font-bold text-emerald-400">READY</span>}
                          </div>

                          {/* Readiness checklist */}
                          <div className="mb-3 space-y-1.5">
                            <div className="flex items-center gap-2 rounded-lg bg-white/[0.02] px-3 py-2">
                              {allVideosReady ? (
                                <Icon.Check className="h-3.5 w-3.5 text-emerald-400" />
                              ) : (
                                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-white/20 text-[8px] font-bold text-white/40">{totalVideosGenerated}</span>
                              )}
                              <span className="text-[12px] text-white/70">Scene videos</span>
                              <span className={`ml-auto text-[12px] font-semibold ${allVideosReady ? 'text-emerald-400' : 'text-white/50'}`}>{totalVideosGenerated} / {result.scenes.length}</span>
                            </div>
                            <div className="flex items-center gap-2 rounded-lg bg-white/[0.02] px-3 py-2">
                              {allVoiceReady ? (
                                <Icon.Check className="h-3.5 w-3.5 text-emerald-400" />
                              ) : narrationScenes > 0 ? (
                                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-white/20 text-[8px] font-bold text-white/40">{totalVoiceReady}</span>
                              ) : (
                                <Icon.Check className="h-3.5 w-3.5 text-emerald-400/40" />)}
                              <span className="text-[12px] text-white/70">Voice narration</span>
                              <span className={`ml-auto text-[12px] font-semibold ${allVoiceReady ? 'text-emerald-400' : 'text-white/50'}`}>{narrationScenes > 0 ? `${totalVoiceReady} / ${narrationScenes}` : 'None needed'}</span>
                            </div>
                            <div className="flex items-center gap-2 rounded-lg bg-white/[0.02] px-3 py-2">
                              <Icon.Check className="h-3.5 w-3.5 text-emerald-400/60" />
                              <span className="text-[12px] text-white/70">Music</span>
                              <span className="ml-auto text-[12px] font-semibold text-white/50">{music}</span>
                            </div>
                            <div className="flex items-center gap-2 rounded-lg bg-white/[0.02] px-3 py-2">
                              <Icon.Check className="h-3.5 w-3.5 text-emerald-400/60" />
                              <span className="text-[12px] text-white/70">Captions</span>
                              <span className={`ml-auto rounded px-1.5 py-0.5 text-[9px] font-bold ${captions ? 'bg-white text-black' : 'bg-white/[0.06] text-white/40'}`}>{captions ? 'ON' : 'OFF'}</span>
                            </div>
                          </div>

                          {/* What's missing */}
                          {!renderFullyReady && missingItems.length > 0 && (
                            <div className="mb-3 rounded-lg border border-amber-500/10 bg-amber-500/[0.03] px-3 py-2">
                              <div className="text-[10px] font-medium text-amber-400/70">
                                Missing: {missingItems.join(', ')}
                              </div>
                            </div>
                          )}

                          {/* CTA button */}
                          <button onClick={startRender} disabled={!renderFullyReady} className={`w-full rounded-xl px-4 py-3.5 text-[13px] font-semibold transition-all active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none ${renderFullyReady ? 'bg-gradient-to-b from-white to-white/90 text-black shadow-[0_4px_20px_-4px_rgba(255,255,255,0.25)] hover:shadow-[0_6px_28px_-4px_rgba(255,255,255,0.35)]' : 'bg-white/[0.05] border border-white/[0.08] text-white/40'}`}>
                            {renderFullyReady ? (
                              <span className="flex items-center justify-center gap-2"><Icon.Sparkles className="h-4 w-4" />Render Final Video</span>
                            ) : (
                              <span className="flex items-center justify-center gap-2">Render Final Video</span>
                            )}
                          </button>

                          {!renderFullyReady && !rendering && (
                            <p className="mt-2 text-center text-[10px] text-white/25">
                              {missingItems.length > 0 ? `Generate ${missingItems.join(' and ')} before rendering.` : 'Complete all scene productions to render.'}
                            </p>
                          )}
                        </div>
                      );
                    })()}
                  </>)}
                </div>
              </div>
            </div>



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
                        {result.scenes.length > 1 && (
                          <button onClick={(e) => { e.stopPropagation(); deleteScene(scene.id); }} aria-label="Delete scene"
                            className="flex h-5 w-5 items-center justify-center rounded text-white/15 transition-colors hover:bg-red-500/10 hover:text-red-400/60">
                            <Icon.Trash />
                          </button>
                        )}
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
        <div id="projects" className="mx-auto mt-16 max-w-5xl">
          {/* Header */}
          <div className="mb-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white">Projects</h2>
                <p className="mt-1 text-[13px] text-white/45">Your video library</p>
              </div>
              <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-white to-white/90 px-5 py-2.5 text-[13px] font-semibold text-black shadow-[0_2px_12px_-4px_rgba(255,255,255,0.2)] transition-all hover:shadow-[0_4px_20px_-4px_rgba(255,255,255,0.3)] active:scale-[0.98]">
                <Icon.Plus className="h-3.5 w-3.5" />New Video
              </button>
            </div>
          </div>

          {/* Search + Filters + Stats */}
          {projects.length > 0 && (
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                {/* Search */}
                <div className="relative">
                  <svg className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                  <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search projects..." className="h-9 w-52 rounded-lg border border-white/[0.08] bg-white/[0.03] pl-8 pr-3 text-[12px] text-white/80 outline-none placeholder:text-white/30 focus:border-white/[0.15] focus:bg-white/[0.05] transition-all" />
                </div>
                {/* Filters */}
                <div className="flex gap-1 rounded-lg bg-white/[0.03] p-0.5">
                  {(["all", "completed", "in-progress"] as const).map((f) => (
                    <button key={f} onClick={() => setProjectFilter(f)} className={`rounded-md px-3 py-1.5 text-[11px] font-medium transition-all ${projectFilter === f ? 'bg-white/[0.08] text-white/90' : 'text-white/40 hover:text-white/55'}`}>{f === 'all' ? 'All' : f === 'completed' ? 'Done' : 'Active'}</button>
                  ))}
                </div>
              </div>
              {/* Stats + Import */}
              <div className="flex items-center gap-3 text-[11px] text-white/40">
                <span>{projects.length} project{projects.length !== 1 ? 's' : ''}</span>
                <span className="text-white/15">|</span>
                <span>{projects.filter((p) => { const ic = p.sceneImages ? Object.keys(p.sceneImages).length : 0; const vc = p.sceneVideos ? Object.keys(p.sceneVideos).length : 0; const sc = p.result?.scenes?.length || 0; return sc > 0 && ic >= sc && vc >= sc; }).length} completed</span>
                <span className="text-white/15">|</span>
                <button onClick={() => importFileRef.current?.click()} className="text-emerald-400/70 hover:text-emerald-400 transition-colors">Import</button>
                <input ref={importFileRef} type="file" accept=".json" onChange={handleImportFile} className="hidden" />
              </div>
            </div>
          )}

          {/* Empty state */}
          {projects.length === 0 ? (
            <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.02] to-transparent p-12 text-center sm:p-16">
              <div className="pointer-events-none absolute inset-0 -z-10">
                <div className="absolute left-1/2 top-0 h-[200px] w-[400px] -translate-x-1/2 rounded-full bg-gradient-to-b from-purple-500/[0.03] to-transparent blur-3xl" />
              </div>
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03]">
                <Icon.Film className="h-7 w-7 text-white/25" />
              </div>
              <h3 className="text-[16px] font-semibold text-white/70">No videos yet</h3>
              <p className="mx-auto mt-2 max-w-[300px] text-[13px] leading-relaxed text-white/35">Your completed videos will appear here. Create your first one with a simple idea.</p>
              <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-white to-white/90 px-5 py-2.5 text-[13px] font-semibold text-black shadow-[0_2px_12px_-4px_rgba(255,255,255,0.2)] transition-all hover:shadow-[0_4px_20px_-4px_rgba(255,255,255,0.3)] active:scale-[0.98]">
                <Icon.Sparkles className="h-3.5 w-3.5" />Create your first video
              </button>
            </div>
          ) : (() => {
            const filtered = projects.filter((p) => {
              const matchesSearch = !searchQuery || p.title.toLowerCase().includes(searchQuery.toLowerCase());
              const imageCount = p.sceneImages ? Object.keys(p.sceneImages).length : 0;
              const videoCount = p.sceneVideos ? Object.keys(p.sceneVideos).length : 0;
              const isComplete = imageCount >= 5 && videoCount >= 5;
              const matchesFilter = projectFilter === 'all' || (projectFilter === 'completed' && isComplete) || (projectFilter === 'in-progress' && !isComplete);
              return matchesSearch && matchesFilter;
            });

            if (filtered.length === 0) {
              return (
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-10 text-center">
                  <div className="text-[14px] font-medium text-white/55">No projects found</div>
                  <button onClick={() => { setSearchQuery(''); setProjectFilter('all'); }} className="mt-3 text-[12px] text-emerald-400/70 hover:text-emerald-400">Clear search</button>
                </div>
              );
            }

            return (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((project) => {
                  const imageCount = project.sceneImages ? Object.keys(project.sceneImages).length : 0;
                  const videoCount = project.sceneVideos ? Object.keys(project.sceneVideos).length : 0;
                  const scenes = project.result?.scenes || [];
                  const sceneCount = scenes.length || 5;
                  const hasFinalVideo = !!project.finalVideoUrl;
                  const isComplete = imageCount >= scenes.length && videoCount >= scenes.length && scenes.length > 0;
                  const firstImage = project.sceneImages ? Object.values(project.sceneImages)[0] : null;
                  const totalDur = scenes.reduce((sum: number, s: { sceneDuration?: string }) => sum + (parseInt(s.sceneDuration || '10') || 10), 0) || 50;
                  const scenesReady = Math.min(imageCount, videoCount);
                  return (
                    <div key={project.id} className="group relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02] transition-all duration-300 hover:border-white/[0.15] hover:bg-white/[0.03] hover:-translate-y-0.5 hover:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.5)]">
                      {/* Thumbnail */}
                      <button onClick={() => loadProject(project)} className="block w-full text-left">
                        <div className="relative aspect-video overflow-hidden bg-[#0c0d12]">
                          {firstImage ? (
                            <img src={firstImage} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <Icon.Film className="h-8 w-8 text-white/10" />
                            </div>
                          )}
                          {/* Gradient overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                          {/* Play overlay on hover */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.12] opacity-0 backdrop-blur-sm transition-all duration-300 group-hover:opacity-100 group-hover:scale-100 scale-90">
                              <Icon.Play className="ml-0.5 h-5 w-5 text-white/90" />
                            </div>
                          </div>
                          {/* Status badge */}
                          <div className="absolute left-3 top-3">
                            <span className={`rounded-md px-2 py-0.5 text-[9px] font-bold tracking-wide backdrop-blur-sm ${isComplete ? 'bg-emerald-500/25 text-emerald-400 border border-emerald-500/25' : 'bg-amber-500/25 text-amber-400 border border-amber-500/20'}`}>{isComplete ? 'COMPLETED' : 'IN PROGRESS'}</span>
                          </div>
                          {hasFinalVideo && (
                            <div className="absolute right-3 top-3">
                              <span className="rounded-md bg-violet-500/25 border border-violet-500/25 px-2 py-0.5 text-[9px] font-bold tracking-wide text-violet-400 backdrop-blur-sm">FINAL VIDEO</span>
                            </div>
                          )}
                          {/* Progress on thumbnail */}
                          <div className="absolute bottom-3 left-3 right-3">
                            <div className="flex items-center gap-2">
                              <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
                                <div className="h-full rounded-full bg-emerald-400 transition-all duration-500" style={{ width: `${((imageCount + videoCount) / 10) * 100}%` }} />
                              </div>
                              <span className="text-[9px] font-semibold text-white/70">{scenesReady}/5</span>
                            </div>
                          </div>
                        </div>
                      </button>

                      {/* Card body */}
                      <div className="p-3.5">
                        <button onClick={() => loadProject(project)} className="block w-full text-left">
                          <div className="truncate text-[13px] font-semibold text-white/85 group-hover:text-white transition-colors">{project.title}</div>
                        </button>
                        <div className="mt-1.5 flex items-center gap-2 text-[10px] text-white/40">
                          <span>{project.style}</span>
                          <span className="text-white/15">|</span>
                          <span>{totalDur}s</span>
                          <span className="text-white/15">|</span>
                          <span>{project.language}</span>
                        </div>

                        {/* Progress dots */}
                        <div className="mt-3 flex items-center gap-1.5">
                          <div className="flex gap-0.5">
                            {Array.from({ length: Math.min(sceneCount, 10) }).map((_, i) => (
                              <div key={i} className={`h-1.5 w-1.5 rounded-full transition-colors ${i < scenesReady ? 'bg-emerald-400' : 'bg-white/[0.08]'}`} />
                            ))}
                          </div>
                          <span className="text-[9px] text-white/30 ml-1">{scenesReady}/{sceneCount} scenes</span>
                        </div>

                        {/* Actions */}
                        <div className="mt-3 flex items-center gap-2 border-t border-white/[0.05] pt-3">
                          <button onClick={() => loadProject(project)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white/[0.08] py-2 text-[11px] font-medium text-white/70 transition-all hover:bg-white/[0.12] hover:text-white/90 active:scale-[0.98]">
                            <Icon.Folder className="h-3 w-3 text-white/50" />Open
                          </button>
                          <button onClick={() => duplicateProject(project)} aria-label="Duplicate" className="flex h-8 w-8 items-center justify-center rounded-lg text-white/30 transition-all hover:bg-white/[0.06] hover:text-white/55">
                            <Icon.Copy2 />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(project.id); }} aria-label="Delete" className="flex h-8 w-8 items-center justify-center rounded-lg text-white/25 transition-all hover:bg-red-500/10 hover:text-red-400/70">
                            <Icon.Trash />
                          </button>
                          <div className="ml-auto">
                            {project.createdAt && <span className="text-[9px] text-white/25">{new Date(project.createdAt).toLocaleDateString()}</span>}
                          </div>
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
            <div className="mx-4 w-full max-w-lg rounded-2xl border border-white/[0.10] bg-[#111218] shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
                <div>
                  <h3 className="text-[15px] font-semibold text-white/90">Characters</h3>
                  <p className="mt-0.5 text-[11px] text-white/40">Characters help keep visual appearance consistent across scenes.</p>
                </div>
                <button onClick={() => setShowCharacters(false)} aria-label="Close" className="flex h-7 w-7 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/70"><Icon.X /></button>
              </div>

              {/* Character list */}
              <div className="max-h-[55vh] overflow-y-auto px-6 py-4 space-y-3">
                {characters.length === 0 && (
                  <div className="rounded-xl border border-dashed border-white/[0.10] bg-white/[0.015] py-8 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.04]">
                      <Icon.User className="h-5 w-5 text-white/25" />
                    </div>
                    <p className="text-[13px] font-medium text-white/55">No characters yet</p>
                    <p className="mt-1 text-[11px] text-white/30">Add characters to keep them visually consistent across all scenes.</p>
                  </div>
                )}
                {characters.map((c, i) => {
                  const realIdx = i;
                  const usedInScenes = result ? result.scenes.filter((s) => (sceneCharacters[s.id] || []).includes(realIdx)) : [];
                  const colorCls = CHAR_COLORS[realIdx % CHAR_COLORS.length];
                  return (
                    <div key={i} className="rounded-xl border border-white/[0.08] bg-white/[0.025] overflow-hidden transition-all hover:border-white/[0.12]">
                      {/* Card header */}
                      <div className="flex items-center gap-3 px-4 py-3">
                        <span className={'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-[11px] font-bold ' + colorCls}>
                          {c.name?.trim() ? getInitials(c.name) : <Icon.User className="h-4 w-4 text-white/30" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <input value={c.name} onChange={(e) => { const next = [...characters]; next[i] = { ...next[i], name: e.target.value }; setCharacters(next); setSaved(false); }} placeholder="Character name" className="w-full bg-transparent text-[13px] font-semibold text-white/85 outline-none placeholder:text-white/25" />
                          <div className="flex items-center gap-2">
                            {c.role ? <span className="text-[10px] text-white/40">{c.role}</span> : <span className="text-[10px] text-white/20">No role set</span>}
                            <span className="text-[9px] text-white/15">|</span>
                            <span className={`text-[9px] font-medium ${usedInScenes.length > 0 ? 'text-emerald-400/60' : 'text-white/20'}`}>
                              {usedInScenes.length > 0 ? `Used in ${usedInScenes.length} scene${usedInScenes.length !== 1 ? 's' : ''}` : 'Not in any scene'}
                            </span>
                          </div>
                        </div>
                        <button onClick={() => { setCharacters(characters.filter((_, j) => j !== i)); setSaved(false); }} aria-label={'Delete ' + (c.name || 'character')} className="flex h-6 w-6 items-center justify-center rounded-md text-white/25 transition-colors hover:bg-red-500/10 hover:text-red-400/80">
                          <Icon.Trash />
                        </button>
                      </div>
                      {/* Card fields */}
                      <div className="grid grid-cols-2 gap-2 border-t border-white/[0.04] px-4 py-2.5">
                        <div>
                          <label className="mb-1 block text-[8px] font-bold uppercase tracking-wider text-white/25">Role</label>
                          <input value={c.role} onChange={(e) => { const next = [...characters]; next[i] = { ...next[i], role: e.target.value }; setCharacters(next); setSaved(false); }} placeholder="e.g. Explorer, Villain" className="w-full rounded-md border border-white/[0.06] bg-[#0c0d12] px-2 py-1.5 text-[11px] text-white/70 outline-none transition-colors focus:border-white/[0.15] placeholder:text-white/15" />
                        </div>
                        <div>
                          <label className="mb-1 block text-[8px] font-bold uppercase tracking-wider text-white/25">Appearance</label>
                          <input value={c.appearance} onChange={(e) => { const next = [...characters]; next[i] = { ...next[i], appearance: e.target.value }; setCharacters(next); setSaved(false); }} placeholder="e.g. Brown hair, blue jacket" className="w-full rounded-md border border-white/[0.06] bg-[#0c0d12] px-2 py-1.5 text-[11px] text-white/70 outline-none transition-colors focus:border-white/[0.15] placeholder:text-white/15" />
                        </div>
                      </div>
                      <div className="border-t border-white/[0.04] px-4 py-2.5">
                        <label className="mb-1 block text-[8px] font-bold uppercase tracking-wider text-white/25">Description</label>
                        <input value={c.description} onChange={(e) => { const next = [...characters]; next[i] = { ...next[i], description: e.target.value }; setCharacters(next); setSaved(false); }} placeholder="Personality, background (optional)" className="w-full rounded-md border border-white/[0.06] bg-[#0c0d12] px-2 py-1.5 text-[11px] text-white/70 outline-none transition-colors focus:border-white/[0.15] placeholder:text-white/15" />
                      </div>
                      {usedInScenes.length > 0 && (
                        <div className="border-t border-white/[0.04] bg-white/[0.015] px-4 py-2">
                          <div className="flex flex-wrap gap-1">
                            {usedInScenes.map((s) => {
                              const sIdx = result ? result.scenes.findIndex((sc) => sc.id === s.id) : -1;
                              return (
                                <span key={s.id} className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[8px] font-bold text-emerald-400/60">
                                  Scene {(sIdx >= 0 ? sIdx + 1 : s.id).toString().padStart(2, '0')}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="border-t border-white/[0.06] px-6 py-3">
                <button onClick={() => { setCharacters([...characters, { name: "", description: "", appearance: "", role: "" }]); setSaved(false); }} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.10] bg-white/[0.02] px-4 py-2.5 text-[12px] font-medium text-white/50 transition-all hover:border-violet-500/20 hover:bg-violet-500/[0.03] hover:text-white/65">
                  <Icon.Plus className="h-3.5 w-3.5" />Add character
                </button>
                <button onClick={() => setShowCharacters(false)} className="mt-2 w-full rounded-xl bg-white/[0.08] px-4 py-2.5 text-[12px] font-medium text-white/70 transition-all hover:bg-white/[0.12] hover:text-white/90">Done</button>
              </div>
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
