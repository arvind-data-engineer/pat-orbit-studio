import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    if (!prompt || !prompt.trim()) {
      return NextResponse.json(
        { error: "Image prompt is required." },
        { status: 400 }
      );
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: prompt,
    });

    const parts = response.candidates?.[0]?.content?.parts ?? [];

    for (const part of parts) {
      if (part.inlineData?.data && part.inlineData?.mimeType) {
        return NextResponse.json({
          image: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
        });
      }
    }

    throw new Error("No image was returned by Gemini.");
  } catch (error) {
    console.error("Generate image error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate image.",
      },
      { status: 500 }
    );
  }
}