import { registerPlugin } from "@capacitor/core";
import type { PluginListenerHandle } from "@capacitor/core";
import type { ConnectionState, DeviceBrief, GattMap } from "../types";

export type WriteType = "write" | "writeNoResponse";

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
  scan(options: { namePrefix: string; timeoutMs?: number }): Promise<{ devices: DeviceBrief[] }>;
  connect(options: { deviceId: string }): Promise<void>;
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
  removeAllListeners(): Promise<void>;
}

export const BleBridgeNative = registerPlugin<BleBridgePlugin>("BleBridge", {
  web: () => import("./bleBridgeWeb").then((module) => new module.BleBridgeWeb())
});
