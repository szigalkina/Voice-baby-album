import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { entries, photos } from "@/lib/schema";
import { requireBaby } from "@/lib/guard";
import { deleteStoredFile } from "@/lib/storage";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  try {
    const { baby, db } = await requireBaby();
    const { id, photoId } = await params;
    const [entry] = await db
      .select()
      .from(entries)
      .where(and(eq(entries.id, id), eq(entries.babyId, baby.id)));
    if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const deleted = await db
      .delete(photos)
      .where(and(eq(photos.id, photoId), eq(photos.entryId, id)))
      .returning();
    if (!deleted.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await deleteStoredFile(deleted[0].blobUrl);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
