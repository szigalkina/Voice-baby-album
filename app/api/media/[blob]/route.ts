import { and, eq } from "drizzle-orm";
import { babies, entries, photos } from "@/lib/schema";
import { requireBaby } from "@/lib/guard";
import { getDb } from "@/lib/db";
import { mediaResponse } from "@/lib/http";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fileBelongsToBaby(db: any, storedUrl: string, babyId: string) {
  const [audio] = await db
    .select({ id: entries.id })
    .from(entries)
    .where(and(eq(entries.audioUrl, storedUrl), eq(entries.babyId, babyId)));
  if (audio) return true;
  const [photo] = await db
    .select({ id: photos.id })
    .from(photos)
    .innerJoin(entries, eq(photos.entryId, entries.id))
    .where(and(eq(photos.blobUrl, storedUrl), eq(entries.babyId, babyId)));
  return !!photo;
}

// Authenticated gateway to private blob storage. Two ways in:
// - a signed-in parent (session cookie), for their own baby's files
// - a share token (?share=…), read-only, for that album's files only
// Supports Range requests — required for audio playback in Safari.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ blob: string }> }
) {
  try {
    const { blob } = await params; // Next decodes the segment → raw blob URL
    const storedUrl = `/api/media/${encodeURIComponent(blob)}`;
    const shareToken = new URL(req.url).searchParams.get("share");

    let babyId: string;
    let db;
    if (shareToken) {
      db = await getDb();
      const [shared] = await db
        .select({ id: babies.id })
        .from(babies)
        .where(eq(babies.shareToken, shareToken));
      if (!shared) return new Response("Not found", { status: 404 });
      babyId = shared.id;
    } else {
      const ctx = await requireBaby();
      db = ctx.db;
      babyId = ctx.baby.id;
    }

    if (!(await fileBelongsToBaby(db, storedUrl, babyId))) {
      return new Response("Not found", { status: 404 });
    }

    const { get } = await import("@vercel/blob");
    const res = await get(blob, { access: "private" });
    if (!res || res.statusCode !== 200 || !res.stream) {
      return new Response("Not found", { status: 404 });
    }
    const data = Buffer.from(await new Response(res.stream).arrayBuffer());
    return mediaResponse(
      data,
      res.blob?.contentType ?? "application/octet-stream",
      req.headers.get("range")
    );
  } catch (e) {
    if (e instanceof Response) return e;
    return new Response("Server error", { status: 500 });
  }
}
