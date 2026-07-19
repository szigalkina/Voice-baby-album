import { describe, it, expect } from "vitest";
import { buildBookPages } from "./book";
import type { Entry } from "./types";

let n = 0;
function entry(photosCount: number, recordedAt: string): Entry {
  n += 1;
  return {
    id: `e${n}`,
    babyId: "b1",
    recordedAt,
    audioUrl: "/a.webm",
    transcript: "t",
    title: `Title ${n}`,
    summary: `Summary ${n}`,
    quote: null,
    isMilestone: false,
    milestoneType: null,
    photoPrompt: null,
    inAlbum: true,
    status: "ready",
    photos: Array.from({ length: photosCount }, (_, i) => ({
      id: `p${n}-${i}`,
      entryId: `e${n}`,
      blobUrl: `/p${i}.jpg`,
      createdAt: recordedAt,
    })),
  };
}

const BD = "2026-03-10";

describe("buildBookPages (one page per entry)", () => {
  it("maps every entry to exactly one page, sides alternating", () => {
    const pages = buildBookPages(
      [
        entry(2, "2026-04-01T10:00:00Z"),
        entry(0, "2026-04-02T10:00:00Z"),
        entry(4, "2026-04-03T10:00:00Z"),
      ],
      BD
    );
    expect(pages).toHaveLength(3);
    expect(pages.map((p) => p.side)).toEqual(["left", "right", "left"]);
  });

  it("caps photos at 4 per page", () => {
    const pages = buildBookPages([entry(6, "2026-04-01T10:00:00Z")], BD);
    expect(pages[0].photos).toHaveLength(4);
  });

  it("keeps zero-photo entries as photo-less pages", () => {
    const pages = buildBookPages([entry(0, "2026-04-01T10:00:00Z")], BD);
    expect(pages[0].photos).toHaveLength(0);
  });

  it("attaches a month label only when the month of life changes", () => {
    const pages = buildBookPages(
      [
        entry(1, "2026-03-15T10:00:00Z"),
        entry(1, "2026-03-20T10:00:00Z"),
        entry(1, "2026-05-20T10:00:00Z"),
      ],
      BD
    );
    expect(pages[0].monthLabel).toBe("Month 1 — March");
    expect(pages[1].monthLabel).toBeUndefined();
    expect(pages[2].monthLabel).toBe("Month 3 — May");
  });
});
