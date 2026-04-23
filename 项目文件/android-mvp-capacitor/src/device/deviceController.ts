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
  notifyUUID: "0000fff2-0000-1000-8000-00805f9b34fb",
  notifyUUIDCandidates: [
    "0000fff2-0000-1000-8000-00805f9b34fb",
    "0000fff3-0000-1000-8000-00805f9b34fb"
  ]
} as const;

type PendingResolver = {
  resolve: (value: string) => void;
  reject: (reason?: unknown) => void;
  timer: ReturnType<typeof setTimeout>;
};

type PendingAnyResolver = {
  resolve: (packetHex: string) => void;
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
  private currentWriteUUID: string = PROFILE.writeUUID;
  private currentNotifyUUID: string = PROFILE.notifyUUID;
  private currentDeviceId = "";
  private gattMap: GattMap | null = null;
  private pendingAnyNotify: PendingAnyResolver | null = null;

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
    let devices = await this.ble.scan(PROFILE.namePrefix);
    if (!devices.length && PROFILE.namePrefix) {
      this.addLog("warn", `No devices matched prefix=${PROFILE.namePrefix}, retrying without filter`);
      devices = await this.ble.scan("");
    }
    this.addLog("info", `Scan result count=${devices.length}`);
    return devices;
  }

  async connectAndPrepare(deviceId: string): Promise<GattMap> {
    this.currentDeviceId = deviceId;
    this.addLog("info", `Connect ${deviceId}`);
    this.attachListeners();
    await this.ble.connect(deviceId);
    const map = await this.ble.discover(deviceId);
    this.gattMap = map;
    this.addGattMapLog(map);
    this.currentWriteUUID = this.resolveWriteUUID(map, this.currentWriteUUID);
    this.resolveWriteType(map, this.currentWriteUUID);
    this.currentNotifyUUID = this.resolveNotifyUUID(map, this.currentNotifyUUID);
    await this.ble.subscribe(deviceId, this.currentNotifyUUID);
    this.addLog("info", `Subscribed notify ${this.currentNotifyUUID}`);
    this.addLog("info", `Selected writeUUID=${this.currentWriteUUID}`);

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
    this.currentWriteUUID = PROFILE.writeUUID;
    this.currentNotifyUUID = PROFILE.notifyUUID;
    this.gattMap = null;
    if (this.pendingAnyNotify) {
      clearTimeout(this.pendingAnyNotify.timer);
      this.pendingAnyNotify.reject(new Error("Disconnected."));
      this.pendingAnyNotify = null;
    }
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
    await this.ble.write(this.currentDeviceId, this.currentWriteUUID, normalized, writeType);
  }

  async sendRawHexAndWait(hex: string, writeType: WriteType, timeoutMs = 2000): Promise<string> {
    if (!this.currentDeviceId) {
      throw new Error("No active device.");
    }
    if (this.pendingAnyNotify) {
      throw new Error("Another raw waiting task is in progress.");
    }
    const normalized = normalizeHex(hex);
    if (!normalized) {
      throw new Error("HEX is empty.");
    }
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    const waiter = new Promise<string>((resolve, reject) => {
      timeoutHandle = setTimeout(() => {
        this.pendingAnyNotify = null;
        reject(new Error("Timeout waiting raw notify packet"));
      }, timeoutMs);
      this.pendingAnyNotify = { resolve, reject, timer: timeoutHandle };
    });
    this.addLog("tx", spacedHex(normalized));
    try {
      await this.ble.write(this.currentDeviceId, this.currentWriteUUID, normalized, writeType);
      return await waiter;
    } catch (error) {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
      this.pendingAnyNotify = null;
      throw error;
    }
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

  getSelectedChannels(): { writeUUID: string; notifyUUID: string } {
    return {
      writeUUID: this.currentWriteUUID,
      notifyUUID: this.currentNotifyUUID
    };
  }

  getChannelCandidates(): { writeUUIDs: string[]; notifyUUIDs: string[] } {
    if (!this.gattMap) {
      return { writeUUIDs: [], notifyUUIDs: [] };
    }
    return this.collectChannelCandidates(this.gattMap);
  }

  async applyChannelSelection(writeUUID: string, notifyUUID: string): Promise<void> {
    const nextWrite = writeUUID.toLowerCase();
    const nextNotify = notifyUUID.toLowerCase();
    if (!nextWrite || !nextNotify) {
      throw new Error("writeUUID and notifyUUID are required.");
    }
    this.currentWriteUUID = nextWrite;
    this.currentNotifyUUID = nextNotify;
    if (this.gattMap) {
      this.resolveWriteType(this.gattMap, this.currentWriteUUID);
    }
    if (this.currentDeviceId) {
      await this.ble.subscribe(this.currentDeviceId, this.currentNotifyUUID);
      this.addLog("info", `Subscribed notify ${this.currentNotifyUUID}`);
    }
    this.addLog("info", `Selected writeUUID=${this.currentWriteUUID}`);
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
    await this.ble.write(this.currentDeviceId, this.currentWriteUUID, payloadHex, this.currentWriteType);
    return waiter;
  }

  private handleIncoming(packetHex: string): void {
    const normalized = normalizeHex(packetHex);
    if (!normalized) {
      return;
    }
    this.addLog("rx", spacedHex(normalized));
    if (this.pendingAnyNotify) {
      clearTimeout(this.pendingAnyNotify.timer);
      const pendingAny = this.pendingAnyNotify;
      this.pendingAnyNotify = null;
      pendingAny.resolve(normalized);
    }
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

  private resolveWriteType(gattMap: GattMap, writeUUID: string): void {
    for (const service of gattMap.services) {
      for (const characteristic of service.characteristics) {
        if (characteristic.uuid.toLowerCase() !== writeUUID.toLowerCase()) {
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

  private resolveWriteUUID(gattMap: GattMap, preferred: string): string {
    const channels = this.collectChannelCandidates(gattMap);
    const preferredLower = preferred.toLowerCase();
    if (channels.writeUUIDs.includes(preferredLower)) {
      return preferredLower;
    }
    const profileDefault = PROFILE.writeUUID.toLowerCase();
    if (channels.writeUUIDs.includes(profileDefault)) {
      return profileDefault;
    }
    return channels.writeUUIDs[0] ?? profileDefault;
  }

  private resolveNotifyUUID(gattMap: GattMap, preferred: string): string {
    const channels = this.collectChannelCandidates(gattMap);
    const preferredLower = preferred.toLowerCase();
    if (channels.notifyUUIDs.includes(preferredLower)) {
      return preferredLower;
    }
    for (const candidate of PROFILE.notifyUUIDCandidates) {
      const candidateLower = candidate.toLowerCase();
      if (channels.notifyUUIDs.includes(candidateLower)) {
        return candidateLower;
      }
    }
    return channels.notifyUUIDs[0] ?? PROFILE.notifyUUID;
  }

  private canNotify(properties: string[]): boolean {
    return properties.includes("notify") || properties.includes("indicate");
  }

  private canWrite(properties: string[]): boolean {
    return properties.includes("write") || properties.includes("writeNoResponse");
  }

  private collectChannelCandidates(gattMap: GattMap): { writeUUIDs: string[]; notifyUUIDs: string[] } {
    const writeSet = new Set<string>();
    const notifySet = new Set<string>();
    for (const service of gattMap.services) {
      for (const characteristic of service.characteristics) {
        const uuid = characteristic.uuid.toLowerCase();
        if (this.canWrite(characteristic.properties)) {
          writeSet.add(uuid);
        }
        if (this.canNotify(characteristic.properties)) {
          notifySet.add(uuid);
        }
      }
    }
    return {
      writeUUIDs: Array.from(writeSet),
      notifyUUIDs: Array.from(notifySet)
    };
  }

  private attachListeners(): void {
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
  }

  private addGattMapLog(gattMap: GattMap): void {
    this.addLog("info", `GATT discovered services=${gattMap.services.length}`);
    for (const service of gattMap.services) {
      const chars = service.characteristics
        .map((item) => `${item.uuid}[${item.properties.join("/")}]`)
        .join(", ");
      this.addLog("info", `${service.uuid} -> ${chars}`);
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
