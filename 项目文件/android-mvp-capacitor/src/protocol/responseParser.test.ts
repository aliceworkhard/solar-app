import { describe, expect, it } from "vitest";
import { parseResponse } from "./responseParser";
import type { DecodedFrame } from "./frameCodec";

describe("parseResponse", () => {
  it("parses status response payload from protocol frame", () => {
    const frame: DecodedFrame = {
      descriptor: 0x01,
      command: 0xe1,
      subCommand: 0x00,
      payload: [0x02, 0x0c, 0x80, 0x01, 0x4a, 0x80, 0x1c, 0x2d],
      rawHex: ""
    };
    const parsed = parseResponse(frame);
    expect(parsed.summary).toContain("status");
    expect(parsed.summary).toContain("brightness=50%");
    expect(parsed.statusPatch?.power).toBe(50);
  });

  it("parses params response as passive status update", () => {
    const parsed = parseResponse({
      descriptor: 0x01,
      command: 0xb1,
      subCommand: 0x03,
      payload: [0x03, 0x01],
      rawHex: ""
    });
    expect(parsed.summary).toContain("params mode=average");
    expect(parsed.statusPatch?.mode).toBe("average");
  });
});
