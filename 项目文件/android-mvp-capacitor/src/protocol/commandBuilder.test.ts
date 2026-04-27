import { describe, expect, it } from "vitest";
import { CommandBuilder } from "./commandBuilder";

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
});
