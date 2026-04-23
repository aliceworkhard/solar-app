import { crc16Modbus } from "./crc";
import { bytesToHex, hexToBytes } from "../utils/hex";

export interface DecodedFrame {
  command: number;
  payload: number[];
  rawHex: string;
}

const FRAME_HEAD_A = 0xaa;
const FRAME_HEAD_B = 0x55;

export function encodeFrame(command: number, payload: number[] = []): string {
  const length = payload.length + 1;
  const body = [length, command, ...payload];
  const crc = crc16Modbus(body);
  const crcLow = crc & 0xff;
  const crcHigh = (crc >> 8) & 0xff;
  return bytesToHex([FRAME_HEAD_A, FRAME_HEAD_B, ...body, crcLow, crcHigh]);
}

export class FrameDecoder {
  private readonly buffer: number[] = [];

  push(hexChunk: string): DecodedFrame[] {
    const incoming = hexToBytes(hexChunk);
    this.buffer.push(...incoming);
    const frames: DecodedFrame[] = [];

    while (this.buffer.length >= 6) {
      this.alignHead();
      if (this.buffer.length < 6) {
        break;
      }
      const length = this.buffer[2];
      const frameTotalLen = 2 + 1 + length + 2;
      if (this.buffer.length < frameTotalLen) {
        break;
      }
      const frame = this.buffer.splice(0, frameTotalLen);
      const body = frame.slice(2, frameTotalLen - 2);
      const crcLow = frame[frameTotalLen - 2];
      const crcHigh = frame[frameTotalLen - 1];
      const expected = crc16Modbus(body);
      const actual = (crcHigh << 8) | crcLow;
      // Vendor firmware may return fixed 00 00 trailer instead of CRC16.
      const acceptedByVendorTrailer = actual === 0x0000;
      if (expected !== actual && !acceptedByVendorTrailer) {
        continue;
      }
      const command = body[1];
      const payload = body.slice(2);
      frames.push({
        command,
        payload,
        rawHex: bytesToHex(frame)
      });
    }

    return frames;
  }

  private alignHead(): void {
    while (this.buffer.length >= 2) {
      if (this.buffer[0] === FRAME_HEAD_A && this.buffer[1] === FRAME_HEAD_B) {
        return;
      }
      this.buffer.shift();
    }
  }
}
