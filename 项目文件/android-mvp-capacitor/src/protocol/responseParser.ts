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

function parseAscii(payload: number[]): string {
  return payload
    .map((item) => (item >= 32 && item <= 126 ? String.fromCharCode(item) : ""))
    .join("")
    .trim();
}

export function parseResponse(frame: DecodedFrame): ParsedResponse {
  const payload = frame.payload;
  switch (frame.command) {
    case 0x81: {
      const power = payload[0] ?? 0;
      const mode = modeFromCode(payload[1] ?? 1);
      const battery = payload[2] ?? 0;
      return {
        command: frame.command,
        summary: `status mode=${mode} power=${power} battery=${battery}`,
        statusPatch: {
          mode,
          power,
          battery,
          lastUpdatedAt: Date.now()
        }
      };
    }
    case 0x82: {
      const version = parseAscii(payload) || `v${(payload[0] ?? 0).toString(16).padStart(2, "0")}`;
      return {
        command: frame.command,
        summary: `version ${version}`,
        statusPatch: {
          fwVersion: version,
          lastUpdatedAt: Date.now()
        }
      };
    }
    case 0x90: {
      const state = payload[0] === 0x01;
      return {
        command: frame.command,
        summary: `powerAck ${state ? "on" : "off"}`,
        statusPatch: {
          connected: true,
          lastUpdatedAt: Date.now()
        }
      };
    }
    case 0xa0: {
      const id = payload[0] ?? 0;
      const value = payload[1] ?? 0;
      return {
        command: frame.command,
        summary: `paramAck id=${id} value=${value}`,
        statusPatch: {
          power: value,
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

