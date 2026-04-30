import { DeviceController } from "./device/deviceController";
import {
  DEFAULT_TIME_CONTROL_PARAMS,
  MAX_TIME_CONTROL_MINUTES,
  MAX_TOTAL_SEGMENT_HALF_HOURS,
  TIME_CONTROL_STEP_MINUTES,
  TIME_CONTROL_SEGMENT_MAX_HALF_HOURS,
  TIME_CONTROL_SEGMENT_MIN_HALF_HOURS,
  TIME_CONTROL_SEGMENT_COUNT,
  applyTimeControlChange,
  cloneTimeControlParams,
  maxOutputByteToPercent,
  type TimeControlChange,
  type TimeControlParams
} from "./protocol/timeControlParams";
import { spacedHex } from "./utils/hex";
import type { DeviceBrief, DeviceStatus, LogEntry } from "./types";

type ViewName = "home" | "control" | "scene" | "profile";
type BottomNavTab = "device" | "scene" | "profile";
type BackNavigationResult = "home" | "exit";
type NativeBackAction = "handled" | "exit";
type SwipeDisconnectState = "closed" | "open";
type FeedbackTone = "idle" | "pending" | "success" | "error";
type EdgeMode = "transparent" | "color-match" | "visual-fallback";
type StyleWriter = Pick<CSSStyleDeclaration, "setProperty">;
type SystemInsetValue = number | string;
type CommandPanelGroupId = "primary" | "brightness" | "reserved";
type BusinessCommandAction =
  | "readStatus"
  | "readParams"
  | "powerToggle"
  | "brightnessUp"
  | "brightnessDown";

declare global {
  interface Window {
    solarRemoteHandleNativeBack?: () => NativeBackAction;
    solarRemoteApplySystemInsets?: (insets: Partial<SystemInsets>) => void;
    solarRemoteSetEdgeMode?: (mode: string) => void;
    __nativeSystemInsets?: Partial<SystemInsets>;
    __nativeSystemInsetsMeta?: NativeSystemInsetsMeta;
    __edgeInsetsMismatchLogged?: boolean;
    __edgeBuildId?: string;
    __edgeBuildLogged?: boolean;
  }
}

export interface BusinessCommand {
  id: string;
  label: string;
  description: string;
  action: BusinessCommandAction;
}

export interface CommandPanelGroup {
  id: CommandPanelGroupId;
  label: string;
  commandIds: string[];
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

export interface SystemInsets {
  top: SystemInsetValue;
  right: SystemInsetValue;
  bottom: SystemInsetValue;
  left: SystemInsetValue;
  topPx?: SystemInsetValue;
  rightPx?: SystemInsetValue;
  bottomPx?: SystemInsetValue;
  leftPx?: SystemInsetValue;
  contentLeft?: SystemInsetValue;
  contentRight?: SystemInsetValue;
  contentLeftPx?: SystemInsetValue;
  contentRightPx?: SystemInsetValue;
  density?: SystemInsetValue;
  webViewWidthPx?: SystemInsetValue;
  viewportWidth?: SystemInsetValue;
  diagnosticColors?: boolean;
}

export interface NormalizedSystemInsets {
  top: string;
  right: string;
  bottom: string;
  left: string;
  contentLeft: string;
  contentRight: string;
}

export interface NativeInsetConversionMetrics {
  density?: SystemInsetValue;
  webViewWidthPx?: SystemInsetValue;
  viewportWidth?: SystemInsetValue;
}

export interface NativeSystemInsetsMeta {
  density: number;
  webViewWidthPx: number;
  viewportWidth: number;
  nativeCssWidth: number;
  widthRatio: number;
  ratioApplied: boolean;
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

export const COMMAND_PANEL_GROUPS: CommandPanelGroup[] = [
  { id: "primary", label: "主要控制", commandIds: ["powerToggleBtn"] },
  { id: "brightness", label: "亮度调节", commandIds: ["brightnessDownBtn", "brightnessUpBtn"] },
  { id: "reserved", label: "系统读取预留", commandIds: ["readStatusBtn", "readParamsBtn"] }
];

export const EDGE_BUILD_ID = "T031-system-bars-final";
export const TIME_CONTROL_EDITOR_MODEL = {
  mode: "time",
  segmentCount: TIME_CONTROL_SEGMENT_COUNT,
  sendPolicy: "send-full-frame-on-change",
  sliderCommitPolicy: "send-on-release",
  syncSourceCommand: "readParams",
  readParamsSync: "decode-b1-mode-01-into-controls",
  durationUnitMinutes: TIME_CONTROL_STEP_MINUTES,
  powerEncoding: "percent-scaled-0xff",
  maxOutputModel: "high-byte-percent-low-byte-00",
  segmentDurationModel: "half-hour-units-1-to-15",
  modeStripPlacement: "above-time-control-editor",
  longFramePolicy: "mode-02-future-split"
} as const;
export const EDGE_MODE_BODY_CLASSES: Record<EdgeMode, string> = {
  transparent: "edge-transparent",
  "color-match": "edge-color-match",
  "visual-fallback": "edge-visual-fallback"
};
export const EDGE_DEFAULT_MODE: EdgeMode = "transparent";
export const EDGE_DIAGNOSTIC_DOM_BACKGROUND = {
  enabled: "rgba(90, 170, 255, 0.22)",
  disabled: "transparent"
} as const;
export const DEVICE_ASSET_SRC = "/assets/ui/mppt_gray_black_controller_transparent.png";
export const TARGET_DEVICE_NAME = "AC632N_1";
export const DETAIL_SECTION_ANCHORS = {
  status: "deviceStatusSection",
  controls: "controlPanelSection"
} as const;
export type DetailSectionName = keyof typeof DETAIL_SECTION_ANCHORS;
export const DEFAULT_DETAIL_SECTION: DetailSectionName = "status";
export const LOAD_CURRENT_BRIGHTNESS_FACTOR_AMP = 9.7272;
export const SYSTEM_INSET_CSS_VARS = {
  top: "--system-top",
  right: "--system-right",
  bottom: "--system-bottom",
  left: "--system-left"
} as const;
export const NATIVE_SYSTEM_INSET_CSS_VARS = {
  top: "--native-inset-top",
  right: "--native-inset-right",
  bottom: "--native-inset-bottom",
  left: "--native-inset-left"
} as const;
export const CONTENT_SAFE_INSET_CSS_VARS = {
  left: "--content-safe-left",
  right: "--content-safe-right"
} as const;
export const EDGE_DIAGNOSTIC_CSS_VARS = {
  domBackground: "--edge-dom-overlay-background"
} as const;
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

export function resolveDetailSectionTarget(target: string | null | undefined): DetailSectionName {
  return target === "controls" ? "controls" : DEFAULT_DETAIL_SECTION;
}

export function normalizeSystemInsets(
  insets: Partial<SystemInsets> = {},
  viewportWidth?: SystemInsetValue
): NormalizedSystemInsets {
  const metrics: NativeInsetConversionMetrics = {
    density: insets.density,
    webViewWidthPx: insets.webViewWidthPx,
    viewportWidth: insets.viewportWidth ?? viewportWidth
  };
  return {
    top: normalizeDirectionalInset(insets.top, insets.topPx, metrics),
    right: normalizeDirectionalInset(insets.right, insets.rightPx, metrics),
    bottom: normalizeDirectionalInset(insets.bottom, insets.bottomPx, metrics),
    left: normalizeDirectionalInset(insets.left, insets.leftPx, metrics),
    contentLeft: normalizeDirectionalInset(insets.contentLeft, insets.contentLeftPx, metrics),
    contentRight: normalizeDirectionalInset(insets.contentRight, insets.contentRightPx, metrics)
  };
}

export function applySystemInsetsToStyle(
  style: StyleWriter,
  insets: Partial<SystemInsets>,
  viewportWidth?: SystemInsetValue
): void {
  const normalized = normalizeSystemInsets(insets, viewportWidth);
  style.setProperty(NATIVE_SYSTEM_INSET_CSS_VARS.top, normalized.top);
  style.setProperty(NATIVE_SYSTEM_INSET_CSS_VARS.right, normalized.right);
  style.setProperty(NATIVE_SYSTEM_INSET_CSS_VARS.bottom, normalized.bottom);
  style.setProperty(NATIVE_SYSTEM_INSET_CSS_VARS.left, normalized.left);
  style.setProperty(SYSTEM_INSET_CSS_VARS.top, normalized.top);
  style.setProperty(SYSTEM_INSET_CSS_VARS.right, normalized.right);
  style.setProperty(SYSTEM_INSET_CSS_VARS.bottom, normalized.bottom);
  style.setProperty(SYSTEM_INSET_CSS_VARS.left, normalized.left);
  style.setProperty(CONTENT_SAFE_INSET_CSS_VARS.left, normalized.contentLeft);
  style.setProperty(CONTENT_SAFE_INSET_CSS_VARS.right, normalized.contentRight);
  style.setProperty(
    EDGE_DIAGNOSTIC_CSS_VARS.domBackground,
    insets.diagnosticColors ? EDGE_DIAGNOSTIC_DOM_BACKGROUND.enabled : EDGE_DIAGNOSTIC_DOM_BACKGROUND.disabled
  );
}

export function normalizeEdgeMode(mode: unknown): EdgeMode {
  return mode === "color-match" || mode === "visual-fallback" || mode === "transparent"
    ? mode
    : "transparent";
}

export function applyEdgeModeToClassList(classList: DOMTokenList, mode: unknown): EdgeMode {
  const normalized = normalizeEdgeMode(mode);
  Object.values(EDGE_MODE_BODY_CLASSES).forEach((className) => classList.remove(className));
  classList.add(EDGE_MODE_BODY_CLASSES[normalized]);
  return normalized;
}

export function resolveNativeCssPx(
  physicalPx: unknown,
  metrics: NativeInsetConversionMetrics = {}
): string {
  const physicalValue = parsePositiveNumber(physicalPx);
  if (!physicalValue) {
    return "0px";
  }

  const density = parsePositiveNumber(metrics.density);
  const webViewWidthPx = parsePositiveNumber(metrics.webViewWidthPx);
  const viewportWidth = parsePositiveNumber(metrics.viewportWidth);
  let cssPx = density ? physicalValue / density : physicalValue;

  if (density && webViewWidthPx && viewportWidth) {
    const nativeCssWidth = webViewWidthPx / density;
    const mismatchThreshold = Math.max(2, viewportWidth * 0.02);
    if (Math.abs(nativeCssWidth - viewportWidth) > mismatchThreshold) {
      cssPx = physicalValue * (viewportWidth / webViewWidthPx);
    }
  }

  return formatCssPx(cssPx);
}

export function createNativeSystemInsetsMeta(
  insets: Partial<SystemInsets>,
  viewportWidth?: SystemInsetValue
): NativeSystemInsetsMeta {
  const density = parsePositiveNumber(insets.density) ?? 0;
  const webViewWidthPx = parsePositiveNumber(insets.webViewWidthPx) ?? 0;
  const resolvedViewportWidth = parsePositiveNumber(insets.viewportWidth ?? viewportWidth) ?? 0;
  const nativeCssWidth = density && webViewWidthPx ? webViewWidthPx / density : 0;
  const widthRatio = webViewWidthPx && resolvedViewportWidth ? resolvedViewportWidth / webViewWidthPx : 0;
  const ratioApplied =
    Boolean(density && webViewWidthPx && resolvedViewportWidth) &&
    Math.abs(nativeCssWidth - resolvedViewportWidth) > Math.max(2, resolvedViewportWidth * 0.02);

  return {
    density,
    webViewWidthPx,
    viewportWidth: resolvedViewportWidth,
    nativeCssWidth,
    widthRatio,
    ratioApplied
  };
}

function normalizeDirectionalInset(
  cssValue: unknown,
  physicalPx: unknown,
  metrics: NativeInsetConversionMetrics
): string {
  if (physicalPx !== undefined && physicalPx !== null) {
    return resolveNativeCssPx(physicalPx, metrics);
  }
  return normalizeInsetValue(cssValue);
}

function normalizeInsetValue(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return formatCssPx(value);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    const numeric = trimmed.endsWith("px") ? Number(trimmed.slice(0, -2)) : Number(trimmed);
    if (Number.isFinite(numeric) && numeric > 0) {
      return formatCssPx(numeric);
    }
  }
  return "0px";
}

function parsePositiveNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    const numeric = trimmed.endsWith("px") ? Number(trimmed.slice(0, -2)) : Number(trimmed);
    if (Number.isFinite(numeric) && numeric > 0) {
      return numeric;
    }
  }
  return undefined;
}

function formatCssPx(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "0px";
  }
  return `${Number(value.toFixed(2))}px`;
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
    return "雷达模式";
  }
  if (mode === "time") {
    return "时控模式";
  }
  if (mode === "average") {
    return "平均模式";
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
    mode: formatModeLabel(status.mode),
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
  private activeDetailSection: DetailSectionName = DEFAULT_DETAIL_SECTION;
  private discoveryRound = 0;
  private scanOperationSeq = 0;
  private activeScanOperationId = 0;
  private connectOperationSeq = 0;
  private activeConnectOperationId = 0;
  private recentlyDisconnectedDeviceId = "";
  private timeControlDraft: TimeControlParams;
  private syncedTimeControlParamsRef?: TimeControlParams;
  private activeTimeControlSegmentIndex = 0;

  constructor(root: HTMLElement, controller: DeviceController) {
    this.root = root;
    this.controller = controller;
    this.status = controller.getStatus();
    this.logs = controller.getLogs();
    this.timeControlDraft = cloneTimeControlParams(this.status.timeControlParams ?? DEFAULT_TIME_CONTROL_PARAMS);
    this.syncedTimeControlParamsRef = this.status.timeControlParams;
  }

  start(): void {
    this.installSystemInsetBridge();
    this.installBackNavigation();
    this.render();
    this.controller.onStatusChange((status) => {
      this.status = status;
      if (status.timeControlParams && status.timeControlParams !== this.syncedTimeControlParamsRef) {
        this.timeControlDraft = cloneTimeControlParams(status.timeControlParams);
        this.syncedTimeControlParamsRef = status.timeControlParams;
      }
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
            <div class="detail-tabs" role="tablist" aria-label="页面分组">
              ${this.renderDetailTabButton("status", REFERENCE_UI_COPY.controlTabs[0])}
              ${this.renderDetailTabButton("controls", REFERENCE_UI_COPY.controlTabs[1])}
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
                ${this.renderCommandPanel()}
                <div class="seg readonly control-mode-strip" id="modeSeg" aria-label="模式展示">
                  <button data-mode="radar" class="seg-btn" type="button">雷达模式</button>
                  <button data-mode="time" class="seg-btn" type="button">时控模式</button>
                  <button data-mode="average" class="seg-btn" type="button">平均模式</button>
                </div>
                ${this.renderTimeControlEditor()}
                <div class="result result-live" id="resultArea" hidden></div>
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

  private renderDetailTabButton(section: DetailSectionName, label: string): string {
    const isActive = this.activeDetailSection === section;
    return `
      <button
        class="detail-tab-button ${isActive ? "active" : ""}"
        data-detail-target="${section}"
        type="button"
        role="tab"
        aria-selected="${isActive}"
        aria-current="${isActive ? "page" : "false"}"
        aria-controls="${DETAIL_SECTION_ANCHORS[section]}"
      >
        ${label}
      </button>
    `;
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

  private renderCommandPanel(): string {
    const primaryGroup = this.commandPanelGroup("primary");
    const brightnessGroup = this.commandPanelGroup("brightness");
    const reservedGroup = this.commandPanelGroup("reserved");

    return `
      <div class="command-panel-body">
        <div class="command-primary-row" aria-label="${primaryGroup.label}">
          ${primaryGroup.commandIds.map((id) => this.renderCommandButton(id, "command-btn-primary")).join("")}
        </div>
        <div class="brightness-command-row" aria-label="${brightnessGroup.label}">
          ${brightnessGroup.commandIds.map((id) => this.renderCommandButton(id, "command-btn-brightness")).join("")}
        </div>
        <div class="reserved-command-block" aria-label="${reservedGroup.label}">
          <div class="reserved-command-head">
            <span>系统读取</span>
            <small>预留</small>
          </div>
          <div class="reserved-command-row">
            ${reservedGroup.commandIds.map((id) => this.renderCommandButton(id, "command-btn-reserved")).join("")}
          </div>
        </div>
      </div>
    `;
  }

  private renderCommandButton(commandId: string, variantClass: string): string {
    const command = this.businessCommand(commandId);
    return `
      <button class="btn command-btn ${variantClass} command-${command.action}" id="${command.id}" data-action="${
        command.action
      }" type="button">
        <span class="command-icon" aria-hidden="true">${this.commandSymbol(command.action)}</span>
        <span class="command-copy">
          <span class="command-title">${command.label}</span>
          <small>${this.commandHint(command)}</small>
        </span>
      </button>
    `;
  }

  private renderTimeControlEditor(): string {
    const params = this.timeControlDraft;
    const activeSegment = this.activeTimeControlSegment();
    const activeMaxDuration = this.maxDurationForActiveTimeSegment();
    const disabled = this.timeControlDisabledAttr();
    return `
      <section class="time-control-card" id="timeControlEditor" aria-label="时控模式参数">
        <div class="time-control-head">
          <div>
            <span class="time-control-eyebrow">时控模式</span>
          </div>
          <span class="time-control-state" id="timeControlSyncMeta">读参数回包同步</span>
        </div>

        <div class="time-control-grid">
          ${this.renderTimeControlStepper("电池类型", "timeBatteryTypeValue", this.formatTimeControlBatteryType(params.batteryType), "batteryType", 1, disabled)}
          ${this.renderTimeControlStepper("电池电压", "timeBatteryVoltageValue", this.formatTimeControlVoltage(params.batteryVoltageMv), "batteryVoltageMv", 100, disabled)}
          ${this.renderTimeControlStepper("光控延时", "timeLightDelayValue", `${params.lightDelaySeconds}s`, "lightDelaySeconds", 5, disabled)}
          ${this.renderTimeControlStepper("灵敏度", "timeSensitivityValue", this.formatTimeControlSensitivity(params.sensitivity), "sensitivity", 1, disabled)}
        </div>

        <label class="time-slider-block" for="timeMaxPwmRange">
          <span>
            最大输出百分比
            <b id="timeMaxPwmValue">${this.formatTimeControlMaxOutput(params.maxOutputByte)}</b>
          </span>
          <input id="timeMaxPwmRange" data-time-control type="range" min="0" max="255" step="1" value="${params.maxOutputByte}" ${disabled} />
        </label>

        <div class="time-segment-tabs" aria-label="时控时段">
          ${params.segments
            .map(
              (segment, index) => `
                <button
                  class="time-segment-tab ${index === this.activeTimeControlSegmentIndex ? "active" : ""}"
                  data-time-segment="${index}"
                  type="button"
                >
                  <span>${index + 1}</span>
                  <b>${this.formatTimeControlHalfHours(segment.durationHalfHours)}</b>
                </button>
              `
            )
            .join("")}
        </div>

        <div class="time-control-range-grid">
          <label class="time-slider-block" for="timeSegmentDurationRange">
            <span>
              当前时段时长
              <b id="timeSegmentDurationValue">${this.formatTimeControlHalfHours(activeSegment.durationHalfHours)}</b>
            </span>
            <input id="timeSegmentDurationRange" data-time-control type="range" min="${TIME_CONTROL_SEGMENT_MIN_HALF_HOURS}" max="${activeMaxDuration}" step="1" value="${
              activeSegment.durationHalfHours
            }" ${disabled} />
          </label>
          <label class="time-slider-block" for="timeSegmentPowerRange">
            <span>
              当前时段功率
              <b id="timeSegmentPowerValue">${activeSegment.powerPercent}%</b>
            </span>
            <input id="timeSegmentPowerRange" data-time-control type="range" min="0" max="100" step="5" value="${activeSegment.powerPercent}" ${disabled} />
          </label>
          <label class="time-slider-block" for="timeMorningDurationRange">
            <span>
              晨亮时长
              <b id="timeMorningDurationValue">${this.formatTimeControlMinutes(params.morningDurationMinutes)}</b>
            </span>
            <input id="timeMorningDurationRange" data-time-control type="range" min="0" max="${MAX_TIME_CONTROL_MINUTES}" step="${TIME_CONTROL_STEP_MINUTES}" value="${params.morningDurationMinutes}" ${disabled} />
          </label>
          <label class="time-slider-block" for="timeMorningPowerRange">
            <span>
              晨亮功率
              <b id="timeMorningPowerValue">${params.morningPowerPercent}%</b>
            </span>
            <input id="timeMorningPowerRange" data-time-control type="range" min="0" max="100" step="5" value="${params.morningPowerPercent}" ${disabled} />
          </label>
        </div>

        <div class="time-control-summary" id="timeSegmentSummary">
          ${this.renderTimeControlSegmentSummary()}
        </div>
      </section>
    `;
  }

  private renderTimeControlStepper(
    label: string,
    valueId: string,
    value: string,
    kind: "batteryType" | "batteryVoltageMv" | "lightDelaySeconds" | "sensitivity",
    step: number,
    disabled: string
  ): string {
    return `
      <div class="time-stepper">
        <span>${label}</span>
        <div>
          <button data-time-control data-time-step data-kind="${kind}" data-delta="${-step}" type="button" ${disabled}>-</button>
          <b id="${valueId}">${value}</b>
          <button data-time-control data-time-step data-kind="${kind}" data-delta="${step}" type="button" ${disabled}>+</button>
        </div>
      </div>
    `;
  }

  private commandPanelGroup(id: CommandPanelGroupId): CommandPanelGroup {
    const group = COMMAND_PANEL_GROUPS.find((item) => item.id === id);
    if (!group) {
      throw new Error(`Missing command panel group: ${id}`);
    }
    return group;
  }

  private businessCommand(commandId: string): BusinessCommand {
    const command = BUSINESS_COMMANDS.find((item) => item.id === commandId);
    if (!command) {
      throw new Error(`Missing business command: ${commandId}`);
    }
    return command;
  }

  private commandSymbol(action: BusinessCommandAction): string {
    const symbols: Record<BusinessCommandAction, string> = {
      readStatus: "S",
      readParams: "P",
      powerToggle: "I/O",
      brightnessUp: "+",
      brightnessDown: "-"
    };
    return symbols[action];
  }

  private commandHint(command: BusinessCommand): string {
    const hints: Partial<Record<BusinessCommandAction, string>> = {
      readStatus: "状态读取预留",
      readParams: "参数读取预留"
    };
    return hints[command.action] ?? command.description;
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
        const target = resolveDetailSectionTarget(button.dataset.detailTarget);
        this.setActiveDetailSection(target);
        this.scrollToDetailSection(target);
      });
    });
    for (const command of BUSINESS_COMMANDS) {
      this.byId(command.id).addEventListener("click", () => {
        void this.handleAction(command, () => this.controller[command.action]());
      });
    }
    this.bindTimeControlEvents();
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

  private bindTimeControlEvents(): void {
    this.root.querySelectorAll<HTMLButtonElement>("[data-time-step]").forEach((button) => {
      button.addEventListener("click", () => {
        const change = this.resolveTimeControlStepChange(button.dataset.kind, Number(button.dataset.delta || 0));
        if (change) {
          void this.commitTimeControlChange(change);
        }
      });
    });

    this.root.querySelectorAll<HTMLButtonElement>("[data-time-segment]").forEach((button) => {
      button.addEventListener("click", () => {
        const index = Number(button.dataset.timeSegment);
        if (!Number.isInteger(index) || index < 0 || index >= TIME_CONTROL_SEGMENT_COUNT) {
          return;
        }
        this.activeTimeControlSegmentIndex = index;
        this.refreshTimeControlEditor();
      });
    });

    this.bindTimeRange("timeMaxPwmRange", (value) => ({ kind: "maxOutputByte", value }));
    this.bindTimeRange("timeSegmentDurationRange", (value) => ({
      kind: "segmentDuration",
      segmentIndex: this.activeTimeControlSegmentIndex,
      value
    }));
    this.bindTimeRange("timeSegmentPowerRange", (value) => ({
      kind: "segmentPower",
      segmentIndex: this.activeTimeControlSegmentIndex,
      value
    }));
    this.bindTimeRange("timeMorningDurationRange", (value) => ({ kind: "morningDuration", value }));
    this.bindTimeRange("timeMorningPowerRange", (value) => ({ kind: "morningPower", value }));
  }

  private bindTimeRange(inputId: string, toChange: (value: number) => TimeControlChange): void {
    const input = this.root.querySelector<HTMLInputElement>(`#${inputId}`);
    if (!input) {
      return;
    }
    input.addEventListener("input", () => {
      this.updateTimeControlRangePreview(inputId, Number(input.value));
    });
    input.addEventListener("change", () => {
      void this.commitTimeControlChange(toChange(Number(input.value)));
    });
  }

  private resolveTimeControlStepChange(kind: string | undefined, delta: number): TimeControlChange | null {
    if (!Number.isFinite(delta) || delta === 0) {
      return null;
    }
    switch (kind) {
      case "batteryType":
        return { kind, value: this.clampTimeValue(this.timeControlDraft.batteryType + delta, 1, 3) };
      case "batteryVoltageMv":
        return { kind, value: this.clampTimeValue(this.timeControlDraft.batteryVoltageMv + delta, 0, 0xffff) };
      case "lightDelaySeconds":
        return { kind, value: this.clampTimeValue(this.timeControlDraft.lightDelaySeconds + delta, 5, 60) };
      case "sensitivity":
        return { kind, value: this.clampTimeValue(this.timeControlDraft.sensitivity + delta, 1, 4) };
      default:
        return null;
    }
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

  private async commitTimeControlChange(change: TimeControlChange): Promise<void> {
    if (!isControlReady(this.status)) {
      this.refreshTimeControlEditor();
      this.setResult("设备未就绪，时控参数未发送", "error");
      return;
    }
    try {
      const result = applyTimeControlChange(this.timeControlDraft, change);
      this.timeControlDraft = result.params;
      this.refreshTimeControlEditor();
      this.setResult("时控参数整包发送中...", "pending");
      const message = await this.controller.writeTimeControlParams(this.timeControlDraft);
      this.setResult(`时控参数整包已发送：${message}`, "success");
    } catch (error) {
      this.refreshTimeControlEditor();
      this.setResult(`时控参数失败：${this.errorMessage(error)}`, "error");
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

  private setActiveDetailSection(target: DetailSectionName): void {
    this.activeDetailSection = target;
    this.refreshDetailTabs();
  }

  private refreshDetailTabs(): void {
    this.root.querySelectorAll<HTMLButtonElement>(".detail-tab-button").forEach((button) => {
      const target = resolveDetailSectionTarget(button.dataset.detailTarget);
      const isActive = target === this.activeDetailSection;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-selected", String(isActive));
      button.setAttribute("aria-current", isActive ? "page" : "false");
    });
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

  private refreshTimeControlEditor(): void {
    if (!this.root.childElementCount) {
      return;
    }
    const params = this.timeControlDraft;
    const ready = isControlReady(this.status);
    const activeSegment = this.activeTimeControlSegment();
    const activeMaxDuration = this.maxDurationForActiveTimeSegment();

    this.setTextIfPresent("timeBatteryTypeValue", this.formatTimeControlBatteryType(params.batteryType));
    this.setTextIfPresent("timeBatteryVoltageValue", this.formatTimeControlVoltage(params.batteryVoltageMv));
    this.setTextIfPresent("timeLightDelayValue", `${params.lightDelaySeconds}s`);
    this.setTextIfPresent("timeSensitivityValue", this.formatTimeControlSensitivity(params.sensitivity));
    this.setTextIfPresent("timeMaxPwmValue", this.formatTimeControlMaxOutput(params.maxOutputByte));
    this.setTextIfPresent("timeSegmentDurationValue", this.formatTimeControlHalfHours(activeSegment.durationHalfHours));
    this.setTextIfPresent("timeSegmentPowerValue", `${activeSegment.powerPercent}%`);
    this.setTextIfPresent("timeMorningDurationValue", this.formatTimeControlMinutes(params.morningDurationMinutes));
    this.setTextIfPresent("timeMorningPowerValue", `${params.morningPowerPercent}%`);
    this.setTextIfPresent(
      "timeControlSyncMeta",
      this.status.timeControlParams ? "已按读参数回包同步" : "等待读参数回包"
    );

    this.setTimeRangeValue("timeMaxPwmRange", params.maxOutputByte);
    this.setTimeRangeValue("timeSegmentDurationRange", activeSegment.durationHalfHours, activeMaxDuration);
    this.setTimeRangeValue("timeSegmentPowerRange", activeSegment.powerPercent);
    this.setTimeRangeValue("timeMorningDurationRange", params.morningDurationMinutes);
    this.setTimeRangeValue("timeMorningPowerRange", params.morningPowerPercent);

    const summary = this.root.querySelector<HTMLElement>("#timeSegmentSummary");
    if (summary) {
      summary.innerHTML = this.renderTimeControlSegmentSummary();
    }

    this.root.querySelectorAll<HTMLButtonElement>("[data-time-segment]").forEach((button) => {
      const index = Number(button.dataset.timeSegment);
      const segment = params.segments[index];
      button.classList.toggle("active", index === this.activeTimeControlSegmentIndex);
      if (segment) {
        const duration = button.querySelector("b");
        if (duration) {
          duration.textContent = this.formatTimeControlHalfHours(segment.durationHalfHours);
        }
      }
    });

    this.root.querySelectorAll<HTMLInputElement | HTMLButtonElement>("[data-time-control]").forEach((control) => {
      control.disabled = !ready;
    });
  }

  private setTimeRangeValue(inputId: string, value: number, max?: number): void {
    const input = this.root.querySelector<HTMLInputElement>(`#${inputId}`);
    if (!input) {
      return;
    }
    input.value = String(value);
    if (max != null) {
      input.max = String(max);
    }
  }

  private updateTimeControlRangePreview(inputId: string, value: number): void {
    if (!Number.isFinite(value)) {
      return;
    }
    if (inputId === "timeMaxPwmRange") {
      this.setTextIfPresent("timeMaxPwmValue", this.formatTimeControlMaxOutput(value));
    } else if (inputId === "timeSegmentDurationRange") {
      this.setTextIfPresent("timeSegmentDurationValue", this.formatTimeControlHalfHours(value));
    } else if (inputId === "timeSegmentPowerRange") {
      this.setTextIfPresent("timeSegmentPowerValue", `${value}%`);
    } else if (inputId === "timeMorningDurationRange") {
      this.setTextIfPresent("timeMorningDurationValue", this.formatTimeControlMinutes(value));
    } else if (inputId === "timeMorningPowerRange") {
      this.setTextIfPresent("timeMorningPowerValue", `${value}%`);
    }
  }

  private renderTimeControlSegmentSummary(): string {
    const total = this.timeControlDraft.segments.reduce((sum, segment) => sum + segment.durationHalfHours, 0);
    return `
      ${this.timeControlDraft.segments
        .map(
          (segment, index) => `
            <span>
              ${index + 1}段
              <b>${this.formatTimeControlHalfHours(segment.durationHalfHours)} / ${segment.powerPercent}%</b>
            </span>
          `
        )
        .join("")}
      <span class="time-control-total">累计 <b id="timeTotalDurationValue">${this.formatTimeControlHalfHours(total)}</b></span>
    `;
  }

  private activeTimeControlSegment(): TimeControlParams["segments"][number] {
    this.activeTimeControlSegmentIndex = this.clampTimeValue(
      this.activeTimeControlSegmentIndex,
      0,
      TIME_CONTROL_SEGMENT_COUNT - 1
    );
    return this.timeControlDraft.segments[this.activeTimeControlSegmentIndex] ?? this.timeControlDraft.segments[0];
  }

  private maxDurationForActiveTimeSegment(): number {
    const otherDuration = this.timeControlDraft.segments.reduce(
      (sum, segment, index) => (index === this.activeTimeControlSegmentIndex ? sum : sum + segment.durationHalfHours),
      0
    );
    const available = Math.max(TIME_CONTROL_SEGMENT_MIN_HALF_HOURS, MAX_TOTAL_SEGMENT_HALF_HOURS - otherDuration);
    return Math.min(TIME_CONTROL_SEGMENT_MAX_HALF_HOURS, available);
  }

  private timeControlDisabledAttr(): string {
    return isControlReady(this.status) ? "" : "disabled";
  }

  private clampTimeValue(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) {
      return min;
    }
    return Math.min(max, Math.max(min, Math.round(value)));
  }

  private formatTimeControlMinutes(value: number): string {
    const safeValue = Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
    const hours = Math.floor(safeValue / 60);
    const minutes = safeValue % 60;
    if (!hours) {
      return `${minutes}min`;
    }
    return minutes ? `${hours}h${minutes}m` : `${hours}h`;
  }

  private formatTimeControlHalfHours(value: number): string {
    const units = this.clampTimeValue(value, 0, MAX_TOTAL_SEGMENT_HALF_HOURS);
    const minutes = units * 30;
    return `${units}档 / ${this.formatTimeControlMinutes(minutes)}`;
  }

  private formatTimeControlMaxOutput(value: number): string {
    const raw = this.clampTimeValue(value, 0, 0xff);
    const percent = maxOutputByteToPercent(raw);
    return `${percent % 1 === 0 ? percent.toFixed(0) : percent.toFixed(1)}%`;
  }

  private formatTimeControlBatteryType(value: number): string {
    const labels: Record<number, string> = {
      1: "磷酸铁锂",
      2: "锂电池",
      3: "铅酸"
    };
    return labels[value] ?? `类型${value}`;
  }

  private formatTimeControlVoltage(value: number): string {
    return `${(value / 1000).toFixed(1)}V`;
  }

  private formatTimeControlSensitivity(value: number): string {
    const labels: Record<number, string> = {
      1: "高",
      2: "中",
      3: "低",
      4: "远程"
    };
    return labels[value] ?? `${value}档`;
  }

  private setTextIfPresent(id: string, text: string): void {
    const node = this.root.querySelector<HTMLElement>(`#${id}`);
    if (node) {
      node.textContent = text;
    }
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
    this.refreshTimeControlEditor();
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
    this.activeDetailSection = DEFAULT_DETAIL_SECTION;
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
    this.activeDetailSection = DEFAULT_DETAIL_SECTION;
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
      this.activeDetailSection = DEFAULT_DETAIL_SECTION;
      this.render();
    });
  }

  private installSystemInsetBridge(): void {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }
    window.__edgeBuildId = EDGE_BUILD_ID;
    document.documentElement.dataset.edgeBuild = EDGE_BUILD_ID;
    window.solarRemoteSetEdgeMode = (mode) => {
      applyEdgeModeToClassList(document.body.classList, mode);
    };
    window.solarRemoteSetEdgeMode(EDGE_DEFAULT_MODE);
    if (!window.__edgeBuildLogged && typeof console !== "undefined" && typeof console.info === "function") {
      window.__edgeBuildLogged = true;
      console.info(`[EdgeT031] build id = ${EDGE_BUILD_ID}`);
    }
    window.solarRemoteApplySystemInsets = (insets) => {
      window.__nativeSystemInsets = { ...insets };
      const viewportWidth = window.innerWidth || insets.viewportWidth;
      const meta = createNativeSystemInsetsMeta(insets, viewportWidth);
      window.__nativeSystemInsetsMeta = meta;
      applySystemInsetsToStyle(document.documentElement.style, insets, viewportWidth);
      if (
        meta.ratioApplied &&
        !window.__edgeInsetsMismatchLogged &&
        typeof console !== "undefined" &&
        typeof console.info === "function"
      ) {
        window.__edgeInsetsMismatchLogged = true;
        console.info("[solar-edge-insets] viewport/native CSS width mismatch; using width ratio", meta);
      }
    };
    if (window.__nativeSystemInsets) {
      window.solarRemoteApplySystemInsets(window.__nativeSystemInsets);
    }
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
