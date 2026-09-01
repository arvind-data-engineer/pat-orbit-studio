/**
 * PAT Orbit — Project Serialization
 *
 * Handles export/import of projects as JSON files with schema versioning.
 * The format is designed to be forward-compatible: future versions can
 * add fields without breaking old imports.
 */

import type { StoredProject } from "./storage";

// ── Export format ───────────────────────────────────────────────────

interface ProjectExport {
  /** Format identifier. */
  format: "pat-orbit-project";
  /** Schema version for forward compatibility. */
  version: number;
  /** ISO timestamp of export. */
  exportedAt: string;
  /** The project data. */
  project: StoredProject;
}

const CURRENT_VERSION = 1;

// ── Export ──────────────────────────────────────────────────────────

/**
 * Serialize a project for export as a JSON string.
 * Strips runtime-only data (voiceAudios, sceneStatus, etc.).
 */
export function exportProject(project: StoredProject): string {
  const exportData: ProjectExport = {
    format: "pat-orbit-project",
    version: CURRENT_VERSION,
    exportedAt: new Date().toISOString(),
    project: {
      id: project.id,
      title: project.title,
      story: project.story,
      language: project.language,
      style: project.style,
      duration: project.duration,
      result: project.result,
      createdAt: project.createdAt,
      sceneImages: project.sceneImages,
      sceneVideos: project.sceneVideos,
      finalVideoUrl: project.finalVideoUrl,
      characters: project.characters,
      sceneCharacters: project.sceneCharacters,
      aspectRatio: project.aspectRatio,
      voice: project.voice,
      captions: project.captions,
      music: project.music,
      voiceGenerated: project.voiceGenerated,
    },
  };
  return JSON.stringify(exportData, null, 2);
}

/**
 * Trigger a browser download of the project as a JSON file.
 */
export function downloadProjectFile(project: StoredProject): void {
  const json = exportProject(project);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const safeName = (project.title || "pat-orbit-project")
    .replace(/[^a-zA-Z0-9\s\-_]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeName}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ── Import ──────────────────────────────────────────────────────────

export interface ImportResult {
  success: boolean;
  project?: StoredProject;
  error?: string;
}

/**
 * Parse and validate an imported JSON string.
 * Returns the validated project or an error message.
 */
export function importProject(jsonString: string): ImportResult {
  let data: unknown;
  try {
    data = JSON.parse(jsonString);
  } catch {
    return { success: false, error: "Invalid JSON file." };
  }

  // Validate format
  if (!data || typeof data !== "object") {
    return { success: false, error: "File is not a valid project file." };
  }

  const exportData = data as Record<string, unknown>;

  if (exportData.format !== "pat-orbit-project") {
    return { success: false, error: "File is not a PAT Orbit project export." };
  }

  const version = Number(exportData.version);
  if (!version || version < 1) {
    return { success: false, error: "Unknown project file version." };
  }

  // Validate project structure
  const project = exportData.project;
  if (!project || typeof project !== "object") {
    return { success: false, error: "Project data is missing or invalid." };
  }

  const p = project as Record<string, unknown>;

  if (typeof p.id !== "string" || typeof p.title !== "string") {
    return { success: false, error: "Project is missing required fields (id, title)." };
  }

  if (!p.result || typeof p.result !== "object") {
    return { success: false, error: "Project is missing story result data." };
  }

  const result = p.result as Record<string, unknown>;
  if (!Array.isArray(result.scenes)) {
    return { success: false, error: "Project has no scenes." };
  }

  // Assign a new ID to avoid conflicts with existing projects
  const importedProject: StoredProject = {
    id: crypto.randomUUID(),
    title: String(p.title),
    story: String(p.story || ""),
    language: String(p.language || "Hindi"),
    style: String(p.style || "Cartoon"),
    duration: String(p.duration || "60 sec"),
    result: p.result,
    createdAt: typeof p.createdAt === "string" ? p.createdAt : new Date().toISOString(),
    sceneImages: isValidRecord(p.sceneImages) ? p.sceneImages as Record<number, string> : undefined,
    sceneVideos: isValidRecord(p.sceneVideos) ? p.sceneVideos as Record<number, string> : undefined,
    finalVideoUrl: typeof p.finalVideoUrl === "string" ? p.finalVideoUrl : null,
    characters: Array.isArray(p.characters) ? p.characters as StoredProject["characters"] : undefined,
    sceneCharacters: isValidRecord(p.sceneCharacters) ? p.sceneCharacters as Record<number, number[]> : undefined,
    aspectRatio: typeof p.aspectRatio === "string" ? p.aspectRatio : undefined,
    voice: typeof p.voice === "string" ? p.voice : undefined,
    captions: typeof p.captions === "boolean" ? p.captions : undefined,
    music: typeof p.music === "string" ? p.music : undefined,
    voiceGenerated: isValidRecord(p.voiceGenerated) ? p.voiceGenerated as Record<number, boolean> : undefined,
  };

  return { success: true, project: importedProject };
}

function isValidRecord(val: unknown): val is Record<string, unknown> {
  return !!val && typeof val === "object" && !Array.isArray(val);
}

/**
 * Read a File object and return its text content.
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsText(file);
  });
}
