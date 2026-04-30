import { describe, expect, it } from "vitest";
import { parseResponse } from "./responseParser";
import type { DecodedFrame } from "./frameCodec";

describe("parseResponse", () => {
  it("parses status response payload from protocol frame", () => {
    const frame: DecodedFrame = {
      descriptor: 0x01,
      command: 0xe1,
      subCommand: 0x00,
      payload: [0x02, 0x0c, 0x80, 0x01, 0x4a, 0x80, 0x1c, 0x2d, 0x99],
      rawHex: ""
    };
    const parsed = parseResponse(frame);
    expect(parsed.summary).toContain("status");
    expect(parsed.summary).toContain("work=10min");
    expect(parsed.summary).toContain("brightness=50%");
    expect(parsed.summary).toContain("battery=25.02V");
    expect(parsed.summary).toContain("current=9.32A");
    expect(parsed.summary).toContain("solar=449.8V");
    expect(parsed.statusPatch?.power).toBe(50);
    expect(parsed.statusPatch?.workMinutes).toBe(10);
    expect(parsed.statusPatch?.batteryVoltage).toBe(25.02);
    expect(parsed.statusPatch?.battery).toBe(25.02);
    expect(parsed.statusPatch?.loadCurrentAmp).toBe(9.32);
    expect(parsed.statusPatch?.solarVoltage).toBe(449.8);
    expect(parsed.statusPatch?.statusExtraRaw).toBe(0x99);
  });

  it("does not update status when a status response has too few effective bytes", () => {
    const parsed = parseResponse({
      descriptor: 0x01,
      command: 0xe1,
      subCommand: 0x00,
      payload: [0x02, 0x0c, 0x80],
      rawHex: ""
    });
    expect(parsed.summary).toContain("status payload too short");
    expect(parsed.statusPatch).toBeUndefined();
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

  it("parses MODE=01 read-params response into time-control parameters for UI synchronization", () => {
    const parsed = parseResponse({
      descriptor: 0x01,
      command: 0xb1,
      subCommand: 0x00,
      payload: [
        0x01,
        0x01,
        0x0c,
        0x80,
        0x06,
        0x40,
        0x37,
        0x01,
        0x36,
        0x4e,
        0x66,
        0x7e,
        0x8a,
        0xff,
        0xff,
        0xff,
        0xff,
        0xff,
        0x88,
        0xff,
        0x00
      ],
      rawHex: ""
    });

    expect(parsed.summary).toContain("params mode=time");
    expect(parsed.statusPatch?.mode).toBe("time");
    expect(parsed.statusPatch?.timeControlParams?.maxOutputByte).toBe(0x06);
    expect(parsed.statusPatch?.timeControlParams?.maxOutputLowByte).toBe(0x40);
    expect(parsed.statusPatch?.timeControlParams?.segments.map((segment) => segment.durationHalfHours)).toEqual([
      9,
      4,
      4,
      4,
      2
    ]);
    expect(parsed.statusPatch?.timeControlParams?.segments.map((segment) => segment.powerPercent)).toEqual([
      100,
      100,
      100,
      100,
      100
    ]);
    expect(parsed.statusPatch?.timeControlParams?.morningDurationMinutes).toBe(680);
  });

  it("links B1 parameter modes into passive status mode updates", () => {
    expect(
      parseResponse({
        descriptor: 0x01,
        command: 0xb1,
        subCommand: 0x00,
        payload: [0x02],
        rawHex: ""
      }).statusPatch?.mode
    ).toBe("radar");
    expect(
      parseResponse({
        descriptor: 0x01,
        command: 0xb1,
        subCommand: 0x00,
        payload: [0x03],
        rawHex: ""
      }).statusPatch?.mode
    ).toBe("average");
  });
});
