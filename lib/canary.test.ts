import { describe, it, expect } from "vitest";
import { CANARY_AUDIO_B64, CANARY_MIME } from "./canary";

describe("health canary audio", () => {
  it("is a plausible embedded m4a sample", () => {
    const buf = Buffer.from(CANARY_AUDIO_B64, "base64");
    expect(buf.length).toBeGreaterThan(2000); // real audio, not a stub
    expect(buf.length).toBeLessThan(100_000); // small enough to embed
    expect(buf.subarray(4, 8).toString()).toBe("ftyp"); // mp4 container magic
    expect(CANARY_MIME).toBe("audio/mp4");
  });
});
