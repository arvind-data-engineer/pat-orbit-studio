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
    <div className="min-h-screen bg-[#0a0b0e]">
      {/* ── Top Bar ── */}
      <header className="sticky top-0 z-40 border-b border-white/[0.04] bg-[#0a0b0e]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-12 max-w-[1600px] items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 text-[10px] font-black text-white">P</div>
            <input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="bg-transparent text-[13px] font-semibold text-white/80 outline-none w-48"
            />
            {saveStatus === "saving" && <span className="text-[10px] text-amber-400/60">Saving...</span>}
            {saved && !hasUnsavedChanges && <span className="text-[10px] text-emerald-400/50">Saved</span>}
          </div>

          {/* Pipeline indicator */}
          <div className="hidden md:flex items-center gap-0.5">
            {(["IDEA", "STORY", "SCENES", "VISUALS", "MOTION", "AUDIO", "FINAL"] as const).map((stage, i, arr) => {
              const stageNum = i;
              const done = stageNum <= 2 || (stageNum === 3 && totalImagesGenerated >= totalScenes) || (stageNum === 4 && totalVideosGenerated >= totalScenes) || (stageNum === 5 && allVoiceReady) || (stageNum === 6 && !!finalVideo);
              return (
                <span key={stage} className="flex items-center">
                  <span className={`px-1.5 py-0.5 text-[9px] font-semibold tracking-wide rounded ${done ? "text-emerald-400/70" : "text-white/20"}`}>{stage}</span>
                  {i < arr.length - 1 && <span className="text-white/8 mx-0.5">·</span>}
                </span>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button onClick={onSaveProject} className={`rounded-md px-3 py-1.5 text-[11px] font-medium transition-all ${hasUnsavedChanges ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15" : "text-white/40 hover:text-white/60"}`}>
              {saved && !hasUnsavedChanges ? "Saved" : "Save"}
            </button>
            <button onClick={onExportVideo} disabled={!finalVideo} className="rounded-md bg-white px-3 py-1.5 text-[11px] font-semibold text-[#0a0b0e] transition-all hover:bg-white/90 disabled:opacity-20 disabled:cursor-not-allowed">
              Export
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] flex h-[calc(100vh-48px)]">
        {/* ── Left: Scene Sidebar ── */}
        <aside className="hidden lg:flex w-60 flex-shrink-0 flex-col border-r border-white/[0.04] bg-white/[0.01]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">Scenes</span>
            <span className="text-[10px] text-white/20">{totalScenes}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
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
                  className={`group flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-all ${isActive ? "bg-white/[0.06] border border-white/[0.08]" : "border border-transparent hover:bg-white/[0.03]"}`}
                >
                  {/* Thumbnail */}
                  <div className="relative h-9 w-12 flex-shrink-0 overflow-hidden rounded bg-white/[0.04]">
                    {hasImg ? (
                      <img src={sceneImages[scene.id]} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <span className="text-[9px] font-bold text-white/20">{String(sceneIdx + 1).padStart(2, "0")}</span>
                      </div>
                    )}
                    {isGen && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <Icon.Spinner className="h-3 w-3 animate-spin text-white" />
                      </div>
                    )}
                    {isActive && <div className="absolute inset-0 border border-indigo-400/40 rounded" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[9px] font-bold ${isActive ? "text-indigo-400" : "text-white/20"}`}>{String(sceneIdx + 1).padStart(2, "0")}</span>
                      <span className={`truncate text-[11px] font-medium ${isActive ? "text-white/85" : "text-white/55"}`}>{scene.title}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1">
                      <span className={`text-[7px] font-bold ${hasImg ? "text-emerald-400/60" : "text-white/10"}`}>IMG</span>
                      <span className={`text-[7px] font-bold ${hasVid ? "text-blue-400/60" : "text-white/10"}`}>VID</span>
                      <span className={`text-[7px] font-bold ${hasVoc ? "text-violet-400/60" : "text-white/10"}`}>VOC</span>
                    </div>
                  </div>
                  {isComplete && <Icon.Check className="h-3 w-3 text-emerald-400/60 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </aside>

        {/* ── Center: Preview + Timeline ── */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Mobile scene tabs */}
          <div className="flex gap-1 overflow-x-auto p-2 lg:hidden border-b border-white/[0.04]">
            {result.scenes.map((scene, sceneIdx) => (
              <button key={scene.id} onClick={() => onSwitchScene(scene.id)} className={`flex-shrink-0 rounded-md px-2.5 py-1 text-[10px] font-medium transition-all ${activeScene === scene.id ? "bg-white/[0.08] text-white" : "text-white/40"}`}>
                {String(sceneIdx + 1).padStart(2, "0")}
              </button>
            ))}
          </div>

          {/* Scene header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.04]">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[13px] font-bold text-white/80">Scene {String(activeScene).padStart(2, "0")}</span>
              <span className="text-white/15">·</span>
              <span className="text-[12px] text-white/45 truncate">{currentScene?.title}</span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {currentScene && (() => {
                const hasImg = !!sceneImages[currentScene.id];
                const hasVid = !!sceneVideos[currentScene.id];
                const hasVoc = voiceStatus[currentScene.id] === "ready";
                const isGen = sceneStatus[currentScene.id]?.startsWith("image") || sceneStatus[currentScene.id]?.startsWith("video");
                if (hasImg && hasVid && hasVoc) return <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[9px] font-semibold text-emerald-400">Complete</span>;
                if (isGen) return <span className="flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-[9px] font-semibold text-amber-400"><Icon.Spinner className="h-2 w-2 animate-spin" />Generating</span>;
                if (hasVid) return <span className="rounded bg-blue-500/10 px-2 py-0.5 text-[9px] font-semibold text-blue-400">Video ready</span>;
                if (hasImg) return <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[9px] font-semibold text-emerald-400">Image ready</span>;
                return <span className="rounded bg-white/[0.04] px-2 py-0.5 text-[9px] font-semibold text-white/30">Not started</span>;
              })()}
            </div>
          </div>

          {/* Video Preview */}
          <div className="flex-1 flex items-center justify-center p-5 bg-[#08090c]">
            <div className="w-full max-w-3xl">
              <div className="relative overflow-hidden rounded-lg border border-white/[0.06] bg-[#0c0d12]">
                {/* Preview states */}
                {currentScene && sceneStatus[currentScene.id] === "image" ? (
                  <div className="flex aspect-video flex-col items-center justify-center bg-[#0c0d12]">
                    <Icon.Spinner className="h-6 w-6 animate-spin text-amber-400/50 mb-3" />
                    <span className="text-[12px] font-medium text-white/50">Creating visual for {currentScene.title}</span>
                    <span className="mt-1 text-[10px] text-white/25">Preparing composition...</span>
                  </div>
                ) : currentScene && sceneStatus[currentScene.id]?.startsWith("video") ? (
                  <div className="flex aspect-video flex-col items-center justify-center bg-[#0c0d12]">
                    <Icon.Spinner className="h-6 w-6 animate-spin text-indigo-400/50 mb-3" />
                    <span className="text-[12px] font-medium text-white/50">Creating motion for {currentScene.title}</span>
                    <span className="mt-1 text-[10px] text-white/25">This may take several minutes...</span>
                  </div>
                ) : currentScene && sceneVideos[currentScene.id] ? (
                  <video src={sceneVideos[currentScene.id]} controls className="aspect-video w-full object-cover bg-black" poster={sceneImages[currentScene.id]} />
                ) : currentScene && sceneImages[currentScene.id] ? (
                  <div className="relative">
                    <img src={sceneImages[currentScene.id]} alt={currentScene.title} className="aspect-video w-full object-cover" />
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                      <span className="text-[10px] font-medium text-white/50">Image ready · Generate motion to continue</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex aspect-video flex-col items-center justify-center">
                    <Icon.Image className="h-8 w-8 text-white/10 mb-3" />
                    <span className="text-[12px] text-white/35">Generate an image to begin</span>
                  </div>
                )}
              </div>

              {/* Generation Controls */}
              {currentScene && (
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <GenButton
                    label="Image"
                    status={sceneStatus[currentScene.id] === "image" ? "generating" : sceneImages[currentScene.id] ? "ready" : "idle"}
                    onClick={() => onStartImage(currentScene.id)}
                    onCancel={() => onCancelGeneration(currentScene.id)}
                    color="emerald"
                  />
                  <GenButton
                    label="Video"
                    status={sceneStatus[currentScene.id]?.startsWith("video") ? "generating" : sceneVideos[currentScene.id] ? "ready" : sceneImages[currentScene.id] ? "idle" : "disabled"}
                    onClick={() => onStartVideo(currentScene.id)}
                    onCancel={() => onCancelGeneration(currentScene.id)}
                    color="indigo"
                  />
                  <GenButton
                    label="Voice"
                    status={voiceStatus[currentScene.id] === "generating" ? "generating" : voiceStatus[currentScene.id] === "ready" ? "ready" : currentScene.narration?.trim() ? "idle" : "disabled"}
                    onClick={() => onStartVoice(currentScene.id)}
                    color="violet"
                    extra={voiceStatus[currentScene.id] === "ready" ? (
                      <button onClick={() => onPlayVoice(currentScene.id)} className="ml-1 rounded px-1.5 py-0.5 text-[9px] text-white/40 hover:text-white/60 hover:bg-white/[0.05]">
                        Play
                      </button>
                    ) : null}
                  />
                </div>
              )}

              {/* Batch + Render */}
              <div className="mt-3 flex gap-2">
                {totalImagesGenerated < totalScenes && (
                  <button onClick={() => result.scenes.forEach((s) => { if (!sceneImages[s.id]) onStartImage(s.id); })} className="flex-1 rounded-md border border-white/[0.04] bg-white/[0.02] px-3 py-2 text-[11px] font-medium text-white/40 hover:text-white/60 hover:bg-white/[0.04] transition-all">
                    Generate all images
                  </button>
                )}
                {totalVideosGenerated < totalImagesGenerated && (
                  <button onClick={() => result.scenes.forEach((s) => { if (!sceneVideos[s.id] && sceneImages[s.id]) onStartVideo(s.id); })} className="flex-1 rounded-md border border-white/[0.04] bg-white/[0.02] px-3 py-2 text-[11px] font-medium text-white/40 hover:text-white/60 hover:bg-white/[0.04] transition-all">
                    Generate all videos
                  </button>
                )}
                {renderReady && !rendering && (
                  <button onClick={onStartRender} className="flex-1 rounded-md bg-white px-3 py-2 text-[11px] font-semibold text-[#0a0b0e] hover:bg-white/90 transition-all">
                    Render final video
                  </button>
                )}
                {rendering && (
                  <div className="flex-1 rounded-md border border-indigo-500/15 bg-indigo-500/[0.04] px-3 py-2 text-[11px] font-medium text-indigo-400/70 flex items-center gap-2">
                    <Icon.Spinner className="h-3 w-3 animate-spin" />
                    {renderStage || "Rendering..."}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="border-t border-white/[0.04] px-5 py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Timeline</span>
                <span className="text-[10px] text-white/20">{totalDurationFormatted}</span>
              </div>
              <div className="flex items-center gap-3 text-[9px] text-white/20">
                {captions && <span className="rounded bg-white/[0.04] px-1.5 py-0.5 font-semibold text-white/30">CC</span>}
                {music !== "None" && <span className="rounded bg-white/[0.04] px-1.5 py-0.5 font-semibold text-white/30">♫ {music}</span>}
              </div>
            </div>
            <div className="space-y-1">
              {result.scenes.map((scene, sceneIdx) => {
                const hasImg = !!sceneImages[scene.id];
                const hasVid = !!sceneVideos[scene.id];
                const hasVoc = voiceStatus[scene.id] === "ready";
                const isComplete = hasImg && hasVid && hasVoc;
                const isActive = activeScene === scene.id;
                const dur = parseInt(scene.sceneDuration || "10", 10) || 10;
                return (
                  <div
                    key={scene.id}
                    onClick={() => onSwitchScene(scene.id)}
                    className={`group flex items-center gap-3 rounded-md border px-3 py-2 cursor-pointer transition-all ${isActive ? "border-indigo-500/20 bg-indigo-500/[0.03]" : "border-transparent hover:bg-white/[0.02]"}`}
                  >
                    <span className={`text-[11px] font-bold w-5 ${isActive ? "text-indigo-400" : "text-white/20"}`}>{String(sceneIdx + 1).padStart(2, "0")}</span>
                    <div className="relative h-6 w-10 flex-shrink-0 overflow-hidden rounded bg-white/[0.04]">
                      {hasImg && <img src={sceneImages[scene.id]} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <span className={`truncate text-[11px] font-medium min-w-0 flex-1 ${isActive ? "text-white/80" : "text-white/50"}`}>{scene.title}</span>
                    <span className="text-[9px] text-white/15 flex-shrink-0">{dur}s</span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className={`w-1.5 h-1.5 rounded-full ${hasImg ? "bg-emerald-400" : "bg-white/10"}`} />
                      <span className={`w-1.5 h-1.5 rounded-full ${hasVid ? "bg-blue-400" : "bg-white/10"}`} />
                      <span className={`w-1.5 h-1.5 rounded-full ${hasVoc ? "bg-violet-400" : "bg-white/10"}`} />
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button onClick={(e) => { e.stopPropagation(); onMoveScene(scene.id, -1); }} disabled={sceneIdx === 0} className="p-0.5 text-white/20 hover:text-white/50 disabled:opacity-15"><Icon.ArrowLeft className="h-2.5 w-2.5" /></button>
                      <button onClick={(e) => { e.stopPropagation(); onMoveScene(scene.id, 1); }} disabled={sceneIdx === result.scenes.length - 1} className="p-0.5 text-white/20 hover:text-white/50 disabled:opacity-15"><Icon.ArrowRight className="h-2.5 w-2.5" /></button>
                      <button onClick={(e) => { e.stopPropagation(); onDuplicateScene(scene.id); }} className="p-0.5 text-white/15 hover:text-white/40"><Icon.Copy2 /></button>
                      {result.scenes.length > 1 && (
                        <button onClick={(e) => { e.stopPropagation(); onSetDeleteSceneConfirm(scene.id); }} className="p-0.5 text-white/15 hover:text-red-400/60"><Icon.Trash /></button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>

        {/* ── Right: Scene Details ── */}
        <aside className="hidden xl:flex w-72 flex-shrink-0 flex-col border-l border-white/[0.04] bg-white/[0.01] overflow-y-auto">
          {currentScene && (
            <div className="p-4 space-y-4">
              {/* Scene info */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Scene details</span>
                  {deleteSceneConfirmId === currentScene.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => { onDeleteScene(currentScene.id); onSetDeleteSceneConfirm(null); }} className="rounded bg-red-500/15 px-2 py-0.5 text-[9px] font-semibold text-red-400 hover:bg-red-500/25">Confirm</button>
                      <button onClick={() => onSetDeleteSceneConfirm(null)} className="rounded px-2 py-0.5 text-[9px] text-white/40 hover:text-white/60">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => onSetDeleteSceneConfirm(currentScene.id)} className="text-[9px] text-white/20 hover:text-red-400/50 transition-colors">Delete</button>
                  )}
                </div>
                <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-3 space-y-3">
                  <div>
                    <label className="text-[9px] font-semibold uppercase tracking-wider text-white/20">Title</label>
                    <p className="text-[12px] text-white/70 mt-0.5">{currentScene.title}</p>
                  </div>
                  <div>
                    <label className="text-[9px] font-semibold uppercase tracking-wider text-white/20">Visual prompt</label>
                    <p className="text-[11px] text-white/45 mt-0.5 leading-relaxed">{currentScene.visual || "No visual prompt"}</p>
                  </div>
                  <div>
                    <label className="text-[9px] font-semibold uppercase tracking-wider text-white/20">Narration</label>
                    <p className="text-[11px] text-white/45 mt-0.5 leading-relaxed">{currentScene.narration || "No narration"}</p>
                  </div>
                  <div className="flex gap-4">
                    {currentScene.beat && (
                      <div>
                        <label className="text-[9px] font-semibold uppercase tracking-wider text-white/20">Beat</label>
                        <p className="text-[11px] text-violet-400/50 mt-0.5">{currentScene.beat}</p>
                      </div>
                    )}
                    {currentScene.sceneDuration && (
                      <div>
                        <label className="text-[9px] font-semibold uppercase tracking-wider text-white/20">Duration</label>
                        <p className="text-[11px] text-blue-400/50 mt-0.5">~{currentScene.sceneDuration}s</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Director info */}
              {currentScene.directorCamera && (
                <div>
                  <label className="text-[9px] font-semibold uppercase tracking-wider text-white/20 block mb-1.5">Camera</label>
                  <div className="flex flex-wrap gap-1">
                    {[currentScene.directorCamera.shotType, currentScene.directorCamera.movement, currentScene.directorCamera.angle].filter(Boolean).map((tag) => (
                      <span key={tag} className="rounded bg-white/[0.03] px-1.5 py-0.5 text-[9px] text-white/35">{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Characters */}
              {characters.length > 0 && (
                <div>
                  <label className="text-[9px] font-semibold uppercase tracking-wider text-white/20 block mb-1.5">Characters</label>
                  <div className="space-y-1">
                    {characters.filter((c) => c.name?.trim()).map((c, i) => {
                      const realIdx = characters.indexOf(c);
                      const inScene = (sceneCharacters[currentScene.id] || []).includes(realIdx);
                      return (
                        <div key={i} className={`flex items-center gap-2 rounded px-2 py-1.5 ${inScene ? "bg-emerald-500/[0.04]" : ""}`}>
                          <span className={`flex h-5 w-5 items-center justify-center rounded text-[7px] font-bold ${CHAR_COLORS[realIdx % CHAR_COLORS.length]}`}>
                            {getInitials(c.name)}
                          </span>
                          <span className="text-[10px] text-white/50">{c.name}</span>
                          {inScene && <span className="ml-auto text-[8px] text-emerald-400/40">in scene</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Continuity */}
              {currentScene.directorContinuityBefore && (
                <div>
                  <label className="text-[9px] font-semibold uppercase tracking-wider text-white/20 block mb-1.5">Continuity</label>
                  <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-2.5 space-y-1.5">
                    {currentScene.directorContinuityBefore.location && (
                      <div><span className="text-[8px] text-white/15">Location:</span> <span className="text-[10px] text-white/40">{currentScene.directorContinuityBefore.location}</span></div>
                    )}
                    {currentScene.directorContinuityBefore.timeOfDay && (
                      <div><span className="text-[8px] text-white/15">Time:</span> <span className="text-[10px] text-white/40">{currentScene.directorContinuityBefore.timeOfDay}</span></div>
                    )}
                    {currentScene.directorContinuityBefore.weather && (
                      <div><span className="text-[8px] text-white/15">Weather:</span> <span className="text-[10px] text-white/40">{currentScene.directorContinuityBefore.weather}</span></div>
                    )}
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

/* ── Gen Button Subcomponent ── */
function GenButton({ label, status, onClick, onCancel, color, extra }: {
  label: string;
  status: "idle" | "generating" | "ready" | "disabled";
  onClick: () => void;
  onCancel?: () => void;
  color: "emerald" | "indigo" | "violet";
  extra?: React.ReactNode;
}) {
  const colorMap = {
    emerald: { idle: "border-emerald-500/15 bg-emerald-500/[0.04] text-emerald-400/70 hover:bg-emerald-500/[0.08]", generating: "border-amber-500/15 bg-amber-500/[0.04] text-amber-400/70", ready: "border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-400" },
    indigo: { idle: "border-indigo-500/15 bg-indigo-500/[0.04] text-indigo-400/70 hover:bg-indigo-500/[0.08]", generating: "border-amber-500/15 bg-amber-500/[0.04] text-amber-400/70", ready: "border-indigo-500/20 bg-indigo-500/[0.06] text-indigo-400" },
    violet: { idle: "border-violet-500/15 bg-violet-500/[0.04] text-violet-400/70 hover:bg-violet-500/[0.08]", generating: "border-amber-500/15 bg-amber-500/[0.04] text-amber-400/70", ready: "border-violet-500/20 bg-violet-500/[0.06] text-violet-400" },
  };
  const disabled = status === "disabled";
  return (
    <div className={`rounded-lg border p-3 text-center transition-all ${disabled ? "border-white/[0.03] bg-white/[0.01] opacity-30" : colorMap[color][status === "generating" ? "generating" : status === "ready" ? "ready" : "idle"]}`}>
      <div className="flex items-center justify-center gap-1.5">
        {status === "generating" && <Icon.Spinner className="h-3 w-3 animate-spin" />}
        {status === "ready" && <Icon.Check className="h-3 w-3" />}
        <span className="text-[11px] font-medium">{label}</span>
        {extra}
      </div>
      {status === "generating" && onCancel && (
        <button onClick={(e) => { e.stopPropagation(); onCancel(); }} className="mt-1.5 text-[9px] text-white/25 hover:text-white/40 transition-colors">Cancel</button>
      )}
      {status === "ready" && (
        <div className="mt-1 text-[9px] opacity-50">✓ Ready</div>
      )}
      {status === "idle" && !disabled && (
        <div className="mt-1 text-[9px] opacity-40">Click to generate</div>
      )}
    </div>
  );
}
