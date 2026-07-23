// One-off local seed: fills the demo album with realistic first-year
// memories for a portfolio screenshot. Not part of the app; run manually
// with the dev server stopped (PGlite is single-process), then restart.
import { eq } from "drizzle-orm";
import { getDb } from "../lib/db";
import { babies, entries } from "../lib/schema";
import { saveFile } from "../lib/storage";

const SILENCE = Buffer.from([0x1a, 0x45, 0xdf, 0xa3]); // placeholder audio bytes

type Seed = {
  monthsAgo: number;
  title: string;
  summary: string;
  quote: string | null;
  isMilestone: boolean;
  milestoneType: string | null;
};

const MEMORIES: Seed[] = [
  {
    monthsAgo: 8,
    title: "First big laugh",
    summary:
      "She laughed out loud for the very first time today, set off by the dog sneezing twice in a row.",
    quote: "laughed out loud for the very first time",
    isMilestone: true,
    milestoneType: "first_laugh",
  },
  {
    monthsAgo: 7,
    title: "Sunday market, sleeping through it",
    summary:
      "We walked the whole Sunday market with her asleep in the carrier. Bought too many tomatoes.",
    quote: null,
    isMilestone: false,
    milestoneType: null,
  },
  {
    monthsAgo: 6,
    title: "Rolled over twice",
    summary:
      "Back to front, then did it again ten minutes later like she wanted to make sure we saw.",
    quote: "did it again like she wanted to make sure we saw",
    isMilestone: true,
    milestoneType: "first_roll",
  },
  {
    monthsAgo: 5,
    title: "Grandma's kitchen",
    summary:
      "She sat propped on the counter and watched grandma make soup, completely still, completely focused.",
    quote: null,
    isMilestone: false,
    milestoneType: null,
  },
  {
    monthsAgo: 4,
    title: "First taste of banana",
    summary:
      "One spoon of mashed banana. She made the face, then opened her mouth for more.",
    quote: "made the face, then opened her mouth for more",
    isMilestone: true,
    milestoneType: "first_food",
  },
  {
    monthsAgo: 3,
    title: "Pulled herself up",
    summary:
      "Pulled up to standing at the coffee table for the first time this evening, wobbled, sat straight back down, grinning.",
    quote: "wobbled, sat straight back down, grinning",
    isMilestone: true,
    milestoneType: "first_stand",
  },
  {
    monthsAgo: 2,
    title: "Rain on the window",
    summary: "She pressed her whole hand flat on the window, watching the rain, for almost ten minutes.",
    quote: null,
    isMilestone: false,
    milestoneType: null,
  },
  {
    monthsAgo: 1,
    title: "First word: 'up'",
    summary:
      "Said 'up' clearly, twice, arms raised, at breakfast. We both just stopped eating and stared at her.",
    quote: "said it clearly, twice, arms raised",
    isMilestone: true,
    milestoneType: "first_word",
  },
];

async function main() {
  const db = await getDb();
  const [baby] = await db.select().from(babies).where(eq(babies.name, "Baby's First Year"));
  if (!baby) throw new Error("Album 'Baby's First Year' not found — create it in the UI first.");

  const audioUrl = await saveFile("audio", "webm", SILENCE, "audio/webm");

  for (const m of MEMORIES) {
    const recordedAt = new Date();
    recordedAt.setMonth(recordedAt.getMonth() - m.monthsAgo);
    await db.insert(entries).values({
      babyId: baby.id,
      recordedAt,
      audioUrl,
      transcript: m.summary,
      title: m.title,
      summary: m.summary,
      quote: m.quote,
      isMilestone: m.isMilestone,
      milestoneType: m.milestoneType,
      photoPrompt: null,
      inAlbum: true,
      status: "ready",
    });
    console.log("seeded:", m.title);
  }
  console.log(`Done — ${MEMORIES.length} entries added to "${baby.name}".`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
