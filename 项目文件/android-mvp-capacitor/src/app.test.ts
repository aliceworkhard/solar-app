import { describe, expect, it } from "vitest";
import {
  BOTTOM_NAV_ITEMS,
  BUSINESS_COMMANDS,
  COMMAND_PANEL_GROUPS,
  CONTENT_SAFE_INSET_CSS_VARS,
  DEFAULT_DETAIL_SECTION,
  DETAIL_SECTION_ANCHORS,
  DEVICE_ASSET_SRC,
  DEVICE_STALE_AFTER_MS,
  DISCOVERY_INTERVAL_MS,
  EDGE_BUILD_ID,
  EDGE_DEFAULT_MODE,
  EDGE_DIAGNOSTIC_DOM_BACKGROUND,
  EDGE_DIAGNOSTIC_CSS_VARS,
  EDGE_MODE_BODY_CLASSES,
  LOAD_CURRENT_BRIGHTNESS_FACTOR_AMP,
  PROFILE_PAGE_COPY,
  REFERENCE_UI_CHROME,
  REFERENCE_UI_COPY,
  SYSTEM_INSET_CSS_VARS,
  STATUS_POLL_INTERVAL_MS,
  SWIPE_DISCONNECT_ACTION_WIDTH_PX,
  SWIPE_DISCONNECT_THRESHOLD_PX,
  TARGET_DEVICE_NAME,
  applyEdgeModeToClassList,
  applySystemInsetsToStyle,
  createLiveStatusModel,
  createNearbyDeviceMetrics,
  filterSupportedDevices,
  formatBatteryPercent,
  formatBatteryVoltage,
  formatLoadCurrent,
  formatSolarVoltage,
  formatWorkMinutes,
  isControlReady,
  mergeDiscoveryDevices,
  resolveNativeBackAction,
  resolveBackNavigation,
  resolveBottomNavTab,
  resolveDiscoveryControlState,
  resolveDetailSectionTarget,
  resolveSwipeDisconnectState,
  normalizeEdgeMode,
  resolveNativeCssPx,
  shouldAutoConnectSupportedDevice,
  shouldScheduleInitialDiscovery,
  shouldStartBackgroundDiscovery,
  shouldOpenControlForConnectedDevice,
  shouldPollReadStatus,
  shouldRefreshEnterControl
} from "./app";
import type { DeviceBrief, DeviceStatus } from "./types";

function status(connectionState: DeviceStatus["connectionState"]): DeviceStatus {
  return {
    connected: connectionState === "ready",
    connectionState,
    mode: "radar",
    power: 0,
    battery: 0,
    fwVersion: "unknown",
    lastUpdatedAt: 0
  };
}

function classListProbe(initial: string[] = []): {
  classList: DOMTokenList;
  values: () => string[];
} {
  const classes = new Set(initial);
  return {
    classList: {
      add(...tokens: string[]) {
        tokens.forEach((token) => classes.add(token));
      },
      remove(...tokens: string[]) {
        tokens.forEach((token) => classes.delete(token));
      }
    } as DOMTokenList,
    values: () => Array.from(classes).sort()
  };
}

describe("App UI command model", () => {
  it("keeps the two-page shell aligned to the provided Chinese reference screens", () => {
    expect(REFERENCE_UI_COPY.homeTitle).toBe("设备");
    expect(REFERENCE_UI_COPY.homeSubtitle).toBe("连接并管理您的 MPPT 设备");
    expect(REFERENCE_UI_COPY.sceneTitle).toBe("场景");
    expect(REFERENCE_UI_COPY.profileTitle).toBe("我的");
    expect(REFERENCE_UI_COPY.profileSubtitle).toBe("管理您的账号与应用设置");
    expect(REFERENCE_UI_COPY.scanSearching).toBe("正在搜索附近设备...");
    expect(REFERENCE_UI_COPY.nearbySectionTitle).toBe("附近设备");
    expect(REFERENCE_UI_COPY.controlTabs).toEqual(["设备状态", "控制面板"]);
    expect(REFERENCE_UI_COPY.commandPanelTitle).toBe("控制面板");
  });

  it("uses the extracted transparent MPPT controller image instead of a full-page screenshot as UI material", () => {
    expect(DEVICE_ASSET_SRC).toBe("/assets/ui/mppt_gray_black_controller_transparent.png");
  });

  it("removes placeholder phone chrome and default waiting feedback from the app UI", () => {
    expect(REFERENCE_UI_CHROME.showMockStatusBar).toBe(false);
    expect(REFERENCE_UI_CHROME.showControlMoreMenu).toBe(false);
    expect(REFERENCE_UI_CHROME.showDefaultFeedbackCard).toBe(false);
    expect(REFERENCE_UI_CHROME.showHomeSummaryCard).toBe(false);
    expect(REFERENCE_UI_CHROME.showHomeScanCard).toBe(false);
    expect(REFERENCE_UI_CHROME.modeSelectorPlacement).toBe("control-panel-bottom");
    expect(REFERENCE_UI_CHROME.detailNavigationMode).toBe("anchor-scroll");
    expect(REFERENCE_UI_CHROME.bottomNavigation).toBe(true);
    expect(REFERENCE_UI_CHROME.statusBarGradientFallback).toBe(true);
    expect(DETAIL_SECTION_ANCHORS).toEqual({
      status: "deviceStatusSection",
      controls: "controlPanelSection"
    });
  });

  it("defaults the detail anchor tabs to device status and normalizes invalid targets", () => {
    expect(DEFAULT_DETAIL_SECTION).toBe("status");
    expect(resolveDetailSectionTarget("status")).toBe("status");
    expect(resolveDetailSectionTarget("controls")).toBe("controls");
    expect(resolveDetailSectionTarget("")).toBe("status");
    expect(resolveDetailSectionTarget(undefined)).toBe("status");
    expect(resolveDetailSectionTarget("unknown")).toBe("status");
  });

  it("defines the bottom tabs and the profile page copy without changing BLE command paths", () => {
    expect(BOTTOM_NAV_ITEMS.map((item) => item.label)).toEqual(["设备", "场景", "我的"]);
    expect(BOTTOM_NAV_ITEMS.map((item) => item.id)).toEqual(["device", "scene", "profile"]);
    expect(PROFILE_PAGE_COPY.userName).toBe("MPPT 用户");
    expect(PROFILE_PAGE_COPY.settings).toContain("固件升级");
    expect(resolveBottomNavTab("home")).toBe("device");
    expect(resolveBottomNavTab("control")).toBe("device");
    expect(resolveBottomNavTab("scene")).toBe("scene");
    expect(resolveBottomNavTab("profile")).toBe("profile");
  });

  it("uses compact profile labels that can stay in one row on narrow Android screens", () => {
    expect((PROFILE_PAGE_COPY as any).deviceStatLabels).toEqual(["在线", "可连", "离线"]);
    expect((PROFILE_PAGE_COPY as any).sceneLabels).toEqual(["夜间", "日常", "节能", "高亮"]);
    expect((PROFILE_PAGE_COPY as any).deviceStatLabels.every((label: string) => label.length <= 2)).toBe(true);
    expect((PROFILE_PAGE_COPY as any).sceneLabels.every((label: string) => label.length <= 2)).toBe(true);
  });

  it("maps Android system insets into CSS variables for segmented edge-to-edge layout", () => {
    const written = new Map<string, string>();
    applySystemInsetsToStyle(
      {
        setProperty(name: string, value: string) {
          written.set(name, value);
        }
      },
      { top: 32, right: 3, bottom: 24, left: 2 }
    );

    expect(SYSTEM_INSET_CSS_VARS).toEqual({
      top: "--system-top",
      right: "--system-right",
      bottom: "--system-bottom",
      left: "--system-left"
    });
    expect(Object.fromEntries(written)).toMatchObject({
      "--native-inset-top": "32px",
      "--native-inset-right": "3px",
      "--native-inset-bottom": "24px",
      "--native-inset-left": "2px",
      "--system-top": "32px",
      "--system-right": "3px",
      "--system-bottom": "24px",
      "--system-left": "2px"
    });
  });

  it("preserves native CSS-pixel inset strings and writes native plus legacy variables", () => {
    const written = new Map<string, string>();
    applySystemInsetsToStyle(
      {
        setProperty(name: string, value: string) {
          written.set(name, value);
        }
      },
      { top: "27.5px", right: 0, bottom: "16.25px", left: "3px" } as any
    );

    expect(Object.fromEntries(written)).toMatchObject({
      "--native-inset-top": "27.5px",
      "--native-inset-right": "0px",
      "--native-inset-bottom": "16.25px",
      "--native-inset-left": "3px",
      "--system-top": "27.5px",
      "--system-right": "0px",
      "--system-bottom": "16.25px",
      "--system-left": "3px"
    });
  });

  it("keeps ordinary side gesture insets out of the main content safe padding", () => {
    const written = new Map<string, string>();
    applySystemInsetsToStyle(
      {
        setProperty(name: string, value: string) {
          written.set(name, value);
        }
      },
      { top: "28px", right: "18px", bottom: "24px", left: "16px" } as any
    );

    expect(CONTENT_SAFE_INSET_CSS_VARS).toEqual({
      left: "--content-safe-left",
      right: "--content-safe-right"
    });
    expect(Object.fromEntries(written)).toMatchObject({
      "--native-inset-left": "16px",
      "--native-inset-right": "18px",
      "--content-safe-left": "0px",
      "--content-safe-right": "0px"
    });
  });

  it("uses explicit horizontal cutout/system-bar safe insets separately from gesture insets", () => {
    const written = new Map<string, string>();
    applySystemInsetsToStyle(
      {
        setProperty(name: string, value: string) {
          written.set(name, value);
        }
      },
      { left: "16px", right: "18px", contentLeft: "4px", contentRight: "6px" } as any
    );

    expect(Object.fromEntries(written)).toMatchObject({
      "--native-inset-left": "16px",
      "--native-inset-right": "18px",
      "--content-safe-left": "4px",
      "--content-safe-right": "6px"
    });
  });

  it("converts native physical px to CSS px with a width-ratio fallback when density width mismatches", () => {
    expect(resolveNativeCssPx(60, { density: 3, webViewWidthPx: 1170, viewportWidth: 390 })).toBe("20px");
    expect(resolveNativeCssPx(60, { density: 3, webViewWidthPx: 1080, viewportWidth: 390 })).toBe("21.67px");
    expect(resolveNativeCssPx(0, { density: 3, webViewWidthPx: 1080, viewportWidth: 390 })).toBe("0px");
  });

  it("exposes a T031 build identity that can prove the installed APK is current", () => {
    expect(EDGE_BUILD_ID).toBe("T031-system-bars-final");
  });

  it("defaults the final edge mode to transparent strips rather than visual fallback", () => {
    const classes = classListProbe(["edge-visual-fallback"]);

    expect(EDGE_DEFAULT_MODE).toBe("transparent");
    applyEdgeModeToClassList(classes.classList, EDGE_DEFAULT_MODE);

    expect(classes.values()).toEqual(["edge-transparent"]);
  });

  it("keeps the DOM diagnostic overlay transparent unless native explicitly enables it", () => {
    const written = new Map<string, string>();

    expect(EDGE_DIAGNOSTIC_DOM_BACKGROUND.disabled).toBe("transparent");
    applySystemInsetsToStyle(
      {
        setProperty(name: string, value: string) {
          written.set(name, value);
        }
      },
      { top: 24, bottom: 16, diagnosticColors: false }
    );

    expect(written.get(EDGE_DIAGNOSTIC_CSS_VARS.domBackground)).toBe("transparent");
  });

  it("normalizes native edge strategy values into stable body classes", () => {
    expect(EDGE_MODE_BODY_CLASSES).toEqual({
      transparent: "edge-transparent",
      "color-match": "edge-color-match",
      "visual-fallback": "edge-visual-fallback"
    });
    expect(normalizeEdgeMode("visual-fallback")).toBe("visual-fallback");
    expect(normalizeEdgeMode("color-match")).toBe("color-match");
    expect(normalizeEdgeMode("unexpected")).toBe("transparent");
  });

  it("switches one edge strategy body class at a time without disturbing other classes", () => {
    const classes = classListProbe(["app-ready", "edge-transparent"]);

    applyEdgeModeToClassList(classes.classList, "visual-fallback");
    expect(classes.values()).toEqual(["app-ready", "edge-visual-fallback"]);

    applyEdgeModeToClassList(classes.classList, "color-match");
    expect(classes.values()).toEqual(["app-ready", "edge-color-match"]);
  });

  it("maps the two-page control surface to the five RF MVP commands once each", () => {
    expect(BUSINESS_COMMANDS.map((command) => command.id)).toEqual([
      "readStatusBtn",
      "readParamsBtn",
      "powerToggleBtn",
      "brightnessUpBtn",
      "brightnessDownBtn"
    ]);
    expect(BUSINESS_COMMANDS.map((command) => command.action)).toEqual([
      "readStatus",
      "readParams",
      "powerToggle",
      "brightnessUp",
      "brightnessDown"
    ]);
    expect(new Set(BUSINESS_COMMANDS.map((command) => command.action)).size).toBe(5);
  });

  it("prioritizes manual controls and keeps read commands as reserved tools", () => {
    expect(COMMAND_PANEL_GROUPS).toEqual([
      { id: "primary", label: "主要控制", commandIds: ["powerToggleBtn"] },
      { id: "brightness", label: "亮度调节", commandIds: ["brightnessDownBtn", "brightnessUpBtn"] },
      { id: "reserved", label: "系统读取预留", commandIds: ["readStatusBtn", "readParamsBtn"] }
    ]);

    const groupedCommandIds = COMMAND_PANEL_GROUPS.flatMap((group) => group.commandIds);
    expect(groupedCommandIds).toHaveLength(BUSINESS_COMMANDS.length);
    expect(new Set(groupedCommandIds)).toEqual(new Set(BUSINESS_COMMANDS.map((command) => command.id)));
  });

  it("enables business controls only after the controller reaches ready", () => {
    expect(isControlReady(status("ready"))).toBe(true);
    expect(isControlReady(status("connecting"))).toBe(false);
    expect(isControlReady(status("subscribing"))).toBe(false);
    expect(isControlReady(status("error"))).toBe(false);
  });
});

describe("App status formatting", () => {
  it("formats read-status effective values with physical units", () => {
    const readableStatus: DeviceStatus = {
      ...status("ready"),
      workMinutes: 75,
      batteryVoltage: 12.35,
      loadCurrentAmp: 1.23,
      solarVoltage: 18.4
    };

    expect(formatWorkMinutes(readableStatus)).toBe("1h 15min");
    expect(formatBatteryVoltage(readableStatus)).toBe("12.35V");
    expect(formatLoadCurrent(readableStatus)).toBe("1.23A");
    expect(formatSolarVoltage(readableStatus)).toBe("18.4V");
  });

  it("uses returned load current while brightness is zero and derives current from brightness when lit", () => {
    expect(LOAD_CURRENT_BRIGHTNESS_FACTOR_AMP).toBe(9.7272);
    expect(formatLoadCurrent({ ...status("ready"), power: 0, loadCurrentAmp: 1.23 })).toBe("1.23A");
    expect(formatLoadCurrent({ ...status("ready"), power: 30, loadCurrentAmp: 1.23 })).toBe("2.92A");
    expect(formatLoadCurrent({ ...status("ready"), power: 100 })).toBe("9.73A");
  });

  it("converts battery voltage to a clamped percentage for the Live Status chip", () => {
    expect(formatBatteryPercent({ ...status("ready"), batteryVoltage: 3.4 })).toBe("100%");
    expect(formatBatteryPercent({ ...status("ready"), batteryVoltage: 2.5 })).toBe("0%");
    expect(formatBatteryPercent({ ...status("ready"), batteryVoltage: 2.95 })).toBe("50%");
    expect(formatBatteryPercent({ ...status("ready"), batteryVoltage: 4.2 })).toBe("100%");
    expect(formatBatteryPercent({ ...status("ready"), batteryVoltage: 2.1 })).toBe("0%");
    expect(formatBatteryPercent(status("ready"))).toBe("-");
  });
});

describe("App discovery model", () => {
  it("only allows the locked AC632N_1 device into the UI discovery list", () => {
    const devices = [
      device("D1", TARGET_DEVICE_NAME, -52),
      device("D2", "AC632N_2", -42),
      device("D3", "Other", -36),
      device("D4", " AC632N_1 ", -58)
    ];

    expect(filterSupportedDevices(devices)).toEqual([
      device("D1", TARGET_DEVICE_NAME, -52),
      device("D4", " AC632N_1 ", -58)
    ]);
  });

  it("opens the detail view instead of reconnecting when the active ready device card is tapped", () => {
    expect(shouldOpenControlForConnectedDevice("D1", "D1", status("ready"))).toBe(true);
    expect(shouldOpenControlForConnectedDevice("D1", "D1", status("connecting"))).toBe(true);
    expect(shouldOpenControlForConnectedDevice("D1", "D1", status("discovering"))).toBe(true);
    expect(shouldOpenControlForConnectedDevice("D1", "D1", status("subscribing"))).toBe(true);
    expect(shouldOpenControlForConnectedDevice("D1", "D2", status("ready"))).toBe(false);
    expect(shouldOpenControlForConnectedDevice("D1", "D1", status("disconnected"))).toBe(false);
  });

  it("schedules startup discovery only when no BLE operation is active", () => {
    expect(shouldScheduleInitialDiscovery(status("idle"), false, false)).toBe(true);
    expect(shouldScheduleInitialDiscovery(status("ready"), false, false)).toBe(true);
    expect(shouldScheduleInitialDiscovery(status("idle"), true, false)).toBe(false);
    expect(shouldScheduleInitialDiscovery(status("connecting"), false, false)).toBe(false);
    expect(shouldScheduleInitialDiscovery(status("idle"), false, true)).toBe(false);
  });

  it("auto-connects only when the locked target is present and no connection is active", () => {
    expect(shouldAutoConnectSupportedDevice([device("D1", TARGET_DEVICE_NAME, -52)], status("idle"), false)).toBe(true);
    expect(shouldAutoConnectSupportedDevice([device("D2", "AC632N_2", -42)], status("idle"), false)).toBe(false);
    expect(shouldAutoConnectSupportedDevice([device("D1", TARGET_DEVICE_NAME, -52)], status("ready"), false)).toBe(false);
    expect(shouldAutoConnectSupportedDevice([device("D1", TARGET_DEVICE_NAME, -52)], status("idle"), true)).toBe(false);
  });

  it("keeps refresh as a list refresh even when a target device is already connected", () => {
    expect(shouldRefreshEnterControl(status("ready"))).toBe(false);
    expect(shouldRefreshEnterControl(status("idle"))).toBe(false);
  });

  it("allows non-blocking background discovery while blocking duplicate or connection-phase scans", () => {
    expect(shouldStartBackgroundDiscovery(status("idle"), false)).toBe(true);
    expect(shouldStartBackgroundDiscovery(status("ready"), false)).toBe(true);
    expect(shouldStartBackgroundDiscovery(status("idle"), true)).toBe(false);
    expect(shouldStartBackgroundDiscovery(status("connecting"), false)).toBe(false);
    expect(shouldStartBackgroundDiscovery(status("discovering"), false)).toBe(false);
    expect(shouldStartBackgroundDiscovery(status("subscribing"), false)).toBe(false);
  });

  it("keeps the discovery stop control clickable and restores the plus state after stop", () => {
    expect(resolveDiscoveryControlState(true, true, "scanning")).toMatchObject({
      label: "×",
      title: "停止持续发现",
      isDanger: true,
      disabled: false
    });
    expect(resolveDiscoveryControlState(false, false, "idle")).toMatchObject({
      label: "+",
      title: "持续发现设备",
      isDanger: false,
      disabled: false
    });
  });

  it("maps system back from control to home before allowing app exit", () => {
    expect(resolveBackNavigation("control")).toBe("home");
    expect(resolveBackNavigation("home")).toBe("exit");
    expect(resolveBackNavigation("scene")).toBe("exit");
    expect(resolveBackNavigation("profile")).toBe("exit");
  });

  it("consumes Android native back on the control page and allows exit from home", () => {
    expect(resolveNativeBackAction("control")).toBe("handled");
    expect(resolveNativeBackAction("home")).toBe("exit");
    expect(resolveNativeBackAction("scene")).toBe("exit");
    expect(resolveNativeBackAction("profile")).toBe("exit");
  });

  it("builds a Live Status model from real read-status fields only", () => {
    const model = createLiveStatusModel({
      ...status("ready"),
      mode: "radar",
      power: 85,
      workMinutes: 27,
      batteryVoltage: 12.8,
      loadCurrentAmp: 1.5,
      solarVoltage: 18.6
    });

    expect(model.caption).toBe("LIVE STATUS");
    expect(model.modeLabel).toBe("雷达");
    expect(model.batteryType).toBe("磷酸铁锂");
    expect(model.workTime).toBe("27min");
    expect(model.brightness).toBe("85%");
    expect(model.batteryVoltage).toBe("12.80V");
    expect(model.batteryPercent).toBe("100%");
    expect(model.loadCurrent).toBe("8.27A");
    expect(model.solarVoltage).toBe("18.6V");
    expect("batteryLevel" in model).toBe(false);
    expect("morningTime" in model).toBe(false);
    expect("lightsOffTime" in model).toBe(false);
  });

  it("shows nearby-device inline metrics only for the active connected target", () => {
    const connectedStatus: DeviceStatus = {
      ...status("ready"),
      mode: "radar",
      power: 56,
      batteryVoltage: 12.34,
      solarVoltage: 18.4
    };

    expect(createNearbyDeviceMetrics("D1", "D1", connectedStatus)).toEqual({
      mode: "radar",
      batteryVoltage: "12.34V",
      solarVoltage: "18.4V",
      power: "56%"
    });
    expect(createNearbyDeviceMetrics("D2", "D1", connectedStatus)).toEqual({
      mode: "-",
      batteryVoltage: "-",
      solarVoltage: "-",
      power: "-"
    });
  });

  it("keeps same-name devices separate by deviceId and preserves the connected device", () => {
    const firstRound = mergeDiscoveryDevices([], [device("A1", "AC632N", -60)], {
      activeDeviceId: "",
      now: 1000,
      scanRound: 1,
      usedFallback: false
    });

    const secondRound = mergeDiscoveryDevices(firstRound, [device("B2", "AC632N", -52)], {
      activeDeviceId: "A1",
      now: 2000,
      scanRound: 2,
      usedFallback: false
    });

    expect(secondRound.map((item) => item.deviceId).sort()).toEqual(["A1", "B2"]);
    expect(secondRound.find((item) => item.deviceId === "A1")?.isConnected).toBe(true);
    expect(secondRound.find((item) => item.deviceId === "B2")?.name).toBe("AC632N");
  });

  it("keeps a disconnected device visible but demotes it below connectable scan results", () => {
    const firstRound = mergeDiscoveryDevices(
      [],
      [device("A1", TARGET_DEVICE_NAME, -34), device("B2", TARGET_DEVICE_NAME, -64)],
      {
        activeDeviceId: "A1",
        now: 1000,
        scanRound: 1,
        usedFallback: false
      }
    );

    const afterDisconnect = mergeDiscoveryDevices(firstRound, [device("A1", TARGET_DEVICE_NAME, -32)], {
      activeDeviceId: "",
      now: 2000,
      scanRound: 2,
      usedFallback: false,
      recentlyDisconnectedDeviceId: "A1"
    });

    expect(afterDisconnect.map((item) => item.deviceId)).toEqual(["B2", "A1"]);
    expect(afterDisconnect.find((item) => item.deviceId === "A1")?.isConnected).toBe(false);
    expect(afterDisconnect.find((item) => item.deviceId === "A1")?.isRecentlyDisconnected).toBe(true);
  });

  it("marks missing devices stale before removing them from the list", () => {
    const firstRound = mergeDiscoveryDevices([], [device("A1", "AC632N", -60)], {
      activeDeviceId: "",
      now: 1000,
      scanRound: 1,
      usedFallback: false
    });

    const staleRound = mergeDiscoveryDevices(firstRound, [], {
      activeDeviceId: "",
      now: 1000 + DEVICE_STALE_AFTER_MS + 1,
      scanRound: 2,
      usedFallback: false
    });

    expect(staleRound).toHaveLength(1);
    expect(staleRound[0]?.isStale).toBe(true);
  });

  it("uses a five second interval for continuous discovery rounds", () => {
    expect(DISCOVERY_INTERVAL_MS).toBe(5000);
  });

  it("polls read-status every five seconds only while the active device is ready", () => {
    expect(STATUS_POLL_INTERVAL_MS).toBe(5000);
    expect(shouldPollReadStatus(status("ready"), false)).toBe(true);
    expect(shouldPollReadStatus(status("ready"), true)).toBe(false);
    expect(shouldPollReadStatus(status("connecting"), false)).toBe(false);
    expect(shouldPollReadStatus(status("disconnected"), false)).toBe(false);
  });

  it("opens the disconnect action only after a deliberate left swipe on a connected card", () => {
    expect(SWIPE_DISCONNECT_THRESHOLD_PX).toBeGreaterThanOrEqual(60);
    expect(SWIPE_DISCONNECT_ACTION_WIDTH_PX).toBe(96);
    expect(resolveSwipeDisconnectState(-SWIPE_DISCONNECT_THRESHOLD_PX, true)).toBe("open");
    expect(resolveSwipeDisconnectState(-20, true)).toBe("closed");
    expect(resolveSwipeDisconnectState(-SWIPE_DISCONNECT_THRESHOLD_PX, false)).toBe("closed");
  });
});

function device(deviceId: string, name: string, rssi: number): DeviceBrief {
  return { deviceId, name, rssi };
}
