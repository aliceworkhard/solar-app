import { encodeFrame } from "./frameCodec";
import { buildTimeControlPayload } from "./timeControlParams";
import type { TimeControlParams } from "./timeControlParams";

export type CommandKind = "query" | "control";

export interface CommandDefinition {
  name: string;
  payloadHex: string;
  kind: CommandKind;
  expectedResponse?: number;
  waitForResponse: boolean;
  timeoutMs?: number;
  retryCount: number;
  updatesStatus: boolean;
}

const CMD = {
  POWER_TOGGLE: 0x0a,
  BRIGHTNESS_UP: 0x0b,
  BRIGHTNESS_DOWN: 0x0c,
  READ_PARAMS: 0x0d,
  READ_STATUS: 0x0e,
  PARAMS_DOWNLOAD: 0xb1
} as const;

const RESP = {
  PARAMS: 0xb1,
  STATUS: 0xe1
} as const;

export class CommandBuilder {
  static readStatus(): CommandDefinition {
    return {
      name: "readStatus",
      kind: "query",
      expectedResponse: RESP.STATUS,
      waitForResponse: false,
      payloadHex: encodeFrame(CMD.READ_STATUS, 0x00, [0x00]),
      retryCount: 0,
      updatesStatus: true
    };
  }

  static readParams(): CommandDefinition {
    return {
      name: "readParams",
      kind: "query",
      expectedResponse: RESP.PARAMS,
      waitForResponse: false,
      payloadHex: encodeFrame(CMD.READ_PARAMS, 0x00, [0x00]),
      retryCount: 0,
      updatesStatus: true
    };
  }

  static powerToggle(): CommandDefinition {
    return {
      name: "powerToggle",
      kind: "control",
      waitForResponse: false,
      payloadHex: encodeFrame(CMD.POWER_TOGGLE, 0x00, [0x00]),
      retryCount: 0,
      updatesStatus: false
    };
  }

  static brightnessUp(): CommandDefinition {
    return {
      name: "brightnessUp",
      kind: "control",
      waitForResponse: false,
      payloadHex: encodeFrame(CMD.BRIGHTNESS_UP, 0x00, [0x00]),
      retryCount: 0,
      updatesStatus: false
    };
  }

  static brightnessDown(): CommandDefinition {
    return {
      name: "brightnessDown",
      kind: "control",
      waitForResponse: false,
      payloadHex: encodeFrame(CMD.BRIGHTNESS_DOWN, 0x00, [0x00]),
      retryCount: 0,
      updatesStatus: false
    };
  }

  static writeTimeControlParams(params: TimeControlParams): CommandDefinition {
    return {
      name: "writeTimeControlParams",
      kind: "control",
      waitForResponse: false,
      payloadHex: encodeFrame(CMD.PARAMS_DOWNLOAD, 0x00, buildTimeControlPayload(params)),
      retryCount: 0,
      updatesStatus: false
    };
  }

  static allDefinitions(): CommandDefinition[] {
    return [
      CommandBuilder.readStatus(),
      CommandBuilder.readParams(),
      CommandBuilder.powerToggle(),
      CommandBuilder.brightnessUp(),
      CommandBuilder.brightnessDown()
    ];
  }
}
