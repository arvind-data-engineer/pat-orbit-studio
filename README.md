# PAT Orbit Studio

AI Video Creation Studio — Generate stories, scenes, visuals, voice and video from one creative workspace.

## Tech Stack

- **Frontend:** Next.js 16.3.3, React 19, TypeScript, Tailwind CSS
- **AI:** Google Gemini (story, image, TTS), Veo 2 (video generation)
- **Processing:** FFmpeg (final video rendering)
- **Storage:** Vercel Blob (video files), Upstash Redis (job state)
- **Orchestration:** Inngest (async background jobs)

## Environment Variables

Create a `.env.local` file with the following:

```
# Google Gemini API key (required)
# Used for: story generation, image generation, video generation (Veo), TTS
GEMINI_API_KEY=your_key_here

# Vercel Blob storage token (required for video storage)
# Get from: vercel.com/dashboard -> Storage -> Blob -> Create Token
BLOB_READ_WRITE_TOKEN=your_token_here

# Upstash Redis (required for async job state)
# Get from: console.upstash.com -> Create Database -> REST API
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here

# Inngest (required for background job execution)
# Get from: inngest.com/dashboard -> App -> Event Key + Signing Key
INNGEST_EVENT_KEY=your_event_key
INNGEST_SIGNING_KEY=your_signing_key
```

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables in `.env.local`

3. Start the Inngest Dev Server (required for background jobs):
   ```bash
   npx inngest dev
   ```

4. In a separate terminal, start Next.js:
   ```bash
   npm run dev
   ```

5. Open http://localhost:3000

## Vercel Deployment

1. Push to GitHub
2. Import project in Vercel dashboard
3. Add all environment variables in Vercel project settings
4. Deploy

### Inngest Production Setup

After deployment:

1. Go to inngest.com/dashboard
2. Add your production app
3. Set the serve URL to: `https://your-domain.vercel.app/api/inngest`
4. Verify functions are detected and active

### Production Checklist

**Environment Variables:**
- [ ] GEMINI_API_KEY
- [ ] BLOB_READ_WRITE_TOKEN
- [ ] UPSTASH_REDIS_REST_URL
- [ ] UPSTASH_REDIS_REST_TOKEN
- [ ] INNGEST_EVENT_KEY
- [ ] INNGEST_SIGNING_KEY

**Inngest:**
- [ ] Production endpoint configured
- [ ] Functions detected
- [ ] Functions active
- [ ] Events received

**Vercel:**
- [ ] Production deployment successful
- [ ] API routes responding
- [ ] Node.js runtime (not Edge) for all API routes

## Architecture

### Async Video Pipeline

```
User clicks "Generate Video"
  -> POST /api/jobs/video (returns jobId in <1s)
  -> Job stored in Redis (status: queued)
  -> Event sent to Inngest
  -> Inngest Cloud executes background function
  -> Veo API generates video
  -> Video uploaded to Vercel Blob
  -> Job updated in Redis (status: completed)
  -> Frontend polls GET /api/jobs/video?jobId=xxx every 3s
  -> Video URL displayed
```

### Final Rendering

```
User clicks "Render Final Video"
  -> Voice audio generated (client-side, fast)
  -> POST /api/jobs/render (returns jobId in <1s)
  -> Inngest Cloud executes render function:
     - Downloads scene videos from Blob
     - Generates voice tracks
     - Generates background music
     - FFmpeg combines everything
     - Uploads final MP4 to Blob
  -> Job updated in Redis (status: completed)
  -> Frontend polls for completion
  -> Final video URL displayed
```

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/generate-story` | POST | Generate 5-scene story |
| `/api/generate-image` | POST | Generate scene image |
| `/api/generate-voice` | POST | Generate narration audio |
| `/api/jobs/video` | POST | Create video generation job |
| `/api/jobs/video` | GET | Poll video job status |
| `/api/jobs/render` | POST | Create render job |
| `/api/jobs/render` | GET | Poll render job status |
| `/api/inngest` | GET/POST/PUT | Inngest HTTP endpoint |
