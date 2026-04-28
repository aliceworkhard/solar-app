import { DeviceController } from "./device/deviceController";
import { spacedHex } from "./utils/hex";
import type { DeviceBrief, DeviceStatus, LogEntry } from "./types";

type ViewName = "home" | "control";
type BackNavigationResult = "home" | "exit";
type NativeBackAction = "handled" | "exit";
type FeedbackTone = "idle" | "pending" | "success" | "error";
type BusinessCommandAction =
  | "readStatus"
  | "readParams"
  | "powerToggle"
  | "brightnessUp"
  | "brightnessDown";

declare global {
  interface Window {
    solarRemoteHandleNativeBack?: () => NativeBackAction;
  }
}

export interface BusinessCommand {
  id: string;
  label: string;
  description: string;
  action: BusinessCommandAction;
}

export interface LiveStatusModel {
  caption: string;
  modeLabel: string;
  modeRaw: string;
  batteryType: string;
  batteryLevel: string;
  workTime: string;
  morningTime: string;
  lightsOffTime: string;
  brightness: string;
  batteryVoltage: string;
  loadCurrent: string;
}

export interface NearbyDeviceMetrics {
  mode: string;
  batteryVoltage: string;
  solarVoltage: string;
  power: string;
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

export const DEVICE_ASSET_SRC = "/assets/ui/mppt_gray_black_controller_transparent.png";
export const TARGET_DEVICE_NAME = "AC632N_1";
export const REFERENCE_UI_COPY = {
  homeTitle: "设备",
  homeSubtitle: "连接并管理您的 MPPT 设备",
  scanIdle: "准备搜索附近设备",
  scanSearching: "正在搜索附近设备...",
  scanHint: "请确保设备已通电并开启蓝牙",
  nearbySectionTitle: "附近设备",
  controlTabs: ["设备状态", "控制面板"],
  commandPanelTitle: "控制面板"
} as const;
export const REFERENCE_UI_CHROME = {
  showMockStatusBar: false,
  showControlMoreMenu: false,
  showDefaultFeedbackCard: false
} as const;

export function shouldRefreshEnterControl(_status: DeviceStatus): boolean {
  return false;
}

export function resolveBackNavigation(view: ViewName): BackNavigationResult {
  return view === "control" ? "home" : "exit";
}

export function resolveNativeBackAction(view: ViewName): NativeBackAction {
  return view === "control" ? "handled" : "exit";
}

export function isControlReady(status: DeviceStatus): boolean {
  return status.connectionState === "ready";
}

export function filterSupportedDevices<T extends DeviceBrief>(devices: T[]): T[] {
  return devices.filter((device) => device.name.trim() === TARGET_DEVICE_NAME);
}

export function shouldOpenControlForConnectedDevice(
  deviceId: string,
  activeDeviceId: string,
  status: DeviceStatus
): boolean {
  return (
    isControlReady(status) &&
    status.connected &&
    Boolean(activeDeviceId) &&
    deviceId.toLowerCase() === activeDeviceId.toLowerCase()
  );
}

export function shouldAutoConnectSupportedDevice(
  devices: DeviceBrief[],
  status: DeviceStatus,
  autoConnectInFlight: boolean
): boolean {
  return (
    !autoConnectInFlight &&
    !status.connected &&
    !["connecting", "discovering", "subscribing"].includes(status.connectionState) &&
    filterSupportedDevices(devices).length > 0
  );
}

function formatFixedUnit(value: number | undefined, digits: number, unit: string): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-";
  }
  return `${value.toFixed(digits)}${unit}`;
}

function formatModeLabel(mode: string): string {
  if (mode === "radar") {
    return "雷达";
  }
  if (mode === "time") {
    return "时控";
  }
  if (mode === "average") {
    return "平均";
  }
  return mode || "-";
}

export function createLiveStatusModel(status: DeviceStatus): LiveStatusModel {
  return {
    caption: "LIVE STATUS",
    modeLabel: formatModeLabel(status.mode),
    modeRaw: status.mode || "-",
    batteryType: "磷酸铁锂",
    batteryLevel: "-",
    workTime: formatWorkMinutes(status),
    morningTime: "-",
    lightsOffTime: "-",
    brightness: `${status.power}%`,
    batteryVoltage: formatBatteryVoltage(status),
    loadCurrent: formatLoadCurrent(status)
  };
}

export function createNearbyDeviceMetrics(
  deviceId: string,
  activeDeviceId: string,
  status: DeviceStatus
): NearbyDeviceMetrics {
  const isActive = Boolean(activeDeviceId) && deviceId.toLowerCase() === activeDeviceId.toLowerCase();
  if (!isActive || !status.connected) {
    return {
      mode: "-",
      batteryVoltage: "-",
      solarVoltage: "-",
      power: "-"
    };
  }
  return {
    mode: status.mode || "-",
    batteryVoltage: formatBatteryVoltage(status),
    solarVoltage: formatSolarVoltage(status),
    power: `${status.power}%`
  };
}

export function formatWorkMinutes(status: DeviceStatus): string {
  const minutes = status.workMinutes;
  if (typeof minutes !== "number" || !Number.isFinite(minutes)) {
    return "-";
  }
  if (minutes < 60) {
    return `${minutes}min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
}

export function formatBatteryVoltage(status: DeviceStatus): string {
  return formatFixedUnit(status.batteryVoltage, 2, "V");
}

export function formatLoadCurrent(status: DeviceStatus): string {
  return formatFixedUnit(status.loadCurrentAmp, 2, "A");
}

export function formatSolarVoltage(status: DeviceStatus): string {
  return formatFixedUnit(status.solarVoltage, 1, "V");
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
  private autoConnectInFlight = false;
  private historyInstalled = false;
  private discoveryTimer: ReturnType<typeof setTimeout> | null = null;
  private discoveryRound = 0;

  constructor(root: HTMLElement, controller: DeviceController) {
    this.root = root;
    this.controller = controller;
    this.status = controller.getStatus();
    this.logs = controller.getLogs();
  }

  start(): void {
    this.installBackNavigation();
    this.render();
    this.controller.onStatusChange((status) => {
      this.status = status;
      this.refreshStatus();
      this.refreshDeviceList();
    });
    this.controller.onLogChange((logs) => {
      this.logs = logs;
      this.refreshLogs();
    });
  }

  private render(): void {
    const isControlView = this.view === "control";
    const activeDeviceName = this.activeDeviceName();
    const liveStatus = createLiveStatusModel(this.status);
    this.root.innerHTML = `
      <div class="shell ${isControlView ? "view-control" : "view-home"}">
        <header class="app-header ${isControlView ? "detail" : "home"}">
          <button class="back-link ${isControlView ? "visible" : ""}" id="backBtn" type="button" aria-label="返回">‹</button>
          <div class="page-title" id="brandTrigger">
            <h1>${isControlView ? activeDeviceName : REFERENCE_UI_COPY.homeTitle}</h1>
            <p>${isControlView ? "设备状态与控制" : REFERENCE_UI_COPY.homeSubtitle}</p>
          </div>
          <div class="top-actions">
            <div class="conn-badge" id="connBadge">未连接</div>
            <button class="scan-fab ${isControlView ? "hidden" : ""}" id="scanBtn" title="持续发现设备" type="button">+</button>
          </div>
        </header>

        <main>
          <section class="panel home-panel ${this.view === "home" ? "active" : ""}" id="homePanel">
            <article class="scan-card">
              <div class="bluetooth-mark">⌁</div>
              <div>
                <strong id="scanStateTitle">${REFERENCE_UI_COPY.scanIdle}</strong>
                <span id="scanStateSub">${REFERENCE_UI_COPY.scanHint}</span>
              </div>
              <div class="scan-orbit" aria-hidden="true"></div>
            </article>
            <div class="inline-feedback" id="homeFeedback" role="status" aria-live="polite" hidden></div>

            <div class="section-row device-section-title">
              <h2>${REFERENCE_UI_COPY.nearbySectionTitle}</h2>
              <button class="text-action" id="quickConnectBtn" type="button"><span aria-hidden="true">↻</span> 刷新</button>
            </div>
            <div class="chip stage-chip" id="connStageChip">连接阶段：idle</div>
            <div class="device-list" id="deviceList"></div>

            <article class="home-summary-card">
              <div class="summary-head">
                <div>
                  <span class="summary-label">当前设备</span>
                  <strong id="homeConnectedName">${activeDeviceName}</strong>
                </div>
                <div class="summary-pills">
                  <span id="homeSummaryStatus">等待连接</span>
                  <span id="fwValue">-</span>
                </div>
              </div>
              <div class="summary-device">
                <img src="${DEVICE_ASSET_SRC}" alt="MPPT 控制器" />
                <div class="summary-device-copy">
                    <span>目标设备</span>
                  <strong>${TARGET_DEVICE_NAME}</strong>
                  <p>当前仅显示验证设备，避免误连。</p>
                </div>
              </div>
              <div class="quick-grid">
                <div class="kv"><span>已开灯时间</span><strong id="workTimeValue">-</strong></div>
                <div class="kv"><span>感应模式</span><strong id="modeValue">-</strong></div>
                <div class="kv"><span>亮度</span><strong id="powerValue">-</strong></div>
                <div class="kv"><span>电池电压</span><strong id="batteryValue">-</strong></div>
                <div class="kv"><span>负载电流</span><strong id="loadCurrentValue">-</strong></div>
                <div class="kv"><span>太阳能电压</span><strong id="solarVoltageValue">-</strong></div>
              </div>
              <div class="summary-actions">
                <button class="btn primary wide" id="enterControlBtn" disabled>进入控制页</button>
                <button class="btn ghost wide" id="disconnectBtn" title="断开连接">断开</button>
              </div>
            </article>
          </section>

          <section class="panel control-panel ${this.view === "control" ? "active" : ""}" id="controlPanel">
            <div class="detail-tabs" aria-label="页面分组">
              <span class="active">${REFERENCE_UI_COPY.controlTabs[0]}</span>
              <span>${REFERENCE_UI_COPY.controlTabs[1]}</span>
            </div>
            <div class="control-stack">
              <article class="detail-device-card live-status-card">
                <div class="live-status-top">
                  <div class="live-status-main">
                    <div class="live-status-caption-row">
                      <span class="live-status-dot" aria-hidden="true"></span>
                      <p id="liveStatusCaption">${liveStatus.caption}</p>
                    </div>
                    <strong id="controlModeValue" class="live-status-title">${liveStatus.modeLabel}</strong>
                    <p class="live-status-label">
                      电池类型 <b id="liveBatteryTypeValue">${liveStatus.batteryType}</b>
                    </p>
                    <p class="live-status-device">
                      <span id="detailTitleValue">${activeDeviceName}</span>
                      <span id="detailSerialValue">${this.activeDeviceSerial()}</span>
                    </p>
                  </div>
                  <div class="live-status-side">
                    <span class="live-status-pill">电池剩余 <b id="liveBatteryLevelValue">${liveStatus.batteryLevel}</b></span>
                    <span class="live-status-sub">已开灯 <b id="liveWorkTimeValue">${liveStatus.workTime}</b></span>
                    <span class="live-status-sub">最后刷新 <b id="lastUpdatedValue">${this.formatLastUpdated()}</b></span>
                  </div>
                </div>

                <div class="live-status-time-grid">
                  <div class="live-status-mini">
                    <span><i class="metric-icon amber" aria-hidden="true"></i>晨亮时间</span>
                    <strong id="morningTimeValue">${liveStatus.morningTime}</strong>
                  </div>
                  <div class="live-status-mini">
                    <span><i class="metric-icon slate" aria-hidden="true"></i>关灯时间</span>
                    <strong id="lightsOffTimeValue">${liveStatus.lightsOffTime}</strong>
                  </div>
                </div>

                <div class="live-status-chip-grid">
                  <div class="live-status-chip"><i class="metric-icon amber" aria-hidden="true"></i>亮度 <strong id="controlPowerValue">${liveStatus.brightness}</strong></div>
                  <div class="live-status-chip"><i class="metric-icon sky" aria-hidden="true"></i>电压 <strong id="controlBatteryValue">${liveStatus.batteryVoltage}</strong></div>
                  <div class="live-status-chip"><i class="metric-icon indigo" aria-hidden="true"></i>电流 <strong id="controlLoadCurrentValue">${liveStatus.loadCurrent}</strong></div>
                </div>

                <div class="live-status-meta" aria-label="连接状态">
                  <span>连接阶段 <b id="controlConnectionStateValue">${this.status.connectionState}</b></span>
                  <span>固件 <b id="detailFwValue">${this.status.fwVersion || "-"}</b></span>
                  <span>太阳能 <b id="controlSolarVoltageValue">${formatSolarVoltage(this.status)}</b></span>
                </div>

                <div class="seg readonly" id="modeSeg" aria-label="模式展示">
                  <button data-mode="radar" class="seg-btn" type="button">雷达模式</button>
                  <button data-mode="time" class="seg-btn" type="button">时控模式</button>
                  <button data-mode="average" class="seg-btn" type="button">平均模式</button>
                </div>
              </article>

              <article class="mvp-command-card">
                <div class="section-row">
                  <h2>${REFERENCE_UI_COPY.commandPanelTitle}</h2>
                  <span class="write-chip">写入方式：<b id="writeTypeValue">-</b></span>
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
                <div class="result result-live" id="resultArea" hidden></div>
              </article>
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
      void this.refreshDeviceDiscovery();
    });
    this.byId("disconnectBtn").addEventListener("click", () => {
      void this.disconnectDevice();
    });
    this.byId("enterControlBtn").addEventListener("click", () => {
      this.openControlPage("已进入控制页，持续发现已暂停");
    });
    this.byId("backBtn").addEventListener("click", () => {
      this.navigateHome();
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

    const modeButtons = this.root.querySelectorAll<HTMLButtonElement>("#modeSeg .seg-btn");
    modeButtons.forEach((button) => {
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
          this.mergeSupportedDevices(devices, {
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
      this.mergeSupportedDevices(result, {
        activeDeviceId: this.activeDeviceId,
        now: Date.now(),
        scanRound: round,
        usedFallback: roundUsedFallback
      });
      this.refreshDeviceList();
      const didAutoConnect = await this.autoConnectSupportedDevice(this.devices, `发现 ${TARGET_DEVICE_NAME}，正在自动连接`);
      if (!didAutoConnect) {
        this.setResult(`第 ${round} 轮完成：当前列表 ${this.devices.length} 台`, "success");
      }
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

  private async refreshDeviceDiscovery(): Promise<void> {
    if (shouldRefreshEnterControl(this.status)) {
      this.openControlPage();
      return;
    }
    try {
      this.setResult(`正在刷新 ${TARGET_DEVICE_NAME}...`, "pending");
      const devices = await this.controller.scan({
        quickWindowMs: 1200,
        fullWindowMs: 2800,
        allowFallbackNoPrefix: true,
        onProgress: (devices) => {
          this.mergeSupportedDevices(devices, {
            activeDeviceId: this.activeDeviceId,
            now: Date.now(),
            scanRound: this.discoveryRound,
            usedFallback: false
          });
          this.refreshDeviceList();
        }
      });
      this.mergeSupportedDevices(devices, {
        activeDeviceId: this.activeDeviceId,
        now: Date.now(),
        scanRound: this.discoveryRound,
        usedFallback: false
      });
      this.refreshDeviceList();
      this.setResult(
        this.status.connected ? "列表已刷新，当前设备保持连接" : `刷新完成：发现 ${this.devices.length} 台目标设备`,
        "success"
      );
    } catch (error) {
      this.setResult(`刷新失败：${this.errorMessage(error)}`, "error");
    }
  }

  private shouldPauseDiscoveryRound(): boolean {
    return ["connecting", "discovering", "subscribing"].includes(this.status.connectionState);
  }

  private mergeSupportedDevices(incomingDevices: DeviceBrief[], context: DiscoveryMergeContext): void {
    this.devices = mergeDiscoveryDevices(
      filterSupportedDevices(this.devices),
      filterSupportedDevices(incomingDevices),
      context
    );
  }

  private firstSupportedDevice(devices: DeviceBrief[]): DeviceBrief | undefined {
    return filterSupportedDevices(devices)[0];
  }

  private async autoConnectSupportedDevice(devices: DeviceBrief[], message: string): Promise<boolean> {
    if (!shouldAutoConnectSupportedDevice(devices, this.status, this.autoConnectInFlight)) {
      return false;
    }
    const target = this.firstSupportedDevice(devices);
    if (!target) {
      return false;
    }
    this.autoConnectInFlight = true;
    this.stopContinuousDiscovery(message);
    try {
      await this.connectDevice(target);
      return true;
    } finally {
      this.autoConnectInFlight = false;
      this.refreshScanControls();
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
      this.refreshStatus();
      this.refreshDeviceList();
      this.refreshUuidSelectors();
      await this.requestInitialStatusRefresh();
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
    this.devices = filterSupportedDevices(this.devices);
    if (!this.devices.length) {
      list.innerHTML = `<div class="device-empty">未发现 ${TARGET_DEVICE_NAME}，点击右上角 + 或刷新重新搜索</div>`;
      return;
    }
    this.mergeSupportedDevices([], {
      activeDeviceId: this.activeDeviceId,
      now: Date.now(),
      scanRound: this.discoveryRound,
      usedFallback: false
    });
    list.innerHTML = this.devices
      .map((device, index) => {
        const metrics = createNearbyDeviceMetrics(device.deviceId, this.activeDeviceId, this.status);
        return `
        <button class="device-item compact ${index === 0 ? "best" : ""} ${device.isConnected ? "connected" : ""} ${device.isStale ? "stale" : ""}" data-device-id="${device.deviceId}">
          <span class="device-art" aria-hidden="true">
            <img src="${DEVICE_ASSET_SRC}" alt="" />
          </span>
          <span class="device-main">
            <span class="device-name">
              <strong>${device.name}</strong>
              ${device.isConnected ? `<em>已连接</em>` : device.isStale ? `<em>最近见过</em>` : `<em>可连接</em>`}
            </span>
            <span class="device-sub">
              序列号 ${this.shortDeviceId(device.deviceId)} · RSSI ${device.rssi} dBm${device.usedFallback ? " · fallback" : ""}
            </span>
            <span class="device-metrics" aria-label="设备状态">
              <span><small>当前模式</small><b>${metrics.mode}</b></span>
              <span><small>电池电压</small><b>${metrics.batteryVoltage}</b></span>
              <span><small>太阳能电压</small><b>${metrics.solarVoltage}</b></span>
              <span><small>亮度</small><b>${metrics.power}</b></span>
            </span>
          </span>
          <span class="device-chevron" aria-hidden="true">›</span>
        </button>
      `;
      })
      .join("");
    list.querySelectorAll<HTMLButtonElement>(".device-item").forEach((button) => {
      button.addEventListener("click", () => {
        const target = this.devices.find((item) => item.deviceId === button.dataset.deviceId);
        if (target) {
          if (shouldOpenControlForConnectedDevice(target.deviceId, this.activeDeviceId, this.status)) {
            this.openControlPage("设备已连接，直接进入控制页");
            return;
          }
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
    const activeDeviceName = this.activeDeviceName();
    const activeSerial = this.activeDeviceSerial();
    const liveStatus = createLiveStatusModel(this.status);
    const lastUpdatedText = this.formatLastUpdated();
    this.byId("connBadge").textContent = this.status.connected
      ? `已连接 (${this.status.connectionState})`
      : `状态: ${this.status.connectionState}`;
    this.byId("connBadge").classList.toggle("online", this.status.connected);
    this.byId("connStageChip").textContent = `连接阶段：${this.status.connectionState}`;
    this.byId("homeConnectedName").textContent = activeDeviceName;
    this.byId("homeSummaryStatus").textContent = this.status.connected ? `已连接 · ${this.status.connectionState}` : "等待连接";
    this.byId("modeValue").textContent = this.status.mode;
    this.byId("powerValue").textContent = `${this.status.power}%`;
    this.byId("batteryValue").textContent = formatBatteryVoltage(this.status);
    this.byId("workTimeValue").textContent = formatWorkMinutes(this.status);
    this.byId("loadCurrentValue").textContent = formatLoadCurrent(this.status);
    this.byId("solarVoltageValue").textContent = formatSolarVoltage(this.status);
    this.byId("fwValue").textContent = this.status.fwVersion || "-";
    this.byId("detailTitleValue").textContent = activeDeviceName;
    this.byId("detailSerialValue").textContent = activeSerial;
    this.byId("detailFwValue").textContent = this.status.fwVersion || "-";
    this.byId("liveStatusCaption").textContent = liveStatus.caption;
    this.byId("controlModeValue").textContent = liveStatus.modeLabel;
    this.byId("liveBatteryTypeValue").textContent = liveStatus.batteryType;
    this.byId("liveBatteryLevelValue").textContent = liveStatus.batteryLevel;
    this.byId("liveWorkTimeValue").textContent = liveStatus.workTime;
    this.byId("morningTimeValue").textContent = liveStatus.morningTime;
    this.byId("lightsOffTimeValue").textContent = liveStatus.lightsOffTime;
    this.byId("controlPowerValue").textContent = liveStatus.brightness;
    this.byId("controlBatteryValue").textContent = liveStatus.batteryVoltage;
    this.byId("controlLoadCurrentValue").textContent = liveStatus.loadCurrent;
    this.byId("controlSolarVoltageValue").textContent = formatSolarVoltage(this.status);
    this.byId("controlConnectionStateValue").textContent = this.status.connectionState;
    this.byId("lastUpdatedValue").textContent = lastUpdatedText;
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
    const scanTitle = this.byId("scanStateTitle");
    const scanSub = this.byId("scanStateSub");
    scanBtn.textContent = this.discoveryActive ? "×" : "+";
    scanBtn.title = this.discoveryActive ? "停止持续发现" : "持续发现设备";
    scanBtn.classList.toggle("danger", this.discoveryActive);
    scanBtn.disabled = this.discoveryScanInFlight && !this.discoveryActive;
    scanTitle.textContent = this.discoveryActive ? REFERENCE_UI_COPY.scanSearching : REFERENCE_UI_COPY.scanIdle;
    scanSub.textContent = this.discoveryActive
      ? `第 ${this.discoveryRound || 1} 轮扫描中，列表会自动增量刷新`
      : REFERENCE_UI_COPY.scanHint;
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
    const resultNodes = this.root.querySelectorAll<HTMLElement>(".result-live");
    resultNodes.forEach((node) => {
      node.hidden = !message || tone === "idle";
      node.textContent = message;
      node.dataset.tone = tone;
    });
    const homeFeedback = this.root.querySelector<HTMLElement>("#homeFeedback");
    if (homeFeedback) {
      homeFeedback.hidden = !message || tone === "idle";
      homeFeedback.textContent = message;
      homeFeedback.dataset.tone = tone;
    }
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

  private openControlPage(message?: string, pushHistory = true): void {
    this.stopContinuousDiscovery(message);
    this.view = "control";
    if (pushHistory && typeof window !== "undefined" && window.history.state?.solarRemoteView !== "control") {
      window.history.pushState({ solarRemoteView: "control" }, "", "#control");
    }
    this.render();
  }

  private navigateHome(): void {
    if (resolveBackNavigation(this.view) === "exit") {
      return;
    }
    if (typeof window !== "undefined" && window.history.state?.solarRemoteView === "control") {
      window.history.back();
      return;
    }
    this.handleNativeBack();
  }

  private installBackNavigation(): void {
    if (this.historyInstalled || typeof window === "undefined") {
      return;
    }
    this.historyInstalled = true;
    window.solarRemoteHandleNativeBack = () => this.handleNativeBack();
    if (window.history.state?.solarRemoteView !== "home") {
      window.history.replaceState({ solarRemoteView: "home" }, "", window.location.pathname + window.location.search);
    }
    window.addEventListener("popstate", (event) => {
      const nextView = event.state?.solarRemoteView === "control" ? "control" : "home";
      if (this.view === nextView) {
        return;
      }
      this.view = nextView;
      this.render();
    });
  }

  private handleNativeBack(): NativeBackAction {
    if (resolveNativeBackAction(this.view) === "exit") {
      return "exit";
    }
    this.view = "home";
    if (typeof window !== "undefined") {
      window.history.replaceState({ solarRemoteView: "home" }, "", window.location.pathname + window.location.search);
    }
    this.render();
    return "handled";
  }

  private async requestInitialStatusRefresh(): Promise<void> {
    try {
      const message = await this.controller.readStatus();
      this.setResult(`连接成功，已发送读状态：${message}`, "success");
    } catch (error) {
      this.setResult(`连接成功，但读状态发送失败：${this.errorMessage(error)}`, "error");
    }
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

  private activeDeviceName(): string {
    if (!this.activeDeviceId || !this.status.connected) {
      return "未连接设备";
    }
    const normalizedActiveId = this.activeDeviceId.toLowerCase();
    const active = this.devices.find((device) => device.deviceId.toLowerCase() === normalizedActiveId);
    return active?.name || "MPPT 控制器";
  }

  private activeDeviceSerial(): string {
    if (!this.activeDeviceId || !this.status.connected) {
      return "-";
    }
    return this.shortDeviceId(this.activeDeviceId);
  }

  private formatLastUpdated(): string {
    if (!this.status.lastUpdatedAt) {
      return "-";
    }
    return new Date(this.status.lastUpdatedAt).toLocaleTimeString("zh-CN", { hour12: false });
  }

  private shortDeviceId(deviceId: string): string {
    const normalized = deviceId.replace(/[^0-9a-fA-F]/g, "").toUpperCase();
    if (normalized.length >= 6) {
      return normalized.slice(-6);
    }
    return deviceId;
  }
}
