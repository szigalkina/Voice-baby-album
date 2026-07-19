import type { Entry, Photo } from "./types";
import { monthLabel, monthNumber } from "./months";

// The album as a printed book. Layout rules (per design):
// - An entry WITH photos gets a full spread: one page of handwritten text, the
//   facing page a photo grid (max 4). Orientation alternates spread to spread
//   (text left / photos right, then photos left / text right).
// - An entry WITHOUT photos gets a single, beautifully centered text page; the
//   NEXT entry is compacted onto the facing page with text + photos combined,
//   so the spread never looks empty. Two photo-less entries in a row simply
//   face each other as two text pages. Spread parity is preserved in all cases.
export interface BookPage {
  kind: "text" | "photos" | "combo";
  side: "left" | "right";
  entry: Entry;
  photos: Photo[];
  monthLabel?: string;
}

export function buildBookPages(entries: Entry[], birthdate: string): BookPage[] {
  const pages: BookPage[] = [];
  let photoSpreadCount = 0;
  let compactNext = false;
  let lastMonth = -1;

  const push = (kind: BookPage["kind"], entry: Entry) => {
    const m = monthNumber(birthdate, new Date(entry.recordedAt));
    const isFirstPageOfEntry =
      pages.length === 0 || pages[pages.length - 1].entry.id !== entry.id;
    const page: BookPage = {
      kind,
      side: pages.length % 2 === 0 ? "left" : "right",
      entry,
      photos: entry.photos.slice(0, 4),
    };
    if (isFirstPageOfEntry && m !== lastMonth) {
      page.monthLabel = monthLabel(birthdate, m);
      lastMonth = m;
    }
    pages.push(page);
  };

  for (const entry of entries) {
    const hasPhotos = entry.photos.length > 0;

    if (compactNext) {
      // Fill the facing page of a photo-less entry.
      push(hasPhotos ? "combo" : "text", entry);
      compactNext = false;
      continue;
    }

    if (!hasPhotos) {
      push("text", entry);
      compactNext = true;
      continue;
    }

    // Full spread, alternating orientation.
    if (photoSpreadCount % 2 === 0) {
      push("text", entry);
      push("photos", entry);
    } else {
      push("photos", entry);
      push("text", entry);
    }
    photoSpreadCount += 1;
  }

  return pages;
}
