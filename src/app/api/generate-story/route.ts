import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      story,
      language = "Hindi",
      contentType = "Story",
      style = "Cartoon",
      duration = "60 sec",
    } = body;

    if (!story || !story.trim()) {
      return NextResponse.json(
        { error: "Please provide a story idea." },
        { status: 400 }
      );
    }

    const prompt = `
You are the AI story engine for PAT Orbit Studio.

Create a short video story based on this idea:

${story}

Settings:
- Content type: ${contentType}
- Language: ${language}
- Visual style: ${style}
- Duration: ${duration}

Create exactly 5 scenes.

For every scene provide:
- id
- short scene title
- natural narration suitable for video voice-over
- detailed visual prompt for an AI image/video generator

Rules:
- Narration must be in ${language}.
- If language is Hindi, use Devanagari script.
- Visual prompts MUST be in English.
- Keep characters visually consistent.
- Create original characters and visuals.
- Do not copy real actors or existing movie scenes.
- Make the story engaging for short-form video.
- Do not use markdown.
- Do not use code fences.
- Return ONLY valid JSON.
- Escape quotation marks inside JSON strings.

Return exactly this structure:

{
  "title": "Short title",
  "scenes": [
    {
      "id": 1,
      "title": "Scene title",
      "narration": "Narration",
      "visual": "English visual prompt"
    },
    {
      "id": 2,
      "title": "Scene title",
      "narration": "Narration",
      "visual": "English visual prompt"
    },
    {
      "id": 3,
      "title": "Scene title",
      "narration": "Narration",
      "visual": "English visual prompt"
    },
    {
      "id": 4,
      "title": "Scene title",
      "narration": "Narration",
      "visual": "English visual prompt"
    },
    {
      "id": 5,
      "title": "Scene title",
      "narration": "Narration",
      "visual": "English visual prompt"
    }
  ]
}
`;

    let response;

const models = [
  "gemini-3.7-flash",
  "gemini-3.6-flash",
];

let lastError: unknown = null;

for (const model of models) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(
        `Generating story with ${model}, attempt ${attempt}...`
      );

      response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      if (response?.text) {
        break;
      }
    } catch (error) {
      lastError = error;

      const errorText =
        error instanceof Error
          ? error.message
          : String(error);

      console.error(
        `${model} attempt ${attempt} failed:`,
        errorText
      );

      const isUnavailable =
        errorText.includes("503") ||
        errorText.includes("UNAVAILABLE") ||
        errorText.includes("high demand");

      if (!isUnavailable) {
        throw error;
      }

      if (attempt < 3) {
        const delay = attempt * 2000;

        console.log(
          `Gemini busy. Retrying in ${delay}ms...`
        );

        await new Promise((resolve) =>
          setTimeout(resolve, delay)
        );
      }
    }
  }

  if (response?.text) {
    break;
  }

  console.log(
    `${model} unavailable. Trying next model...`
  );
}

if (!response?.text) {
  throw (
    lastError instanceof Error
      ? lastError
      : new Error(
          "Gemini is temporarily unavailable. Please try again shortly."
        )
  );
}

    let text = response.text?.trim();

    if (!text) {
      throw new Error("Gemini returned an empty response.");
    }

    // Remove accidental markdown code fences.
    text = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let result;

    try {
      result = JSON.parse(text);
    } catch {
      console.error("Invalid Gemini JSON:");
      console.error(text);

      throw new Error(
        "AI returned invalid story data. Please try generating again."
      );
    }

    // Validate the basic structure.
    if (
      !result ||
      typeof result.title !== "string" ||
      !Array.isArray(result.scenes)
    ) {
      throw new Error("AI returned an invalid story structure.");
    }

    if (result.scenes.length !== 5) {
      throw new Error("AI did not generate exactly 5 scenes.");
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Generate story error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate story.",
      },
      { status: 500 }
    );
  }
}