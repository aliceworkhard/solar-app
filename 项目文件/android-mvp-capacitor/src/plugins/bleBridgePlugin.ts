import { registerPlugin } from "@capacitor/core";
import type { PluginListenerHandle } from "@capacitor/core";
import type { ConnectionState, DeviceBrief, GattMap, ScanProgressEvent } from "../types";

export type WriteType = "write" | "writeNoResponse";

export interface BleScanOptions {
  namePrefix: string;
  quickWindowMs?: number;
  fullWindowMs?: number;
  allowFallbackNoPrefix?: boolean;
}

export interface ConnectOptions {
  deviceId: string;
  connectTimeoutMs?: number;
  discoverTimeoutMs?: number;
}

export interface NotifyEvent {
  deviceId: string;
  packetHex: string;
  receivedAt: number;
}

export interface ConnectionStateEvent {
  state: ConnectionState;
  reason?: string;
}

export interface BleBridgePlugin {
  scan(options: BleScanOptions): Promise<{ devices: DeviceBrief[] }>;
  connect(options: ConnectOptions): Promise<void>;
  discover(options: { deviceId: string }): Promise<GattMap>;
  subscribe(options: { deviceId: string; notifyUUID: string }): Promise<void>;
  write(options: {
    deviceId: string;
    writeUUID: string;
    payloadHex: string;
    writeType: WriteType;
  }): Promise<void>;
  disconnect(options: { deviceId: string }): Promise<void>;
  addListener(
    eventName: "notify",
    listenerFunc: (event: NotifyEvent) => void
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: "connectionState",
    listenerFunc: (event: ConnectionStateEvent) => void
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: "scanProgress",
    listenerFunc: (event: ScanProgressEvent) => void
  ): Promise<PluginListenerHandle>;
  removeAllListeners(): Promise<void>;
}

export const BleBridgeNative = registerPlugin<BleBridgePlugin>("BleBridge", {
  web: () => import("./bleBridgeWeb").then((module) => new module.BleBridgeWeb())
});
