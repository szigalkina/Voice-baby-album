import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ALBUM_COOKIE, getBabiesForUser, requireUser } from "@/lib/guard";
import { getDb } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const userId = await requireUser();
    const { id } = await req.json();
    const db = await getDb();
    const list = await getBabiesForUser(db, userId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!list.some((b: any) => b.id === id)) {
      return NextResponse.json({ error: "Not your album" }, { status: 404 });
    }
    (await cookies()).set(ALBUM_COOKIE, id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
