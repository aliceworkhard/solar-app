import { describe, expect, it } from "vitest";
import { FrameDecoder, encodeFrame } from "./frameCodec";

describe("FrameDecoder", () => {
  it("decodes frame encoded by local encoder (crc16)", () => {
    const decoder = new FrameDecoder();
    const packet = encodeFrame(0x10, [0x01]);
    const frames = decoder.push(packet);
    expect(frames).toHaveLength(1);
    expect(frames[0].command).toBe(0x10);
    expect(frames[0].payload).toEqual([0x01]);
  });

  it("decodes vendor frame when trailer bytes are 00 00", () => {
    const decoder = new FrameDecoder();
    const frames = decoder.push("AA550290AA0000");
    expect(frames).toHaveLength(1);
    expect(frames[0].command).toBe(0x90);
    expect(frames[0].payload).toEqual([0xaa]);
  });
});

