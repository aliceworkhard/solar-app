import { describe, expect, it } from "vitest";
import {
  BUSINESS_COMMANDS,
  DEVICE_STALE_AFTER_MS,
  DISCOVERY_INTERVAL_MS,
  isControlReady,
  mergeDiscoveryDevices
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

describe("App UI command model", () => {
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

  it("enables business controls only after the controller reaches ready", () => {
    expect(isControlReady(status("ready"))).toBe(true);
    expect(isControlReady(status("connecting"))).toBe(false);
    expect(isControlReady(status("subscribing"))).toBe(false);
    expect(isControlReady(status("error"))).toBe(false);
  });
});

describe("App discovery model", () => {
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
});

function device(deviceId: string, name: string, rssi: number): DeviceBrief {
  return { deviceId, name, rssi };
}
