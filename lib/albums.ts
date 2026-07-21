import { eq, inArray } from "drizzle-orm";
import { babies, babyMembers, entries, invites, photos } from "./schema";
import { deleteStoredFile } from "./storage";

// Deletes an album and EVERYTHING under it: stored audio + photo files (best
// effort), photo rows, entries, memberships, invites, the album row itself.
// Used by album deletion and by GDPR account deletion — one audited path.
// entries.babyId has no DB cascade, so the order here matters.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function deleteAlbumDeep(db: any, babyId: string): Promise<void> {
  const albumEntries = await db.select().from(entries).where(eq(entries.babyId, babyId));
  const entryIds = albumEntries.map((e: typeof entries.$inferSelect) => e.id);
  const pics = entryIds.length
    ? await db.select().from(photos).where(inArray(photos.entryId, entryIds))
    : [];
  for (const p of pics) await deleteStoredFile(p.blobUrl);
  for (const e of albumEntries) await deleteStoredFile(e.audioUrl);
  if (entryIds.length) {
    await db.delete(photos).where(inArray(photos.entryId, entryIds));
  }
  await db.delete(entries).where(eq(entries.babyId, babyId));
  await db.delete(babyMembers).where(eq(babyMembers.babyId, babyId));
  await db.delete(invites).where(eq(invites.babyId, babyId));
  await db.delete(babies).where(eq(babies.id, babyId));
}
