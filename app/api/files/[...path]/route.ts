import { promises as fs } from "fs";
import path from "path";
import { and, eq } from "drizzle-orm";
import { babies, entries, photos } from "@/lib/schema";
import { getUserId } from "@/lib/auth";
import { getBabyForUser } from "@/lib/guard";
import { getDb } from "@/lib/db";
import { mediaResponse } from "@/lib/http";

const TYPES: Record<string, string> = {
  webm: "audio/webm",
  mp4: "audio/mp4",
  m4a: "audio/mp4",
  wav: "audio/wav",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

// Local-disk twin of the /api/media gateway — same access rules:
// session (own baby) or ?share= token, file must belong to that baby.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const parts = (await params).path;
  const storedUrl = `/api/files/${parts.join("/")}`;
  const db = await getDb();
  const shareToken = new URL(req.url).searchParams.get("share");

  let babyId: string | null = null;
  if (shareToken) {
    const [shared] = await db
      .select({ id: babies.id })
      .from(babies)
      .where(eq(babies.shareToken, shareToken));
    babyId = shared?.id ?? null;
  } else {
    const userId = await getUserId();
    if (userId) babyId = (await getBabyForUser(db, userId))?.id ?? null;
  }
  if (!babyId) return new Response("Not found", { status: 404 });

  const [audio] = await db
    .select({ id: entries.id })
    .from(entries)
    .where(and(eq(entries.audioUrl, storedUrl), eq(entries.babyId, babyId)));
  let owned = !!audio;
  if (!owned) {
    const [photo] = await db
      .select({ id: photos.id })
      .from(photos)
      .innerJoin(entries, eq(photos.entryId, entries.id))
      .where(and(eq(photos.blobUrl, storedUrl), eq(entries.babyId, babyId)));
    owned = !!photo;
  }
  if (!owned) return new Response("Not found", { status: 404 });

  const base = path.join(process.cwd(), ".data", "uploads");
  const filePath = path.resolve(base, ...parts);
  if (!filePath.startsWith(base + path.sep)) {
    return new Response("Not found", { status: 404 });
  }
  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath).slice(1);
    return mediaResponse(
      data,
      TYPES[ext] ?? "application/octet-stream",
      req.headers.get("range")
    );
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
