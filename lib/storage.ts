import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

const DISK_TYPES: Record<string, string> = {
  webm: "audio/webm",
  mp4: "audio/mp4",
  m4a: "audio/mp4",
  wav: "audio/wav",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

// Saves a file and returns the URL to store in the DB.
// - Vercel Blob configured: PRIVATE blob; returns an app-internal /api/media/…
//   URL served only through the authenticated media route.
// - Local dev: disk under .data/uploads, served by /api/files.
export async function saveFile(
  folder: "audio" | "photos",
  ext: string,
  data: Buffer,
  contentType: string
): Promise<string> {
  const name = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`${folder}/${name}`, data, {
      access: "private",
      contentType,
    });
    return `/api/media/${encodeURIComponent(blob.url)}`;
  }
  const dir = path.join(process.cwd(), ".data", "uploads", folder);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), data);
  return `/api/files/${folder}/${name}`;
}

// Reads any stored media URL back into memory (server-side only).
// Handles all three URL shapes that can exist in the DB:
//   /api/media/<encoded private blob url>  (current)
//   /api/files/<folder>/<name>             (local disk)
//   https://…public.blob…                  (legacy public blobs)
export async function readStoredFile(
  url: string
): Promise<{ data: Buffer; contentType: string } | null> {
  if (url.startsWith("/api/media/")) {
    const blobUrl = decodeURIComponent(url.slice("/api/media/".length));
    const { get } = await import("@vercel/blob");
    const res = await get(blobUrl, { access: "private" });
    if (!res || res.statusCode !== 200 || !res.stream) return null;
    const data = Buffer.from(await new Response(res.stream).arrayBuffer());
    return {
      data,
      contentType: res.blob?.contentType ?? "application/octet-stream",
    };
  }
  if (url.startsWith("/api/files/")) {
    try {
      const rel = url.replace("/api/files/", "");
      const filePath = path.join(process.cwd(), ".data", "uploads", ...rel.split("/"));
      const data = await fs.readFile(filePath);
      const ext = path.extname(filePath).slice(1);
      return { data, contentType: DISK_TYPES[ext] ?? "application/octet-stream" };
    } catch {
      return null;
    }
  }
  const res = await fetch(url);
  if (!res.ok) return null;
  return {
    data: Buffer.from(await res.arrayBuffer()),
    contentType: res.headers.get("content-type") ?? "application/octet-stream",
  };
}
