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

describe("buildBookPages", () => {
  it("gives a photo entry a spread: text left, photos right", () => {
    const pages = buildBookPages([entry(2, "2026-04-01T10:00:00Z")], BD);
    expect(pages.map((p) => p.kind)).toEqual(["text", "photos"]);
    expect(pages.map((p) => p.side)).toEqual(["left", "right"]);
  });

  it("alternates spread orientation between photo entries", () => {
    const pages = buildBookPages(
      [entry(1, "2026-04-01T10:00:00Z"), entry(1, "2026-04-02T10:00:00Z")],
      BD
    );
    expect(pages.map((p) => p.kind)).toEqual(["text", "photos", "photos", "text"]);
  });

  it("renders a no-photo entry as one text page and compacts the next entry onto the facing page", () => {
    const pages = buildBookPages(
      [entry(0, "2026-04-01T10:00:00Z"), entry(3, "2026-04-02T10:00:00Z")],
      BD
    );
    expect(pages.map((p) => p.kind)).toEqual(["text", "combo"]);
    expect(pages.map((p) => p.side)).toEqual(["left", "right"]);
  });

  it("handles two consecutive no-photo entries as two text pages, then resumes spreads", () => {
    const pages = buildBookPages(
      [
        entry(0, "2026-04-01T10:00:00Z"),
        entry(0, "2026-04-02T10:00:00Z"),
        entry(1, "2026-04-03T10:00:00Z"),
      ],
      BD
    );
    expect(pages.map((p) => p.kind)).toEqual(["text", "text", "text", "photos"]);
    // spread parity is preserved: the photo entry starts on a left page
    expect(pages[2].side).toBe("left");
  });

  it("attaches a month label when the month of life changes", () => {
    const pages = buildBookPages(
      [entry(1, "2026-03-15T10:00:00Z"), entry(1, "2026-05-20T10:00:00Z")],
      BD
    );
    expect(pages[0].monthLabel).toBe("Month 1 — March");
    expect(pages[1].monthLabel).toBeUndefined(); // photo page of same entry
    expect(pages[2].monthLabel).toBe("Month 3 — May"); // photos-left page starts new month
  });

  it("caps photos at 4 per page", () => {
    const pages = buildBookPages([entry(6, "2026-04-01T10:00:00Z")], BD);
    const photoPage = pages.find((p) => p.kind === "photos")!;
    expect(photoPage.photos.length).toBe(4);
  });
});
