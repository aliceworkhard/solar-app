import { DeviceController } from "./device/deviceController";
import { spacedHex } from "./utils/hex";
import type { DeviceBrief, DeviceStatus, LogEntry } from "./types";

type ViewName = "home" | "control";
type FeedbackTone = "idle" | "pending" | "success" | "error";
type BusinessCommandAction =
  | "readStatus"
  | "readParams"
  | "powerToggle"
  | "brightnessUp"
  | "brightnessDown";

export interface BusinessCommand {
  id: string;
  label: string;
  description: string;
  action: BusinessCommandAction;
}

export const BUSINESS_COMMANDS: BusinessCommand[] = [
  {
    id: "readStatusBtn",
    label: "读状态",
    description: "状态协议 0xE1",
    action: "readStatus"
  },
  {
    id: "readParamsBtn",
    label: "读参数",
    description: "参数下载 0xB1",
    action: "readParams"
  },
  {
    id: "powerToggleBtn",
    label: "开/关",
    description: "RF 控制 0x0A",
    action: "powerToggle"
  },
  {
    id: "brightnessUpBtn",
    label: "增加亮度",
    description: "RF 控制 0x0B",
    action: "brightnessUp"
  },
  {
    id: "brightnessDownBtn",
    label: "降低亮度",
    description: "RF 控制 0x0C",
    action: "brightnessDown"
  }
];

export function isControlReady(status: DeviceStatus): boolean {
  return status.connectionState === "ready";
}

export const DISCOVERY_INTERVAL_MS = 5000;
export const DEVICE_STALE_AFTER_MS = 30000;
export const DEVICE_FORGET_AFTER_MS = 60000;

export interface DiscoveredDeviceRecord extends DeviceBrief {
  firstSeenAt: number;
  lastSeenAt: number;
  scanRound: number;
  isConnected: boolean;
  isStale: boolean;
  usedFallback: boolean;
}

export interface DiscoveryMergeContext {
  activeDeviceId: string;
  now: number;
  scanRound: number;
  usedFallback: boolean;
}

export function mergeDiscoveryDevices(
  currentDevices: DiscoveredDeviceRecord[],
  incomingDevices: DeviceBrief[],
  context: DiscoveryMergeContext
): DiscoveredDeviceRecord[] {
  const byId = new Map<string, DiscoveredDeviceRecord>();
  const activeDeviceId = context.activeDeviceId.toLowerCase();

  for (const current of currentDevices) {
    const isConnected = current.deviceId.toLowerCase() === activeDeviceId;
    const ageMs = context.now - current.lastSeenAt;
    if (!isConnected && ageMs > DEVICE_FORGET_AFTER_MS) {
      continue;
    }
    byId.set(current.deviceId, {
      ...current,
      isConnected,
      isStale: !isConnected && ageMs > DEVICE_STALE_AFTER_MS
    });
  }

  for (const incoming of incomingDevices) {
    const previous = byId.get(incoming.deviceId);
    const isConnected = incoming.deviceId.toLowerCase() === activeDeviceId;
    byId.set(incoming.deviceId, {
      deviceId: incoming.deviceId,
      name: incoming.name || previous?.name || "Unknown",
      rssi: incoming.rssi,
      firstSeenAt: previous?.firstSeenAt ?? context.now,
      lastSeenAt: context.now,
      scanRound: context.scanRound,
      isConnected,
      isStale: false,
      usedFallback: context.usedFallback
    });
  }

  return Array.from(byId.values()).sort((left, right) => {
    if (left.isConnected !== right.isConnected) {
      return left.isConnected ? -1 : 1;
    }
    if (left.isStale !== right.isStale) {
      return left.isStale ? 1 : -1;
    }
    if (left.rssi !== right.rssi) {
      return right.rssi - left.rssi;
    }
    return right.lastSeenAt - left.lastSeenAt;
  });
}

export class App {
  private readonly root: HTMLElement;
  private readonly controller: DeviceController;
  private devices: DiscoveredDeviceRecord[] = [];
  private status: DeviceStatus;
  private logs: LogEntry[] = [];
  private activeDeviceId = "";
  private view: ViewName = "home";
  private hiddenTapCount = 0;
  private debugVisible = false;
  private discoveryActive = false;
  private discoveryScanInFlight = false;
  private discoveryTimer: ReturnType<typeof setTimeout> | null = null;
  private discoveryRound = 0;

  constructor(root: HTMLElement, controller: DeviceController) {
    this.root = root;
    this.controller = controller;
    this.status = controller.getStatus();
    this.logs = controller.getLogs();
  }

  start(): void {
    this.render();
    this.controller.onStatusChange((status) => {
      this.status = status;
      this.refreshStatus();
    });
    this.controller.onLogChange((logs) => {
      this.logs = logs;
      this.refreshLogs();
    });
  }

  private render(): void {
    this.root.innerHTML = `
      <div class="shell">
        <header class="shell-header">
          <div class="brand" id="brandTrigger">
            <div class="brand-kicker">Solar Remote</div>
            <h1>太阳能遥控器</h1>
          </div>
          <div class="conn-badge" id="connBadge">未连接</div>
        </header>
        <div class="feedback-bar" id="feedbackBar" role="status" aria-live="polite">等待操作</div>

        <main>
          <section class="panel ${this.view === "home" ? "active" : ""}" id="homePanel">
            <div class="visual-strip">
              <img src="/assets/ui/01_device_home_page.png" alt="home reference" />
            </div>
            <div class="toolbar">
              <button class="btn primary icon" id="scanBtn" title="持续发现设备">扫描设备</button>
              <button class="btn ghost" id="quickConnectBtn" title="快速连接">快连最近</button>
              <button class="btn ghost" id="disconnectBtn" title="断开连接">断开</button>
            </div>
            <div class="chip stage-chip" id="connStageChip">连接阶段：idle</div>
            <div class="device-list" id="deviceList"></div>
            <div class="quick-grid">
              <div class="kv"><span>模式</span><strong id="modeValue">-</strong></div>
              <div class="kv"><span>功率</span><strong id="powerValue">-</strong></div>
              <div class="kv"><span>电池</span><strong id="batteryValue">-</strong></div>
              <div class="kv"><span>固件</span><strong id="fwValue">-</strong></div>
            </div>
            <button class="btn primary wide" id="enterControlBtn" disabled>进入控制页</button>
          </section>

          <section class="panel ${this.view === "control" ? "active" : ""}" id="controlPanel">
            <div class="visual-strip">
              <img src="/assets/ui/02_device_detail_control_page.png" alt="control reference" />
            </div>
            <div class="toolbar">
              <button class="btn ghost" id="backBtn">返回</button>
              <div class="chip">写入方式：<span id="writeTypeValue">-</span></div>
            </div>

            <div class="control-stack">
              <div class="status-slab">
                <div><span>当前模式</span><strong id="controlModeValue">-</strong></div>
                <div><span>当前功率</span><strong id="controlPowerValue">-</strong></div>
                <div><span>电池</span><strong id="controlBatteryValue">-</strong></div>
              </div>

              <div class="seg" id="modeSeg">
                <button data-mode="radar" class="seg-btn">雷达</button>
                <button data-mode="time" class="seg-btn">时控</button>
                <button data-mode="average" class="seg-btn">平均</button>
              </div>

              <div class="range-wrap">
                <label for="powerSlider">功率参数</label>
                <input id="powerSlider" type="range" min="0" max="100" value="30" />
                <div class="range-value"><span id="powerSliderValue">30%</span></div>
              </div>

              <div class="command-grid">
                ${BUSINESS_COMMANDS.map(
                  (command) => `
                    <button class="btn command-btn" id="${command.id}" data-action="${command.action}">
                      <span>${command.label}</span>
                      <small>${command.description}</small>
                    </button>
                  `
                ).join("")}
              </div>
              <div class="result result-live" id="resultArea">等待操作</div>
            </div>
          </section>

          <section class="panel debug ${this.debugVisible ? "active" : ""}" id="debugPanel">
            <div class="toolbar">
              <div class="chip">调试控制台</div>
              <button class="btn ghost" id="debugCloseBtn">关闭</button>
            </div>
            <div class="uuid-row">
              <select id="uuidWriteSelect"></select>
              <select id="uuidNotifySelect"></select>
              <button class="btn" id="uuidApplyBtn">应用UUID</button>
            </div>
            <div class="raw-row">
              <input id="rawHexInput" type="text" placeholder="AA5502010000" />
              <select id="rawWriteType">
                <option value="write">write</option>
              </select>
              <button class="btn" id="rawSendBtn">发送HEX</button>
            </div>
            <pre id="logArea"></pre>
          </section>
        </main>
      </div>
    `;

    this.bindEvents();
    this.refreshStatus();
    this.refreshDeviceList();
    this.refreshLogs();
    this.refreshUuidSelectors();
    this.refreshScanControls();
  }

  private bindEvents(): void {
    this.byId("scanBtn").addEventListener("click", () => {
      void this.toggleContinuousDiscovery();
    });
    this.byId("quickConnectBtn").addEventListener("click", () => {
      void this.quickConnectPreferred();
    });
    this.byId("disconnectBtn").addEventListener("click", () => {
      void this.disconnectDevice();
    });
    this.byId("enterControlBtn").addEventListener("click", () => {
      this.stopContinuousDiscovery("已进入控制页，持续发现已暂停");
      this.view = "control";
      this.render();
    });
    this.byId("backBtn").addEventListener("click", () => {
      this.view = "home";
      this.render();
    });
    for (const command of BUSINESS_COMMANDS) {
      this.byId(command.id).addEventListener("click", () => {
        void this.handleAction(command, () => this.controller[command.action]());
      });
    }
    this.byId("brandTrigger").addEventListener("click", () => this.toggleDebugByTap());
    this.byId("debugCloseBtn").addEventListener("click", () => {
      this.debugVisible = false;
      this.render();
    });
    this.byId("uuidApplyBtn").addEventListener("click", () => {
      void this.handleApplyUuid();
    });
    this.byId("rawSendBtn").addEventListener("click", () => void this.handleRawSend());

    const slider = this.byId("powerSlider") as HTMLInputElement;
    const sliderValue = this.byId("powerSliderValue");
    slider.addEventListener("input", () => {
      sliderValue.textContent = `${slider.value}%`;
    });

    const modeButtons = this.root.querySelectorAll<HTMLButtonElement>("#modeSeg .seg-btn");
    modeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        modeButtons.forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
      });
      if (button.dataset.mode === this.status.mode) {
        button.classList.add("active");
      }
    });
  }

  private async toggleContinuousDiscovery(): Promise<void> {
    if (this.discoveryActive) {
      this.stopContinuousDiscovery("已停止持续发现");
      return;
    }
    this.discoveryActive = true;
    this.discoveryRound = 0;
    this.refreshScanControls();
    await this.runDiscoveryRound();
  }

  private stopContinuousDiscovery(message?: string): void {
    this.discoveryActive = false;
    if (this.discoveryTimer) {
      clearTimeout(this.discoveryTimer);
      this.discoveryTimer = null;
    }
    this.refreshScanControls();
    if (message) {
      this.setResult(message, "idle");
    }
  }

  private async runDiscoveryRound(): Promise<void> {
    if (!this.discoveryActive || this.discoveryScanInFlight) {
      return;
    }
    if (this.shouldPauseDiscoveryRound()) {
      this.setResult("BLE 操作中，下一轮持续发现已顺延", "pending");
      this.scheduleNextDiscoveryRound();
      return;
    }

    this.discoveryScanInFlight = true;
    this.discoveryRound += 1;
    const round = this.discoveryRound;
    let roundUsedFallback = false;
    this.refreshScanControls();

    try {
      this.setResult(`持续发现第 ${round} 轮...`, "pending");
      this.refreshDeviceList();
      const result = await this.controller.scan({
        quickWindowMs: 1500,
        fullWindowMs: 4200,
        allowFallbackNoPrefix: true,
        onProgress: (devices, meta) => {
          roundUsedFallback = meta.usedFallbackNoPrefix;
          this.devices = mergeDiscoveryDevices(this.devices, devices, {
            activeDeviceId: this.activeDeviceId,
            now: Date.now(),
            scanRound: round,
            usedFallback: roundUsedFallback
          });
          this.refreshDeviceList();
          if (meta.completed) {
            this.setResult(
              `第 ${round} 轮完成：当前列表 ${this.devices.length} 台${meta.usedFallbackNoPrefix ? "（已触发无前缀补扫）" : ""}`,
              "success"
            );
          }
        }
      });
      this.devices = mergeDiscoveryDevices(this.devices, result, {
        activeDeviceId: this.activeDeviceId,
        now: Date.now(),
        scanRound: round,
        usedFallback: roundUsedFallback
      });
      this.refreshDeviceList();
      this.setResult(`第 ${round} 轮完成：当前列表 ${this.devices.length} 台`, "success");
    } catch (error) {
      this.setResult(`持续发现失败：${this.errorMessage(error)}`, "error");
    } finally {
      this.discoveryScanInFlight = false;
      this.refreshScanControls();
      this.scheduleNextDiscoveryRound();
    }
  }

  private scheduleNextDiscoveryRound(): void {
    if (!this.discoveryActive) {
      return;
    }
    if (this.discoveryTimer) {
      clearTimeout(this.discoveryTimer);
    }
    this.discoveryTimer = setTimeout(() => {
      this.discoveryTimer = null;
      void this.runDiscoveryRound();
    }, DISCOVERY_INTERVAL_MS);
  }

  private shouldPauseDiscoveryRound(): boolean {
    return ["connecting", "discovering", "subscribing"].includes(this.status.connectionState);
  }

  private async quickConnectPreferred(): Promise<void> {
    try {
      this.setResult("正在尝试快速连接最近设备...", "pending");
      const quickConnected = await this.controller.quickConnect();
      if (quickConnected) {
        this.activeDeviceId = this.controller.getRecentDeviceId();
        this.devices = mergeDiscoveryDevices(this.devices, [], {
          activeDeviceId: this.activeDeviceId,
          now: Date.now(),
          scanRound: this.discoveryRound,
          usedFallback: false
        });
        this.setResult("快速连接成功", "success");
        this.refreshStatus();
        this.refreshDeviceList();
        this.refreshUuidSelectors();
        return;
      }

      this.setResult("快连失败，自动扫描并连接信号最强设备...", "pending");
      const devices = await this.controller.scan({
        quickWindowMs: 1500,
        fullWindowMs: 4200,
        allowFallbackNoPrefix: true,
        onProgress: (devices) => {
          this.devices = mergeDiscoveryDevices(this.devices, devices, {
            activeDeviceId: this.activeDeviceId,
            now: Date.now(),
            scanRound: this.discoveryRound,
            usedFallback: false
          });
          this.refreshDeviceList();
        }
      });
      this.devices = mergeDiscoveryDevices(this.devices, devices, {
        activeDeviceId: this.activeDeviceId,
        now: Date.now(),
        scanRound: this.discoveryRound,
        usedFallback: false
      });
      this.refreshDeviceList();
      const strongest = this.devices.find((item) => !item.isStale) ?? this.devices[0];
      if (!strongest) {
        this.setResult("未发现可连接设备", "error");
        return;
      }
      await this.connectDevice(strongest);
    } catch (error) {
      this.setResult(`快连失败：${this.errorMessage(error)}`, "error");
    }
  }

  private async connectDevice(device: DeviceBrief): Promise<void> {
    try {
      this.activeDeviceId = device.deviceId;
      this.devices = mergeDiscoveryDevices(this.devices, [], {
        activeDeviceId: this.activeDeviceId,
        now: Date.now(),
        scanRound: this.discoveryRound,
        usedFallback: false
      });
      this.refreshDeviceList();
      this.setResult(`连接 ${device.name}...`, "pending");
      await this.controller.connectAndPrepare(device.deviceId);
      this.setResult("连接成功并已订阅通知", "success");
      this.refreshStatus();
      this.refreshUuidSelectors();
    } catch (error) {
      this.activeDeviceId = "";
      this.setResult(`连接失败：${this.errorMessage(error)}`, "error");
      this.refreshDeviceList();
    }
  }

  private async disconnectDevice(): Promise<void> {
    try {
      await this.controller.disconnect();
      this.activeDeviceId = "";
      this.setResult("已断开连接", "success");
      this.refreshStatus();
      this.refreshDeviceList();
      this.refreshUuidSelectors();
    } catch (error) {
      this.setResult(`断开失败：${this.errorMessage(error)}`, "error");
    }
  }

  private async handleApplyUuid(): Promise<void> {
    const writeUUID = (this.byId("uuidWriteSelect") as HTMLSelectElement).value;
    const notifyUUID = (this.byId("uuidNotifySelect") as HTMLSelectElement).value;
    try {
      await this.controller.applyChannelSelection(writeUUID, notifyUUID);
      this.refreshStatus();
      this.refreshUuidSelectors();
      this.setResult(`UUID已应用 write=${writeUUID} notify=${notifyUUID}`, "success");
    } catch (error) {
      this.setResult(`应用UUID失败：${this.errorMessage(error)}`, "error");
    }
  }

  private async handleAction(command: BusinessCommand, action: () => Promise<string>): Promise<void> {
    try {
      this.setResult(`${command.label}发送中...`, "pending");
      const message = await action();
      this.setResult(`${command.label}已发送：${message}`, "success");
    } catch (error) {
      this.setResult(`${command.label}失败：${this.errorMessage(error)}`, "error");
    }
  }

  private async handleRawSend(): Promise<void> {
    const hexInput = this.byId("rawHexInput") as HTMLInputElement;
    const writeType = (this.byId("rawWriteType") as HTMLSelectElement).value as "write" | "writeNoResponse";
    try {
      await this.controller.sendRawHex(hexInput.value, writeType);
      this.setResult(`RAW已发送 TX=${spacedHex(hexInput.value)}（不等待BLE回包）`, "success");
    } catch (error) {
      this.setResult(`RAW发送失败：${this.errorMessage(error)}`, "error");
    }
  }

  private refreshDeviceList(): void {
    const list = this.byId("deviceList");
    if (!this.devices.length) {
      list.innerHTML = `<div class="device-empty">暂无设备，点击扫描设备开始持续发现</div>`;
      return;
    }
    this.devices = mergeDiscoveryDevices(this.devices, [], {
      activeDeviceId: this.activeDeviceId,
      now: Date.now(),
      scanRound: this.discoveryRound,
      usedFallback: false
    });
    list.innerHTML = this.devices
      .map(
        (device, index) => `
        <button class="device-item ${index === 0 ? "best" : ""} ${device.isConnected ? "connected" : ""} ${device.isStale ? "stale" : ""}" data-device-id="${device.deviceId}">
          <div class="device-name">
            <span>${device.name}</span>
            ${device.isConnected ? `<em>已连接</em>` : device.isStale ? `<em>最近见过</em>` : ""}
          </div>
          <div class="device-sub">
            MAC ${this.shortDeviceId(device.deviceId)} · RSSI ${device.rssi} dBm · 第 ${device.scanRound} 轮${index === 0 ? " · strongest" : ""}${device.usedFallback ? " · fallback" : ""}
          </div>
        </button>
      `
      )
      .join("");
    list.querySelectorAll<HTMLButtonElement>(".device-item").forEach((button) => {
      button.addEventListener("click", () => {
        const target = this.devices.find((item) => item.deviceId === button.dataset.deviceId);
        if (target) {
          void this.connectDevice(target);
        }
      });
    });
  }

  private refreshStatus(): void {
    if (!this.root.childElementCount) {
      return;
    }
    const ready = isControlReady(this.status);
    this.byId("connBadge").textContent = this.status.connected
      ? `已连接 (${this.status.connectionState})`
      : `状态: ${this.status.connectionState}`;
    this.byId("connBadge").classList.toggle("online", this.status.connected);
    this.byId("connStageChip").textContent = `连接阶段：${this.status.connectionState}`;
    this.byId("modeValue").textContent = this.status.mode;
    this.byId("powerValue").textContent = `${this.status.power}%`;
    this.byId("batteryValue").textContent = this.status.battery == null ? "-" : `${this.status.battery}%`;
    this.byId("fwValue").textContent = this.status.fwVersion || "-";
    this.byId("controlModeValue").textContent = this.status.mode;
    this.byId("controlPowerValue").textContent = `${this.status.power}%`;
    this.byId("controlBatteryValue").textContent = this.status.battery == null ? "-" : `${this.status.battery}%`;
    this.byId("writeTypeValue").textContent = this.controller.getWriteType();
    const modeButtons = this.root.querySelectorAll<HTMLButtonElement>("#modeSeg .seg-btn");
    modeButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.mode === this.status.mode);
    });
    const enterControlBtn = this.byId("enterControlBtn") as HTMLButtonElement;
    enterControlBtn.disabled = !ready;
    const controlButtons = [...BUSINESS_COMMANDS.map((command) => command.id), "rawSendBtn"];
    for (const id of controlButtons) {
      (this.byId(id) as HTMLButtonElement).disabled = !ready;
    }
    this.refreshScanControls();
  }

  private refreshLogs(): void {
    if (!this.root.childElementCount) {
      return;
    }
    const logArea = this.byId("logArea");
    const content = this.logs
      .slice(-120)
      .map((item) => {
        const time = new Date(item.time).toLocaleTimeString("zh-CN", { hour12: false });
        return `[${time}] [${item.level}] ${item.message}`;
      })
      .join("\n");
    logArea.textContent = content || "暂无日志";
    logArea.scrollTop = logArea.scrollHeight;
  }

  private refreshUuidSelectors(): void {
    if (!this.root.childElementCount) {
      return;
    }
    const writeSelect = this.byId("uuidWriteSelect") as HTMLSelectElement;
    const notifySelect = this.byId("uuidNotifySelect") as HTMLSelectElement;
    const applyBtn = this.byId("uuidApplyBtn") as HTMLButtonElement;
    const candidates = this.controller.getChannelCandidates();
    const selected = this.controller.getSelectedChannels();

    this.renderUuidOptions(writeSelect, candidates.writeUUIDs, selected.writeUUID);
    this.renderUuidOptions(notifySelect, candidates.notifyUUIDs, selected.notifyUUID);

    applyBtn.disabled = !this.status.connected || !candidates.writeUUIDs.length || !candidates.notifyUUIDs.length;
    (this.byId("quickConnectBtn") as HTMLButtonElement).disabled = this.status.connectionState === "connecting";
  }

  private refreshScanControls(): void {
    if (!this.root.childElementCount) {
      return;
    }
    const scanBtn = this.byId("scanBtn") as HTMLButtonElement;
    scanBtn.textContent = this.discoveryActive ? "停止扫描" : "扫描设备";
    scanBtn.title = this.discoveryActive ? "停止持续发现" : "持续发现设备";
    scanBtn.classList.toggle("danger", this.discoveryActive);
    scanBtn.disabled = this.discoveryScanInFlight && !this.discoveryActive;
  }

  private renderUuidOptions(
    select: HTMLSelectElement,
    values: string[],
    selectedValue: string
  ): void {
    const normalizedSelected = selectedValue.toLowerCase();
    const options = values.length
      ? values
      : ["(请先连接设备并发现服务)"];
    select.innerHTML = options
      .map((item) => `<option value="${item}">${item}</option>`)
      .join("");
    if (values.length && values.includes(normalizedSelected)) {
      select.value = normalizedSelected;
      return;
    }
    select.value = options[0];
  }

  private setResult(message: string, tone: FeedbackTone = "idle"): void {
    if (!this.root.childElementCount) {
      return;
    }
    const resultNodes = this.root.querySelectorAll<HTMLElement>("#feedbackBar, .result-live");
    resultNodes.forEach((node) => {
      node.textContent = message;
      node.dataset.tone = tone;
    });
  }

  private toggleDebugByTap(): void {
    this.hiddenTapCount += 1;
    if (this.hiddenTapCount < 5) {
      return;
    }
    this.hiddenTapCount = 0;
    this.debugVisible = !this.debugVisible;
    this.render();
  }

  private byId(id: string): HTMLElement {
    const element = this.root.querySelector<HTMLElement>(`#${id}`);
    if (!element) {
      throw new Error(`Element #${id} not found.`);
    }
    return element;
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  private shortDeviceId(deviceId: string): string {
    const normalized = deviceId.replace(/[^0-9a-fA-F]/g, "").toUpperCase();
    if (normalized.length >= 6) {
      return normalized.slice(-6);
    }
    return deviceId;
  }
}
