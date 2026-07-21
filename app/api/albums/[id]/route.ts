import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { babies } from "@/lib/schema";
import { getDb } from "@/lib/db";
import { ALBUM_COOKIE, requireUser } from "@/lib/guard";
import { deleteAlbumDeep } from "@/lib/albums";

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
    await deleteAlbumDeep(db, id);
    const jar = await cookies();
    if (jar.get(ALBUM_COOKIE)?.value === id) jar.delete(ALBUM_COOKIE);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
