import { bytesToHex, hexToBytes } from "../utils/hex";

export interface DecodedFrame {
  descriptor: number;
  command: number;
  subCommand: number;
  payload: number[];
  rawHex: string;
}

const HOST_A = 0xff;
const HOST_B = 0xce;
const DESCRIPTOR_MASTER = 0x00;
const END_MARK = 0x30;

function checksum(bytes: number[]): number {
  return bytes.reduce((sum, item) => sum + (item & 0xff), 0) & 0xff;
}

export function encodeFrame(
  command: number,
  subCommand = 0x00,
  data: number[] = [0x00],
  descriptor = DESCRIPTOR_MASTER
): string {
  const cleanData = data.map((item) => item & 0xff);
  // RF control frames count descriptor through checksum in the length byte.
  const length = cleanData.length + 5;
  const withoutChecksum = [
    HOST_A,
    HOST_B,
    length,
    descriptor & 0xff,
    command & 0xff,
    subCommand & 0xff,
    ...cleanData,
    END_MARK
  ];
  return bytesToHex([...withoutChecksum, checksum(withoutChecksum)]);
}

export class FrameDecoder {
  private readonly buffer: number[] = [];

  push(hexChunk: string): DecodedFrame[] {
    const incoming = hexToBytes(hexChunk);
    this.buffer.push(...incoming);
    const frames: DecodedFrame[] = [];

    while (this.buffer.length >= 9) {
      this.alignHead();
      if (this.buffer.length < 9) {
        break;
      }
      const length = this.buffer[2];
      const frameTotalLen = 3 + length;
      if (this.buffer.length < frameTotalLen) {
        break;
      }
      const frame = this.buffer.splice(0, frameTotalLen);
      const actualChecksum = frame[frameTotalLen - 1];
      const expectedChecksum = checksum(frame.slice(0, frameTotalLen - 1));
      if (expectedChecksum !== actualChecksum || frame[frameTotalLen - 2] !== END_MARK) {
        continue;
      }
      const descriptor = frame[3];
      const command = frame[4];
      const subCommand = frame[5];
      const payload = frame.slice(6, frameTotalLen - 2);
      frames.push({
        descriptor,
        command,
        subCommand,
        payload,
        rawHex: bytesToHex(frame)
      });
    }

    return frames;
  }

  private alignHead(): void {
    while (this.buffer.length >= 2) {
      if (this.buffer[0] === HOST_A && this.buffer[1] === HOST_B) {
        return;
      }
      this.buffer.shift();
    }
  }
}
