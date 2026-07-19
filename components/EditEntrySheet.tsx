"use client";

import { useState } from "react";
import Image from "next/image";
import type { Entry } from "@/lib/types";
import PhotoUploader from "./PhotoUploader";

export default function EditEntrySheet({
  entry,
  onClose,
  onSaved,
  onDeleted,
}: {
  entry: Entry;
  onClose: () => void;
  onSaved: (e: Entry) => void;
  onDeleted: (id: string) => void;
}) {
  const [title, setTitle] = useState(entry.title ?? "");
  const [summary, setSummary] = useState(entry.summary ?? "");
  const [photos, setPhotos] = useState(entry.photos);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function removePhoto(photoId: string) {
    const res = await fetch(`/api/entries/${entry.id}/photos/${photoId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      const next = photos.filter((p) => p.id !== photoId);
      setPhotos(next);
      onSaved({ ...entry, photos: next });
    }
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/entries/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, summary }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't save");
      onSaved({ ...entry, ...data.entry, photos });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save");
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this memory? The recording will be gone too.")) return;
    const res = await fetch(`/api/entries/${entry.id}`, { method: "DELETE" });
    if (res.ok) {
      onDeleted(entry.id);
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-ink/40"
      />
      <div className="relative w-full max-w-md rounded-t-3xl bg-milk p-5 pb-8 max-h-[88vh] overflow-y-auto shadow-2xl fade-up">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-cream" />
        <h2 className="font-display text-xl font-semibold mb-4">Edit this page</h2>

        <label className="block text-sm font-medium mb-1.5">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-2xl border border-cream bg-white/80 px-4 py-3 outline-none focus:border-apricot focus:ring-2 focus:ring-apricot/30"
        />

        <label className="block text-sm font-medium mb-1.5 mt-4">Message</label>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={4}
          className="w-full rounded-2xl border border-cream bg-white/80 px-4 py-3 outline-none focus:border-apricot focus:ring-2 focus:ring-apricot/30"
        />

        <label className="block text-sm font-medium mb-1.5 mt-4">
          Photos <span className="text-ink-soft font-normal">(the page shows up to 4)</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {photos.map((p) => (
            <div key={p.id} className="relative">
              <Image
                src={p.blobUrl}
                alt=""
                width={200}
                height={200}
                unoptimized
                className="aspect-square w-full rounded-xl object-cover"
              />
              <button
                aria-label="Remove photo"
                onClick={() => removePhoto(p.id)}
                className="absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full bg-ink text-white text-xs shadow active:scale-90"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <div className="mt-3">
          <PhotoUploader
            entryId={entry.id}
            onAdded={(newPhotos) => {
              const next = [...photos, ...newPhotos];
              setPhotos(next);
              onSaved({ ...entry, photos: next });
            }}
          />
        </div>

        {error && <p className="mt-3 text-sm text-apricot-deep">{error}</p>}

        <div className="mt-6 flex items-center justify-between">
          <button onClick={remove} className="text-sm text-apricot-deep underline underline-offset-2">
            Delete memory
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-full px-5 py-2.5 text-sm text-ink-soft">
              Cancel
            </button>
            <button
              onClick={save}
              disabled={busy}
              className="rounded-full bg-apricot px-6 py-2.5 text-sm font-semibold text-white shadow disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
