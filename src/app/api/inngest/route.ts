import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest";
import { generateVideoJob, renderVideoJob } from "@/inngest/functions";

/**
 * Inngest HTTP endpoint.
 * Inngest Cloud calls this endpoint to execute functions.
 * In development, use `npx inngest dev` to tunnel events here.
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [generateVideoJob, renderVideoJob],
});
