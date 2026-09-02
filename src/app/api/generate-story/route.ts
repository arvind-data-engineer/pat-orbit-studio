import { NextResponse } from "next/server";
import { getStoryProvider } from "@/lib/ai/providers";
import type { DirectorInput } from "@/lib/ai/director";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      story,
      language = "Hindi",
      style = "Cartoon",
      duration = "60 sec",
      aspectRatio = "16:9",
      characters = [],
    } = body as {
      story?: string;
      language?: string;
      style?: string;
      duration?: string;
      aspectRatio?: string;
      characters?: Array<{
        name: string;
        description?: string;
        appearance?: string;
        role?: string;
      }>;
    };

    if (!story || !story.trim()) {
      return NextResponse.json(
        { error: "Please provide a story idea." },
        { status: 400 }
      );
    }

    // Parse duration string → seconds.
    const durationMatch = duration.match(/(\d+)/);
    const durationSec = durationMatch ? parseInt(durationMatch[1], 10) : 60;

    // Build character list for the Director.
    const directorCharacters = (characters ?? [])
      .filter((c) => c.name?.trim())
      .map((c) => ({
        name: c.name.trim(),
        role: c.role?.trim() || "character",
        appearance: c.appearance?.trim() || "",
        description: c.description?.trim() || "",
      }));

    // Call the AI Director via provider abstraction.
    const input: DirectorInput = {
      idea: story.trim(),
      genre: style,
      tone: language,
      duration: durationSec,
      aspectRatio: (aspectRatio as DirectorInput["aspectRatio"]) || "16:9",
      visualStyle: style,
      characters: directorCharacters,
    };

    const storyProvider = getStoryProvider();
    const plan = await storyProvider.generatePlan(input);

    // Convert Director scenes -> Studio scenes.
    // Studio Scene = { id: number, title, narration, visual, beat, sceneDuration }
    // DirectorScene has structured fields we flatten into the Studio format.

    const scenes = plan.scenes.map((scene, i) => {
      // Build a detailed visual prompt string from the structured VisualPlan.
      const v = scene.visual;
      const visualParts: string[] = [];
      if (v.subject) visualParts.push(v.subject);
      if (v.environment) visualParts.push(`in ${v.environment}`);
      if (v.action) visualParts.push(v.action);
      if (v.lighting) visualParts.push(`Lighting: ${v.lighting}`);
      if (v.composition) visualParts.push(`${v.composition} shot`);
      if (v.visualStyle) visualParts.push(`${v.visualStyle} style`);
      const visualPrompt = visualParts.join(". ");

      // Build a camera/motion note to append.
      const camParts: string[] = [];
      if (scene.camera.shotType) camParts.push(scene.camera.shotType);
      if (scene.camera.angle) camParts.push(scene.camera.angle);
      if (scene.camera.movement && scene.camera.movement !== "static") {
        camParts.push(`${scene.camera.movement} movement`);
      }
      const cameraNote = camParts.length > 0 ? ` Camera: ${camParts.join(", ")}.` : "";

      return {
        id: i + 1,
        title: scene.title || `Scene ${i + 1}`,
        narration: scene.narration || "",
        visual: visualPrompt + cameraNote,
        beat: scene.beat || "",
        sceneDuration: String(Math.round(scene.duration) || Math.round(durationSec / 5)),
        // Pass Director structured plans through for downstream generation
        directorCamera: scene.camera,
        directorMotion: scene.motion,
        directorVoice: scene.voice,
        directorContinuityBefore: scene.continuityBefore || undefined,
        directorContinuityAfter: scene.continuityAfter || undefined,
      };
    });

    const result = {
      title: plan.project.title || "Untitled",
      scenes,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Generate story error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to generate story.",
      },
      { status: 500 }
    );
  }
}
