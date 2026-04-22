import { encodeFrame } from "./frameCodec";

export interface CommandPacket {
  name: string;
  expectedResponse: number;
  payloadHex: string;
}

const CMD = {
  READ_STATUS: 0x01,
  READ_VERSION: 0x02,
  POWER: 0x10,
  SET_PARAM: 0x20
} as const;

const RESP = {
  STATUS: 0x81,
  VERSION: 0x82,
  POWER_ACK: 0x90,
  PARAM_ACK: 0xa0
} as const;

export class CommandBuilder {
  static readStatus(): CommandPacket {
    return {
      name: "readStatus",
      expectedResponse: RESP.STATUS,
      payloadHex: encodeFrame(CMD.READ_STATUS)
    };
  }

  static readVersion(): CommandPacket {
    return {
      name: "readVersion",
      expectedResponse: RESP.VERSION,
      payloadHex: encodeFrame(CMD.READ_VERSION)
    };
  }

  static powerOn(): CommandPacket {
    return {
      name: "powerOn",
      expectedResponse: RESP.POWER_ACK,
      payloadHex: encodeFrame(CMD.POWER, [0x01])
    };
  }

  static powerOff(): CommandPacket {
    return {
      name: "powerOff",
      expectedResponse: RESP.POWER_ACK,
      payloadHex: encodeFrame(CMD.POWER, [0x00])
    };
  }

  static setParam(paramId: number, value: number): CommandPacket {
    return {
      name: "setParam",
      expectedResponse: RESP.PARAM_ACK,
      payloadHex: encodeFrame(CMD.SET_PARAM, [paramId & 0xff, value & 0xff])
    };
  }
}

