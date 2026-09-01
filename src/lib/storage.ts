/**
 * PAT Orbit — Project Storage Abstraction
 *
 * Isolates all persistence behind clean functions so the rest of the
 * application never touches localStorage directly. This makes it
 * straightforward to swap to IndexedDB later.
 *
 * Storage key: "pat-orbit-projects"
 * Schema version: 1
 */

// ── Types ───────────────────────────────────────────────────────────

export interface StoredProject {
  id: string;
  title: string;
  story: string;
  language: string;
  style: string;
  duration: string;
  result: unknown; // StoryResult — avoid circular import
  createdAt: string;
  updatedAt?: string; // ISO timestamp of last save
  sceneImages?: Record<number, string>;
  sceneVideos?: Record<number, string>;
  finalVideoUrl?: string | null;
  characters?: Array<{ name: string; description: string; appearance: string; role: string }>;
  sceneCharacters?: Record<number, number[]>;
  aspectRatio?: string;
  voice?: string;
  captions?: boolean;
  music?: string;
  voiceGenerated?: Record<number, boolean>;
}

interface StorageData {
  version: number;
  projects: StoredProject[];
  lastProjectId?: string;
}

// ── Constants ───────────────────────────────────────────────────────

const STORAGE_KEY = "pat-orbit-projects";
const SCHEMA_VERSION = 1;
const AUTO_SAVE_DEBOUNCE_MS = 2000;

// ── Internal helpers ────────────────────────────────────────────────

function safeGetItem(): StorageData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Handle legacy format (no version field — array of projects directly)
    if (Array.isArray(parsed)) {
      return { version: 1, projects: parsed.filter(isValidProject) };
    }
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.projects)) {
      return {
        version: parsed.version || 1,
        projects: parsed.projects.filter(isValidProject),
        lastProjectId: typeof parsed.lastProjectId === "string" ? parsed.lastProjectId : undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}

function safeSetItem(data: StorageData): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (err) {
    // QuotaExceededError — localStorage is full
    console.error("[Storage] Failed to save:", err);
    return false;
  }
}

function isValidProject(p: unknown): p is StoredProject {
  return !!p && typeof p === "object" && !!(p as Record<string, unknown>).id && !!(p as Record<string, unknown>).title;
}

// ── Public API ──────────────────────────────────────────────────────

/**
 * Load all projects from storage.
 * Returns an empty array if storage is empty or corrupted.
 */
export function loadProjects(): StoredProject[] {
  const data = safeGetItem();
  return data?.projects ?? [];
}

/**
 * Save the full projects array to storage.
 * Returns true on success, false on quota error.
 */
export function saveProjects(projects: StoredProject[]): boolean {
  const existing = safeGetItem();
  const data: StorageData = {
    version: SCHEMA_VERSION,
    projects,
    lastProjectId: existing?.lastProjectId,
  };
  return safeSetItem(data);
}

/**
 * Save a single project (upsert) and persist all projects.
 * Automatically sets updatedAt timestamp.
 */
export function saveProject(project: StoredProject): boolean {
  const projects = loadProjects();
  const idx = projects.findIndex((p) => p.id === project.id);
  const now = new Date().toISOString();
  const updated: StoredProject = { ...project, updatedAt: now };
  if (idx >= 0) {
    projects[idx] = updated;
  } else {
    projects.unshift(updated);
  }
  return saveProjects(projects);
}

/**
 * Rename a project by ID.
 */
export function renameProject(id: string, newTitle: string): boolean {
  const projects = loadProjects();
  const project = projects.find((p) => p.id === id);
  if (!project) return false;
  project.title = newTitle;
  project.updatedAt = new Date().toISOString();
  return saveProjects(projects);
}

/**
 * Duplicate a project by ID with a new ID.
 */
export function duplicateProject(id: string): StoredProject | null {
  const projects = loadProjects();
  const original = projects.find((p) => p.id === id);
  if (!original) return null;
  const dup: StoredProject = {
    ...JSON.parse(JSON.stringify(original)),
    id: crypto.randomUUID(),
    title: original.title + " (Copy)",
    createdAt: new Date().toISOString(),
    updatedAt: undefined,
  };
  projects.unshift(dup);
  saveProjects(projects);
  return dup;
}

/**
 * Delete a project by ID.
 */
export function deleteProject(id: string): boolean {
  const projects = loadProjects().filter((p) => p.id !== id);
  return saveProjects(projects);
}

/**
 * Get the last active project ID.
 */
export function getLastProjectId(): string | null {
  const data = safeGetItem();
  return data?.lastProjectId ?? null;
}

/**
 * Set the last active project ID.
 */
export function setLastProjectId(id: string | null): boolean {
  const data = safeGetItem() ?? { version: SCHEMA_VERSION, projects: [] };
  data.lastProjectId = id ?? undefined;
  return safeSetItem(data);
}

/**
 * Get storage usage information.
 */
export function getStorageInfo(): { usedBytes: number; projects: number; quota: number; percentUsed: number } {
  const raw = localStorage.getItem(STORAGE_KEY) || "";
  const usedBytes = new Blob([raw]).size;
  // Most browsers give 5MB for localStorage
  const quota = 5 * 1024 * 1024;
  return {
    usedBytes,
    projects: loadProjects().length,
    quota,
    percentUsed: Math.round((usedBytes / quota) * 100),
  };
}

/**
 * Create a debounced auto-save function.
 * Returns { save, flush, cancel } where:
 *   save() queues a debounced save
 *   flush() saves immediately
 *   cancel() cancels pending save
 */
export function createAutoSave(
  getProjects: () => StoredProject[],
  onStatusChange?: (status: "saving" | "saved" | "error") => void
): { save: () => void; flush: () => void; cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastSavedJson = "";

  function doSave() {
    const projects = getProjects();
    const json = JSON.stringify(projects);
    // Skip save if nothing changed
    if (json === lastSavedJson) {
      onStatusChange?.("saved");
      return;
    }
    onStatusChange?.("saving");
    const ok = saveProjects(projects);
    if (ok) {
      lastSavedJson = json;
      onStatusChange?.("saved");
    } else {
      onStatusChange?.("error");
    }
  }

  return {
    save() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(doSave, AUTO_SAVE_DEBOUNCE_MS);
    },
    flush() {
      if (timer) clearTimeout(timer);
      timer = null;
      doSave();
    },
    cancel() {
      if (timer) clearTimeout(timer);
      timer = null;
    },
  };
}
