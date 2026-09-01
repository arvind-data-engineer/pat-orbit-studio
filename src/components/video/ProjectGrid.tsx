"use client";

import { useRef } from "react";
import { Icon } from "@/components/icons";
import type { Project } from "./types";

interface ProjectGridProps {
  projects: Project[];
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  projectFilter: "all" | "completed" | "in-progress";
  setProjectFilter: (v: "all" | "completed" | "in-progress") => void;
  onLoadProject: (p: Project) => void;
  onDuplicateProject: (p: Project) => void;
  onDeleteProject: (id: string) => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  importRef: React.RefObject<HTMLInputElement | null>;
  onNewVideo: () => void;
}

export function ProjectGrid({
  projects, searchQuery, setSearchQuery,
  projectFilter, setProjectFilter,
  onLoadProject, onDuplicateProject, onDeleteProject,
  onImport, importRef, onNewVideo,
}: ProjectGridProps) {
  const filtered = projects.filter((p) => {
    const matchesSearch = !searchQuery || p.title.toLowerCase().includes(searchQuery.toLowerCase());
    const sc = p.result?.scenes?.length || 0;
    const ic = p.sceneImages ? Object.keys(p.sceneImages).length : 0;
    const vc = p.sceneVideos ? Object.keys(p.sceneVideos).length : 0;
    const isComplete = sc > 0 && ic >= sc && vc >= sc;
    const matchesFilter = projectFilter === "all" || (projectFilter === "completed" && isComplete) || (projectFilter === "in-progress" && !isComplete);
    return matchesSearch && matchesFilter;
  });

  const completedCount = projects.filter((p) => {
    const sc = p.result?.scenes?.length || 0;
    const ic = p.sceneImages ? Object.keys(p.sceneImages).length : 0;
    const vc = p.sceneVideos ? Object.keys(p.sceneVideos).length : 0;
    return sc > 0 && ic >= sc && vc >= sc;
  }).length;

  return (
    <div className="min-h-screen bg-[#0a0b0e]">
      <div className="mx-auto max-w-5xl px-4 py-10">
        {/* Header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Projects</h1>
            <p className="mt-1 text-[13px] text-white/35">{projects.length} project{projects.length !== 1 ? "s" : ""} · {completedCount} completed</p>
          </div>
          <button onClick={onNewVideo} className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-[13px] font-semibold text-[#0a0b0e] hover:bg-white/90 transition-all">
            <Icon.Plus className="h-3.5 w-3.5" />New video
          </button>
        </div>

        {/* Search + Filters */}
        {projects.length > 0 && (
          <div className="flex items-center gap-3 mb-6">
            <div className="relative flex-1 max-w-xs">
              <svg className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search projects..." className="h-8 w-full rounded-lg border border-white/[0.06] bg-white/[0.02] pl-8 pr-3 text-[12px] text-white/70 outline-none placeholder:text-white/20 focus:border-white/[0.12] transition-all" />
            </div>
            <div className="flex gap-0.5 rounded-lg bg-white/[0.02] p-0.5">
              {(["all", "completed", "in-progress"] as const).map((f) => (
                <button key={f} onClick={() => setProjectFilter(f)} className={`rounded-md px-3 py-1 text-[11px] font-medium transition-all ${projectFilter === f ? "bg-white/[0.06] text-white/80" : "text-white/30 hover:text-white/50"}`}>
                  {f === "all" ? "All" : f === "completed" ? "Done" : "Active"}
                </button>
              ))}
            </div>
            <button onClick={() => importRef.current?.click()} className="text-[11px] text-emerald-400/60 hover:text-emerald-400 transition-colors ml-auto">Import</button>
            <input ref={importRef} type="file" accept=".json" onChange={onImport} className="hidden" />
          </div>
        )}

        {/* Empty state */}
        {projects.length === 0 && (
          <div className="rounded-xl border border-white/[0.04] bg-white/[0.015] p-16 text-center">
            <Icon.Film className="h-10 w-10 text-white/10 mx-auto mb-4" />
            <h3 className="text-[16px] font-semibold text-white/60">No videos yet</h3>
            <p className="mt-2 text-[13px] text-white/30">Your completed videos will appear here.</p>
            <button onClick={onNewVideo} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-[13px] font-semibold text-[#0a0b0e] hover:bg-white/90 transition-all">
              <Icon.Sparkles className="h-3.5 w-3.5" />Create your first video
            </button>
          </div>
        )}

        {/* No results */}
        {projects.length > 0 && filtered.length === 0 && (
          <div className="rounded-xl border border-white/[0.04] bg-white/[0.015] p-10 text-center">
            <div className="text-[14px] font-medium text-white/40">No projects found</div>
            <button onClick={() => { setSearchQuery(""); setProjectFilter("all"); }} className="mt-2 text-[11px] text-emerald-400/60 hover:text-emerald-400">Clear filters</button>
          </div>
        )}

        {/* Project grid */}
        {filtered.length > 0 && (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((project) => {
              const sc = project.result?.scenes?.length || 0;
              const ic = project.sceneImages ? Object.keys(project.sceneImages).length : 0;
              const vc = project.sceneVideos ? Object.keys(project.sceneVideos).length : 0;
              const isComplete = sc > 0 && ic >= sc && vc >= sc;
              const hasFinal = !!project.finalVideoUrl;
              const firstImg = project.sceneImages ? Object.values(project.sceneImages)[0] : null;
              const totalDur = (project.result?.scenes || []).reduce((sum: number, s: { sceneDuration?: string }) => sum + (parseInt(s.sceneDuration || "10") || 10), 0);
              const durStr = `${String(Math.floor(totalDur / 60)).padStart(2, "0")}:${String(totalDur % 60).padStart(2, "0")}`;
              const scenesReady = Math.min(ic, vc);
              return (
                <div key={project.id} className="group rounded-lg border border-white/[0.04] bg-white/[0.015] overflow-hidden transition-all hover:border-white/[0.08] hover:bg-white/[0.025]">
                  {/* Thumbnail */}
                  <button onClick={() => onLoadProject(project)} className="block w-full text-left">
                    <div className="relative aspect-video overflow-hidden bg-[#0c0d12]">
                      {firstImg ? (
                        <img src={firstImg} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Icon.Film className="h-6 w-6 text-white/8" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      {/* Status badge */}
                      <div className="absolute left-2 top-2">
                        <span className={`rounded px-1.5 py-0.5 text-[8px] font-semibold ${isComplete ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/15 text-amber-400"}`}>
                          {isComplete ? "Done" : "Active"}
                        </span>
                      </div>
                      {hasFinal && (
                        <div className="absolute right-2 top-2">
                          <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[8px] font-semibold text-indigo-400">Final</span>
                        </div>
                      )}
                      {/* Progress bar */}
                      <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="h-0.5 w-full rounded-full bg-white/10">
                          <div className="h-full rounded-full bg-emerald-400" style={{ width: `${sc > 0 ? (scenesReady / sc) * 100 : 0}%` }} />
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Body */}
                  <div className="p-3">
                    <button onClick={() => onLoadProject(project)} className="block w-full text-left">
                      <div className="truncate text-[13px] font-semibold text-white/75 group-hover:text-white transition-colors">{project.title || "Untitled"}</div>
                    </button>
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-white/25">
                      <span>{project.style}</span>
                      <span>·</span>
                      <span>{durStr}</span>
                      <span>·</span>
                      <span>{sc} scenes</span>
                    </div>
                    {/* Scene dots */}
                    <div className="mt-2 flex items-center gap-1">
                      {Array.from({ length: Math.min(sc, 10) }).map((_, i) => (
                        <div key={i} className={`h-1 w-1 rounded-full ${i < scenesReady ? "bg-emerald-400" : "bg-white/[0.06]"}`} />
                      ))}
                      <span className="text-[9px] text-white/15 ml-1">{scenesReady}/{sc}</span>
                    </div>
                    {/* Actions */}
                    <div className="mt-2.5 flex items-center gap-1.5 border-t border-white/[0.03] pt-2.5">
                      <button onClick={() => onLoadProject(project)} className="flex-1 rounded-md bg-white/[0.04] py-1.5 text-[10px] font-medium text-white/50 hover:bg-white/[0.08] hover:text-white/70 transition-all">
                        Open
                      </button>
                      <button onClick={() => onDuplicateProject(project)} className="rounded-md p-1.5 text-white/20 hover:text-white/40 hover:bg-white/[0.04] transition-all">
                        <Icon.Copy2 />
                      </button>
                      <button onClick={() => onDeleteProject(project.id)} className="rounded-md p-1.5 text-white/15 hover:text-red-400/60 hover:bg-red-500/[0.04] transition-all">
                        <Icon.Trash />
                      </button>
                      {project.createdAt && <span className="ml-auto text-[9px] text-white/15">{new Date(project.createdAt).toLocaleDateString()}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
