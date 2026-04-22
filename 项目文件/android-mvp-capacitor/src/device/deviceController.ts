import { BleBridge } from "../ble/bleBridge";
import { CommandBuilder } from "../protocol/commandBuilder";
import { FrameDecoder } from "../protocol/frameCodec";
import { parseResponse } from "../protocol/responseParser";
import { normalizeHex, spacedHex } from "../utils/hex";
import type { DeviceBrief, DeviceStatus, GattMap, LogEntry, Unsubscribe, ConnectionState } from "../types";
import type { WriteType } from "../plugins/bleBridgePlugin";

const PROFILE = {
  namePrefix: "AC632N",
  serviceUUID: "0000fff0-0000-1000-8000-00805f9b34fb",
  writeUUID: "0000fff1-0000-1000-8000-00805f9b34fb",
  notifyUUID: "0000fff2-0000-1000-8000-00805f9b34fb"
} as const;

type PendingResolver = {
  resolve: (value: string) => void;
  reject: (reason?: unknown) => void;
  timer: ReturnType<typeof setTimeout>;
};

export class DeviceController {
  private readonly ble = new BleBridge();
  private readonly frameDecoder = new FrameDecoder();
  private readonly stateListeners = new Set<(status: DeviceStatus) => void>();
  private readonly logListeners = new Set<(logs: LogEntry[]) => void>();
  private readonly pendingResponse = new Map<number, PendingResolver>();
  private notifyUnsubscribe: Unsubscribe | null = null;
  private connUnsubscribe: Unsubscribe | null = null;
  private commandChain: Promise<void> = Promise.resolve();
  private logs: LogEntry[] = [];
  private nextLogId = 1;
  private currentWriteType: WriteType = "write";
  private currentDeviceId = "";

  private status: DeviceStatus = {
    connected: false,
    mode: "radar",
    power: 0,
    battery: 0,
    fwVersion: "unknown",
    lastUpdatedAt: Date.now()
  };

  async scan(): Promise<DeviceBrief[]> {
    this.addLog("info", "Start BLE scan");
    return this.ble.scan(PROFILE.namePrefix);
  }

  async connectAndPrepare(deviceId: string): Promise<GattMap> {
    this.currentDeviceId = deviceId;
    this.addLog("info", `Connect ${deviceId}`);
    await this.ble.connect(deviceId);
    const map = await this.ble.discover(deviceId);
    this.resolveWriteType(map);
    await this.ble.subscribe(deviceId, PROFILE.notifyUUID);
    this.addLog("info", `Subscribed notify ${PROFILE.notifyUUID}`);

    if (this.notifyUnsubscribe) {
      this.notifyUnsubscribe();
    }
    this.notifyUnsubscribe = this.ble.onNotify((packetHex) => {
      this.handleIncoming(packetHex);
    });

    if (this.connUnsubscribe) {
      this.connUnsubscribe();
    }
    this.connUnsubscribe = this.ble.onConnectionState((state, reason) => {
      this.handleConnectionEvent(state, reason);
    });

    this.mergeStatus({ connected: true, lastUpdatedAt: Date.now() });
    return map;
  }

  async disconnect(): Promise<void> {
    if (!this.currentDeviceId) {
      return;
    }
    await this.ble.disconnect(this.currentDeviceId);
    this.mergeStatus({
      connected: false,
      lastUpdatedAt: Date.now()
    });
    this.currentDeviceId = "";
    this.addLog("info", "Disconnected");
  }

  async readStatus(): Promise<string> {
    const packet = CommandBuilder.readStatus();
    return this.dispatchCommand(packet.payloadHex, packet.expectedResponse);
  }

  async readVersion(): Promise<string> {
    const packet = CommandBuilder.readVersion();
    return this.dispatchCommand(packet.payloadHex, packet.expectedResponse);
  }

  async powerOn(): Promise<string> {
    const packet = CommandBuilder.powerOn();
    return this.dispatchCommand(packet.payloadHex, packet.expectedResponse);
  }

  async powerOff(): Promise<string> {
    const packet = CommandBuilder.powerOff();
    return this.dispatchCommand(packet.payloadHex, packet.expectedResponse);
  }

  async setParam(paramId: string, value: number): Promise<string> {
    const parsedParamId = Number.parseInt(paramId, 10);
    const safeId = Number.isFinite(parsedParamId) ? parsedParamId : 1;
    const packet = CommandBuilder.setParam(safeId, value);
    return this.dispatchCommand(packet.payloadHex, packet.expectedResponse);
  }

  async sendRawHex(hex: string, writeType: WriteType): Promise<void> {
    if (!this.currentDeviceId) {
      throw new Error("No active device.");
    }
    const normalized = normalizeHex(hex);
    if (!normalized) {
      throw new Error("HEX is empty.");
    }
    this.addLog("tx", spacedHex(normalized));
    await this.ble.write(this.currentDeviceId, PROFILE.writeUUID, normalized, writeType);
  }

  getStatus(): DeviceStatus {
    return { ...this.status };
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  getWriteType(): WriteType {
    return this.currentWriteType;
  }

  onStatusChange(listener: (status: DeviceStatus) => void): Unsubscribe {
    this.stateListeners.add(listener);
    listener(this.getStatus());
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  onLogChange(listener: (logs: LogEntry[]) => void): Unsubscribe {
    this.logListeners.add(listener);
    listener(this.getLogs());
    return () => {
      this.logListeners.delete(listener);
    };
  }

  private async dispatchCommand(payloadHex: string, expectedResponse: number): Promise<string> {
    return this.runExclusive(async () => {
      if (!this.currentDeviceId) {
        throw new Error("No active device.");
      }
      return this.sendWithRetry(payloadHex, expectedResponse, 2, 2000);
    });
  }

  private async sendWithRetry(
    payloadHex: string,
    expectedResponse: number,
    retries: number,
    timeoutMs: number
  ): Promise<string> {
    let latestError: Error | null = null;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        const response = await this.sendAndWait(payloadHex, expectedResponse, timeoutMs);
        return response;
      } catch (error) {
        latestError = error as Error;
        this.addLog("warn", `Attempt ${attempt + 1} failed: ${latestError.message}`);
      }
    }
    throw latestError ?? new Error("Command failed.");
  }

  private async sendAndWait(
    payloadHex: string,
    expectedResponse: number,
    timeoutMs: number
  ): Promise<string> {
    if (!this.currentDeviceId) {
      throw new Error("No active device.");
    }
    if (this.pendingResponse.has(expectedResponse)) {
      throw new Error(`Command conflict, pending response 0x${expectedResponse.toString(16)}`);
    }
    const waiter = new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingResponse.delete(expectedResponse);
        reject(new Error(`Timeout waiting response 0x${expectedResponse.toString(16).toUpperCase()}`));
      }, timeoutMs);
      this.pendingResponse.set(expectedResponse, { resolve, reject, timer });
    });
    this.addLog("tx", spacedHex(payloadHex));
    await this.ble.write(this.currentDeviceId, PROFILE.writeUUID, payloadHex, this.currentWriteType);
    return waiter;
  }

  private handleIncoming(packetHex: string): void {
    const normalized = normalizeHex(packetHex);
    if (!normalized) {
      return;
    }
    this.addLog("rx", spacedHex(normalized));
    const frames = this.frameDecoder.push(normalized);
    for (const frame of frames) {
      const parsed = parseResponse(frame);
      if (parsed.statusPatch) {
        this.mergeStatus(parsed.statusPatch);
      }
      const pending = this.pendingResponse.get(frame.command);
      if (pending) {
        clearTimeout(pending.timer);
        this.pendingResponse.delete(frame.command);
        pending.resolve(parsed.summary);
      }
      this.addLog("info", parsed.summary);
    }
  }

  private handleConnectionEvent(state: ConnectionState, reason?: string): void {
    this.addLog("info", `connection ${state}${reason ? ` (${reason})` : ""}`);
    if (state === "disconnected" || state === "error") {
      this.mergeStatus({
        connected: false,
        lastUpdatedAt: Date.now()
      });
    }
  }

  private resolveWriteType(gattMap: GattMap): void {
    for (const service of gattMap.services) {
      if (service.uuid.toLowerCase() !== PROFILE.serviceUUID) {
        continue;
      }
      for (const characteristic of service.characteristics) {
        if (characteristic.uuid.toLowerCase() !== PROFILE.writeUUID) {
          continue;
        }
        if (characteristic.properties.includes("write")) {
          this.currentWriteType = "write";
        } else if (characteristic.properties.includes("writeNoResponse")) {
          this.currentWriteType = "writeNoResponse";
        }
        this.addLog("info", `Detected writeType=${this.currentWriteType}`);
        return;
      }
    }
  }

  private mergeStatus(patch: Partial<DeviceStatus>): void {
    this.status = { ...this.status, ...patch };
    for (const listener of this.stateListeners) {
      listener(this.getStatus());
    }
  }

  private addLog(level: LogEntry["level"], message: string): void {
    this.logs = [
      ...this.logs,
      {
        id: this.nextLogId++,
        time: Date.now(),
        level,
        message
      }
    ].slice(-300);
    for (const listener of this.logListeners) {
      listener(this.getLogs());
    }
  }

  private async runExclusive<T>(task: () => Promise<T>): Promise<T> {
    const nextTask = this.commandChain.then(task, task);
    this.commandChain = nextTask.then(
      () => undefined,
      () => undefined
    );
    return nextTask;
  }
}
