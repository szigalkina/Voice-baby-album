"use client";

import { useMemo } from "react";
import type { Baby, Entry } from "@/lib/types";
import { currentMonthLabel } from "@/lib/months";
import { buildBookPages } from "@/lib/book";
import BookPage from "./BookPage";
import WaveMark from "./WaveMark";

// The read-only book grandparents see. No account, no editing, no controls.
export default function SharedBook({
  baby,
  entries,
}: {
  baby: Baby;
  entries: Entry[];
}) {
  const pages = useMemo(
    () => buildBookPages(entries, baby.birthdate),
    [entries, baby.birthdate]
  );

  return (
    <main className="relative z-10 mx-auto w-full max-w-md flex-1 pb-16">
      <header className="pt-10 pb-6 text-center px-5">
        <h1 className="font-display italic text-[36px] leading-tight">
          {baby.title ?? baby.name}
        </h1>
        <p className="label-caps text-ink-soft mt-1">{currentMonthLabel(baby.birthdate)}</p>
      </header>

      {pages.length === 0 ? (
        <div className="text-center py-14 fade-up px-5">
          <WaveMark className="mb-5" />
          <p className="font-display italic text-[22px] text-ink-soft">
            the album is just beginning
          </p>
        </div>
      ) : (
        <div className="fade-up">
          <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 px-8 pb-4 no-scrollbar">
            {pages.map((page, i) => (
              <div key={page.entry.id} className="snap-center shrink-0 w-[82%]">
                <BookPage page={page} number={i + 1} />
              </div>
            ))}
            <div className="shrink-0 w-6" />
          </div>
          <p className="label-caps !text-[9px] text-ink-soft text-center mt-2">
            {pages.length} {pages.length === 1 ? "page" : "pages"} · swipe to turn
          </p>
        </div>
      )}

      <footer className="mt-12 text-center">
        <WaveMark className="mb-3 opacity-60" />
        <p className="label-caps !text-[9px] text-ink-soft/70">voice baby album</p>
      </footer>
    </main>
  );
}
