import { desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { babies, entries, photos } from "@/lib/schema";
import type { Entry } from "@/lib/types";
import SharedBook from "@/components/SharedBook";
import WaveMark from "@/components/WaveMark";

export const dynamic = "force-dynamic";

export default async function SharedAlbumPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const db = await getDb();
  const [baby] = await db.select().from(babies).where(eq(babies.shareToken, token));

  if (!baby) {
    return (
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 text-center">
        <WaveMark className="mb-6" />
        <h1 className="font-display italic text-[26px] leading-snug">
          this album link is no longer active
        </h1>
        <p className="mt-3 text-sm text-ink-soft">
          ask the family for a fresh one
        </p>
      </main>
    );
  }

  const list = await db
    .select()
    .from(entries)
    .where(eq(entries.babyId, baby.id))
    .orderBy(desc(entries.recordedAt));
  const ids = list.map((e: typeof entries.$inferSelect) => e.id);
  const pics = ids.length
    ? await db.select().from(photos).where(inArray(photos.entryId, ids))
    : [];
  const album: Entry[] = list
    .map((e: typeof entries.$inferSelect) => ({
      ...e,
      photos: pics
        .filter((p: typeof photos.$inferSelect) => p.entryId === e.id)
        .map((p: typeof photos.$inferSelect) => ({
          ...p,
          // Route photo loads through the share token — no account needed.
          blobUrl: `${p.blobUrl}${p.blobUrl.includes("?") ? "&" : "?"}share=${token}`,
        })),
    }))
    .filter((e: Entry) => e.status === "ready" && e.inAlbum)
    .sort(
      (a: Entry, b: Entry) =>
        new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
    );

  return (
    <SharedBook
      baby={{ id: baby.id, name: baby.name, birthdate: baby.birthdate, title: baby.title }}
      entries={album}
    />
  );
}
