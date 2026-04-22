export type Unsubscribe = () => void;

export type ConnectionState =
  | "idle"
  | "scanning"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export interface DeviceBrief {
  deviceId: string;
  name: string;
  rssi: number;
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
  mode: string;
  power: number;
  battery?: number;
  fwVersion?: string;
  lastUpdatedAt: number;
}

export interface LogEntry {
  id: number;
  time: number;
  level: "info" | "warn" | "error" | "tx" | "rx";
  message: string;
}

