"use client";

import { useRef, useState } from "react";
import type { Photo } from "@/lib/types";
import { reportClientError } from "@/lib/report";

// The platform rejects request bodies over ~4.5MB with a plain-text error the
// client can't parse — modern phone photos are routinely bigger. Downscale in
// the browser to a print-safe size (2560px covers 300dpi on the 21cm page).
const MAX_EDGE = 2560;
const MAX_BYTES = 4 * 1024 * 1024;

async function shrink(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size <= MAX_BYTES) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    let out: Blob | null = null;
    for (const quality of [0.85, 0.6]) {
      out = await new Promise<Blob | null>((r) =>
        canvas.toBlob(r, "image/jpeg", quality)
      );
      if (out && out.size <= MAX_BYTES) break;
    }
    return out ?? file;
  } catch {
    return file; // undecodable here (e.g. HEIC outside Safari) — the server explains
  }
}

export default function PhotoUploader({
  entryId,
  onAdded,
  label = "add a photo",
}: {
  entryId: string;
  onAdded: (photos: Photo[]) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    const added: Photo[] = [];
    try {
      // One photo per request: several photos together can exceed the
      // platform's request size limit even after downscaling.
      for (const f of Array.from(files)) {
        const blob = await shrink(f);
        const form = new FormData();
        form.append("photo", blob, blob === f ? f.name : "photo.jpg");
        const res = await fetch(`/api/entries/${entryId}/photos`, {
          method: "POST",
          body: form,
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.photos) {
          throw new Error(
            data?.error ??
              (res.status === 413
                ? "That photo is too large to upload"
                : "Upload failed")
          );
        }
        added.push(...data.photos);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      setError(msg);
      reportClientError(`photo upload: ${msg}`);
    } finally {
      if (added.length) onAdded(added);
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <span>
      {/* No `capture` attribute: phones offer the photo gallery (with camera
          as an option) and computers open a normal file picker. */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => upload(e.target.files)}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="label-caps text-ink underline underline-offset-4 disabled:opacity-40"
      >
        {busy ? "uploading…" : label}
      </button>
      {error && <span className="ml-2 text-xs text-umber">{error}</span>}
    </span>
  );
}
