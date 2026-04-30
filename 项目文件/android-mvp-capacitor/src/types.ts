import type { TimeControlParams } from "./protocol/timeControlParams";

export type Unsubscribe = () => void;

export type ConnectionState =
  | "idle"
  | "scanning"
  | "connecting"
  | "discovering"
  | "subscribing"
  | "connected"
  | "ready"
  | "disconnected"
  | "error";

export type ScanStage = "quick" | "full";

export interface DeviceBrief {
  deviceId: string;
  name: string;
  rssi: number;
}

export interface ScanProgressEvent {
  devices: DeviceBrief[];
  stage: ScanStage;
  completed: boolean;
  usedFallbackNoPrefix: boolean;
  emittedAt: number;
}

export interface CharacteristicInfo {
  uuid: string;
  properties: string[];
}

export interface ServiceInfo {
  uuid: string;
  characteristics: CharacteristicInfo[];
}

export interface GattMap {
  services: ServiceInfo[];
}

export interface DeviceStatus {
  connected: boolean;
  connectionState: ConnectionState;
  mode: string;
  power: number;
  battery?: number;
  batteryVoltage?: number;
  workMinutes?: number;
  loadCurrentAmp?: number;
  solarVoltage?: number;
  statusExtraRaw?: number;
  timeControlParams?: TimeControlParams;
  fwVersion?: string;
  lastUpdatedAt: number;
}

export interface LogEntry {
  id: number;
  time: number;
  level: "info" | "warn" | "error" | "tx" | "rx";
  message: string;
  direction?: "tx" | "rx";
  commandName?: string;
  payloadHex?: string;
  writeType?: "write" | "writeNoResponse";
  result?: string;
  rawNotify?: string;
}
