import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "pat-orbit-studio",
  ...(process.env.INNGEST_EVENT_KEY
    ? { eventKey: process.env.INNGEST_EVENT_KEY }
    : {}),
});

/**
 * Inngest event schemas for async video pipeline jobs.
 * The Inngest functions will read full job data from Redis
 * using the jobId included in the event payload.
 */
export type VideoJobEvent = {
  name: "jobs/video.create";
  data: { jobId: string };
};

export type RenderJobEvent = {
  name: "jobs/render.create";
  data: { jobId: string };
};

export type InngestEvents = VideoJobEvent | RenderJobEvent;
