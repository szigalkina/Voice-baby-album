import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { entries, photos, users } from "@/lib/schema";
import { getDb } from "@/lib/db";
import { getBabiesForUser, requireUser } from "@/lib/guard";

// GDPR data portability: everything we hold about the account, as one JSON
// download. Recordings and photos are files — they play/download in the app
// and the album exports as a print PDF; this file carries all the text and
// the structure.
export async function GET() {
  try {
    const userId = await requireUser();
    const db = await getDb();
    const [me] = await db.select().from(users).where(eq(users.id, userId));
    if (!me) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const albums = await getBabiesForUser(db, userId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const albumIds = albums.map((b: any) => b.id);
    const allEntries = albumIds.length
      ? await db.select().from(entries).where(inArray(entries.babyId, albumIds))
      : [];
    const entryIds = allEntries.map((e: typeof entries.$inferSelect) => e.id);
    const allPhotos = entryIds.length
      ? await db.select().from(photos).where(inArray(photos.entryId, entryIds))
      : [];

    const data = {
      exportedAt: new Date().toISOString(),
      account: { email: me.email, createdAt: me.createdAt },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      albums: albums.map((b: any) => ({
        name: b.name,
        title: b.title,
        startDate: b.birthdate,
        owned: b.userId === userId,
        createdAt: b.createdAt,
        entries: allEntries
          .filter((e: typeof entries.$inferSelect) => e.babyId === b.id)
          .map((e: typeof entries.$inferSelect) => ({
            recordedAt: e.recordedAt,
            status: e.status,
            title: e.title,
            summary: e.summary,
            transcript: e.transcript,
            quote: e.quote,
            isMilestone: e.isMilestone,
            milestoneType: e.milestoneType,
            inAlbum: e.inAlbum,
            audioUrl: e.audioUrl,
            photos: allPhotos
              .filter((p: typeof photos.$inferSelect) => p.entryId === e.id)
              .map((p: typeof photos.$inferSelect) => p.blobUrl),
          })),
      })),
    };
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": 'attachment; filename="voice-memory-album-export.json"',
      },
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
