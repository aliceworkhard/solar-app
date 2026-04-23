import { describe, expect, it } from "vitest";
import { DeviceController } from "./deviceController";
import type {
  ConnectionState,
  DeviceBrief,
  GattMap,
  ScanStage,
  ScanProgressEvent
} from "../types";
import type { BleScanOptions, WriteType, ConnectOptions } from "../plugins/bleBridgePlugin";

const SERVICE_UUID = "0000fff0-0000-1000-8000-00805f9b34fb";
const WRITE_UUID = "0000fff1-0000-1000-8000-00805f9b34fb";
const NOTIFY_UUID_FFF2 = "0000fff2-0000-1000-8000-00805f9b34fb";
const NOTIFY_UUID_FFF3 = "0000fff3-0000-1000-8000-00805f9b34fb";

class MockBleBridge {
  readonly calls: string[] = [];
  notifyListener?: (packetHex: string, deviceId: string) => void;
  connectionListener?: (state: ConnectionState, reason?: string) => void;
  scanProgressListener?: (event: ScanProgressEvent) => void;
  map: GattMap;
  quickScanDevices: DeviceBrief[] = [];
  failConnect = false;
  lastScanOptions?: BleScanOptions;
  lastConnectOptions?: ConnectOptions;

  constructor(map: GattMap) {
    this.map = map;
  }

  async scan(options: BleScanOptions): Promise<DeviceBrief[]> {
    this.calls.push(`scan:${options.namePrefix}`);
    this.lastScanOptions = options;
    return this.quickScanDevices;
  }

  async connect(options: ConnectOptions): Promise<void> {
    this.calls.push(`connect:${options.deviceId}`);
    this.lastConnectOptions = options;
    if (this.failConnect) {
      throw new Error("mock connect failed");
    }
  }

  async discover(deviceId: string): Promise<GattMap> {
    this.calls.push(`discover:${deviceId}`);
    return this.map;
  }

  async subscribe(deviceId: string, notifyUUID: string): Promise<void> {
    this.calls.push(`subscribe:${deviceId}:${notifyUUID}`);
  }

  async write(
    deviceId: string,
    writeUUID: string,
    payloadHex: string,
    writeType: WriteType
  ): Promise<void> {
    this.calls.push(`write:${deviceId}:${writeUUID}:${payloadHex}:${writeType}`);
  }

  async disconnect(deviceId: string): Promise<void> {
    this.calls.push(`disconnect:${deviceId}`);
  }

  onNotify(callback: (packetHex: string, deviceId: string) => void): () => void {
    this.calls.push("onNotify");
    this.notifyListener = callback;
    return () => undefined;
  }

  onConnectionState(callback: (state: ConnectionState, reason?: string) => void): () => void {
    this.calls.push("onConnectionState");
    this.connectionListener = callback;
    return () => undefined;
  }

  onScanProgress(callback: (event: ScanProgressEvent) => void): () => void {
    this.calls.push("onScanProgress");
    this.scanProgressListener = callback;
    return () => {
      this.calls.push("offScanProgress");
      this.scanProgressListener = undefined;
    };
  }

  emitNotify(packetHex: string, deviceId: string): void {
    this.notifyListener?.(packetHex, deviceId);
  }

  emitConnectionState(state: ConnectionState, reason?: string): void {
    this.connectionListener?.(state, reason);
  }

  emitScanProgress(
    devices: DeviceBrief[],
    stage: ScanStage,
    completed: boolean,
    usedFallbackNoPrefix: boolean
  ): void {
    this.scanProgressListener?.({
      devices,
      stage,
      completed,
      usedFallbackNoPrefix,
      emittedAt: Date.now()
    });
  }
}

describe("DeviceController BLE flow", () => {
  it("falls back to available notify characteristic and registers listener before subscribe", async () => {
    const map: GattMap = {
      services: [
        {
          uuid: SERVICE_UUID,
          characteristics: [
            { uuid: WRITE_UUID, properties: ["write"] },
            { uuid: NOTIFY_UUID_FFF3, properties: ["notify"] }
          ]
        }
      ]
    };
    const bridge = new MockBleBridge(map);
    const controller = new DeviceController() as unknown as {
      ble: MockBleBridge;
      connectAndPrepare: (id: string) => Promise<GattMap>;
    };
    controller.ble = bridge;

    await controller.connectAndPrepare("D1");

    const subscribeCall = bridge.calls.find((entry) => entry.startsWith("subscribe:"));
    expect(subscribeCall).toBe(`subscribe:D1:${NOTIFY_UUID_FFF3}`);

    const listenerIndex = bridge.calls.indexOf("onNotify");
    const subscribeIndex = bridge.calls.findIndex((entry) => entry.startsWith("subscribe:"));
    expect(listenerIndex).toBeGreaterThanOrEqual(0);
    expect(subscribeIndex).toBeGreaterThanOrEqual(0);
    expect(listenerIndex).toBeLessThan(subscribeIndex);
  });

  it("supports raw write and waits for first notify packet", async () => {
    const map: GattMap = {
      services: [
        {
          uuid: SERVICE_UUID,
          characteristics: [
            { uuid: WRITE_UUID, properties: ["write"] },
            { uuid: NOTIFY_UUID_FFF2, properties: ["notify"] }
          ]
        }
      ]
    };
    const bridge = new MockBleBridge(map);
    const controller = new DeviceController() as unknown as {
      ble: MockBleBridge;
      connectAndPrepare: (id: string) => Promise<GattMap>;
      sendRawHexAndWait: (hex: string, writeType: WriteType, timeoutMs?: number) => Promise<string>;
    };
    controller.ble = bridge;
    await controller.connectAndPrepare("D1");

    const waitResponse = controller.sendRawHexAndWait("AA 55 01 02", "write", 1000);
    bridge.emitNotify("ABCD", "D1");
    await expect(waitResponse).resolves.toBe("ABCD");
  });

  it("returns write/notify uuid candidates from discovered gatt", async () => {
    const map: GattMap = {
      services: [
        {
          uuid: SERVICE_UUID,
          characteristics: [
            { uuid: WRITE_UUID, properties: ["write", "writeNoResponse"] },
            { uuid: NOTIFY_UUID_FFF2, properties: ["notify"] },
            { uuid: NOTIFY_UUID_FFF3, properties: ["indicate"] }
          ]
        }
      ]
    };
    const bridge = new MockBleBridge(map);
    const controller = new DeviceController() as unknown as {
      ble: MockBleBridge;
      connectAndPrepare: (id: string) => Promise<GattMap>;
      getChannelCandidates: () => { writeUUIDs: string[]; notifyUUIDs: string[] };
    };
    controller.ble = bridge;
    await controller.connectAndPrepare("D1");

    const channels = controller.getChannelCandidates();
    expect(channels.writeUUIDs).toContain(WRITE_UUID);
    expect(channels.notifyUUIDs).toContain(NOTIFY_UUID_FFF2);
    expect(channels.notifyUUIDs).toContain(NOTIFY_UUID_FFF3);
  });

  it("applies selected write/notify uuid and uses selected write uuid for raw send", async () => {
    const customWrite = "0000fff9-0000-1000-8000-00805f9b34fb";
    const customNotify = "0000fffa-0000-1000-8000-00805f9b34fb";
    const map: GattMap = {
      services: [
        {
          uuid: SERVICE_UUID,
          characteristics: [
            { uuid: WRITE_UUID, properties: ["write"] },
            { uuid: customWrite, properties: ["write"] },
            { uuid: NOTIFY_UUID_FFF2, properties: ["notify"] },
            { uuid: customNotify, properties: ["notify"] }
          ]
        }
      ]
    };
    const bridge = new MockBleBridge(map);
    const controller = new DeviceController() as unknown as {
      ble: MockBleBridge;
      connectAndPrepare: (id: string) => Promise<GattMap>;
      applyChannelSelection: (writeUUID: string, notifyUUID: string) => Promise<void>;
      sendRawHex: (hex: string, writeType: WriteType) => Promise<void>;
      getSelectedChannels: () => { writeUUID: string; notifyUUID: string };
    };
    controller.ble = bridge;
    await controller.connectAndPrepare("D1");
    await controller.applyChannelSelection(customWrite, customNotify);
    await controller.sendRawHex("12 34 56", "write");

    const subscribeCall = bridge.calls.find((entry) => entry === `subscribe:D1:${customNotify}`);
    expect(subscribeCall).toBeTruthy();
    const writeCall = bridge.calls.find((entry) => entry.includes(`:${customWrite}:123456:`));
    expect(writeCall).toBeTruthy();
    expect(controller.getSelectedChannels().writeUUID).toBe(customWrite);
    expect(controller.getSelectedChannels().notifyUUID).toBe(customNotify);
  });

  it("uses quick/full scan options and streams progress updates", async () => {
    const bridge = new MockBleBridge({ services: [] });
    bridge.quickScanDevices = [{ deviceId: "D2", name: "AC632N_2", rssi: -66 }];
    const progress: DeviceBrief[][] = [];
    const controller = new DeviceController() as unknown as {
      ble: MockBleBridge;
      scan: (options?: {
        quickWindowMs?: number;
        fullWindowMs?: number;
        onProgress?: (devices: DeviceBrief[]) => void;
      }) => Promise<DeviceBrief[]>;
    };
    controller.ble = bridge;

    const quickDevices = await controller.scan({
      quickWindowMs: 1500,
      fullWindowMs: 4200,
      onProgress: (devices) => {
        progress.push(devices);
      }
    });
    bridge.emitScanProgress(
      [
        { deviceId: "D2", name: "AC632N_2", rssi: -66 },
        { deviceId: "D1", name: "AC632N_1", rssi: -49 }
      ],
      "full",
      false,
      false
    );

    expect(quickDevices).toHaveLength(1);
    expect(bridge.lastScanOptions).toBeTruthy();
    expect(bridge.lastScanOptions?.quickWindowMs).toBe(1500);
    expect(bridge.lastScanOptions?.fullWindowMs).toBe(4200);
    expect(bridge.lastScanOptions?.allowFallbackNoPrefix).toBe(true);
    expect(progress.length).toBeGreaterThan(0);
    const lastProgressBatch = progress[progress.length - 1];
    expect(lastProgressBatch?.[0]?.deviceId).toBe("D1");
  });

  it("tracks ready state and can quick-connect to the last successful device", async () => {
    const map: GattMap = {
      services: [
        {
          uuid: SERVICE_UUID,
          characteristics: [
            { uuid: WRITE_UUID, properties: ["write"] },
            { uuid: NOTIFY_UUID_FFF2, properties: ["notify"] }
          ]
        }
      ]
    };
    const bridge = new MockBleBridge(map);
    const controller = new DeviceController() as unknown as {
      ble: MockBleBridge;
      connectAndPrepare: (id: string) => Promise<GattMap>;
      quickConnect: () => Promise<boolean>;
      getStatus: () => { connectionState: ConnectionState; connected: boolean };
    };
    controller.ble = bridge;

    await controller.connectAndPrepare("D1");
    expect(controller.getStatus().connectionState).toBe("ready");
    expect(controller.getStatus().connected).toBe(true);

    await expect(controller.quickConnect()).resolves.toBe(true);
    expect(bridge.calls.filter((entry) => entry === "connect:D1").length).toBeGreaterThanOrEqual(2);
  });

  it("locks command writeType to write mode for this project profile", async () => {
    const map: GattMap = {
      services: [
        {
          uuid: SERVICE_UUID,
          characteristics: [
            { uuid: WRITE_UUID, properties: ["writeNoResponse"] },
            { uuid: NOTIFY_UUID_FFF2, properties: ["notify"] }
          ]
        }
      ]
    };
    const bridge = new MockBleBridge(map);
    const controller = new DeviceController() as unknown as {
      ble: MockBleBridge;
      connectAndPrepare: (id: string) => Promise<GattMap>;
      getWriteType: () => WriteType;
      sendRawHex: (hex: string, writeType: WriteType) => Promise<void>;
    };
    controller.ble = bridge;
    await controller.connectAndPrepare("D1");
    await controller.sendRawHex("12 34 56", controller.getWriteType());

    expect(controller.getWriteType()).toBe("write");
    const writeCall = bridge.calls.find((entry) => entry.endsWith(":123456:write"));
    expect(writeCall).toBeTruthy();
  });
});
