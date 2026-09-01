"use client";

import { useRef } from "react";
import { Icon } from "@/components/icons";
import { getInitials, CHAR_COLORS, type Scene, type StoryResult, type Character } from "./types";

interface WorkspaceViewProps {
  result: StoryResult;
  activeScene: number;
  projectName: string;
  setProjectName: (v: string) => void;
  sceneImages: Record<number, string>;
  sceneVideos: Record<number, string>;
  sceneStatus: Record<number, string>;
  voiceStatus: Record<number, "idle" | "generating" | "ready">;
  voiceAudios: Record<number, string>;
  characters: Character[];
  sceneCharacters: Record<number, number[]>;
  currentScene: Scene | null;
  totalImagesGenerated: number;
  totalVideosGenerated: number;
  totalVoiceReady: number;
  totalDurationFormatted: string;
  rendering: boolean;
  renderStage: string;
  finalVideo: string | null;
  saved: boolean;
  hasUnsavedChanges: boolean;
  saveStatus: string;
  music: string;
  captions: boolean;
  // Actions
  onSwitchScene: (id: number) => void;
  onStartImage: (id: number) => void;
  onStartVideo: (id: number) => void;
  onStartVoice: (id: number) => void;
  onPlayVoice: (id: number) => void;
  onStopVoice: () => void;
  onCancelGeneration: (id: number) => void;
  onStartRender: () => void;
  onExportVideo: () => void;
  onSaveProject: () => void;
  onDuplicateScene: (id: number) => void;
  onDeleteScene: (id: number) => void;
  onMoveScene: (id: number, dir: -1 | 1) => void;
  onSetDeleteSceneConfirm: (id: number | null) => void;
  deleteSceneConfirmId: number | null;
}

export function WorkspaceView({
  result, activeScene, projectName, setProjectName,
  sceneImages, sceneVideos, sceneStatus, voiceStatus, voiceAudios,
  characters, sceneCharacters, currentScene,
  totalImagesGenerated, totalVideosGenerated, totalVoiceReady,
  totalDurationFormatted, rendering, renderStage, finalVideo,
  saved, hasUnsavedChanges, saveStatus, music, captions,
  onSwitchScene, onStartImage, onStartVideo, onStartVoice,
  onPlayVoice, onStopVoice, onCancelGeneration,
  onStartRender, onExportVideo, onSaveProject,
  onDuplicateScene, onDeleteScene, onMoveScene,
  onSetDeleteSceneConfirm, deleteSceneConfirmId,
}: WorkspaceViewProps) {
  const totalScenes = result.scenes.length;
  const totalVideosReady = totalVideosGenerated >= totalScenes;
  const narrationScenes = result.scenes.filter((s) => s.narration?.trim()).length;
  const allVoiceReady = totalVoiceReady >= narrationScenes;
  const renderReady = totalVideosReady && allVoiceReady;

  return (
    <div className="min-h-[calc(100vh-48px)] flex flex-col bg-[#08090c]">
      {/* ── Workspace header ── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.04]">
        <div className="flex items-center gap-3 min-w-0">
          <input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="bg-transparent text-[14px] font-semibold text-white/80 outline-none w-56 truncate"
          />
          {saveStatus === "saving" && <span className="text-[11px] text-amber-400/60">Saving...</span>}
          {saved && !hasUnsavedChanges && <span className="text-[11px] text-emerald-400/40">Saved</span>}
          {hasUnsavedChanges && <span className="text-[11px] text-white/20">Unsaved</span>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onSaveProject} className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition-all ${hasUnsavedChanges ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15" : "text-white/35 hover:text-white/55 hover:bg-white/[0.04]"}`}>
            Save
          </button>
          <button onClick={onExportVideo} disabled={!finalVideo} className="rounded-md bg-white px-3.5 py-1.5 text-[12px] font-semibold text-[#08090c] transition-all hover:bg-white/90 disabled:opacity-15 disabled:cursor-not-allowed">
            Export
          </button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* ── Left: Scene storyboard ── */}
        <aside className="hidden lg:flex w-56 flex-shrink-0 flex-col border-r border-white/[0.04] bg-[#0a0b0e]">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/[0.04]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-white/30">Scenes</span>
            <span className="text-[10px] text-white/15">{totalScenes}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
            {result.scenes.map((scene, sceneIdx) => {
              const hasImg = !!sceneImages[scene.id];
              const hasVid = !!sceneVideos[scene.id];
              const hasVoc = voiceStatus[scene.id] === "ready";
              const isGen = sceneStatus[scene.id]?.startsWith("image") || sceneStatus[scene.id]?.startsWith("video");
              const isComplete = hasImg && hasVid && hasVoc;
              const isActive = activeScene === scene.id;
              return (
                <button
                  key={scene.id}
                  onClick={() => onSwitchScene(scene.id)}
                  className={`group flex w-full gap-2 rounded-lg p-2 text-left transition-all ${isActive ? "bg-white/[0.05]" : "hover:bg-white/[0.02]"}`}
                >
                  {/* Thumbnail */}
                  <div className="relative h-12 w-16 flex-shrink-0 overflow-hidden rounded-md bg-[#14161c]">
                    {hasImg ? (
                      <img src={sceneImages[scene.id]} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <span className="text-[11px] font-bold text-white/15">{String(sceneIdx + 1).padStart(2, "0")}</span>
                      </div>
                    )}
                    {isGen && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                        <Icon.Spinner className="h-3.5 w-3.5 animate-spin text-white" />
                      </div>
                    )}
                    {isActive && <div className="absolute inset-0 border-2 border-indigo-400/50 rounded-md" />}
                  </div>
                  <div className="min-w-0 flex-1 flex flex-col justify-center">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold ${isActive ? "text-indigo-400" : "text-white/20"}`}>
                        {String(sceneIdx + 1).padStart(2, "0")}
                      </span>
                      <span className={`truncate text-[12px] font-medium ${isActive ? "text-white/90" : "text-white/50"}`}>
                        {scene.title}
                      </span>
                    </div>
                    {/* Status dots — proper icons, not abbreviations */}
                    <div className="mt-1 flex items-center gap-1.5">
                      <StatusDot has={hasImg} color="emerald" tooltip="Image" />
                      <StatusDot has={hasVid} color="blue" tooltip="Video" />
                      <StatusDot has={hasVoc} color="violet" tooltip="Voice" />
                    </div>
                  </div>
                  {isComplete && <Icon.Check className="h-3 w-3 text-emerald-400/50 flex-shrink-0 mt-1" />}
                </button>
              );
            })}
          </div>
        </aside>

        {/* ── Center: Preview + controls ── */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Mobile scene tabs */}
          <div className="flex gap-1 overflow-x-auto p-2 lg:hidden border-b border-white/[0.04]">
            {result.scenes.map((scene, sceneIdx) => {
              const hasImg = !!sceneImages[scene.id];
              const hasVid = !!sceneVideos[scene.id];
              const isActive = activeScene === scene.id;
              return (
                <button key={scene.id} onClick={() => onSwitchScene(scene.id)} className={`flex-shrink-0 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-medium transition-all ${isActive ? "bg-white/[0.08] text-white" : "text-white/35"}`}>
                  {String(sceneIdx + 1).padStart(2, "0")}
                  {(hasImg || hasVid) && (
                    <span className={`h-1.5 w-1.5 rounded-full ${hasVid ? "bg-blue-400" : "bg-emerald-400"}`} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Scene header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.04]">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[13px] font-bold text-white/80">Scene {String(activeScene).padStart(2, "0")}</span>
              <span className="text-white/10">·</span>
              <span className="text-[13px] text-white/40 truncate">{currentScene?.title}</span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {currentScene && (() => {
                const hasImg = !!sceneImages[currentScene.id];
                const hasVid = !!sceneVideos[currentScene.id];
                const hasVoc = voiceStatus[currentScene.id] === "ready";
                const isGen = sceneStatus[currentScene.id]?.startsWith("image") || sceneStatus[currentScene.id]?.startsWith("video");
                if (hasImg && hasVid && hasVoc) return <span className="rounded-md bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400">Complete</span>;
                if (isGen) return <span className="flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-400"><Icon.Spinner className="h-3 w-3 animate-spin" />Generating</span>;
                if (hasVid) return <span className="rounded-md bg-blue-500/10 px-2.5 py-1 text-[11px] font-medium text-blue-400">Video ready</span>;
                if (hasImg) return <span className="rounded-md bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400">Image ready</span>;
                return <span className="rounded-md bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-white/25">Not started</span>;
              })()}
            </div>
          </div>

          {/* Video Preview — THE VISUAL ANCHOR */}
          <div className="flex-1 flex items-center justify-center p-4 sm:p-6 bg-[#05060a]">
            <div className="w-full max-w-4xl">
              <div className="video-surface rounded-lg border border-white/[0.05]">
                {currentScene && sceneStatus[currentScene.id] === "image" ? (
                  <div className="flex aspect-video flex-col items-center justify-center bg-[#0a0b0e]">
                    <Icon.Spinner className="h-7 w-7 animate-spin text-amber-400/40 mb-3" />
                    <span className="text-[14px] font-medium text-white/45">Creating visual</span>
                    <span className="mt-1 text-[12px] text-white/20">This may take a moment...</span>
                  </div>
                ) : currentScene && sceneStatus[currentScene.id]?.startsWith("video") ? (
                  <div className="flex aspect-video flex-col items-center justify-center bg-[#0a0b0e]">
                    <Icon.Spinner className="h-7 w-7 animate-spin text-indigo-400/40 mb-3" />
                    <span className="text-[14px] font-medium text-white/45">Generating motion</span>
                    <span className="mt-1 text-[12px] text-white/20">This may take several minutes...</span>
                  </div>
                ) : currentScene && sceneVideos[currentScene.id] ? (
                  <video src={sceneVideos[currentScene.id]} controls className="aspect-video w-full object-cover bg-black" poster={sceneImages[currentScene.id]} />
                ) : currentScene && sceneImages[currentScene.id] ? (
                  <div className="relative">
                    <img src={sceneImages[currentScene.id]} alt={currentScene.title} className="aspect-video w-full object-cover" />
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-5">
                      <span className="text-[12px] font-medium text-white/60">Image ready — generate motion to animate</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex aspect-video flex-col items-center justify-center bg-[#0a0b0e]">
                    <Icon.Image className="h-10 w-10 text-white/8 mb-3" />
                    <span className="text-[14px] text-white/30">Generate an image to begin</span>
                  </div>
                )}
              </div>

              {/* Generation controls — prominent buttons, not tiny cards */}
              {currentScene && (
                <div className="mt-4 flex gap-2 flex-wrap">
                  <GenButton
                    label="Image"
                    icon={<Icon.Image className="h-3.5 w-3.5" />}
                    status={sceneStatus[currentScene.id] === "image" ? "generating" : sceneImages[currentScene.id] ? "ready" : "idle"}
                    onClick={() => onStartImage(currentScene.id)}
                    onCancel={() => onCancelGeneration(currentScene.id)}
                  />
                  <GenButton
                    label="Video"
                    icon={<Icon.Video className="h-3.5 w-3.5" />}
                    status={sceneStatus[currentScene.id]?.startsWith("video") ? "generating" : sceneVideos[currentScene.id] ? "ready" : sceneImages[currentScene.id] ? "idle" : "disabled"}
                    onClick={() => onStartVideo(currentScene.id)}
                    onCancel={() => onCancelGeneration(currentScene.id)}
                  />
                  <GenButton
                    label="Voice"
                    icon={<Icon.Mic className="h-3.5 w-3.5" />}
                    status={voiceStatus[currentScene.id] === "generating" ? "generating" : voiceStatus[currentScene.id] === "ready" ? "ready" : currentScene.narration?.trim() ? "idle" : "disabled"}
                    onClick={() => onStartVoice(currentScene.id)}
                  />
                  {voiceStatus[currentScene.id] === "ready" && (
                    <button onClick={() => onPlayVoice(currentScene.id)} className="flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-3.5 py-2 text-[12px] font-medium text-white/50 hover:bg-white/[0.06] hover:text-white/70 transition-all">
                      <Icon.Play className="h-3 w-3" /> Play
                    </button>
                  )}
                </div>
              )}

              {/* Batch + Render row */}
              <div className="mt-3 flex gap-2 flex-wrap items-center">
                {totalImagesGenerated < totalScenes && (
                  <button onClick={() => result.scenes.forEach((s) => { if (!sceneImages[s.id]) onStartImage(s.id); })} className="rounded-lg border border-white/[0.05] bg-white/[0.02] px-4 py-2 text-[12px] font-medium text-white/40 hover:text-white/60 hover:bg-white/[0.04] transition-all">
                    Generate all images
                  </button>
                )}
                {totalVideosGenerated < totalImagesGenerated && (
                  <button onClick={() => result.scenes.forEach((s) => { if (!sceneVideos[s.id] && sceneImages[s.id]) onStartVideo(s.id); })} className="rounded-lg border border-white/[0.05] bg-white/[0.02] px-4 py-2 text-[12px] font-medium text-white/40 hover:text-white/60 hover:bg-white/[0.04] transition-all">
                    Generate all videos
                  </button>
                )}
                {renderReady && !rendering && (
                  <button onClick={onStartRender} className="ml-auto rounded-lg bg-white px-4 py-2 text-[12px] font-semibold text-[#08090c] hover:bg-white/90 transition-all">
                    Render final video
                  </button>
                )}
                {rendering && (
                  <div className="ml-auto flex items-center gap-2 rounded-lg border border-indigo-500/[0.12] bg-indigo-500/[0.03] px-4 py-2 text-[12px] font-medium text-indigo-400/70">
                    <Icon.Spinner className="h-3.5 w-3.5 animate-spin" />
                    {renderStage || "Rendering..."}
                  </div>
                )}
                {finalVideo && !rendering && (
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-[11px] text-emerald-400/60 font-medium">Video ready</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Timeline — visual scene strip */}
          <div className="border-t border-white/[0.04] px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-white/25">Timeline</span>
                <span className="text-[11px] text-white/15">{totalDurationFormatted}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-white/15">
                {captions && <span className="rounded bg-white/[0.04] px-1.5 py-0.5 font-medium text-white/25">CC</span>}
                {music !== "None" && <span className="rounded bg-white/[0.04] px-1.5 py-0.5 font-medium text-white/25">♫ {music}</span>}
              </div>
            </div>
            {/* Visual scene blocks */}
            <div className="flex gap-1 items-stretch">
              {result.scenes.map((scene, sceneIdx) => {
                const hasImg = !!sceneImages[scene.id];
                const hasVid = !!sceneVideos[scene.id];
                const isComplete = hasImg && hasVid;
                const isActive = activeScene === scene.id;
                const dur = parseInt(scene.sceneDuration || "10", 10) || 10;
                const totalDur = result.scenes.reduce((sum, s) => sum + (parseInt(s.sceneDuration || "10", 10) || 10), 0);
                const widthPct = Math.max(12, (dur / totalDur) * 100);
                return (
                  <button
                    key={scene.id}
                    onClick={() => onSwitchScene(scene.id)}
                    className={`relative rounded-md overflow-hidden transition-all flex-shrink-0 ${
                      isActive ? "ring-1 ring-indigo-400/40" : "hover:ring-1 hover:ring-white/10"
                    }`}
                    style={{ width: `${widthPct}%`, minHeight: 40 }}
                  >
                    {hasImg ? (
                      <img src={sceneImages[scene.id]} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 bg-[#14161c]" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-1 left-1.5 right-1.5 flex items-end justify-between">
                      <span className="text-[10px] font-bold text-white/70">{String(sceneIdx + 1).padStart(2, "0")}</span>
                      <span className="text-[9px] text-white/40">{dur}s</span>
                    </div>
                    {isComplete && (
                      <div className="absolute top-1 right-1">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </main>

        {/* ── Right: Scene details + editing ── */}
        <aside className="hidden xl:flex w-72 flex-shrink-0 flex-col border-l border-white/[0.04] bg-[#0a0b0e] overflow-y-auto">
          {currentScene && (
            <div className="p-4 space-y-4">
              {/* Scene info — editable */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-white/30">Scene</span>
                  {deleteSceneConfirmId === currentScene.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => { onDeleteScene(currentScene.id); onSetDeleteSceneConfirm(null); }} className="rounded bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-400 hover:bg-red-500/25">Delete</button>
                      <button onClick={() => onSetDeleteSceneConfirm(null)} className="rounded px-2 py-0.5 text-[10px] text-white/35 hover:text-white/55">Cancel</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button onClick={() => { const idx = result.scenes.findIndex(s => s.id === currentScene.id); if (idx > 0) onMoveScene(currentScene.id, -1); }} disabled={result.scenes.findIndex(s => s.id === currentScene.id) === 0} className="rounded p-1 text-white/20 hover:text-white/50 disabled:opacity-15"><Icon.ArrowLeft className="h-3 w-3" /></button>
                      <button onClick={() => { const idx = result.scenes.findIndex(s => s.id === currentScene.id); if (idx < result.scenes.length - 1) onMoveScene(currentScene.id, 1); }} disabled={result.scenes.findIndex(s => s.id === currentScene.id) === result.scenes.length - 1} className="rounded p-1 text-white/20 hover:text-white/50 disabled:opacity-15"><Icon.ArrowRight className="h-3 w-3" /></button>
                      <button onClick={() => onDuplicateScene(currentScene.id)} className="rounded p-1 text-white/20 hover:text-white/40"><Icon.Copy2 /></button>
                      {result.scenes.length > 1 && (
                        <button onClick={() => onSetDeleteSceneConfirm(currentScene.id)} className="rounded p-1 text-white/15 hover:text-red-400/60"><Icon.Trash /></button>
                      )}
                    </div>
                  )}
                </div>

                {/* Scene metadata */}
                <div className="rounded-lg border border-white/[0.04] bg-[#0e1015] p-3 space-y-3">
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-white/20">Title</label>
                    <p className="text-[13px] text-white/75 mt-0.5 font-medium">{currentScene.title}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-white/20">Visual prompt</label>
                    <p className="text-[12px] text-white/45 mt-0.5 leading-relaxed">{currentScene.visual || "No visual prompt"}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-white/20">Narration</label>
                    <p className="text-[12px] text-white/45 mt-0.5 leading-relaxed italic">{currentScene.narration || "No narration"}</p>
                  </div>
                  <div className="flex gap-4">
                    {currentScene.beat && (
                      <div>
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-white/20">Beat</label>
                        <p className="text-[11px] text-violet-400/50 mt-0.5">{currentScene.beat}</p>
                      </div>
                    )}
                    {currentScene.sceneDuration && (
                      <div>
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-white/20">Duration</label>
                        <p className="text-[11px] text-blue-400/50 mt-0.5">~{currentScene.sceneDuration}s</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Director camera */}
              {currentScene.directorCamera && (
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-white/20 block mb-1.5">Camera</label>
                  <div className="flex flex-wrap gap-1">
                    {[currentScene.directorCamera.shotType, currentScene.directorCamera.movement, currentScene.directorCamera.angle].filter(Boolean).map((tag) => (
                      <span key={tag} className="rounded bg-white/[0.03] px-2 py-0.5 text-[10px] text-white/35">{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Characters */}
              {characters.length > 0 && (
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-white/20 block mb-1.5">Characters</label>
                  <div className="space-y-1">
                    {characters.filter((c) => c.name?.trim()).map((c, i) => {
                      const realIdx = characters.indexOf(c);
                      const inScene = (sceneCharacters[currentScene.id] || []).includes(realIdx);
                      return (
                        <div key={i} className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${inScene ? "bg-emerald-500/[0.04]" : ""}`}>
                          <span className={`flex h-5 w-5 items-center justify-center rounded text-[8px] font-bold ${CHAR_COLORS[realIdx % CHAR_COLORS.length]}`}>
                            {getInitials(c.name)}
                          </span>
                          <span className="text-[11px] text-white/50">{c.name}</span>
                          {inScene && <span className="ml-auto text-[9px] text-emerald-400/40">in scene</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

/* ── Generation button ── */
function GenButton({ label, icon, status, onClick, onCancel }: {
  label: string;
  icon: React.ReactNode;
  status: "idle" | "generating" | "ready" | "disabled";
  onClick: () => void;
  onCancel?: () => void;
}) {
  if (status === "generating" && onCancel) {
    return (
      <button onClick={onCancel} className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 border border-amber-500/[0.15] px-3.5 py-2 text-[12px] font-medium text-amber-400 hover:bg-amber-500/15 transition-all">
        <Icon.Spinner className="h-3.5 w-3.5 animate-spin" />
        {label} — Cancel
      </button>
    );
  }
  if (status === "generating") {
    return (
      <div className="flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-3.5 py-2 text-[12px] font-medium text-white/40">
        <Icon.Spinner className="h-3.5 w-3.5 animate-spin" /> {label}...
      </div>
    );
  }
  if (status === "ready") {
    return (
      <div className="flex items-center gap-1.5 rounded-lg bg-emerald-500/[0.08] border border-emerald-500/[0.12] px-3.5 py-2 text-[12px] font-medium text-emerald-400">
        <Icon.Check className="h-3 w-3" /> {label}
      </div>
    );
  }
  if (status === "disabled") {
    return (
      <button disabled className="flex items-center gap-1.5 rounded-lg bg-white/[0.02] px-3.5 py-2 text-[12px] font-medium text-white/15 cursor-not-allowed">
        {icon} {label}
      </button>
    );
  }
  return (
    <button onClick={onClick} className="flex items-center gap-1.5 rounded-lg bg-white/[0.05] border border-white/[0.06] px-3.5 py-2 text-[12px] font-medium text-white/65 hover:bg-white/[0.08] hover:text-white/85 transition-all">
      {icon} {label}
    </button>
  );
}

/* ── Status dot ── */
function StatusDot({ has, color, tooltip }: { has: boolean; color: string; tooltip: string }) {
  const colorMap: Record<string, string> = {
    emerald: has ? "bg-emerald-400" : "bg-white/[0.06]",
    blue: has ? "bg-blue-400" : "bg-white/[0.06]",
    violet: has ? "bg-violet-400" : "bg-white/[0.06]",
  };
  return <span title={tooltip} className={`h-1.5 w-1.5 rounded-full ${colorMap[color] || "bg-white/[0.06]"}`} />;
}
