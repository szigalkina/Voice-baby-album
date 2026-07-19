import type { Entry, Photo } from "./types";
import { monthLabel, monthNumber } from "./months";

// The album as a printed book — ONE RULE: every entry is exactly one page,
// message and photos together. Pages without photos get a centered-text
// treatment (message middle, date bottom-middle but semi-central) so they
// never look empty. Sides alternate purely by position, like a real book.
export interface BookPage {
  side: "left" | "right";
  entry: Entry;
  photos: Photo[]; // capped at 4 — the 2x2 grid maximum
  monthLabel?: string;
}

export function buildBookPages(entries: Entry[], birthdate: string): BookPage[] {
  let lastMonth = -1;
  return entries.map((entry, i) => {
    const m = monthNumber(birthdate, new Date(entry.recordedAt));
    const page: BookPage = {
      side: i % 2 === 0 ? "left" : "right",
      entry,
      photos: entry.photos.slice(0, 4),
    };
    if (m !== lastMonth) {
      page.monthLabel = monthLabel(birthdate, m);
      lastMonth = m;
    }
    return page;
  });
}
