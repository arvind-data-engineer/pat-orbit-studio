import { NextResponse } from "next/server";
import { inngest } from "@/lib/inngest";
import { createJob, getJob, type JobData } from "@/lib/jobs";

/**
 * POST /api/jobs/video
 * Creates an async video generation job and returns immediately.
 *
 * Body: { prompt, image?, duration?, aspectRatio?, sceneId? }
 * Response: { jobId, status: "queued" }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, image, duration, aspectRatio, sceneId, characters, sceneTitle } = body;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json(
        { error: "Video prompt is required." },
        { status: 400 }
      );
    }

    if (prompt.length > 5000) {
      return NextResponse.json(
        { error: "Video prompt is too long. Maximum 5000 characters." },
        { status: 400 }
      );
    }

    if (aspectRatio && !['16:9', '9:16', '1:1'].includes(aspectRatio)) {
      return NextResponse.json(
        { error: "Invalid aspect ratio." },
        { status: 400 }
      );
    }

    const jobId = `video-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Store initial job state in Redis
    const jobData: JobData = {
      id: jobId,
      type: "video",
      status: "queued",
      sceneId: typeof sceneId === "number" ? sceneId : undefined,
      prompt: prompt.trim(),
      image: image || undefined,
      duration: duration || undefined,
      aspectRatio: aspectRatio || undefined,
      characters: Array.isArray(characters) ? characters : undefined,
      sceneTitle: typeof sceneTitle === 'string' ? sceneTitle : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const stored = await createJob(jobData);
    if (!stored) {
      return NextResponse.json(
        { error: "Job queue unavailable. Please try again." },
        { status: 503 }
      );
    }

    // Dispatch event to Inngest to start background processing
    await inngest.send({
      name: "jobs/video.create",
      data: { jobId },
    });

    console.log(`[jobs/video] Created ${jobId} for scene ${sceneId ?? 'unknown'}`);
    return NextResponse.json({ jobId, status: "queued" }, { status: 202 });
  } catch (error) {
    console.error("Create video job error:", error);
    return NextResponse.json(
      { error: "Failed to create video job." },
      { status: 500 }
    );
  }
}

/**
 * GET /api/jobs/video?jobId=xxx
 * Returns the current status of a video generation job.
 *
 * Response: { jobId, status, videoUrl?, error? }
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    if (!jobId) {
      return NextResponse.json(
        { error: "jobId parameter is required." },
        { status: 400 }
      );
    }

    const job = await getJob(jobId);
    if (!job) {
      return NextResponse.json(
        { error: "Job not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      videoUrl: job.videoUrl || null,
      error: job.error || null,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    });
  } catch (error) {
    console.error("Get video job error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve job status." },
      { status: 500 }
    );
  }
}
