import { describe, expect, it } from "vitest";
import { DeviceController } from "./deviceController";
import type { CommandDefinition } from "../protocol/commandBuilder";
import { encodeFrame } from "../protocol/frameCodec";
import { DEFAULT_TIME_CONTROL_PARAMS } from "../protocol/timeControlParams";
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
  writeFailuresRemaining = 0;
  notifyOnSuccessfulWrite = "";
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
    if (this.writeFailuresRemaining > 0) {
      this.writeFailuresRemaining -= 1;
      throw new Error("mock write failed");
    }
    if (this.notifyOnSuccessfulWrite) {
      this.emitNotify(this.notifyOnSuccessfulWrite, deviceId);
    }
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

  it("keeps a ready connection state after a background scan while connected", async () => {
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
    bridge.quickScanDevices = [{ deviceId: "D2", name: "AC632N_2", rssi: -58 }];
    const controller = new DeviceController() as unknown as {
      ble: MockBleBridge;
      connectAndPrepare: (id: string) => Promise<GattMap>;
      scan: (options?: { quickWindowMs?: number; fullWindowMs?: number }) => Promise<DeviceBrief[]>;
      getStatus: () => { connectionState: ConnectionState; connected: boolean };
    };
    controller.ble = bridge;

    await controller.connectAndPrepare("D1");
    await controller.scan({ quickWindowMs: 600, fullWindowMs: 600 });

    expect(controller.getStatus().connected).toBe(true);
    expect(controller.getStatus().connectionState).toBe("ready");
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

  it("sends protocol control commands without waiting for notify response", async () => {
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
      powerToggle: () => Promise<string>;
      brightnessDown: () => Promise<string>;
    };
    controller.ble = bridge;
    await controller.connectAndPrepare("D1");

    await expect(controller.powerToggle()).resolves.toContain("sent powerToggle");
    await expect(controller.brightnessDown()).resolves.toContain("sent brightnessDown");

    const controlWrites = bridge.calls.filter((entry) => entry.startsWith("write:D1"));
    expect(controlWrites.length).toBe(2);
    expect(controlWrites[0]).toContain(":FFCE06000A0000300D:write");
    expect(controlWrites[1]).toContain(":FFCE06000C0000300F:write");
  });

  it("sends query commands without waiting unless explicitly marked as response commands", async () => {
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
      readStatus: () => Promise<string>;
    };
    controller.ble = bridge;
    await controller.connectAndPrepare("D1");

    await expect(controller.readStatus()).resolves.toContain("sent readStatus");
    const writeCall = bridge.calls.find((entry) => entry.startsWith("write:D1"));
    expect(writeCall).toBeTruthy();
  });

  it("sends the five minimum command-table payloads through the app-facing methods", async () => {
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
      powerToggle: () => Promise<string>;
      brightnessUp: () => Promise<string>;
      brightnessDown: () => Promise<string>;
      readParams: () => Promise<string>;
      readStatus: () => Promise<string>;
    };
    controller.ble = bridge;
    await controller.connectAndPrepare("D1");

    await controller.powerToggle();
    await controller.brightnessUp();
    await controller.brightnessDown();
    await controller.readParams();
    await controller.readStatus();

    const payloads = bridge.calls
      .filter((entry) => entry.startsWith("write:D1"))
      .map((entry) => entry.split(":")[3]);
    expect(payloads).toEqual([
      "FFCE06000A0000300D",
      "FFCE06000B0000300E",
      "FFCE06000C0000300F",
      "FFCE06000D00003010",
      "FFCE06000E00003011"
    ]);
  });

  it("reports the complete byte length for time-control whole-frame writes", async () => {
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
      writeTimeControlParams: (params: typeof DEFAULT_TIME_CONTROL_PARAMS) => Promise<string>;
      getLogs: () => { message: string; commandName?: string; payloadHex?: string }[];
    };
    controller.ble = bridge;
    await controller.connectAndPrepare("D1");

    await expect(controller.writeTimeControlParams(DEFAULT_TIME_CONTROL_PARAMS)).resolves.toBe(
      "sent writeTimeControlParams bytes=29"
    );

    const writeCall = bridge.calls.find((entry) => entry.includes(":FFCE1A00B10001010C80FF001E02"));
    expect(writeCall).toBeTruthy();
    const txLog = controller
      .getLogs()
      .find((entry) => entry.commandName === "writeTimeControlParams" && entry.payloadHex?.startsWith("FFCE1A00"));
    expect(txLog?.message).toContain("bytes=29");
  });

  it("cleans pending response after a waited command write fails so retry can wait for notify", async () => {
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
    bridge.writeFailuresRemaining = 1;
    bridge.notifyOnSuccessfulWrite = encodeFrame(0x99);
    const command: CommandDefinition = {
      name: "explicitResponseCommand",
      kind: "query",
      payloadHex: encodeFrame(0x09),
      expectedResponse: 0x99,
      waitForResponse: true,
      timeoutMs: 1000,
      retryCount: 1,
      updatesStatus: true
    };
    const controller = new DeviceController() as unknown as {
      ble: MockBleBridge;
      connectAndPrepare: (id: string) => Promise<GattMap>;
      dispatchCommand: (definition: CommandDefinition) => Promise<string>;
    };
    controller.ble = bridge;
    await controller.connectAndPrepare("D1");

    await expect(controller.dispatchCommand(command)).resolves.toBe("unknown command=0x99");

    const writes = bridge.calls.filter((entry) => entry.startsWith("write:D1"));
    expect(writes).toHaveLength(2);
  });
});
