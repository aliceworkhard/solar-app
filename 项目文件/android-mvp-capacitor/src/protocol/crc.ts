export function crc16Modbus(bytes: number[]): number {
  let crc = 0xffff;
  for (const item of bytes) {
    crc ^= item;
    for (let bit = 0; bit < 8; bit += 1) {
      if (crc & 0x0001) {
        crc = (crc >> 1) ^ 0xa001;
      } else {
        crc >>= 1;
      }
    }
  }
  return crc & 0xffff;
}

