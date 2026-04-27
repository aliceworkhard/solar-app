import { describe, expect, it } from "vitest";
import { FrameDecoder, encodeFrame } from "./frameCodec";

describe("FrameDecoder", () => {
  it("encodes the protocol read-params command", () => {
    expect(encodeFrame(0x0d, 0x00, [0x00])).toBe("FFCE06000D00003010");
  });

  it("decodes frame encoded by local RF encoder", () => {
    const decoder = new FrameDecoder();
    const packet = encodeFrame(0x0e, 0x01, [0x00]);
    const frames = decoder.push(packet);
    expect(frames).toHaveLength(1);
    expect(frames[0].descriptor).toBe(0x00);
    expect(frames[0].command).toBe(0x0e);
    expect(frames[0].subCommand).toBe(0x01);
    expect(frames[0].payload).toEqual([0x00]);
  });

  it("decodes protocol frames split across notify chunks", () => {
    const decoder = new FrameDecoder();
    expect(decoder.push("FFCE0600")).toHaveLength(0);
    const frames = decoder.push("0D00003010");
    expect(frames).toHaveLength(1);
    expect(frames[0].command).toBe(0x0d);
    expect(frames[0].rawHex).toBe("FFCE06000D00003010");
  });
});
