import { describe, expect, it } from "vitest";
import { parseResponse } from "./responseParser";
import type { DecodedFrame } from "./frameCodec";

describe("parseResponse", () => {
  it("treats 0x90 payload 0xAA as generic ack code, not off state", () => {
    const frame: DecodedFrame = {
      command: 0x90,
      payload: [0xaa],
      rawHex: "AA550290AA0000"
    };
    const parsed = parseResponse(frame);
    expect(parsed.summary).toContain("powerAck");
    expect(parsed.summary).toContain("0xAA");
    expect(parsed.summary.includes("off")).toBe(false);
  });

  it("keeps explicit on/off semantics for payload 0x01/0x00", () => {
    const onParsed = parseResponse({ command: 0x90, payload: [0x01], rawHex: "" });
    const offParsed = parseResponse({ command: 0x90, payload: [0x00], rawHex: "" });
    expect(onParsed.summary).toBe("powerAck on");
    expect(offParsed.summary).toBe("powerAck off");
  });
});

