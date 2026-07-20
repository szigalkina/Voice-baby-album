import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq, inArray } from "drizzle-orm";
import { babies, babyMembers, entries, invites, photos } from "@/lib/schema";
import { getDb } from "@/lib/db";
import { ALBUM_COOKIE, requireUser } from "@/lib/guard";
import { deleteStoredFile } from "@/lib/storage";

// Only the album's creator can rename or delete it (members just view/add).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ownedBaby(db: any, userId: string, id: string) {
  const [baby] = await db.select().from(babies).where(eq(babies.id, id));
  return baby && baby.userId === userId ? baby : null;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUser();
    const { id } = await params;
    const db = await getDb();
    if (!(await ownedBaby(db, userId, id))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const body = await req.json();
    const patch: Record<string, string> = {};
    if (typeof body.name === "string" && body.name.trim()) {
      patch.name = body.name.trim().slice(0, 80);
    }
    if (typeof body.birthdate === "string" && body.birthdate) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(body.birthdate) || isNaN(Date.parse(body.birthdate))) {
        return NextResponse.json({ error: "Date must be YYYY-MM-DD" }, { status: 400 });
      }
      patch.birthdate = body.birthdate;
    }
    if (!Object.keys(patch).length) {
      return NextResponse.json({ error: "Nothing to change" }, { status: 400 });
    }
    const [updated] = await db
      .update(babies)
      .set(patch)
      .where(eq(babies.id, id))
      .returning();
    return NextResponse.json({ album: updated });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUser();
    const { id } = await params;
    const db = await getDb();
    if (!(await ownedBaby(db, userId, id))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const albumEntries = await db.select().from(entries).where(eq(entries.babyId, id));
    const entryIds = albumEntries.map((e: typeof entries.$inferSelect) => e.id);
    const pics = entryIds.length
      ? await db.select().from(photos).where(inArray(photos.entryId, entryIds))
      : [];
    // Stored files first (best effort — deleteStoredFile swallows errors),
    // then rows; entries.babyId has no cascade so the order matters.
    for (const p of pics) await deleteStoredFile(p.blobUrl);
    for (const e of albumEntries) await deleteStoredFile(e.audioUrl);
    if (entryIds.length) {
      await db.delete(photos).where(inArray(photos.entryId, entryIds));
    }
    await db.delete(entries).where(eq(entries.babyId, id));
    await db.delete(babyMembers).where(eq(babyMembers.babyId, id));
    await db.delete(invites).where(eq(invites.babyId, id));
    await db.delete(babies).where(eq(babies.id, id));
    const jar = await cookies();
    if (jar.get(ALBUM_COOKIE)?.value === id) jar.delete(ALBUM_COOKIE);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
