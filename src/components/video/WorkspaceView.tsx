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
  const activeIdx = result.scenes.findIndex((s) => s.id === activeScene);

  return (
    <div className="h-[calc(100vh-48px)] flex flex-col bg-[#0a0b0f] overflow-hidden">
      {/* ── Workspace header ── */}
      <header className="flex items-center justify-between px-5 h-12 border-b border-white/[0.04] flex-shrink-0 bg-[#0a0b0f]">
        <div className="flex items-center gap-4 min-w-0">
          <input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="bg-transparent text-[14px] font-semibold text-white/80 outline-none w-56 truncate hover:text-white/95 transition-colors"
          />
          <div className="hidden sm:flex items-center gap-3 text-[11px]">
            {saveStatus === "saving" && <span className="text-amber-400/50">Saving...</span>}
            {saved && !hasUnsavedChanges && <span className="text-emerald-400/35">Saved</span>}
            {hasUnsavedChanges && <span className="text-white/15">Unsaved</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onSaveProject} className={`rounded-lg px-3.5 py-1.5 text-[12px] font-medium transition-all ${hasUnsavedChanges ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15" : "text-white/30 hover:text-white/50 hover:bg-white/[0.04]"}`}>
            Save
          </button>
          <button onClick={onExportVideo} disabled={!finalVideo} className="rounded-lg bg-white/[0.06] border border-white/[0.06] px-4 py-1.5 text-[12px] font-medium text-white/70 hover:bg-white/[0.10] hover:text-white/90 transition-all disabled:opacity-15 disabled:cursor-not-allowed">
            Export
          </button>
          {renderReady && !rendering && (
            <button onClick={onStartRender} className="rounded-lg bg-white px-4 py-1.5 text-[12px] font-semibold text-[#0a0b0f] hover:bg-white/90 transition-all">
              Render
            </button>
          )}
          {rendering && (
            <div className="flex items-center gap-2 rounded-lg bg-indigo-500/[0.08] border border-indigo-500/[0.12] px-4 py-1.5 text-[12px] font-medium text-indigo-400/80">
              <Icon.Spinner className="h-3 w-3 animate-spin" />
              {renderStage || "Rendering..."}
            </div>
          )}
        </div>
      </header>

      {/* ── Main area: Preview + Details ── */}
      <div className="flex-1 flex min-h-0 overflow-hidden">

        {/* ── Center: Video Preview (dominant) ── */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Scene label */}
          <div className="flex items-center justify-between px-5 py-2 flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-[13px] font-bold text-white/75 tabular-nums">
                {String(activeIdx + 1).padStart(2, "0")}
                <span className="text-white/15 mx-1">/</span>
                <span className="text-white/25 font-normal">{String(totalScenes).padStart(2, "0")}</span>
              </span>
              <span className="h-3 w-px bg-white/[0.06]" />
              <span className="text-[13px] text-white/40 truncate">{currentScene?.title}</span>
            </div>
            {/* Scene completion badge */}
            {currentScene && (() => {
              const hasImg = !!sceneImages[currentScene.id];
              const hasVid = !!sceneVideos[currentScene.id];
              const hasVoc = voiceStatus[currentScene.id] === "ready";
              const isGen = sceneStatus[currentScene.id]?.startsWith("image") || sceneStatus[currentScene.id]?.startsWith("video");
              if (hasImg && hasVid && hasVoc) return <span className="text-[11px] font-medium text-emerald-400/50">Complete</span>;
              if (isGen) return <span className="flex items-center gap-1.5 text-[11px] font-medium text-amber-400/60"><Icon.Spinner className="h-3 w-3 animate-spin" />Generating</span>;
              if (hasVid) return <span className="text-[11px] font-medium text-blue-400/50">Video ready</span>;
              if (hasImg) return <span className="text-[11px] font-medium text-emerald-400/50">Image ready</span>;
              return null;
            })()}
          </div>

          {/* ── THE VIDEO PREVIEW — visual anchor ── */}
          <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-2 min-h-0">
            <div className="w-full max-w-5xl animate-scale-in">
              <div className="video-surface rounded-xl border border-white/[0.05] bg-black shadow-2xl shadow-black/50">
                {currentScene && sceneStatus[currentScene.id] === "image" ? (
                  <div className="flex aspect-video flex-col items-center justify-center bg-[#08090c]">
                    <Icon.Spinner className="h-8 w-8 animate-spin text-amber-400/30 mb-3" />
                    <span className="text-[15px] font-medium text-white/35">Creating visual</span>
                  </div>
                ) : currentScene && sceneStatus[currentScene.id]?.startsWith("video") ? (
                  <div className="flex aspect-video flex-col items-center justify-center bg-[#08090c]">
                    <Icon.Spinner className="h-8 w-8 animate-spin text-indigo-400/30 mb-3" />
                    <span className="text-[15px] font-medium text-white/35">Generating motion</span>
                    <span className="mt-1.5 text-[12px] text-white/15">This may take several minutes...</span>
                  </div>
                ) : currentScene && sceneVideos[currentScene.id] ? (
                  <video src={sceneVideos[currentScene.id]} controls className="aspect-video w-full object-cover" poster={sceneImages[currentScene.id]} />
                ) : currentScene && sceneImages[currentScene.id] ? (
                  <div className="relative">
                    <img src={sceneImages[currentScene.id]} alt={currentScene.title} className="aspect-video w-full object-cover" />
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-6">
                      <span className="text-[13px] font-medium text-white/50">Image ready — generate motion to animate</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex aspect-video flex-col items-center justify-center bg-[#08090c]">
                    <Icon.Image className="h-12 w-12 text-white/[0.06] mb-3" />
                    <span className="text-[15px] text-white/20">Generate an image to begin</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Scene storyboard strip (horizontal) ── */}
          <div className="flex-shrink-0 border-t border-white/[0.04] px-4 py-3 bg-[#0a0b0f]">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/20">Scenes · {totalDurationFormatted}</span>
              <div className="flex items-center gap-1.5 text-[10px] text-white/12">
                {captions && <span className="rounded bg-white/[0.04] px-1.5 py-0.5">CC</span>}
                {music !== "None" && <span className="rounded bg-white/[0.04] px-1.5 py-0.5">♫</span>}
              </div>
            </div>
            <div className="flex gap-1.5">
              {result.scenes.map((scene, sceneIdx) => {
                const hasImg = !!sceneImages[scene.id];
                const hasVid = !!sceneVideos[scene.id];
                const hasVoc = voiceStatus[scene.id] === "ready";
                const isComplete = hasImg && hasVid && hasVoc;
                const isGen = sceneStatus[scene.id]?.startsWith("image") || sceneStatus[scene.id]?.startsWith("video");
                const isActive = activeScene === scene.id;
                const dur = parseInt(scene.sceneDuration || "10", 10) || 10;
                const totalDur = result.scenes.reduce((sum, s) => sum + (parseInt(s.sceneDuration || "10", 10) || 10), 0);
                const widthPct = Math.max(10, (dur / totalDur) * 100);
                return (
                  <button
                    key={scene.id}
                    onClick={() => onSwitchScene(scene.id)}
                    className={`timeline-block flex-shrink-0 ${isActive ? "active" : ""}`}
                    style={{ width: `${widthPct}%` }}
                  >
                    {/* Background */}
                    {hasImg ? (
                      <img src={sceneImages[scene.id]} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 bg-[#14161c]" />
                    )}
                    {/* Dark gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    {/* Generating overlay */}
                    {isGen && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <Icon.Spinner className="h-3 w-3 animate-spin text-white/60" />
                      </div>
                    )}
                    {/* Content */}
                    <div className="relative h-full flex flex-col justify-between p-2">
                      <span className="text-[10px] font-bold text-white/60">{String(sceneIdx + 1).padStart(2, "0")}</span>
                      <div className="flex items-end justify-between">
                        <span className="text-[9px] font-medium text-white/50 truncate max-w-[80%]">{scene.title}</span>
                        <div className="flex items-center gap-1">
                          {hasImg && <span className="h-1 w-1 rounded-full bg-emerald-400" />}
                          {hasVid && <span className="h-1 w-1 rounded-full bg-blue-400" />}
                          {hasVoc && <span className="h-1 w-1 rounded-full bg-violet-400" />}
                        </div>
                      </div>
                    </div>
                    {/* Completion indicator */}
                    {isComplete && (
                      <div className="absolute top-1.5 right-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 block" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Generation controls row ── */}
          {currentScene && (
            <div className="flex-shrink-0 border-t border-white/[0.04] px-4 py-3 bg-[#0a0b0f]">
              <div className="flex items-center gap-2 flex-wrap">
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
                  <button onClick={() => onPlayVoice(currentScene.id)} className="flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-3 py-2 text-[12px] font-medium text-white/40 hover:bg-white/[0.06] hover:text-white/60 transition-all">
                    <Icon.Play className="h-3 w-3" /> Play voice
                  </button>
                )}

                {/* Batch actions */}
                <div className="ml-auto flex items-center gap-2">
                  {totalImagesGenerated < totalScenes && (
                    <button onClick={() => result.scenes.forEach((s) => { if (!sceneImages[s.id]) onStartImage(s.id); })} className="rounded-lg border border-white/[0.04] px-3 py-2 text-[11px] font-medium text-white/30 hover:text-white/50 hover:bg-white/[0.03] transition-all">
                      All images
                    </button>
                  )}
                  {totalVideosGenerated < totalImagesGenerated && (
                    <button onClick={() => result.scenes.forEach((s) => { if (!sceneVideos[s.id] && sceneImages[s.id]) onStartVideo(s.id); })} className="rounded-lg border border-white/[0.04] px-3 py-2 text-[11px] font-medium text-white/30 hover:text-white/50 hover:bg-white/[0.03] transition-all">
                      All videos
                    </button>
                  )}
                </div>
              </div>

              {/* Render progress */}
              {rendering && (
                <div className="mt-3 animate-fade-in">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1 rounded-full bg-white/[0.04] overflow-hidden">
                      <div className="h-full bg-indigo-400/40 rounded-full transition-all duration-1000" style={{ width: "50%" }} />
                    </div>
                    <span className="text-[11px] text-white/30 font-medium">{renderStage}</span>
                  </div>
                </div>
              )}

              {/* Final video ready */}
              {finalVideo && !rendering && (
                <div className="mt-3 flex items-center gap-3 animate-fade-in">
                  <div className="flex items-center gap-2 text-emerald-400/60">
                    <Icon.Check className="h-4 w-4" />
                    <span className="text-[13px] font-semibold">Your video is ready</span>
                  </div>
                  <div className="ml-auto flex gap-2">
                    <a href={finalVideo} target="_blank" rel="noopener" className="rounded-lg bg-white/[0.06] px-3 py-1.5 text-[12px] font-medium text-white/50 hover:bg-white/[0.10] hover:text-white/75 transition-all">
                      Preview
                    </a>
                    <button onClick={onExportVideo} className="rounded-lg bg-white px-3.5 py-1.5 text-[12px] font-semibold text-[#0a0b0f] hover:bg-white/90 transition-all">
                      Export
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        {/* ── Right: Scene details + editing panel ── */}
        <aside className="hidden xl:flex w-80 flex-shrink-0 flex-col border-l border-white/[0.04] bg-[#0d0e14] overflow-y-auto">
          {currentScene && (
            <div className="p-5 space-y-5">
              {/* Scene controls header */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/25">Scene details</span>
                <div className="flex items-center gap-0.5">
                  <button onClick={() => { const idx = result.scenes.findIndex(s => s.id === currentScene.id); if (idx > 0) onMoveScene(currentScene.id, -1); }} disabled={result.scenes.findIndex(s => s.id === currentScene.id) === 0} className="rounded-md p-1.5 text-white/20 hover:text-white/50 hover:bg-white/[0.04] disabled:opacity-15 transition-all"><Icon.ArrowLeft className="h-3 w-3" /></button>
                  <button onClick={() => { const idx = result.scenes.findIndex(s => s.id === currentScene.id); if (idx < result.scenes.length - 1) onMoveScene(currentScene.id, 1); }} disabled={result.scenes.findIndex(s => s.id === currentScene.id) === result.scenes.length - 1} className="rounded-md p-1.5 text-white/20 hover:text-white/50 hover:bg-white/[0.04] disabled:opacity-15 transition-all"><Icon.ArrowRight className="h-3 w-3" /></button>
                  <button onClick={() => onDuplicateScene(currentScene.id)} className="rounded-md p-1.5 text-white/20 hover:text-white/40 hover:bg-white/[0.04] transition-all"><Icon.Copy2 /></button>
                  {result.scenes.length > 1 && (
                    deleteSceneConfirmId === currentScene.id ? (
                      <div className="flex items-center gap-0.5 ml-1">
                        <button onClick={() => { onDeleteScene(currentScene.id); onSetDeleteSceneConfirm(null); }} className="rounded px-2 py-1 text-[10px] font-semibold text-red-400 bg-red-500/15 hover:bg-red-500/25 transition-all">Delete</button>
                        <button onClick={() => onSetDeleteSceneConfirm(null)} className="rounded px-2 py-1 text-[10px] text-white/30 hover:text-white/50 transition-all">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => onSetDeleteSceneConfirm(currentScene.id)} className="rounded-md p-1.5 text-white/15 hover:text-red-400/50 hover:bg-red-500/[0.04] transition-all"><Icon.Trash /></button>
                    )
                  )}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/20 block mb-1.5">Title</label>
                <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2.5">
                  <p className="text-[14px] font-medium text-white/80">{currentScene.title}</p>
                </div>
              </div>

              {/* Visual prompt */}
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/20 block mb-1.5">Visual</label>
                <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2.5">
                  <p className="text-[12px] text-white/45 leading-relaxed">{currentScene.visual || "No visual prompt"}</p>
                </div>
              </div>

              {/* Narration */}
              {currentScene.narration && (
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/20 block mb-1.5">Narration</label>
                  <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2.5">
                    <p className="text-[12px] text-white/40 leading-relaxed italic">&ldquo;{currentScene.narration}&rdquo;</p>
                  </div>
                </div>
              )}

              {/* Metadata row */}
              <div className="flex gap-3">
                {currentScene.sceneDuration && (
                  <div className="flex-1 rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2">
                    <label className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/15 block">Duration</label>
                    <p className="text-[13px] font-medium text-white/55 mt-0.5">{currentScene.sceneDuration}s</p>
                  </div>
                )}
                {currentScene.beat && (
                  <div className="flex-1 rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2">
                    <label className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/15 block">Beat</label>
                    <p className="text-[13px] font-medium text-white/55 mt-0.5">{currentScene.beat}</p>
                  </div>
                )}
              </div>

              {/* Director camera */}
              {currentScene.directorCamera && (
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/20 block mb-1.5">Camera</label>
                  <div className="flex flex-wrap gap-1.5">
                    {[currentScene.directorCamera.shotType, currentScene.directorCamera.movement, currentScene.directorCamera.angle].filter(Boolean).map((tag) => (
                      <span key={tag} className="rounded-md bg-white/[0.03] border border-white/[0.04] px-2.5 py-1 text-[11px] text-white/35 font-medium">{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Characters in scene */}
              {characters.filter((c) => c.name?.trim()).length > 0 && (
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/20 block mb-1.5">Characters</label>
                  <div className="space-y-1.5">
                    {characters.filter((c) => c.name?.trim()).map((c) => {
                      const realIdx = characters.indexOf(c);
                      const inScene = (sceneCharacters[currentScene.id] || []).includes(realIdx);
                      return (
                        <div key={realIdx} className={`flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors ${inScene ? "bg-emerald-500/[0.04] border border-emerald-500/[0.08]" : "bg-white/[0.01]"}`}>
                          <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-[9px] font-bold ${CHAR_COLORS[realIdx % CHAR_COLORS.length]}`}>
                            {getInitials(c.name)}
                          </span>
                          <span className="text-[12px] text-white/50">{c.name}</span>
                          {inScene && <span className="ml-auto text-[9px] text-emerald-400/35 font-medium">In scene</span>}
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
      <button onClick={onCancel} className="flex items-center gap-1.5 rounded-lg bg-amber-500/[0.08] border border-amber-500/[0.12] px-3.5 py-2 text-[12px] font-medium text-amber-400/80 hover:bg-amber-500/[0.12] transition-all gen-pulse" style={{ color: "rgb(234,179,8)" }}>
        <Icon.Spinner className="h-3.5 w-3.5 animate-spin" />
        {label}
      </button>
    );
  }
  if (status === "generating") {
    return (
      <div className="flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-3.5 py-2 text-[12px] font-medium text-white/35">
        <Icon.Spinner className="h-3.5 w-3.5 animate-spin" /> {label}...
      </div>
    );
  }
  if (status === "ready") {
    return (
      <div className="flex items-center gap-1.5 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/[0.10] px-3.5 py-2 text-[12px] font-medium text-emerald-400/80">
        <Icon.Check className="h-3 w-3" /> {label}
      </div>
    );
  }
  if (status === "disabled") {
    return (
      <button disabled className="flex items-center gap-1.5 rounded-lg bg-white/[0.02] px-3.5 py-2 text-[12px] font-medium text-white/12 cursor-not-allowed">
        {icon} {label}
      </button>
    );
  }
  return (
    <button onClick={onClick} className="flex items-center gap-1.5 rounded-lg bg-white/[0.05] border border-white/[0.06] px-3.5 py-2 text-[12px] font-medium text-white/60 hover:bg-white/[0.08] hover:text-white/80 hover:border-white/[0.10] transition-all">
      {icon} {label}
    </button>
  );
}
