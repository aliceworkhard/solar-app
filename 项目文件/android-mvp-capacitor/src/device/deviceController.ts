import { BleBridge } from "../ble/bleBridge";
import { CommandBuilder } from "../protocol/commandBuilder";
import { FrameDecoder } from "../protocol/frameCodec";
import { parseResponse } from "../protocol/responseParser";
import { normalizeHex, spacedHex } from "../utils/hex";
import type {
  ConnectionState,
  DeviceBrief,
  DeviceStatus,
  GattMap,
  LogEntry,
  ScanStage,
  Unsubscribe
} from "../types";
import type { WriteType } from "../plugins/bleBridgePlugin";

const PROFILE = {
  namePrefix: "AC632N",
  serviceUUID: "0000fff0-0000-1000-8000-00805f9b34fb",
  writeUUID: "0000fff1-0000-1000-8000-00805f9b34fb",
  writeType: "write" as const,
  notifyUUID: "0000fff2-0000-1000-8000-00805f9b34fb",
  notifyUUIDCandidates: [
    "0000fff2-0000-1000-8000-00805f9b34fb",
    "0000fff3-0000-1000-8000-00805f9b34fb"
  ]
} as const;

const DEFAULT_SCAN_QUICK_WINDOW_MS = 1500;
const DEFAULT_SCAN_FULL_WINDOW_MS = 4200;
const DEFAULT_CONNECT_TIMEOUT_MS = 3200;
const DEFAULT_DISCOVER_TIMEOUT_MS = 1800;
const RECENT_DEVICE_KEY = "solar.remote.recentDeviceId";

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

export interface ScanOptions {
  quickWindowMs?: number;
  fullWindowMs?: number;
  allowFallbackNoPrefix?: boolean;
  onProgress?: (
    devices: DeviceBrief[],
    meta: { stage: ScanStage; completed: boolean; usedFallbackNoPrefix: boolean }
  ) => void;
}

export class DeviceController {
  private readonly ble = new BleBridge();
  private readonly frameDecoder = new FrameDecoder();
  private readonly stateListeners = new Set<(status: DeviceStatus) => void>();
  private readonly logListeners = new Set<(logs: LogEntry[]) => void>();
  private readonly pendingResponse = new Map<number, PendingResolver>();
  private notifyUnsubscribe: Unsubscribe | null = null;
  private connUnsubscribe: Unsubscribe | null = null;
  private scanProgressUnsubscribe: Unsubscribe | null = null;
  private commandChain: Promise<void> = Promise.resolve();
  private logs: LogEntry[] = [];
  private nextLogId = 1;
  private currentWriteType: WriteType = PROFILE.writeType;
  private currentWriteUUID: string = PROFILE.writeUUID;
  private currentNotifyUUID: string = PROFILE.notifyUUID;
  private currentDeviceId = "";
  private recentDeviceId = "";
  private gattMap: GattMap | null = null;
  private pendingAnyNotify: PendingAnyResolver | null = null;

  private status: DeviceStatus = {
    connected: false,
    connectionState: "idle",
    mode: "radar",
    power: 0,
    battery: 0,
    fwVersion: "unknown",
    lastUpdatedAt: Date.now()
  };

  constructor() {
    this.recentDeviceId = this.readRecentDeviceId();
  }

  async scan(options: ScanOptions = {}): Promise<DeviceBrief[]> {
    const quickWindowMs = options.quickWindowMs ?? DEFAULT_SCAN_QUICK_WINDOW_MS;
    const fullWindowMs = options.fullWindowMs ?? DEFAULT_SCAN_FULL_WINDOW_MS;
    const allowFallbackNoPrefix = options.allowFallbackNoPrefix ?? true;

    if (this.scanProgressUnsubscribe) {
      this.scanProgressUnsubscribe();
      this.scanProgressUnsubscribe = null;
    }

    if (options.onProgress) {
      this.scanProgressUnsubscribe = this.ble.onScanProgress((event) => {
        const sorted = this.sortDevices(event.devices);
        options.onProgress?.(sorted, {
          stage: event.stage,
          completed: event.completed,
          usedFallbackNoPrefix: event.usedFallbackNoPrefix
        });
        this.addLog(
          "info",
          `scanProgress stage=${event.stage} count=${sorted.length}${event.usedFallbackNoPrefix ? " fallback" : ""}${event.completed ? " done" : ""}`
        );
        if (event.completed && this.scanProgressUnsubscribe) {
          this.scanProgressUnsubscribe();
          this.scanProgressUnsubscribe = null;
        }
      });
    }

    this.mergeStatus({
      connectionState: "scanning",
      lastUpdatedAt: Date.now()
    });
    this.addLog(
      "info",
      `Start BLE scan quick=${quickWindowMs}ms full=${fullWindowMs}ms`
    );

    try {
      const devices = await this.ble.scan({
        namePrefix: PROFILE.namePrefix,
        quickWindowMs,
        fullWindowMs,
        allowFallbackNoPrefix
      });
      const sorted = this.sortDevices(devices);
      this.addLog("info", `Scan quick result count=${sorted.length}`);
      this.mergeStatus({ connectionState: "idle", lastUpdatedAt: Date.now() });
      return sorted;
    } catch (error) {
      this.mergeStatus({ connectionState: "error", lastUpdatedAt: Date.now() });
      throw error;
    }
  }

  async connectAndPrepare(deviceId: string): Promise<GattMap> {
    this.currentDeviceId = deviceId;
    this.addLog("info", `Connect ${deviceId}`);
    this.attachListeners();
    this.mergeStatus({
      connected: false,
      connectionState: "connecting",
      lastUpdatedAt: Date.now()
    });
    try {
      await this.ble.connect({
        deviceId,
        connectTimeoutMs: DEFAULT_CONNECT_TIMEOUT_MS,
        discoverTimeoutMs: DEFAULT_DISCOVER_TIMEOUT_MS
      });
      this.mergeStatus({ connectionState: "discovering", lastUpdatedAt: Date.now() });
      const map = await this.ble.discover(deviceId);
      this.gattMap = map;
      this.addGattMapLog(map);
      this.currentWriteUUID = this.resolveWriteUUID(map, this.currentWriteUUID);
      this.resolveWriteType(map, this.currentWriteUUID);
      this.currentNotifyUUID = this.resolveNotifyUUID(map, this.currentNotifyUUID);
      this.mergeStatus({ connectionState: "subscribing", lastUpdatedAt: Date.now() });
      await this.ble.subscribe(deviceId, this.currentNotifyUUID);
      this.addLog("info", `Subscribed notify ${this.currentNotifyUUID}`);
      this.addLog("info", `Selected writeUUID=${this.currentWriteUUID}`);
      this.recentDeviceId = deviceId;
      this.writeRecentDeviceId(deviceId);
      this.mergeStatus({
        connected: true,
        connectionState: "ready",
        lastUpdatedAt: Date.now()
      });
      return map;
    } catch (error) {
      this.mergeStatus({
        connected: false,
        connectionState: "error",
        lastUpdatedAt: Date.now()
      });
      throw error;
    }
  }

  async quickConnect(): Promise<boolean> {
    const targetDeviceId = this.recentDeviceId || this.readRecentDeviceId();
    if (!targetDeviceId) {
      this.addLog("warn", "No recent device for quick connect");
      return false;
    }
    try {
      await this.connectAndPrepare(targetDeviceId);
      this.addLog("info", `Quick connect success ${targetDeviceId}`);
      return true;
    } catch (error) {
      this.addLog("warn", `Quick connect failed ${targetDeviceId}: ${this.errorMessage(error)}`);
      return false;
    }
  }

  getRecentDeviceId(): string {
    return this.recentDeviceId;
  }

  async disconnect(): Promise<void> {
    if (!this.currentDeviceId) {
      return;
    }
    await this.ble.disconnect(this.currentDeviceId);
    this.mergeStatus({
      connected: false,
      connectionState: "disconnected",
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
    this.ensureReadyForTx();
    const normalized = normalizeHex(hex);
    if (!normalized) {
      throw new Error("HEX is empty.");
    }
    this.addLog("tx", spacedHex(normalized));
    await this.ble.write(this.currentDeviceId, this.currentWriteUUID, normalized, writeType);
  }

  async sendRawHexAndWait(hex: string, writeType: WriteType, timeoutMs = 2000): Promise<string> {
    this.ensureReadyForTx();
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
      this.mergeStatus({ connectionState: "subscribing", lastUpdatedAt: Date.now() });
      await this.ble.subscribe(this.currentDeviceId, this.currentNotifyUUID);
      this.mergeStatus({ connectionState: "ready", lastUpdatedAt: Date.now() });
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
      this.ensureReadyForTx();
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
    this.ensureReadyForTx();
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

  private ensureReadyForTx(): void {
    if (!this.currentDeviceId) {
      throw new Error("No active device.");
    }
    if (this.status.connectionState !== "ready") {
      throw new Error(`Device is not ready. currentState=${this.status.connectionState}`);
    }
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
    if (state === "error" || state === "disconnected") {
      this.mergeStatus({
        connected: false,
        connectionState: state,
        lastUpdatedAt: Date.now()
      });
      return;
    }
    if (state === "ready" || state === "connected") {
      this.mergeStatus({
        connected: true,
        connectionState: state === "connected" ? "ready" : state,
        lastUpdatedAt: Date.now()
      });
      return;
    }
    this.mergeStatus({
      connectionState: state,
      lastUpdatedAt: Date.now()
    });
  }

  private resolveWriteType(gattMap: GattMap, writeUUID: string): void {
    this.currentWriteType = PROFILE.writeType;
    for (const service of gattMap.services) {
      for (const characteristic of service.characteristics) {
        if (characteristic.uuid.toLowerCase() !== writeUUID.toLowerCase()) {
          continue;
        }
        if (!characteristic.properties.includes(PROFILE.writeType)) {
          this.addLog(
            "warn",
            `Profile writeType=${PROFILE.writeType} not advertised by ${writeUUID}, force using profile setting`
          );
        }
        this.addLog("info", `Locked writeType=${this.currentWriteType}`);
        return;
      }
    }
    this.addLog("warn", `Write characteristic ${writeUUID} not found, fallback to profile writeType=${this.currentWriteType}`);
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

  private sortDevices(devices: DeviceBrief[]): DeviceBrief[] {
    return [...devices].sort((left, right) => right.rssi - left.rssi);
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

  private readRecentDeviceId(): string {
    const storage = this.getStorage();
    if (!storage) {
      return "";
    }
    try {
      return storage.getItem(RECENT_DEVICE_KEY) ?? "";
    } catch {
      return "";
    }
  }

  private writeRecentDeviceId(deviceId: string): void {
    const storage = this.getStorage();
    if (!storage) {
      return;
    }
    try {
      storage.setItem(RECENT_DEVICE_KEY, deviceId);
    } catch {
      // Ignore storage failures and keep in-memory fallback only.
    }
  }

  private getStorage(): Storage | null {
    if (typeof globalThis === "undefined" || !("localStorage" in globalThis)) {
      return null;
    }
    return globalThis.localStorage;
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
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
