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

// Squares, 2x2 max. Grid scales with how many photos the moment has.
function PhotoGrid({ photos }: { photos: Photo[] }) {
  if (photos.length === 1) {
    return (
      <div className="mx-auto w-[62%]">
        <Print photo={photos[0]} className="aspect-square" />
      </div>
    );
  }
  if (photos.length === 2) {
    return (
      <div className="grid grid-cols-2 gap-2.5 w-[88%] mx-auto">
        {photos.map((p) => (
          <Print key={p.id} photo={p} className="aspect-square" />
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-2 w-[72%] mx-auto">
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

export default function BookPage({
  page,
  number,
  onEdit,
}: {
  page: BookPageData;
  number: number;
  onEdit?: () => void;
}) {
  const { entry, photos } = page;
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

      {onEdit && (
        <button
          onClick={onEdit}
          aria-label="Edit this page"
          className="absolute top-2.5 right-3 z-10 h-8 w-8 rounded-full bg-white/70 border border-cream text-sm text-ink-soft shadow-sm active:scale-90 transition"
        >
          ✎
        </button>
      )}

      {page.monthLabel && (
        <p className="pt-7 text-[10px] uppercase tracking-[0.2em] text-ink-soft/70 text-center font-body">
          {page.monthLabel}
        </p>
      )}

      {photos.length > 0 ? (
        <div className={`flex-1 flex flex-col px-6 ${page.monthLabel ? "pt-2" : "pt-7"} pb-6`}>
          <div className="text-center mb-3">
            <h3 className="font-hand text-2xl leading-tight">{entry.title}</h3>
            <p
              className={`font-hand text-lg leading-snug text-ink/80 mt-1 ${
                photos.length > 2 ? "line-clamp-3" : "line-clamp-4"
              }`}
            >
              {entry.summary}
            </p>
            {entry.isMilestone && <span className="text-sm">✨</span>}
          </div>
          <div className="flex-1 flex items-center">
            <div className="w-full">
              <PhotoGrid photos={photos} />
            </div>
          </div>
          <p className="font-hand text-base text-ink-soft text-center mt-2">
            {handDate(entry.recordedAt)}
          </p>
        </div>
      ) : (
        <div className={`flex-1 flex flex-col px-7 ${page.monthLabel ? "pt-2" : "pt-8"} pb-8`}>
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

      <span
        className={`absolute bottom-2.5 ${numberSide} text-[10px] text-ink-soft/60 font-body`}
      >
        {number}
      </span>
    </div>
  );
}
