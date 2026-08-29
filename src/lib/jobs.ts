import { Redis } from "@upstash/redis";

/**
 * Lightweight Redis client for job state.
 * Upstash Redis uses REST API — compatible with Vercel serverless.
 * Falls back gracefully if env vars are not set.
 */
let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  try {
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
    }
  } catch {
    // Redis unavailable — jobs will fail gracefully
  }
  return redis;
}

/* ------------------------------------------------------------------ */
/*  Job types                                                          */
/* ------------------------------------------------------------------ */

export type JobType = "video" | "render";
export type JobStatus = "queued" | "processing" | "completed" | "failed";

export interface JobData {
  id: string;
  type: JobType;
  status: JobStatus;
  sceneId?: number;
  /** Video-specific fields */
  prompt?: string;
  image?: string;
  duration?: string;
  aspectRatio?: string;
  createdAt: string;
  updatedAt: string;
  error?: string;
  videoUrl?: string;
  /** Render-specific metadata */
  render?: {
    scenes: Array<{ id: number; video: string; narration?: string }>;
    aspectRatio?: string;
    captions?: boolean;
    music?: string;
    voiceAudios?: Record<number, string>;
  };
}

const JOB_TTL_SECONDS = 86400; // 24 hours

/* ------------------------------------------------------------------ */
/*  Job store operations                                               */
/* ------------------------------------------------------------------ */

export async function createJob(data: JobData): Promise<JobData | null> {
  const r = getRedis();
  if (!r) return null;
  await r.set(`job:${data.id}`, JSON.stringify(data), { ex: JOB_TTL_SECONDS });
  return data;
}

export async function getJob(id: string): Promise<JobData | null> {
  const r = getRedis();
  if (!r) return null;
  const raw = await r.get<string>(`job:${id}`);
  if (!raw || typeof raw !== "string") return null;
  try {
    return JSON.parse(raw) as JobData;
  } catch {
    return null;
  }
}

export async function updateJob(
  id: string,
  updates: Partial<JobData>
): Promise<JobData | null> {
  const r = getRedis();
  if (!r) return null;
  const existing = await getJob(id);
  if (!existing) return null;
  const updated: JobData = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  await r.set(`job:${id}`, JSON.stringify(updated), { ex: JOB_TTL_SECONDS });
  return updated;
}
