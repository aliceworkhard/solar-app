import { WebPlugin } from "@capacitor/core";
import type { ConnectionState, DeviceBrief, GattMap, ScanProgressEvent } from "../types";
import type {
  BleScanOptions,
  BleBridgePlugin,
  ConnectOptions,
  ConnectionStateEvent,
  NotifyEvent,
  WriteType
} from "./bleBridgePlugin";

const MOCK_DEVICE: DeviceBrief = {
  deviceId: "00:11:22:33:44:55",
  name: "AC632N_1",
  rssi: -47
};

const MOCK_GATT: GattMap = {
  services: [
    {
      uuid: "0000fff0-0000-1000-8000-00805f9b34fb",
      characteristics: [
        { uuid: "0000fff1-0000-1000-8000-00805f9b34fb", properties: ["write", "writeNoResponse"] },
        { uuid: "0000fff2-0000-1000-8000-00805f9b34fb", properties: ["notify"] }
      ]
    }
  ]
};

export class BleBridgeWeb extends WebPlugin implements BleBridgePlugin {
  private connected = false;
  private activeDeviceId = "";
  private notifyTimer: ReturnType<typeof setInterval> | null = null;

  async scan(options: BleScanOptions): Promise<{ devices: DeviceBrief[] }> {
    await this.delay(450);
    const stage: ScanProgressEvent = {
      devices: [MOCK_DEVICE],
      stage: "quick",
      completed: false,
      usedFallbackNoPrefix: false,
      emittedAt: Date.now()
    };
    this.notifyListeners("scanProgress", stage);
    setTimeout(() => {
      const fullStage: ScanProgressEvent = {
        devices: [MOCK_DEVICE],
        stage: "full",
        completed: true,
        usedFallbackNoPrefix: false,
        emittedAt: Date.now()
      };
      this.notifyListeners("scanProgress", fullStage);
    }, Math.max(600, Math.floor((options.fullWindowMs ?? 1800) / 3)));
    if (!MOCK_DEVICE.name.startsWith(options.namePrefix)) {
      return { devices: [] };
    }
    return { devices: [MOCK_DEVICE] };
  }

  async connect(options: ConnectOptions): Promise<void> {
    await this.delay(250);
    this.connected = true;
    this.activeDeviceId = options.deviceId;
    this.emitConnectionState("discovering");
  }

  async discover(options: { deviceId: string }): Promise<GattMap> {
    void options;
    await this.delay(180);
    return MOCK_GATT;
  }

  async subscribe(options: { deviceId: string; notifyUUID: string }): Promise<void> {
    void options;
    if (!this.connected) {
      throw new Error("Device not connected.");
    }
    this.emitConnectionState("subscribing");
    this.startMockNotify();
    this.emitConnectionState("ready");
  }

  async write(options: {
    deviceId: string;
    writeUUID: string;
    payloadHex: string;
    writeType: WriteType;
  }): Promise<void> {
    if (!this.connected || options.deviceId !== this.activeDeviceId) {
      throw new Error("No active connection.");
    }
    await this.delay(options.writeType === "write" ? 110 : 35);
    const normalized = options.payloadHex.replace(/\s+/g, "").toUpperCase();
    const loopback = `AA550290${normalized.slice(0, 2) || "00"}0000`;
    this.emitNotify(loopback);
  }

  async disconnect(options: { deviceId: string }): Promise<void> {
    void options;
    this.stopMockNotify();
    this.connected = false;
    this.activeDeviceId = "";
    this.emitConnectionState("disconnected");
  }

  private emitNotify(packetHex: string): void {
    const payload: NotifyEvent = {
      deviceId: this.activeDeviceId || MOCK_DEVICE.deviceId,
      packetHex,
      receivedAt: Date.now()
    };
    this.notifyListeners("notify", payload);
  }

  private emitConnectionState(state: ConnectionState): void {
    const payload: ConnectionStateEvent = { state };
    this.notifyListeners("connectionState", payload);
  }

  private startMockNotify(): void {
    this.stopMockNotify();
    this.notifyTimer = setInterval(() => {
      if (!this.connected) {
        return;
      }
      const pseudoPower = Math.floor((Date.now() / 1000) % 100);
      this.emitNotify(`AA550481${pseudoPower.toString(16).padStart(2, "0")}01000000`);
    }, 3000);
  }

  private stopMockNotify(): void {
    if (this.notifyTimer) {
      clearInterval(this.notifyTimer);
      this.notifyTimer = null;
    }
  }

  private async delay(ms: number): Promise<void> {
    await new Promise<void>((resolve) => setTimeout(resolve, ms));
  }
}
