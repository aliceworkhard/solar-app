import { describe, expect, it } from "vitest";
import {
  DEFAULT_TIME_CONTROL_PARAMS,
  POINTS_PER_HALF_HOUR_UNIT,
  TIME_CONTROL_SEGMENT_COUNT,
  applyTimeControlChange,
  buildTimeControlPayload,
  decodeTimeControlPayload,
  maxOutputByteToPercent,
  validateTimeControlParams
} from "./timeControlParams";

const SUPPLIER_TIME_PAYLOAD = [
  0x01,
  0x01,
  0x0c,
  0x80,
  0xff,
  0x00,
  0x1e,
  0x02,
  0x18,
  0x2a,
  0x36,
  0x3c,
  0x42,
  0xcc,
  0xff,
  0x80,
  0x4d,
  0x4d,
  0x0c,
  0x4d,
  0x00
];

const USER_READ_TIME_PAYLOAD = [
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
];

describe("time control parameter codec", () => {
  it("encodes supplier MODE=01 time-control durations as half-hour units multiplied by six points", () => {
    const params = {
      ...DEFAULT_TIME_CONTROL_PARAMS,
      batteryType: 1,
      batteryVoltageMv: 3200,
      maxOutputByte: 0xff,
      lightDelaySeconds: 30,
      sensitivity: 2,
      segments: [
        { durationHalfHours: 4, powerPercent: 80 },
        { durationHalfHours: 3, powerPercent: 100 },
        { durationHalfHours: 2, powerPercent: 50 },
        { durationHalfHours: 1, powerPercent: 30 },
        { durationHalfHours: 1, powerPercent: 30 }
      ],
      morningDurationMinutes: 60,
      morningPowerPercent: 30
    };

    expect(TIME_CONTROL_SEGMENT_COUNT).toBe(5);
    expect(POINTS_PER_HALF_HOUR_UNIT).toBe(6);
    expect(buildTimeControlPayload(params)).toEqual(SUPPLIER_TIME_PAYLOAD);
  });

  it("decodes supplier MODE=01 payload into UI half-hour units and scaled powers", () => {
    const decoded = decodeTimeControlPayload(SUPPLIER_TIME_PAYLOAD);

    expect(decoded.mode).toBe("time");
    expect(decoded.batteryType).toBe(1);
    expect(decoded.batteryVoltageMv).toBe(3200);
    expect(decoded.maxOutputByte).toBe(0xff);
    expect(maxOutputByteToPercent(decoded.maxOutputByte)).toBe(100);
    expect(decoded.maxOutputLowByte).toBe(0x00);
    expect(decoded.lightDelaySeconds).toBe(30);
    expect(decoded.sensitivity).toBe(2);
    expect(decoded.segments.map((segment) => segment.durationHalfHours)).toEqual([4, 3, 2, 1, 1]);
    expect(decoded.segments.map((segment) => segment.powerPercent)).toEqual([80, 100, 50, 30, 30]);
    expect(decoded.segments.map((segment) => segment.powerRaw)).toEqual([0xcc, 0xff, 0x80, 0x4d, 0x4d]);
    expect(decoded.morningDurationMinutes).toBe(60);
    expect(decoded.morningPowerPercent).toBe(30);
    expect(decoded.morningPowerRaw).toBe(0x4d);
  });

  it("decodes the user read-params frame but normalizes max output low byte on the next write", () => {
    const decoded = decodeTimeControlPayload(USER_READ_TIME_PAYLOAD);

    expect(decoded.maxOutputByte).toBe(0x06);
    expect(decoded.maxOutputLowByte).toBe(0x40);
    expect(maxOutputByteToPercent(decoded.maxOutputByte)).toBeCloseTo(2.4, 1);
    expect(decoded.lightDelaySeconds).toBe(55);
    expect(decoded.sensitivity).toBe(1);
    expect(decoded.segments.map((segment) => segment.durationHalfHours)).toEqual([9, 4, 4, 4, 2]);
    expect(decoded.segments.map((segment) => segment.powerPercent)).toEqual([100, 100, 100, 100, 100]);
    expect(decoded.segments.map((segment) => segment.powerRaw)).toEqual([0xff, 0xff, 0xff, 0xff, 0xff]);
    expect(decoded.morningDurationMinutes).toBe(680);
    expect(decoded.morningPowerPercent).toBe(100);
    expect(buildTimeControlPayload(decoded).slice(4, 6)).toEqual([0x06, 0x00]);
  });

  it("encodes the user changed-frame values with max output low byte fixed to 00", () => {
    const params = {
      ...DEFAULT_TIME_CONTROL_PARAMS,
      maxOutputByte: 0x06,
      lightDelaySeconds: 55,
      sensitivity: 1,
      segments: [
        { durationHalfHours: 12, powerPercent: 2 },
        { durationHalfHours: 4, powerPercent: 100 },
        { durationHalfHours: 4, powerPercent: 100 },
        { durationHalfHours: 4, powerPercent: 100 },
        { durationHalfHours: 2, powerPercent: 100 }
      ],
      morningDurationMinutes: 300,
      morningPowerPercent: 100
    };

    expect(buildTimeControlPayload(params)).toEqual([
      0x01,
      0x01,
      0x0c,
      0x80,
      0x06,
      0x00,
      0x37,
      0x01,
      0x48,
      0x60,
      0x78,
      0x90,
      0x9c,
      0x05,
      0xff,
      0xff,
      0xff,
      0xff,
      0x3c,
      0xff,
      0x00
    ]);
  });

  it("rejects invalid half-hour segment ranges before sending a frame", () => {
    expect(() =>
      validateTimeControlParams({
        ...DEFAULT_TIME_CONTROL_PARAMS,
        segments: [
          { durationHalfHours: 0, powerPercent: 100 },
          { durationHalfHours: 1, powerPercent: 100 },
          { durationHalfHours: 1, powerPercent: 0 },
          { durationHalfHours: 1, powerPercent: 0 },
          { durationHalfHours: 1, powerPercent: 0 }
        ]
      })
    ).toThrow(/1-15/);

    expect(() =>
      validateTimeControlParams({
        ...DEFAULT_TIME_CONTROL_PARAMS,
        segments: [
          { durationHalfHours: 15, powerPercent: 100 },
          { durationHalfHours: 15, powerPercent: 100 },
          { durationHalfHours: 15, powerPercent: 0 },
          { durationHalfHours: 15, powerPercent: 0 },
          { durationHalfHours: 15, powerPercent: 0 }
        ]
      })
    ).toThrow(/255/);
  });

  it("updates one draft field and marks the edit as requiring a full-frame send", () => {
    const next = applyTimeControlChange(DEFAULT_TIME_CONTROL_PARAMS, {
      kind: "segmentPower",
      segmentIndex: 2,
      value: 65
    });

    expect(next.shouldSendWholeFrame).toBe(true);
    expect(next.params.segments[2]?.powerPercent).toBe(65);
    expect(next.params.segments[0]).toEqual(DEFAULT_TIME_CONTROL_PARAMS.segments[0]);
  });

  it("updates the max-output byte without exposing the low byte as a UI field", () => {
    const next = applyTimeControlChange(DEFAULT_TIME_CONTROL_PARAMS, {
      kind: "maxOutputByte",
      value: 0x80
    });

    expect(next.params.maxOutputByte).toBe(0x80);
    expect(maxOutputByteToPercent(next.params.maxOutputByte)).toBeCloseTo(50.2, 1);
    expect(next.shouldSendWholeFrame).toBe(true);
  });
});
