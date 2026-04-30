import { describe, expect, it } from "vitest";
import { CommandBuilder } from "./commandBuilder";
import { DEFAULT_TIME_CONTROL_PARAMS } from "./timeControlParams";

describe("CommandBuilder definitions", () => {
  it("matches the five RF MVP command payloads from the minimum command table", () => {
    expect(
      Object.fromEntries(
        CommandBuilder.allDefinitions().map((command) => [command.name, command.payloadHex])
      )
    ).toEqual({
      powerToggle: "FFCE06000A0000300D",
      brightnessUp: "FFCE06000B0000300E",
      brightnessDown: "FFCE06000C0000300F",
      readParams: "FFCE06000D00003010",
      readStatus: "FFCE06000E00003011"
    });
  });

  it("returns command definitions with payload and no response wait by default", () => {
    expect(CommandBuilder.readStatus()).toMatchObject({
      name: "readStatus",
      kind: "query",
      expectedResponse: 0xe1,
      waitForResponse: false,
      retryCount: 0,
      updatesStatus: true
    });

    const powerToggle = CommandBuilder.powerToggle();
    expect(powerToggle).toMatchObject({
      name: "powerToggle",
      kind: "control",
      waitForResponse: false,
      retryCount: 0,
      updatesStatus: false
    });
    expect(powerToggle.expectedResponse).toBeUndefined();
  });

  it("defines all five MVP commands", () => {
    const commands = CommandBuilder.allDefinitions();
    expect(commands.map((item) => item.name)).toEqual([
      "readStatus",
      "readParams",
      "powerToggle",
      "brightnessUp",
      "brightnessDown"
    ]);
  });

  it("builds a non-blocking full time-control parameter frame without adding it to the MVP command list", () => {
    const command = CommandBuilder.writeTimeControlParams({
      ...DEFAULT_TIME_CONTROL_PARAMS,
      batteryType: 1,
      batteryVoltageMv: 3200,
      maxOutputByte: 0xff,
      lightDelaySeconds: 30,
      sensitivity: 2,
      segments: [
        { durationHalfHours: 4, powerPercent: 80 },
        { durationHalfHours: 3, powerPercent: 100 },
        { durationHalfHours: 2, powerPercent: 50 },
        { durationHalfHours: 1, powerPercent: 30 },
        { durationHalfHours: 1, powerPercent: 30 }
      ],
      morningDurationMinutes: 60,
      morningPowerPercent: 30
    });

    expect(command).toMatchObject({
      name: "writeTimeControlParams",
      kind: "control",
      waitForResponse: false,
      retryCount: 0,
      updatesStatus: false,
      payloadHex: "FFCE1A00B10001010C80FF001E02182A363C42CCFF804D4D0C4D0030A9"
    });
    expect(command.payloadHex.length / 2).toBe(29);
    expect(command.payloadHex.slice(20, 24)).toBe("FF00");
    expect(CommandBuilder.allDefinitions().map((item) => item.name)).not.toContain("writeTimeControlParams");
  });
});
