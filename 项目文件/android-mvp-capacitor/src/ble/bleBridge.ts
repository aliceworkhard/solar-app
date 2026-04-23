import type {
  ConnectionState,
  DeviceBrief,
  GattMap,
  ScanProgressEvent,
  Unsubscribe
} from "../types";
import { BleBridgeNative } from "../plugins/bleBridgePlugin";
import type { BleScanOptions, ConnectOptions, WriteType } from "../plugins/bleBridgePlugin";

export class BleBridge {
  async scan(options: BleScanOptions): Promise<DeviceBrief[]> {
    const result = await BleBridgeNative.scan(options);
    return result.devices;
  }

  async connect(options: ConnectOptions): Promise<void> {
    await BleBridgeNative.connect(options);
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

  onScanProgress(callback: (event: ScanProgressEvent) => void): Unsubscribe {
    let active = true;
    const handlePromise = BleBridgeNative.addListener("scanProgress", (event) => {
      if (active) {
        callback(event);
      }
    });
    return () => {
      active = false;
      void handlePromise.then((handle) => handle.remove());
    };
  }
}
