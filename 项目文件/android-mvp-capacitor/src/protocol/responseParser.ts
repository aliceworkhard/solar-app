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

export function parseResponse(frame: DecodedFrame): ParsedResponse {
  const payload = frame.payload;
  switch (frame.command) {
    case 0xe1: {
      const workMinutes = (payload[0] ?? 0) * 5;
      const batteryVoltage = word(payload[1], payload[2]) * 0.00782;
      const loadCurrent = word(payload[3], payload[4]) * 0.028256;
      const brightness = Math.min(100, Math.round(((payload[5] ?? 0) / 255) * 100));
      const solarVoltage = word(payload[6], payload[7]) * 0.062366;
      return {
        command: frame.command,
        summary: `status work=${workMinutes}min brightness=${brightness}% battery=${batteryVoltage.toFixed(2)}V current=${loadCurrent.toFixed(2)}A solar=${solarVoltage.toFixed(1)}V`,
        statusPatch: {
          power: brightness,
          battery: Number(batteryVoltage.toFixed(2)),
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
