export function normalizeHex(input: string): string {
  return input.replace(/[^0-9a-fA-F]/g, "").toUpperCase();
}

export function bytesToHex(bytes: number[]): string {
  return bytes.map((item) => item.toString(16).padStart(2, "0")).join("").toUpperCase();
}

export function hexToBytes(hex: string): number[] {
  const normalized = normalizeHex(hex);
  if (normalized.length % 2 !== 0) {
    throw new Error("Hex length must be even.");
  }
  const output: number[] = [];
  for (let index = 0; index < normalized.length; index += 2) {
    output.push(parseInt(normalized.slice(index, index + 2), 16));
  }
  return output;
}

export function spacedHex(hex: string): string {
  const normalized = normalizeHex(hex);
  return normalized.match(/.{1,2}/g)?.join(" ") ?? "";
}

