export const TIME_CONTROL_SEGMENT_COUNT = 5;
export const TIME_CONTROL_STEP_MINUTES = 5;
export const POINTS_PER_HALF_HOUR_UNIT = 6;
export const TIME_CONTROL_SEGMENT_MIN_HALF_HOURS = 1;
export const TIME_CONTROL_SEGMENT_MAX_HALF_HOURS = 15;
export const MAX_TIME_CONTROL_POINTS = 0xff;
export const MAX_TIME_CONTROL_MINUTES = MAX_TIME_CONTROL_POINTS * TIME_CONTROL_STEP_MINUTES;
export const MAX_TOTAL_SEGMENT_HALF_HOURS = Math.floor(MAX_TIME_CONTROL_POINTS / POINTS_PER_HALF_HOUR_UNIT);

const TIME_CONTROL_MODE = 0x01;

export interface TimeControlSegment {
  durationHalfHours: number;
  powerPercent: number;
  powerRaw?: number;
}

export interface TimeControlParams {
  mode: "time";
  batteryType: number;
  batteryVoltageMv: number;
  maxOutputByte: number;
  maxOutputLowByte?: number;
  lightDelaySeconds: number;
  sensitivity: number;
  segments: TimeControlSegment[];
  morningDurationMinutes: number;
  morningPowerPercent: number;
  morningPowerRaw?: number;
  extensionByte: number;
}

export type TimeControlChange =
  | { kind: "batteryType"; value: number }
  | { kind: "batteryVoltageMv"; value: number }
  | { kind: "maxOutputByte"; value: number }
  | { kind: "lightDelaySeconds"; value: number }
  | { kind: "sensitivity"; value: number }
  | { kind: "segmentDuration"; segmentIndex: number; value: number }
  | { kind: "segmentPower"; segmentIndex: number; value: number }
  | { kind: "morningDuration"; value: number }
  | { kind: "morningPower"; value: number };

export interface TimeControlChangeResult {
  params: TimeControlParams;
  shouldSendWholeFrame: boolean;
}

export const DEFAULT_TIME_CONTROL_PARAMS: TimeControlParams = {
  mode: "time",
  batteryType: 1,
  batteryVoltageMv: 3200,
  maxOutputByte: 0xff,
  maxOutputLowByte: 0x00,
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
  morningPowerPercent: 30,
  extensionByte: 0x00
};

export function cloneTimeControlParams(params: TimeControlParams): TimeControlParams {
  return {
    ...params,
    segments: params.segments.map((segment) => ({ ...segment }))
  };
}

export function validateTimeControlParams(params: TimeControlParams): void {
  if (params.mode !== "time") {
    throw new Error("Time-control params mode must be time.");
  }
  assertIntegerRange(params.batteryType, 1, 3, "battery type");
  assertIntegerRange(params.batteryVoltageMv, 0, 0xffff, "battery voltage");
  assertIntegerRange(params.maxOutputByte, 0, 0xff, "max output byte");
  if (params.maxOutputLowByte != null) {
    assertIntegerRange(params.maxOutputLowByte, 0, 0xff, "max output low byte");
  }
  assertStepRange(params.lightDelaySeconds, 5, 60, 5, "light delay");
  assertIntegerRange(params.sensitivity, 1, 4, "sensitivity");
  if (params.segments.length !== TIME_CONTROL_SEGMENT_COUNT) {
    throw new Error(`Time-control mode requires ${TIME_CONTROL_SEGMENT_COUNT} segments.`);
  }

  let cumulativePoints = 0;
  for (const [index, segment] of params.segments.entries()) {
    assertIntegerRange(
      segment.durationHalfHours,
      TIME_CONTROL_SEGMENT_MIN_HALF_HOURS,
      TIME_CONTROL_SEGMENT_MAX_HALF_HOURS,
      `segment ${index + 1} half-hour units`
    );
    cumulativePoints += segment.durationHalfHours * POINTS_PER_HALF_HOUR_UNIT;
    assertIntegerRange(segment.powerPercent, 0, 100, `segment ${index + 1} power`);
    if (segment.powerRaw != null) {
      assertIntegerRange(segment.powerRaw, 0, 0xff, `segment ${index + 1} power raw`);
    }
  }
  if (cumulativePoints > MAX_TIME_CONTROL_POINTS) {
    throw new Error("Time-control cumulative segment points cannot exceed 255.");
  }
  durationMinutesToPoints(params.morningDurationMinutes, "morning duration");
  assertIntegerRange(params.morningPowerPercent, 0, 100, "morning power");
  if (params.morningPowerRaw != null) {
    assertIntegerRange(params.morningPowerRaw, 0, 0xff, "morning power raw");
  }
  assertIntegerRange(params.extensionByte, 0, 0xff, "extension byte");
}

export function buildTimeControlPayload(params: TimeControlParams): number[] {
  validateTimeControlParams(params);
  const cumulativeDurationPoints: number[] = [];
  let cumulative = 0;
  for (const segment of params.segments) {
    cumulative += segment.durationHalfHours * POINTS_PER_HALF_HOUR_UNIT;
    cumulativeDurationPoints.push(cumulative);
  }

  const batteryVoltage = params.batteryVoltageMv & 0xffff;
  return [
    TIME_CONTROL_MODE,
    params.batteryType & 0xff,
    (batteryVoltage >> 8) & 0xff,
    batteryVoltage & 0xff,
    params.maxOutputByte & 0xff,
    0x00,
    params.lightDelaySeconds & 0xff,
    params.sensitivity & 0xff,
    ...cumulativeDurationPoints.map((item) => item & 0xff),
    ...params.segments.map((segment) => powerPercentToRaw(segment.powerPercent)),
    durationMinutesToPoints(params.morningDurationMinutes, "morning duration") & 0xff,
    powerPercentToRaw(params.morningPowerPercent),
    params.extensionByte & 0xff
  ];
}

export function decodeTimeControlPayload(payload: number[]): TimeControlParams {
  if (payload.length < 21) {
    throw new Error(`Time-control payload too short: ${payload.length}`);
  }
  if ((payload[0] ?? 0) !== TIME_CONTROL_MODE) {
    throw new Error(`Not a time-control payload: mode=0x${(payload[0] ?? 0).toString(16)}`);
  }
  const cumulativePoints = payload.slice(8, 13);
  const durations: number[] = [];
  let previous = 0;
  for (const item of cumulativePoints) {
    if (item < previous) {
      throw new Error("Time-control segment cumulative points are not ascending.");
    }
    const rawUnits = (item - previous) / POINTS_PER_HALF_HOUR_UNIT;
    durations.push(clampInteger(Math.round(rawUnits), TIME_CONTROL_SEGMENT_MIN_HALF_HOURS, TIME_CONTROL_SEGMENT_MAX_HALF_HOURS));
    previous = item;
  }
  const params: TimeControlParams = {
    mode: "time",
    batteryType: payload[1] ?? 1,
    batteryVoltageMv: word(payload[2], payload[3]),
    maxOutputByte: payload[4] ?? 0,
    maxOutputLowByte: payload[5] ?? 0,
    lightDelaySeconds: payload[6] ?? 5,
    sensitivity: payload[7] ?? 1,
    segments: durations.map((durationHalfHours, index) => {
      const powerRaw = payload[13 + index] ?? 0;
      return {
        durationHalfHours,
        powerPercent: rawPowerToPercent(powerRaw),
        powerRaw
      };
    }),
    morningDurationMinutes: (payload[18] ?? 0) * TIME_CONTROL_STEP_MINUTES,
    morningPowerPercent: rawPowerToPercent(payload[19] ?? 0),
    morningPowerRaw: payload[19] ?? 0,
    extensionByte: payload[20] ?? 0
  };
  validateTimeControlParams(params);
  return params;
}

export function applyTimeControlChange(
  params: TimeControlParams,
  change: TimeControlChange
): TimeControlChangeResult {
  const next = cloneTimeControlParams(params);
  switch (change.kind) {
    case "batteryType":
      next.batteryType = change.value;
      break;
    case "batteryVoltageMv":
      next.batteryVoltageMv = change.value;
      break;
    case "maxOutputByte":
      next.maxOutputByte = change.value;
      next.maxOutputLowByte = 0x00;
      break;
    case "lightDelaySeconds":
      next.lightDelaySeconds = change.value;
      break;
    case "sensitivity":
      next.sensitivity = change.value;
      break;
    case "segmentDuration":
      ensureSegmentIndex(change.segmentIndex);
      next.segments[change.segmentIndex] = {
        ...next.segments[change.segmentIndex],
        durationHalfHours: change.value
      };
      break;
    case "segmentPower":
      ensureSegmentIndex(change.segmentIndex);
      next.segments[change.segmentIndex] = {
        ...next.segments[change.segmentIndex],
        powerPercent: change.value,
        powerRaw: undefined
      };
      break;
    case "morningDuration":
      next.morningDurationMinutes = change.value;
      break;
    case "morningPower":
      next.morningPowerPercent = change.value;
      next.morningPowerRaw = undefined;
      break;
  }
  validateTimeControlParams(next);
  return {
    params: next,
    shouldSendWholeFrame: true
  };
}

export function rawPowerToPercent(raw: number): number {
  assertIntegerRange(raw, 0, 0xff, "power raw");
  return Math.round((raw / 0xff) * 100);
}

export function powerPercentToRaw(percent: number): number {
  assertIntegerRange(percent, 0, 100, "power percent");
  return Math.round((percent / 100) * 0xff);
}

export function maxOutputByteToPercent(raw: number): number {
  assertIntegerRange(raw, 0, 0xff, "max output byte");
  return Number((raw / 2.55).toFixed(1));
}

function durationMinutesToPoints(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be non-negative.`);
  }
  if (!Number.isInteger(value) || value % TIME_CONTROL_STEP_MINUTES !== 0) {
    throw new Error(`${label} must use a 5min step.`);
  }
  if (value > MAX_TIME_CONTROL_MINUTES) {
    throw new Error(`${label} cannot exceed 21h15m.`);
  }
  return value / TIME_CONTROL_STEP_MINUTES;
}

function assertIntegerRange(value: number, min: number, max: number, label: string): void {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${label} must be in ${min}-${max}.`);
  }
}

function assertStepRange(value: number, min: number, max: number, step: number, label: string): void {
  if (!Number.isFinite(value) || value < min || value > max || value % step !== 0) {
    throw new Error(`${label} must be in ${min}-${max} with ${step} step.`);
  }
}

function ensureSegmentIndex(index: number): void {
  if (!Number.isInteger(index) || index < 0 || index >= TIME_CONTROL_SEGMENT_COUNT) {
    throw new Error(`Invalid time-control segment index: ${index}`);
  }
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

function word(high = 0, low = 0): number {
  return ((high & 0xff) << 8) | (low & 0xff);
}
