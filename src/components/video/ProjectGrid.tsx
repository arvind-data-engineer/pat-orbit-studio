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

  return (
    <div className="min-h-[calc(100vh-48px)] bg-[#0a0b0f]">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-10">
        {/* Header */}
        <div className="flex items-end justify-between mb-8 animate-fade-in">
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-white/90">Projects</h1>
            <p className="mt-1 text-[13px] text-white/25">{projects.length} project{projects.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => importRef.current?.click()} className="rounded-lg border border-white/[0.05] bg-white/[0.03] px-4 py-2 text-[12px] font-medium text-white/40 hover:text-white/60 hover:bg-white/[0.05] transition-all">
              Import
            </button>
            <input ref={importRef} type="file" accept=".json" onChange={onImport} className="hidden" />
            <button onClick={onNewVideo} className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-[13px] font-semibold text-[#0a0b0f] hover:bg-white/90 transition-all">
              <Icon.Plus className="h-3.5 w-3.5" />New video
            </button>
          </div>
        </div>

        {/* Search + Filters */}
        {projects.length > 0 && (
          <div className="flex items-center gap-3 mb-8">
            <div className="relative flex-1 max-w-sm">
              <svg className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="h-9 w-full rounded-lg border border-white/[0.05] bg-[#0e1015] pl-9 pr-3 text-[13px] text-white/70 outline-none placeholder:text-white/15 focus:border-white/[0.10] transition-all"
              />
            </div>
            <div className="flex gap-0.5 rounded-lg bg-[#0e1015] p-0.5 border border-white/[0.04]">
              {(["all", "completed", "in-progress"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setProjectFilter(f)}
                  className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition-all ${
                    projectFilter === f
                      ? "bg-white/[0.06] text-white/70"
                      : "text-white/25 hover:text-white/45"
                  }`}
                >
                  {f === "all" ? "All" : f === "completed" ? "Done" : "Active"}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {projects.length === 0 && (
          <div className="animate-fade-in">
            <div className="rounded-2xl border border-white/[0.04] bg-[#0e1015] p-24 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center mx-auto mb-5">
                <Icon.Film className="h-7 w-7 text-white/[0.10]" />
              </div>
              <h3 className="text-[20px] font-bold text-white/45">No videos yet</h3>
              <p className="mt-2 text-[14px] text-white/20 max-w-xs mx-auto">Your AI-generated videos will appear here.</p>
              <button onClick={onNewVideo} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-[14px] font-semibold text-[#0a0b0f] hover:bg-white/90 transition-all">
                Create your first video
              </button>
            </div>
          </div>
        )}

        {/* No results */}
        {projects.length > 0 && filtered.length === 0 && (
          <div className="rounded-xl border border-white/[0.04] bg-[#0e1015] p-12 text-center">
            <div className="text-[14px] font-medium text-white/30">No projects found</div>
            <button onClick={() => { setSearchQuery(""); setProjectFilter("all"); }} className="mt-2 text-[12px] text-white/25 hover:text-white/45 transition-colors">Clear filters</button>
          </div>
        )}

        {/* Project grid */}
        {filtered.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
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
                <div key={project.id} className="group rounded-xl border border-white/[0.04] bg-[#0e1015] overflow-hidden transition-all hover:border-white/[0.08]">
                  {/* Thumbnail */}
                  <button onClick={() => onLoadProject(project)} className="block w-full text-left">
                    <div className="relative aspect-video overflow-hidden bg-[#08090c]">
                      {firstImg ? (
                        <img src={firstImg} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#0e1015] to-[#08090c]">
                          <Icon.Film className="h-10 w-10 text-white/[0.04]" />
                        </div>
                      )}
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      {/* Status badges */}
                      <div className="absolute top-3 left-3 flex gap-1.5">
                        {isComplete && (
                          <span className="rounded-md bg-emerald-500/20 backdrop-blur-sm px-2 py-0.5 text-[10px] font-semibold text-emerald-400">Done</span>
                        )}
                        {hasFinal && (
                          <span className="rounded-md bg-indigo-500/20 backdrop-blur-sm px-2 py-0.5 text-[10px] font-semibold text-indigo-400">Final</span>
                        )}
                      </div>
                      {/* Duration */}
                      <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="rounded-md bg-black/60 backdrop-blur-sm px-2 py-0.5 text-[11px] font-medium text-white/70">{durStr}</span>
                      </div>
                    </div>
                  </button>

                  {/* Info */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <button onClick={() => onLoadProject(project)} className="block w-full text-left">
                          <div className="truncate text-[15px] font-semibold text-white/70 group-hover:text-white transition-colors">{project.title || "Untitled"}</div>
                        </button>
                        <div className="mt-1 flex items-center gap-2 text-[12px] text-white/20">
                          <span>{project.style}</span>
                          <span className="text-white/10">·</span>
                          <span>{sc} scenes</span>
                          <span className="text-white/10">·</span>
                          <span>{durStr}</span>
                        </div>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-3 flex items-center gap-1">
                      {Array.from({ length: Math.min(sc, 12) }).map((_, i) => (
                        <div key={i} className={`h-1 rounded-full flex-1 max-w-3 ${i < scenesReady ? "bg-emerald-400/50" : "bg-white/[0.05]"}`} />
                      ))}
                      <span className="text-[10px] text-white/12 ml-2 tabular-nums">{scenesReady}/{sc}</span>
                    </div>
                    {/* Actions */}
                    <div className="mt-4 flex items-center gap-2 border-t border-white/[0.03] pt-3">
                      <button onClick={() => onLoadProject(project)} className="flex-1 rounded-lg bg-white/[0.04] py-2 text-[12px] font-medium text-white/45 hover:bg-white/[0.07] hover:text-white/70 transition-all">
                        Continue
                      </button>
                      <button onClick={() => onDuplicateProject(project)} title="Duplicate" className="rounded-lg p-2 text-white/15 hover:text-white/35 hover:bg-white/[0.04] transition-all">
                        <Icon.Copy2 />
                      </button>
                      <button onClick={() => onDeleteProject(project.id)} title="Delete" className="rounded-lg p-2 text-white/10 hover:text-red-400/50 hover:bg-red-500/[0.04] transition-all">
                        <Icon.Trash />
                      </button>
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
