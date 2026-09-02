/**
 * Gemini Story Provider
 *
 * Wraps the existing Director implementation that uses Gemini API.
 * Requires GEMINI_API_KEY environment variable.
 */

import { createProductionPlan, type DirectorInput } from "../director";
import type { ProductionPlan } from "../director-schema";
import type { StoryProvider, ProviderStatus } from "./types";

class GeminiStoryProvider implements StoryProvider {
  readonly name = "Gemini Director";
  readonly requiresApiKey = true;

  async generatePlan(input: DirectorInput): Promise<ProductionPlan> {
    return createProductionPlan(input);
  }
}

export async function checkGeminiDirectorHealth(): Promise<ProviderStatus> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { available: false, name: "Gemini", error: "GEMINI_API_KEY not configured" };
  }
  return { available: true, name: "Gemini (configured)" };
}

export const geminiStoryProvider: StoryProvider = new GeminiStoryProvider();
export default geminiStoryProvider;
