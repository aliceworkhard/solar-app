import { DeviceController } from "./device/deviceController";
import { spacedHex } from "./utils/hex";
import type { DeviceBrief, DeviceStatus, LogEntry } from "./types";

type ViewName = "home" | "control" | "scene" | "profile";
type BottomNavTab = "device" | "scene" | "profile";
type BackNavigationResult = "home" | "exit";
type NativeBackAction = "handled" | "exit";
type SwipeDisconnectState = "closed" | "open";
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
  workTime: string;
  brightness: string;
  batteryVoltage: string;
  batteryPercent: string;
  loadCurrent: string;
  solarVoltage: string;
}

export interface NearbyDeviceMetrics {
  mode: string;
  batteryVoltage: string;
  solarVoltage: string;
  power: string;
}

export interface DiscoveryControlState {
  label: string;
  title: string;
  isDanger: boolean;
  disabled: boolean;
  stageText: string;
}

export interface BottomNavItem {
  id: BottomNavTab;
  label: string;
  icon: string;
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
export const DETAIL_SECTION_ANCHORS = {
  status: "deviceStatusSection",
  controls: "controlPanelSection"
} as const;
type DetailSectionName = keyof typeof DETAIL_SECTION_ANCHORS;
export const LOAD_CURRENT_BRIGHTNESS_FACTOR_AMP = 9.7272;
export const REFERENCE_UI_COPY = {
  homeTitle: "设备",
  homeSubtitle: "连接并管理您的 MPPT 设备",
  sceneTitle: "场景",
  sceneSubtitle: "预留",
  profileTitle: "我的",
  profileSubtitle: "管理您的账号与应用设置",
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
  showDefaultFeedbackCard: false,
  showHomeSummaryCard: false,
  showHomeScanCard: false,
  modeSelectorPlacement: "control-panel-bottom",
  detailNavigationMode: "anchor-scroll",
  bottomNavigation: true,
  statusBarGradientFallback: true
} as const;
export const BOTTOM_NAV_ITEMS: BottomNavItem[] = [
  { id: "device", label: "设备", icon: "▣" },
  { id: "scene", label: "场景", icon: "◇" },
  { id: "profile", label: "我的", icon: "●" }
];
export const PROFILE_PAGE_COPY = {
  userName: "MPPT 用户",
  userId: "20240501001",
  userTag: "普通用户",
  deviceSectionTitle: "我的设备",
  sceneSectionTitle: "我的场景",
  deviceStatLabels: ["在线", "可连", "离线"],
  sceneLabels: ["夜间", "日常", "节能", "高亮"],
  settings: ["设备共享", "固件升级", "数据统计", "操作日志", "帮助与反馈", "关于我们"]
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

export function resolveBottomNavTab(view: ViewName): BottomNavTab {
  if (view === "scene") {
    return "scene";
  }
  if (view === "profile") {
    return "profile";
  }
  return "device";
}

export function isControlReady(status: DeviceStatus): boolean {
  return status.connectionState === "ready";
}

export const STATUS_POLL_INTERVAL_MS = 5000;
export const SWIPE_DISCONNECT_ACTION_WIDTH_PX = 96;
export const SWIPE_DISCONNECT_THRESHOLD_PX = 72;

export function shouldPollReadStatus(status: DeviceStatus, pollInFlight: boolean): boolean {
  return status.connected && isControlReady(status) && !pollInFlight;
}

export function shouldStartBackgroundDiscovery(status: DeviceStatus, scanInFlight: boolean): boolean {
  return !scanInFlight && !["connecting", "discovering", "subscribing"].includes(status.connectionState);
}

export function resolveDiscoveryControlState(
  discoveryActive: boolean,
  scanInFlight: boolean,
  connectionState: DeviceStatus["connectionState"]
): DiscoveryControlState {
  return {
    label: discoveryActive ? "×" : "+",
    title: discoveryActive ? "停止持续发现" : "持续发现设备",
    isDanger: discoveryActive,
    disabled: scanInFlight && !discoveryActive,
    stageText: scanInFlight ? `连接阶段：${connectionState} · 后台搜索中` : `连接阶段：${connectionState}`
  };
}

export function shouldScheduleInitialDiscovery(
  status: DeviceStatus,
  scanInFlight: boolean,
  alreadyScheduled: boolean
): boolean {
  return !alreadyScheduled && shouldStartBackgroundDiscovery(status, scanInFlight);
}

export function resolveSwipeDisconnectState(deltaX: number, isConnected: boolean): SwipeDisconnectState {
  return isConnected && deltaX <= -SWIPE_DISCONNECT_THRESHOLD_PX ? "open" : "closed";
}

export function filterSupportedDevices<T extends DeviceBrief>(devices: T[]): T[] {
  return devices.filter((device) => device.name.trim() === TARGET_DEVICE_NAME);
}

export function shouldOpenControlForConnectedDevice(
  deviceId: string,
  activeDeviceId: string,
  status: DeviceStatus
): boolean {
  const activeDeviceMatches =
    Boolean(activeDeviceId) && deviceId.toLowerCase() === activeDeviceId.toLowerCase();
  return (
    activeDeviceMatches &&
    ["connecting", "discovering", "subscribing", "connected", "ready"].includes(status.connectionState)
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
    workTime: formatWorkMinutes(status),
    brightness: `${status.power}%`,
    batteryVoltage: formatBatteryVoltage(status),
    batteryPercent: formatBatteryPercent(status),
    loadCurrent: formatLoadCurrent(status),
    solarVoltage: formatSolarVoltage(status)
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

export function formatBatteryPercent(status: DeviceStatus): string {
  const voltage = status.batteryVoltage;
  if (typeof voltage !== "number" || !Number.isFinite(voltage)) {
    return "-";
  }
  const percent = ((voltage - 2.5) / (3.4 - 2.5)) * 100;
  const clamped = Math.min(100, Math.max(0, Math.round(percent)));
  return `${clamped}%`;
}

export function formatLoadCurrent(status: DeviceStatus): string {
  if (typeof status.power === "number" && Number.isFinite(status.power) && status.power > 0) {
    return `${((status.power / 100) * LOAD_CURRENT_BRIGHTNESS_FACTOR_AMP).toFixed(2)}A`;
  }
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
  isRecentlyDisconnected: boolean;
  usedFallback: boolean;
}

export interface DiscoveryMergeContext {
  activeDeviceId: string;
  now: number;
  scanRound: number;
  usedFallback: boolean;
  recentlyDisconnectedDeviceId?: string;
}

export function mergeDiscoveryDevices(
  currentDevices: DiscoveredDeviceRecord[],
  incomingDevices: DeviceBrief[],
  context: DiscoveryMergeContext
): DiscoveredDeviceRecord[] {
  const byId = new Map<string, DiscoveredDeviceRecord>();
  const activeDeviceId = context.activeDeviceId.toLowerCase();
  const recentlyDisconnectedDeviceId = context.recentlyDisconnectedDeviceId?.toLowerCase() ?? "";

  for (const current of currentDevices) {
    const isConnected = current.deviceId.toLowerCase() === activeDeviceId;
    const isRecentlyDisconnected =
      !isConnected && Boolean(recentlyDisconnectedDeviceId) && current.deviceId.toLowerCase() === recentlyDisconnectedDeviceId;
    const ageMs = context.now - current.lastSeenAt;
    if (!isConnected && ageMs > DEVICE_FORGET_AFTER_MS) {
      continue;
    }
    byId.set(current.deviceId, {
      ...current,
      isConnected,
      isStale: !isConnected && ageMs > DEVICE_STALE_AFTER_MS,
      isRecentlyDisconnected
    });
  }

  for (const incoming of incomingDevices) {
    const previous = byId.get(incoming.deviceId);
    const isConnected = incoming.deviceId.toLowerCase() === activeDeviceId;
    const isRecentlyDisconnected =
      !isConnected && Boolean(recentlyDisconnectedDeviceId) && incoming.deviceId.toLowerCase() === recentlyDisconnectedDeviceId;
    byId.set(incoming.deviceId, {
      deviceId: incoming.deviceId,
      name: incoming.name || previous?.name || "Unknown",
      rssi: incoming.rssi,
      firstSeenAt: previous?.firstSeenAt ?? context.now,
      lastSeenAt: context.now,
      scanRound: context.scanRound,
      isConnected,
      isStale: false,
      isRecentlyDisconnected,
      usedFallback: context.usedFallback
    });
  }

  return Array.from(byId.values()).sort((left, right) => {
    if (left.isConnected !== right.isConnected) {
      return left.isConnected ? -1 : 1;
    }
    if (left.isRecentlyDisconnected !== right.isRecentlyDisconnected) {
      return left.isRecentlyDisconnected ? 1 : -1;
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
  private initialDiscoveryScheduled = false;
  private historyInstalled = false;
  private discoveryTimer: ReturnType<typeof setTimeout> | null = null;
  private statusPollTimer: ReturnType<typeof setTimeout> | null = null;
  private statusPollInFlight = false;
  private swipedDeviceId = "";
  private discoveryRound = 0;
  private scanOperationSeq = 0;
  private activeScanOperationId = 0;
  private connectOperationSeq = 0;
  private activeConnectOperationId = 0;
  private recentlyDisconnectedDeviceId = "";

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
      this.syncStatusPolling();
    });
    this.controller.onLogChange((logs) => {
      this.logs = logs;
      this.refreshLogs();
    });
    this.scheduleInitialDiscovery();
  }

  private render(): void {
    const isControlView = this.view === "control";
    const isHomeView = this.view === "home";
    const headerVariant = isControlView ? "detail" : this.view === "profile" ? "profile" : this.view === "scene" ? "scene" : "home";
    const activeDeviceName = this.activeDeviceName();
    const liveStatus = createLiveStatusModel(this.status);
    this.root.innerHTML = `
      <div class="shell view-${this.view}">
        <header class="app-header ${headerVariant}">
          <button class="back-link ${isControlView ? "visible" : ""}" id="backBtn" type="button" aria-label="返回">‹</button>
          <div class="page-title" id="brandTrigger">
            <h1>${this.pageTitle(activeDeviceName)}</h1>
            <p>${this.pageSubtitle()}</p>
          </div>
          <div class="top-actions">
            <div class="conn-badge" id="connBadge">未连接</div>
            <button class="scan-fab ${isHomeView ? "" : "hidden"}" id="scanBtn" title="持续发现设备" type="button">+</button>
            ${this.view === "profile" ? this.renderProfileHeaderActions() : ""}
          </div>
        </header>

        <main>
          <section class="panel home-panel ${this.view === "home" ? "active" : ""}" id="homePanel">
            <div class="inline-feedback" id="homeFeedback" role="status" aria-live="polite" hidden></div>

            <div class="section-row device-section-title">
              <h2>${REFERENCE_UI_COPY.nearbySectionTitle}</h2>
              <button class="text-action" id="quickConnectBtn" type="button"><span aria-hidden="true">↻</span> 刷新</button>
            </div>
            <div class="chip stage-chip" id="connStageChip">连接阶段：idle</div>
            <div class="device-list" id="deviceList"></div>
          </section>

          <section class="panel control-panel ${this.view === "control" ? "active" : ""}" id="controlPanel">
            <div class="detail-tabs" aria-label="页面分组">
              <button class="detail-tab-button" data-detail-target="status" type="button">
                ${REFERENCE_UI_COPY.controlTabs[0]}
              </button>
              <button class="detail-tab-button" data-detail-target="controls" type="button">
                ${REFERENCE_UI_COPY.controlTabs[1]}
              </button>
            </div>
            <div class="control-stack">
              <article class="detail-device-card live-status-card" id="${DETAIL_SECTION_ANCHORS.status}" tabindex="-1">
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
                    <span class="live-status-pill">电池电压 <b id="liveBatteryVoltageValue">${liveStatus.batteryVoltage}</b></span>
                    <span class="live-status-sub">已开灯 <b id="liveWorkTimeValue">${liveStatus.workTime}</b></span>
                    <span class="live-status-sub">最后刷新 <b id="lastUpdatedValue">${this.formatLastUpdated()}</b></span>
                  </div>
                </div>

                <div class="live-status-time-grid">
                  <div class="live-status-mini">
                    <span><i class="metric-icon amber" aria-hidden="true"></i>模式</span>
                    <strong id="liveModeSummaryValue">${liveStatus.modeLabel}</strong>
                  </div>
                  <div class="live-status-mini">
                    <span><i class="metric-icon slate" aria-hidden="true"></i>太阳能电压</span>
                    <strong id="liveSolarVoltageValue">${liveStatus.solarVoltage}</strong>
                  </div>
                </div>

                <div class="live-status-chip-grid">
                  <div class="live-status-chip"><i class="metric-icon amber" aria-hidden="true"></i>亮度 <strong id="controlPowerValue">${liveStatus.brightness}</strong></div>
                  <div class="live-status-chip"><i class="metric-icon indigo" aria-hidden="true"></i>电流 <strong id="controlLoadCurrentValue">${liveStatus.loadCurrent}</strong></div>
                  <div class="live-status-chip"><i class="metric-icon sky" aria-hidden="true"></i>电量 <strong id="batteryPercentChipValue">${liveStatus.batteryPercent}</strong></div>
                </div>

                <div class="live-status-meta" aria-label="连接状态">
                  <span>连接阶段 <b id="controlConnectionStateValue">${this.status.connectionState}</b></span>
                  <span>设备 <b id="liveDeviceNameValue">${activeDeviceName}</b></span>
                </div>
              </article>

              <article class="mvp-command-card" id="${DETAIL_SECTION_ANCHORS.controls}" tabindex="-1">
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
                <div class="seg readonly control-mode-strip" id="modeSeg" aria-label="模式展示">
                  <button data-mode="radar" class="seg-btn" type="button">雷达模式</button>
                  <button data-mode="time" class="seg-btn" type="button">时控模式</button>
                  <button data-mode="average" class="seg-btn" type="button">平均模式</button>
                </div>
              </article>
            </div>
          </section>

          ${this.renderScenePanel()}

          ${this.renderProfilePanel()}

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
        ${this.renderBottomNavigation()}
      </div>
    `;

    this.bindEvents();
    this.refreshStatus();
    this.refreshDeviceList();
    this.refreshLogs();
    this.refreshUuidSelectors();
    this.refreshScanControls();
  }

  private pageTitle(activeDeviceName: string): string {
    if (this.view === "control") {
      return activeDeviceName;
    }
    if (this.view === "scene") {
      return REFERENCE_UI_COPY.sceneTitle;
    }
    if (this.view === "profile") {
      return REFERENCE_UI_COPY.profileTitle;
    }
    return REFERENCE_UI_COPY.homeTitle;
  }

  private pageSubtitle(): string {
    if (this.view === "control") {
      return "设备状态与控制";
    }
    if (this.view === "scene") {
      return REFERENCE_UI_COPY.sceneSubtitle;
    }
    if (this.view === "profile") {
      return REFERENCE_UI_COPY.profileSubtitle;
    }
    return REFERENCE_UI_COPY.homeSubtitle;
  }

  private renderProfileHeaderActions(): string {
    return `
      <button class="header-icon-button" type="button" aria-label="通知">⌂</button>
      <button class="header-icon-button" type="button" aria-label="设置">⌾</button>
    `;
  }

  private renderScenePanel(): string {
    return `
      <section class="panel scene-panel ${this.view === "scene" ? "active" : ""}" id="scenePanel" aria-label="场景预留">
        <div class="scene-reserved" aria-hidden="true"></div>
      </section>
    `;
  }

  private renderProfilePanel(): string {
    const totalDevices = Math.max(this.devices.length, this.status.connected ? 1 : 0);
    const onlineDevices = this.status.connected ? 1 : 0;
    const connectableDevices = this.devices.filter((device) => !device.isConnected && !device.isStale).length;
    const offlineDevices = Math.max(totalDevices - onlineDevices - connectableDevices, 0);

    return `
      <section class="panel profile-panel ${this.view === "profile" ? "active" : ""}" id="profilePanel">
        <article class="profile-user-card">
          <span class="profile-avatar" aria-hidden="true"></span>
          <div class="profile-user-copy">
            <div class="profile-name-line">
              <strong>${PROFILE_PAGE_COPY.userName}</strong>
              <span>${PROFILE_PAGE_COPY.userTag}</span>
            </div>
            <p>ID：${PROFILE_PAGE_COPY.userId}</p>
          </div>
          <span class="profile-chevron" aria-hidden="true">›</span>
        </article>

        <article class="profile-card">
          <div class="profile-card-head">
            <h2>${PROFILE_PAGE_COPY.deviceSectionTitle}</h2>
            <span>共 ${totalDevices} 台设备</span>
          </div>
          <div class="profile-device-stats">
            <div><i class="profile-stat-icon blue" aria-hidden="true"></i><span>${PROFILE_PAGE_COPY.deviceStatLabels[0]}</span><strong>${onlineDevices}</strong></div>
            <div><i class="profile-stat-icon green" aria-hidden="true"></i><span>${PROFILE_PAGE_COPY.deviceStatLabels[1]}</span><strong>${connectableDevices}</strong></div>
            <div><i class="profile-stat-icon slate" aria-hidden="true"></i><span>${PROFILE_PAGE_COPY.deviceStatLabels[2]}</span><strong>${offlineDevices}</strong></div>
          </div>
        </article>

        <article class="profile-card">
          <div class="profile-card-head">
            <h2>${PROFILE_PAGE_COPY.sceneSectionTitle}</h2>
            <span>共 4 个场景</span>
          </div>
          <div class="profile-scene-grid">
            <div><i class="scene-icon moon" aria-hidden="true"></i><span>${PROFILE_PAGE_COPY.sceneLabels[0]}</span></div>
            <div><i class="scene-icon sun" aria-hidden="true"></i><span>${PROFILE_PAGE_COPY.sceneLabels[1]}</span></div>
            <div><i class="scene-icon leaf" aria-hidden="true"></i><span>${PROFILE_PAGE_COPY.sceneLabels[2]}</span></div>
            <div><i class="scene-icon bright" aria-hidden="true"></i><span>${PROFILE_PAGE_COPY.sceneLabels[3]}</span></div>
          </div>
        </article>

        <article class="profile-list-card">
          ${PROFILE_PAGE_COPY.settings
            .map(
              (item, index) => `
                <div class="profile-list-row">
                  <span class="profile-list-icon tone-${index}" aria-hidden="true"></span>
                  <div>
                    <strong>${item}</strong>
                    <small>${this.profileSettingSubtitle(item)}</small>
                  </div>
                  <span class="profile-row-meta">${item === "固件升级" ? "V1.2.3" : ""}</span>
                  <span class="profile-chevron" aria-hidden="true">›</span>
                </div>
              `
            )
            .join("")}
        </article>

        <button class="profile-logout" type="button">退出登录</button>
      </section>
    `;
  }

  private profileSettingSubtitle(item: string): string {
    const subtitles: Record<string, string> = {
      设备共享: "与家人或团队共享设备",
      固件升级: "当前版本 V1.2.3",
      数据统计: "查看设备使用数据与趋势",
      操作日志: "查看设备操作记录",
      帮助与反馈: "使用帮助与问题反馈",
      关于我们: "了解更多关于 MPPT"
    };
    return subtitles[item] || "";
  }

  private renderBottomNavigation(): string {
    const activeTab = resolveBottomNavTab(this.view);
    return `
      <nav class="bottom-nav" aria-label="底部导航">
        ${BOTTOM_NAV_ITEMS.map(
          (item) => `
            <button class="bottom-nav-item ${activeTab === item.id ? "active" : ""}" data-bottom-tab="${item.id}" type="button" aria-current="${activeTab === item.id ? "page" : "false"}">
              <span class="bottom-nav-icon" aria-hidden="true">${item.icon}</span>
              <span>${item.label}</span>
            </button>
          `
        ).join("")}
      </nav>
    `;
  }

  private bindEvents(): void {
    this.byId("scanBtn").addEventListener("click", () => {
      void this.toggleContinuousDiscovery();
    });
    this.byId("quickConnectBtn").addEventListener("click", () => {
      void this.refreshDeviceDiscovery();
    });
    this.byId("backBtn").addEventListener("click", () => {
      this.navigateHome();
    });
    this.root.querySelectorAll<HTMLButtonElement>(".bottom-nav-item").forEach((button) => {
      button.addEventListener("click", () => {
        const tab = button.dataset.bottomTab as BottomNavTab | undefined;
        if (tab) {
          this.navigateBottomTab(tab);
        }
      });
    });
    this.root.querySelectorAll<HTMLButtonElement>(".detail-tab-button").forEach((button) => {
      button.addEventListener("click", () => {
        const target = button.dataset.detailTarget === "controls" ? "controls" : "status";
        this.scrollToDetailSection(target);
      });
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

  private scheduleInitialDiscovery(): void {
    if (!shouldScheduleInitialDiscovery(this.status, this.discoveryScanInFlight, this.initialDiscoveryScheduled)) {
      return;
    }
    this.initialDiscoveryScheduled = true;
    setTimeout(() => {
      if (shouldStartBackgroundDiscovery(this.status, this.discoveryScanInFlight)) {
        this.refreshDeviceDiscovery();
      }
    }, 0);
  }

  private toggleContinuousDiscovery(): void {
    if (this.discoveryActive) {
      this.stopContinuousDiscovery("已停止持续发现");
      return;
    }
    this.discoveryActive = true;
    this.discoveryRound = 0;
    this.refreshScanControls();
    void this.runDiscoveryRound();
  }

  private stopContinuousDiscovery(message?: string): void {
    this.discoveryActive = false;
    this.invalidateScanOperation();
    if (this.discoveryTimer) {
      clearTimeout(this.discoveryTimer);
      this.discoveryTimer = null;
    }
    this.refreshScanControls();
    if (message) {
      this.setResult(message, "success");
    }
  }

  private startScanOperation(): number {
    const operationId = ++this.scanOperationSeq;
    this.activeScanOperationId = operationId;
    this.discoveryScanInFlight = true;
    return operationId;
  }

  private invalidateScanOperation(): void {
    this.activeScanOperationId = ++this.scanOperationSeq;
    this.discoveryScanInFlight = false;
  }

  private isActiveScanOperation(operationId: number): boolean {
    return this.activeScanOperationId === operationId;
  }

  private startConnectOperation(): number {
    const operationId = ++this.connectOperationSeq;
    this.activeConnectOperationId = operationId;
    return operationId;
  }

  private invalidateConnectOperation(): void {
    this.activeConnectOperationId = ++this.connectOperationSeq;
    this.autoConnectInFlight = false;
  }

  private isActiveConnectOperation(operationId: number): boolean {
    return this.activeConnectOperationId === operationId;
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

    const operationId = this.startScanOperation();
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
          if (!this.isActiveScanOperation(operationId)) {
            return;
          }
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
      if (!this.isActiveScanOperation(operationId)) {
        return;
      }
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
      if (this.isActiveScanOperation(operationId)) {
        this.setResult(`持续发现失败：${this.errorMessage(error)}`, "error");
      }
    } finally {
      if (this.isActiveScanOperation(operationId)) {
        this.discoveryScanInFlight = false;
        this.refreshScanControls();
        this.scheduleNextDiscoveryRound();
      }
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

  private refreshDeviceDiscovery(): void {
    if (shouldRefreshEnterControl(this.status)) {
      this.openControlPage();
      return;
    }
    if (!shouldStartBackgroundDiscovery(this.status, this.discoveryScanInFlight)) {
      this.setResult(
        this.discoveryScanInFlight ? "正在后台刷新附近设备..." : `当前连接阶段为 ${this.status.connectionState}，稍后再刷新`,
        "pending"
      );
      this.refreshScanControls();
      return;
    }

    const operationId = this.startScanOperation();
    this.discoveryRound += 1;
    const round = this.discoveryRound;
    this.refreshScanControls();
    this.setResult(
      this.status.connected ? "正在后台刷新附近设备，当前连接保持可用" : `正在后台搜索 ${TARGET_DEVICE_NAME}...`,
      "pending"
    );
    this.refreshDeviceList();

    void this.controller
      .scan({
        quickWindowMs: 1200,
        fullWindowMs: 2800,
        allowFallbackNoPrefix: true,
        onProgress: (devices, meta) => {
          if (!this.isActiveScanOperation(operationId)) {
            return;
          }
          this.mergeSupportedDevices(devices, {
            activeDeviceId: this.activeDeviceId,
            now: Date.now(),
            scanRound: round,
            usedFallback: meta.usedFallbackNoPrefix
          });
          this.refreshDeviceList();
          void this.autoConnectSupportedDevice(this.devices, `发现 ${TARGET_DEVICE_NAME}，正在自动连接`);
        }
      })
      .then(async (devices) => {
        if (!this.isActiveScanOperation(operationId)) {
          return;
        }
        this.mergeSupportedDevices(devices, {
          activeDeviceId: this.activeDeviceId,
          now: Date.now(),
          scanRound: round,
          usedFallback: false
        });
        this.refreshDeviceList();
        const didAutoConnect = await this.autoConnectSupportedDevice(
          this.devices,
          `发现 ${TARGET_DEVICE_NAME}，正在自动连接`
        );
        if (!didAutoConnect) {
          this.setResult(
            this.status.connected ? "列表已后台刷新，当前设备保持连接" : `刷新完成：发现 ${this.devices.length} 台目标设备`,
            "success"
          );
        }
      })
      .catch((error) => {
        if (this.isActiveScanOperation(operationId)) {
          this.setResult(`刷新失败：${this.errorMessage(error)}`, "error");
        }
      })
      .finally(() => {
        if (this.isActiveScanOperation(operationId)) {
          this.discoveryScanInFlight = false;
          this.refreshScanControls();
        }
      });
  }

  private shouldPauseDiscoveryRound(): boolean {
    return ["connecting", "discovering", "subscribing"].includes(this.status.connectionState);
  }

  private mergeSupportedDevices(incomingDevices: DeviceBrief[], context: DiscoveryMergeContext): void {
    const mergeContext = {
      ...context,
      recentlyDisconnectedDeviceId: context.recentlyDisconnectedDeviceId ?? this.recentlyDisconnectedDeviceId
    };
    this.devices = mergeDiscoveryDevices(
      filterSupportedDevices(this.devices),
      filterSupportedDevices(incomingDevices),
      mergeContext
    );
  }

  private firstSupportedDevice(devices: DeviceBrief[]): DeviceBrief | undefined {
    const recentlyDisconnectedDeviceId = this.recentlyDisconnectedDeviceId.toLowerCase();
    return filterSupportedDevices(devices).find(
      (device) => !recentlyDisconnectedDeviceId || device.deviceId.toLowerCase() !== recentlyDisconnectedDeviceId
    );
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
    const operationId = this.startConnectOperation();
    try {
      this.activeDeviceId = device.deviceId;
      this.recentlyDisconnectedDeviceId = "";
      this.devices = mergeDiscoveryDevices(this.devices, [], {
        activeDeviceId: this.activeDeviceId,
        now: Date.now(),
        scanRound: this.discoveryRound,
        usedFallback: false
      });
      this.refreshDeviceList();
      this.setResult(`连接 ${device.name}...`, "pending");
      await this.controller.connectAndPrepare(device.deviceId);
      if (!this.isActiveConnectOperation(operationId)) {
        return;
      }
      this.refreshStatus();
      this.refreshDeviceList();
      this.refreshUuidSelectors();
      this.requestInitialStatusRefresh(operationId);
      this.syncStatusPolling();
    } catch (error) {
      if (this.isActiveConnectOperation(operationId)) {
        this.activeDeviceId = "";
        this.stopStatusPolling();
        this.setResult(`连接失败：${this.errorMessage(error)}`, "error");
        this.refreshDeviceList();
      }
    }
  }

  private async disconnectDevice(): Promise<void> {
    const disconnectedDeviceId = this.activeDeviceId;
    try {
      this.stopContinuousDiscovery();
      this.invalidateScanOperation();
      this.invalidateConnectOperation();
      await this.controller.disconnect();
      this.recentlyDisconnectedDeviceId = disconnectedDeviceId;
      this.activeDeviceId = "";
      this.stopStatusPolling();
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

  private scrollToDetailSection(target: DetailSectionName): void {
    const section = this.root.querySelector<HTMLElement>(`#${DETAIL_SECTION_ANCHORS[target]}`);
    if (!section) {
      return;
    }
    section.scrollIntoView({ behavior: "smooth", block: "start" });
    section.focus({ preventScroll: true });
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
        const isSwipeOpen = this.swipedDeviceId === device.deviceId && device.isConnected;
        return `
        <div class="device-row-shell ${device.isConnected ? "connected" : ""} ${isSwipeOpen ? "swiped" : ""}" data-device-id="${device.deviceId}">
          ${device.isConnected ? `<button class="device-swipe-action" type="button" data-disconnect-device-id="${device.deviceId}">取消连接</button>` : ""}
          <button class="device-item compact device-card-button ${index === 0 ? "best" : ""} ${device.isConnected ? "connected" : ""} ${device.isStale ? "stale" : ""}" data-device-id="${device.deviceId}">
            <span class="device-art" aria-hidden="true">
              <img src="${DEVICE_ASSET_SRC}" alt="" />
            </span>
            <span class="device-main">
              <span class="device-name">
                <strong>${device.name}</strong>
                ${device.isConnected ? `<em>已连接</em>` : device.isStale ? `<em>最近见过</em>` : `<em>可连接</em>`}
              </span>
              <span class="device-sub">
                序列号 ${this.shortDeviceId(device.deviceId)}${device.usedFallback ? " · fallback" : ""}
              </span>
              <span class="device-metrics" aria-label="设备状态">
                <span><small>当前模式</small><b>${metrics.mode}</b></span>
                <span><small>电池电压</small><b>${metrics.batteryVoltage}</b></span>
                <span><small>太阳能电压</small><b>${metrics.solarVoltage}</b></span>
                <span><small>亮度</small><b>${metrics.power}</b></span>
              </span>
            </span>
            <span class="device-rssi" aria-label="RSSI ${device.rssi} dBm">
              <b>${device.rssi}</b>
              <small>dBm</small>
            </span>
          </button>
        </div>
      `;
      })
      .join("");
    list.querySelectorAll<HTMLButtonElement>(".device-card-button").forEach((button) => {
      button.addEventListener("click", () => {
        if (this.swipedDeviceId === button.dataset.deviceId) {
          this.swipedDeviceId = "";
          this.refreshDeviceList();
          return;
        }
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
    list.querySelectorAll<HTMLButtonElement>(".device-swipe-action").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const deviceId = button.dataset.disconnectDeviceId || "";
        if (deviceId && deviceId === this.activeDeviceId) {
          this.swipedDeviceId = "";
          void this.disconnectDevice();
        }
      });
    });
    this.bindSwipeDisconnect(list);
  }

  private bindSwipeDisconnect(list: HTMLElement): void {
    list.querySelectorAll<HTMLElement>(".device-row-shell.connected").forEach((row) => {
      const card = row.querySelector<HTMLElement>(".device-item");
      let startX = 0;
      let startY = 0;
      let tracking = false;
      const resetDrag = () => {
        row.classList.remove("dragging");
        if (card) {
          card.style.transform = "";
        }
      };

      row.addEventListener("pointerdown", (event) => {
        startX = event.clientX;
        startY = event.clientY;
        tracking = true;
        row.setPointerCapture(event.pointerId);
      });

      row.addEventListener("pointermove", (event) => {
        if (!tracking || !card) {
          return;
        }
        const deltaX = event.clientX - startX;
        const deltaY = event.clientY - startY;
        if (Math.abs(deltaY) > Math.abs(deltaX)) {
          return;
        }
        if (deltaX < 0 || this.swipedDeviceId === row.dataset.deviceId) {
          const openOffset = this.swipedDeviceId === row.dataset.deviceId ? -SWIPE_DISCONNECT_ACTION_WIDTH_PX : 0;
          const offset = Math.max(-SWIPE_DISCONNECT_ACTION_WIDTH_PX, Math.min(0, openOffset + deltaX));
          row.classList.add("dragging");
          card.style.transform = `translateX(${offset}px)`;
          event.preventDefault();
        }
      });

      row.addEventListener("pointerup", (event) => {
        if (!tracking) {
          return;
        }
        tracking = false;
        resetDrag();
        const deltaX = event.clientX - startX;
        const deltaY = event.clientY - startY;
        if (Math.abs(deltaY) > Math.abs(deltaX)) {
          return;
        }
        const state = resolveSwipeDisconnectState(deltaX, row.classList.contains("connected"));
        if (state === "open") {
          this.swipedDeviceId = row.dataset.deviceId || "";
          row.classList.add("swiped");
          event.preventDefault();
          return;
        }
        if (deltaX > 20 && this.swipedDeviceId === row.dataset.deviceId) {
          this.swipedDeviceId = "";
          row.classList.remove("swiped");
          event.preventDefault();
        }
      });

      row.addEventListener("pointercancel", () => {
        tracking = false;
        resetDrag();
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
    this.byId("detailTitleValue").textContent = activeDeviceName;
    this.byId("detailSerialValue").textContent = activeSerial;
    this.byId("liveStatusCaption").textContent = liveStatus.caption;
    this.byId("controlModeValue").textContent = liveStatus.modeLabel;
    this.byId("liveBatteryTypeValue").textContent = liveStatus.batteryType;
    this.byId("liveBatteryVoltageValue").textContent = liveStatus.batteryVoltage;
    this.byId("liveWorkTimeValue").textContent = liveStatus.workTime;
    this.byId("liveModeSummaryValue").textContent = liveStatus.modeLabel;
    this.byId("liveSolarVoltageValue").textContent = liveStatus.solarVoltage;
    this.byId("controlPowerValue").textContent = liveStatus.brightness;
    this.byId("controlLoadCurrentValue").textContent = liveStatus.loadCurrent;
    this.byId("batteryPercentChipValue").textContent = liveStatus.batteryPercent;
    this.byId("controlConnectionStateValue").textContent = this.status.connectionState;
    this.byId("liveDeviceNameValue").textContent = activeDeviceName;
    this.byId("lastUpdatedValue").textContent = lastUpdatedText;
    this.byId("writeTypeValue").textContent = this.controller.getWriteType();
    const modeButtons = this.root.querySelectorAll<HTMLButtonElement>("#modeSeg .seg-btn");
    modeButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.mode === this.status.mode);
    });
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
    (this.byId("quickConnectBtn") as HTMLButtonElement).disabled = !shouldStartBackgroundDiscovery(
      this.status,
      this.discoveryScanInFlight
    );
  }

  private refreshScanControls(): void {
    if (!this.root.childElementCount) {
      return;
    }
    const scanBtn = this.byId("scanBtn") as HTMLButtonElement;
    const quickConnectBtn = this.byId("quickConnectBtn") as HTMLButtonElement;
    const stageChip = this.byId("connStageChip");
    const controlState = resolveDiscoveryControlState(
      this.discoveryActive,
      this.discoveryScanInFlight,
      this.status.connectionState
    );
    scanBtn.textContent = controlState.label;
    scanBtn.title = controlState.title;
    scanBtn.classList.toggle("danger", controlState.isDanger);
    scanBtn.disabled = controlState.disabled;
    quickConnectBtn.disabled = !shouldStartBackgroundDiscovery(this.status, this.discoveryScanInFlight);
    stageChip.textContent = controlState.stageText;
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

  private navigateBottomTab(tab: BottomNavTab): void {
    const nextView: ViewName = tab === "device" ? "home" : tab;
    if (this.view === nextView) {
      return;
    }
    this.view = nextView;
    if (typeof window !== "undefined") {
      window.history.replaceState({ solarRemoteView: "home" }, "", window.location.pathname + window.location.search);
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

  private requestInitialStatusRefresh(operationId: number): void {
    void this.controller
      .readStatus()
      .then((message) => {
        if (this.isActiveConnectOperation(operationId)) {
          this.setResult(`连接成功，已发送读状态：${message}`, "success");
        }
      })
      .catch((error) => {
        if (this.isActiveConnectOperation(operationId)) {
          this.setResult(`连接成功，但读状态发送失败：${this.errorMessage(error)}`, "error");
        }
      });
  }

  private syncStatusPolling(): void {
    if (!shouldPollReadStatus(this.status, this.statusPollInFlight)) {
      if (!this.status.connected || !isControlReady(this.status)) {
        this.stopStatusPolling();
      }
      return;
    }
    if (this.statusPollTimer) {
      return;
    }
    this.statusPollTimer = setTimeout(() => {
      this.statusPollTimer = null;
      void this.runStatusPoll();
    }, STATUS_POLL_INTERVAL_MS);
  }

  private stopStatusPolling(): void {
    if (this.statusPollTimer) {
      clearTimeout(this.statusPollTimer);
      this.statusPollTimer = null;
    }
  }

  private async runStatusPoll(): Promise<void> {
    if (!shouldPollReadStatus(this.status, this.statusPollInFlight)) {
      this.syncStatusPolling();
      return;
    }
    this.statusPollInFlight = true;
    try {
      const message = await this.controller.readStatus();
      this.setResult(`自动读状态已发送：${message}`, "idle");
    } catch (error) {
      this.setResult(`自动读状态失败：${this.errorMessage(error)}`, "error");
    } finally {
      this.statusPollInFlight = false;
      this.syncStatusPolling();
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
