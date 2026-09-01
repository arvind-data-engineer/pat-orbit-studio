/**
 * PAT Orbit — Shared Video Types
 *
 * Extracted from page.tsx for component reuse.
 */

export type Scene = {
  id: number;
  title: string;
  narration: string;
  visual: string;
  beat?: string;
  sceneDuration?: string;
  directorCamera?: { shotType: string; angle: string; movement: string; framing: string };
  directorMotion?: { subjectMovement: string; environmentMovement: string; intensity: string };
  directorVoice?: { voice: string; emotion: string; pace: string; emphasis: string };
  directorContinuityBefore?: { characters: { name: string; appearance: string }[]; location: string; timeOfDay: string; weather: string; importantObjects: string[]; previousSceneEnding: string };
  directorContinuityAfter?: { characters: { name: string; appearance: string }[]; location: string; timeOfDay: string; weather: string; importantObjects: string[]; previousSceneEnding: string };
};

export type StoryResult = {
  title: string;
  scenes: Scene[];
};

export type Character = {
  name: string;
  description: string;
  appearance: string;
  role: string;
};

export type Project = {
  id: string;
  title: string;
  story: string;
  language: string;
  style: string;
  duration: string;
  result: StoryResult;
  createdAt: string;
  sceneImages?: Record<number, string>;
  sceneVideos?: Record<number, string>;
  finalVideoUrl?: string | null;
  characters?: Character[];
  sceneCharacters?: Record<number, number[]>;
  aspectRatio?: string;
  voice?: string;
  captions?: boolean;
  music?: string;
  voiceGenerated?: Record<number, boolean>;
};

export const TEMPLATES = [
  { icon: "🎬", label: "Cinematic Story", desc: "Dramatic narrative with cinematic visuals", style: "Cinematic", duration: "60 sec", aspectRatio: "16:9", text: "A retired astronaut receives a mysterious signal from a distant planet. She must decide whether to return to space for one final mission that could change humanity's understanding of the universe." },
  { icon: "📱", label: "YouTube Short", desc: "Fast-paced vertical short-form video", style: "Cinematic", duration: "30 sec", aspectRatio: "9:16", text: "A street magician performs an impossible trick in a crowded market. The camera follows the coin as it transforms into something nobody expected, leaving the audience in complete shock." },
  { icon: "👻", label: "Horror", desc: "Suspenseful atmospheric horror story", style: "Cinematic", duration: "60 sec", aspectRatio: "9:16", text: "A family moves into an old Victorian house. On the first night, the youngest daughter whispers that someone else already lives here. Strange sounds begin echoing from the basement at exactly 3 AM." },
  { icon: "🧒", label: "Kids Adventure", desc: "Colorful animated adventure for all ages", style: "Cartoon", duration: "60 sec", aspectRatio: "16:9", text: "A brave little fox named Pip discovers a hidden garden where tiny magical creatures live. When a storm threatens to destroy their home, Pip must find the legendary Sun Stone to save them all." },
  { icon: "🚀", label: "Sci-Fi", desc: "Futuristic cinematic story", style: "Cinematic", duration: "60 sec", aspectRatio: "16:9", text: "In the year 2150, a city floats above the clouds. A young engineer discovers that the city's power source is slowly dying. She has 24 hours to find a solution before the entire city falls from the sky." },
  { icon: "💡", label: "Motivational", desc: "Inspirational short video", style: "Cinematic", duration: "30 sec", aspectRatio: "9:16", text: "A young boxer trains alone in an empty gym at dawn. Through sweat and determination, we see the journey from struggle to triumph, ending with a powerful moment of victory." },
];

export const MUSIC_DESCRIPTIONS: Record<string, string> = {
  None: "No background music",
  Ambient: "Soft, atmospheric background tones",
  Cinematic: "Dramatic orchestral-style score",
  Emotional: "Gentle, expressive melody",
};

export function getInitials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

export const CHAR_COLORS = [
  'bg-emerald-500/20 text-emerald-400',
  'bg-violet-500/20 text-violet-400',
  'bg-amber-500/20 text-amber-400',
  'bg-blue-500/20 text-blue-400',
  'bg-rose-500/20 text-rose-400',
  'bg-cyan-500/20 text-cyan-400',
];

/** Production pipeline stages */
export const PIPELINE_STAGES = [
  { key: "idea", label: "Idea" },
  { key: "story", label: "Story" },
  { key: "scenes", label: "Scenes" },
  { key: "visuals", label: "Visuals" },
  { key: "motion", label: "Motion" },
  { key: "audio", label: "Audio" },
  { key: "final", label: "Final" },
] as const;
