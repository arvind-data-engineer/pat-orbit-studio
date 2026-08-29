import { NextResponse } from "next/server";
import { inngest } from "@/lib/inngest";
import { createJob, getJob, type JobData } from "@/lib/jobs";

/**
 * POST /api/jobs/render
 * Creates an async final-render job and returns immediately.
 *
 * Body: { scenes, aspectRatio, captions, music, voiceAudios }
 * Response: { jobId, status: "queued" }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { scenes, aspectRatio, captions, music, voiceAudios } = body;

    if (!Array.isArray(scenes) || scenes.length === 0) {
      return NextResponse.json(
        { error: "No scene videos provided." },
        { status: 400 }
      );
    }

    // Validate each scene has a video URL
    for (let i = 0; i < scenes.length; i++) {
      const s = scenes[i];
      if (!s || typeof s !== "object" || !s.video || typeof s.video !== "string") {
        return NextResponse.json(
          { error: `Scene ${i + 1} is missing a video.` },
          { status: 400 }
        );
      }
      // Validate video URL is a reasonable format
      if (!s.video.startsWith('http') && !s.video.startsWith('data:')) {
        return NextResponse.json(
          { error: `Scene ${i + 1} has an invalid video URL.` },
          { status: 400 }
        );
      }
    }

    if (aspectRatio && !['16:9', '9:16', '1:1'].includes(aspectRatio)) {
      return NextResponse.json(
        { error: "Invalid aspect ratio." },
        { status: 400 }
      );
    }

    if (music && !['None', 'Ambient', 'Cinematic', 'Emotional'].includes(music)) {
      return NextResponse.json(
        { error: "Invalid music option." },
        { status: 400 }
      );
    }

    const jobId = `render-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const jobData: JobData = {
      id: jobId,
      type: "render",
      status: "queued",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      render: {
        scenes: scenes.map((s: { id: number; video: string; narration?: string }) => ({
          id: s.id,
          video: s.video,
          narration: s.narration,
        })),
        aspectRatio,
        captions: !!captions,
        music: music || "None",
        voiceAudios: voiceAudios || {},
      },
    };

    const stored = await createJob(jobData);
    if (!stored) {
      return NextResponse.json(
        { error: "Job queue unavailable. Please try again." },
        { status: 503 }
      );
    }

    await inngest.send({
      name: "jobs/render.create",
      data: { jobId },
    });

    console.log(`[jobs/render] Created ${jobId} with ${scenes.length} scenes`);
    return NextResponse.json({ jobId, status: "queued" }, { status: 202 });
  } catch (error) {
    console.error("Create render job error:", error);
    return NextResponse.json(
      { error: "Failed to create render job." },
      { status: 500 }
    );
  }
}

/**
 * GET /api/jobs/render?jobId=xxx
 * Returns the current status of a render job.
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
    console.error("Get render job error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve job status." },
      { status: 500 }
    );
  }
}
