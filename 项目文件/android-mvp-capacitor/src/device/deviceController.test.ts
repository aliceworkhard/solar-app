import { describe, expect, it } from "vitest";
import { DeviceController } from "./deviceController";
import type { DeviceBrief, GattMap, ConnectionState } from "../types";
import type { WriteType } from "../plugins/bleBridgePlugin";

const SERVICE_UUID = "0000fff0-0000-1000-8000-00805f9b34fb";
const WRITE_UUID = "0000fff1-0000-1000-8000-00805f9b34fb";
const NOTIFY_UUID_FFF2 = "0000fff2-0000-1000-8000-00805f9b34fb";
const NOTIFY_UUID_FFF3 = "0000fff3-0000-1000-8000-00805f9b34fb";

class MockBleBridge {
  readonly calls: string[] = [];
  notifyListener?: (packetHex: string, deviceId: string) => void;
  connectionListener?: (state: ConnectionState, reason?: string) => void;
  map: GattMap;
  scanResultByPrefix = new Map<string, DeviceBrief[]>();

  constructor(map: GattMap) {
    this.map = map;
  }

  async scan(namePrefix: string): Promise<DeviceBrief[]> {
    this.calls.push(`scan:${namePrefix}`);
    return this.scanResultByPrefix.get(namePrefix) ?? [];
  }

  async connect(deviceId: string): Promise<void> {
    this.calls.push(`connect:${deviceId}`);
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

  emitNotify(packetHex: string, deviceId: string): void {
    this.notifyListener?.(packetHex, deviceId);
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
    const controller = new DeviceController() as unknown as { ble: MockBleBridge; connectAndPrepare: (id: string) => Promise<GattMap> };
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

  it("retries scan without namePrefix when filtered scan returns empty", async () => {
    const bridge = new MockBleBridge({ services: [] });
    bridge.scanResultByPrefix.set("AC632N", []);
    bridge.scanResultByPrefix.set("", [
      { deviceId: "D1", name: "Unknown", rssi: -55 }
    ]);
    const controller = new DeviceController() as unknown as {
      ble: MockBleBridge;
      scan: () => Promise<DeviceBrief[]>;
    };
    controller.ble = bridge;

    const devices = await controller.scan();
    expect(devices).toHaveLength(1);
    expect(bridge.calls).toContain("scan:AC632N");
    expect(bridge.calls).toContain("scan:");
  });
});
