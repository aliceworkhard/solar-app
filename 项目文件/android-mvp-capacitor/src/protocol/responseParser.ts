import type { DeviceStatus } from "../types";
import type { DecodedFrame } from "./frameCodec";

export interface ParsedResponse {
  command: number;
  summary: string;
  statusPatch?: Partial<DeviceStatus>;
}

function modeFromCode(value: number): string {
  if (value === 1) {
    return "radar";
  }
  if (value === 2) {
    return "time";
  }
  if (value === 3) {
    return "average";
  }
  return "unknown";
}

function word(high = 0, low = 0): number {
  return ((high & 0xff) << 8) | (low & 0xff);
}

function fixedNumber(value: number, digits: number): number {
  return Number(value.toFixed(digits));
}

export function parseResponse(frame: DecodedFrame): ParsedResponse {
  const payload = frame.payload;
  switch (frame.command) {
    case 0xe1: {
      if (payload.length < 8) {
        return {
          command: frame.command,
          summary: `status payload too short bytes=${payload.length}`
        };
      }
      const workMinutes = (payload[0] ?? 0) * 5;
      const batteryVoltage = fixedNumber(word(payload[1], payload[2]) * 0.00782, 2);
      const loadCurrent = fixedNumber(word(payload[3], payload[4]) * 0.028256, 2);
      const brightness = Math.min(100, Math.round(((payload[5] ?? 0) / 255) * 100));
      const solarVoltage = fixedNumber(word(payload[6], payload[7]) * 0.062366, 1);
      const statusExtraRaw = payload[8];
      const extraSummary = statusExtraRaw == null
        ? ""
        : ` extra=0x${statusExtraRaw.toString(16).toUpperCase().padStart(2, "0")}`;
      return {
        command: frame.command,
        summary: `status work=${workMinutes}min brightness=${brightness}% battery=${batteryVoltage.toFixed(2)}V current=${loadCurrent.toFixed(2)}A solar=${solarVoltage.toFixed(1)}V${extraSummary}`,
        statusPatch: {
          workMinutes,
          power: brightness,
          battery: batteryVoltage,
          batteryVoltage,
          loadCurrentAmp: loadCurrent,
          solarVoltage,
          ...(statusExtraRaw == null ? {} : { statusExtraRaw }),
          lastUpdatedAt: Date.now()
        }
      };
    }
    case 0xb1: {
      const mode = modeFromCode(frame.subCommand || payload[0] || 1);
      return {
        command: frame.command,
        summary: `params mode=${mode} bytes=${payload.length}`,
        statusPatch: {
          mode,
          lastUpdatedAt: Date.now()
        }
      };
    }
    default:
      return {
        command: frame.command,
        summary: `unknown command=0x${frame.command.toString(16).toUpperCase()}`
      };
  }
}
