import type { ConnectionState, DeviceBrief, GattMap, Unsubscribe } from "../types";
import { BleBridgeNative } from "../plugins/bleBridgePlugin";
import type { WriteType } from "../plugins/bleBridgePlugin";

export class BleBridge {
  async scan(namePrefix: string): Promise<DeviceBrief[]> {
    const result = await BleBridgeNative.scan({ namePrefix, timeoutMs: 5000 });
    return result.devices;
  }

  async connect(deviceId: string): Promise<void> {
    await BleBridgeNative.connect({ deviceId });
  }

  async discover(deviceId: string): Promise<GattMap> {
    return BleBridgeNative.discover({ deviceId });
  }

  async subscribe(deviceId: string, notifyUUID: string): Promise<void> {
    await BleBridgeNative.subscribe({ deviceId, notifyUUID });
  }

  async write(
    deviceId: string,
    writeUUID: string,
    payloadHex: string,
    writeType: WriteType
  ): Promise<void> {
    await BleBridgeNative.write({ deviceId, writeUUID, payloadHex, writeType });
  }

  async disconnect(deviceId: string): Promise<void> {
    await BleBridgeNative.disconnect({ deviceId });
  }

  onNotify(callback: (packetHex: string, deviceId: string) => void): Unsubscribe {
    let active = true;
    const handlePromise = BleBridgeNative.addListener("notify", (event) => {
      if (active) {
        callback(event.packetHex, event.deviceId);
      }
    });
    return () => {
      active = false;
      void handlePromise.then((handle) => handle.remove());
    };
  }

  onConnectionState(callback: (state: ConnectionState, reason?: string) => void): Unsubscribe {
    let active = true;
    const handlePromise = BleBridgeNative.addListener("connectionState", (event) => {
      if (active) {
        callback(event.state, event.reason);
      }
    });
    return () => {
      active = false;
      void handlePromise.then((handle) => handle.remove());
    };
  }
}

