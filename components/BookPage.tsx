"use client";

import Image from "next/image";
import type { BookPage as BookPageData } from "@/lib/book";
import type { Photo } from "@/lib/types";

function handDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Printed-photo look: thin warm border, soft shadow, square crop.
function Print({ photo, className = "" }: { photo: Photo; className?: string }) {
  return (
    <div className={`bg-white p-1.5 shadow-md border border-cream rounded-[3px] ${className}`}>
      <Image
        src={photo.blobUrl}
        alt=""
        width={600}
        height={600}
        unoptimized
        className="w-full h-full object-cover"
      />
    </div>
  );
}

// Max 4 photos, squares, 2x2 — a single photo gets the full frame.
function PhotoGrid({ photos, compact = false }: { photos: Photo[]; compact?: boolean }) {
  if (photos.length === 1) {
    return (
      <div className={`mx-auto ${compact ? "w-[55%]" : "w-[85%]"}`}>
        <Print photo={photos[0]} className="aspect-square" />
      </div>
    );
  }
  return (
    <div
      className={`grid grid-cols-2 ${compact ? "gap-2 w-[70%]" : "gap-3 w-full"} mx-auto`}
    >
      {photos.slice(0, 4).map((p, i) => (
        <Print
          key={p.id}
          photo={p}
          className={`aspect-square ${photos.length === 3 && i === 2 ? "col-span-2 w-1/2 mx-auto" : ""}`}
        />
      ))}
    </div>
  );
}

function MonthCaption({ label }: { label?: string }) {
  if (!label) return null;
  return (
    <p className="text-[10px] uppercase tracking-[0.2em] text-ink-soft/70 text-center font-body">
      {label}
    </p>
  );
}

export default function BookPage({ page, number }: { page: BookPageData; number: number }) {
  const { entry } = page;
  const numberSide = page.side === "left" ? "left-5" : "right-5";

  return (
    <div className="relative w-full aspect-[3/4.1] rounded-md bg-paper shadow-xl border border-cream overflow-hidden flex flex-col">
      {/* inner page edge, like the gutter of an open book */}
      <div
        className={`absolute inset-y-0 w-3 pointer-events-none ${
          page.side === "left"
            ? "right-0 bg-gradient-to-l from-ink/6 to-transparent"
            : "left-0 bg-gradient-to-r from-ink/6 to-transparent"
        }`}
      />

      {page.kind === "text" && (
        <div className="flex-1 flex flex-col px-7 py-8">
          <MonthCaption label={page.monthLabel} />
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
            <h3 className="font-hand text-3xl leading-tight">{entry.title}</h3>
            <p className="font-hand text-[22px] leading-snug text-ink/80 line-clamp-[9]">
              {entry.summary}
            </p>
            {entry.isMilestone && <span className="text-base">✨</span>}
          </div>
          {/* date: bottom middle, but not glued to the edge — semi central */}
          <p className="font-hand text-lg text-ink-soft text-center mb-6">
            {handDate(entry.recordedAt)}
          </p>
        </div>
      )}

      {page.kind === "photos" && (
        <div className="flex-1 flex flex-col px-6 py-8">
          <MonthCaption label={page.monthLabel} />
          <div className="flex-1 flex items-center">
            <PhotoGrid photos={page.photos} />
          </div>
        </div>
      )}

      {page.kind === "combo" && (
        <div className="flex-1 flex flex-col px-6 py-7">
          <MonthCaption label={page.monthLabel} />
          <div className="text-center mt-1 mb-3">
            <h3 className="font-hand text-2xl leading-tight">{entry.title}</h3>
            <p className="font-hand text-lg leading-snug text-ink/80 line-clamp-3 mt-1">
              {entry.summary}
            </p>
          </div>
          <div className="flex-1 flex items-center">
            <PhotoGrid photos={page.photos} compact />
          </div>
          <p className="font-hand text-base text-ink-soft text-center mb-1">
            {handDate(entry.recordedAt)}
          </p>
        </div>
      )}

      <span
        className={`absolute bottom-2.5 ${numberSide} text-[10px] text-ink-soft/60 font-body`}
      >
        {number}
      </span>
    </div>
  );
}
