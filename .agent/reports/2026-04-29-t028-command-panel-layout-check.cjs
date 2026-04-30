const fs = require("fs");
const http = require("http");
const path = require("path");
const { spawn } = require("child_process");

const ROOT = "C:/Users/SJGK8/Desktop/PROJECT/太阳能遥控器app";
const APP_DIR = path.join(ROOT, "项目文件/android-mvp-capacitor");
const SCREENSHOT_DIR = path.join(ROOT, ".agent/reports/screenshots");
const CHROME_PATH = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const APP_PORT = 5177;
const DEBUG_PORT = 9227;
const APP_URL = `http://127.0.0.1:${APP_PORT}`;

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requestJson(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`${url} -> ${res.statusCode}: ${data}`));
          return;
        }
        resolve(JSON.parse(data));
      });
    });
    req.on("error", reject);
    req.setTimeout(3000, () => {
      req.destroy(new Error(`Timeout requesting ${url}`));
    });
  });
}

function requestOk(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      res.resume();
      res.on("end", () => {
        if (res.statusCode < 200 || res.statusCode >= 400) {
          reject(new Error(`${url} -> ${res.statusCode}`));
          return;
        }
        resolve(true);
      });
    });
    req.on("error", reject);
    req.setTimeout(3000, () => {
      req.destroy(new Error(`Timeout requesting ${url}`));
    });
  });
}

async function waitFor(check, label) {
  const deadline = Date.now() + 30000;
  let lastError;
  while (Date.now() < deadline) {
    try {
      return await check();
    } catch (error) {
      lastError = error;
      await wait(300);
    }
  }
  throw new Error(`Timed out waiting for ${label}: ${lastError?.message || "unknown"}`);
}

function startProcess(file, args, options = {}) {
  const command = file.endsWith(".cmd") ? "cmd.exe" : file;
  const commandArgs = file.endsWith(".cmd") ? ["/d", "/s", "/c", file, ...args] : args;
  return spawn(command, commandArgs, {
    cwd: options.cwd,
    stdio: "ignore",
    windowsHide: true
  });
}

function connectCdp(wsUrl) {
  const socket = new WebSocket(wsUrl);
  let nextId = 1;
  const pending = new Map();

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (!message.id) {
      return;
    }
    const request = pending.get(message.id);
    if (!request) {
      return;
    }
    pending.delete(message.id);
    if (message.error) {
      request.reject(new Error(`${message.error.message}: ${message.error.data || ""}`));
      return;
    }
    request.resolve(message.result);
  });

  const opened = new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  return {
    async send(method, params = {}) {
      await opened;
      const id = nextId++;
      socket.send(JSON.stringify({ id, method, params }));
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
      });
    },
    close() {
      socket.close();
    }
  };
}

async function main() {
  const results = [];
  const vite = startProcess("npm.cmd", ["run", "dev", "--", "--host", "127.0.0.1", "--port", String(APP_PORT)], {
    cwd: APP_DIR
  });
  const chromeUserDataDir = path.join(process.env.TEMP || APP_DIR, `solar-remote-t028-chrome-${Date.now()}`);
  const chrome = startProcess(CHROME_PATH, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${chromeUserDataDir}`,
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "about:blank"
  ]);

  try {
    await waitFor(() => requestOk(`${APP_URL}/`), "Vite dev server");
    const pages = await waitFor(() => requestJson(`http://127.0.0.1:${DEBUG_PORT}/json/list`), "Chrome DevTools");
    const pageInfo = pages.find((page) => page.type === "page");
    if (!pageInfo) {
      throw new Error("No Chrome page target found");
    }
    const cdp = connectCdp(pageInfo.webSocketDebuggerUrl);
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");

    for (const width of [320, 360, 390]) {
      await cdp.send("Emulation.setDeviceMetricsOverride", {
        width,
        height: 900,
        deviceScaleFactor: 1,
        mobile: true
      });
      await cdp.send("Page.navigate", { url: APP_URL });
      await wait(900);

      const evaluation = await cdp.send("Runtime.evaluate", {
        returnByValue: true,
        expression: `(() => {
          window.solarRemoteApplySystemInsets?.({ top: 32, right: 0, bottom: 24, left: 0 });
          document.querySelector(".shell")?.classList.remove("view-home");
          document.querySelector(".shell")?.classList.add("view-control");
          document.querySelector("#homePanel")?.classList.remove("active");
          document.querySelector("#controlPanel")?.classList.add("active");
          document.querySelectorAll(".command-btn").forEach((button) => {
            button.disabled = false;
          });
          const buttons = Array.from(document.querySelectorAll(".command-btn")).map((node) => {
            const rect = node.getBoundingClientRect();
            return {
              id: node.id,
              left: rect.left,
              right: rect.right,
              top: rect.top,
              bottom: rect.bottom,
              width: rect.width,
              height: rect.height,
              label: node.querySelector(".command-title")?.textContent?.trim() || ""
            };
          });
          const panel = document.querySelector("#controlPanelSection").getBoundingClientRect();
          return JSON.stringify({
            width: window.innerWidth,
            scrollWidth: document.documentElement.scrollWidth,
            buttonIds: buttons.map((button) => button.id),
            buttons,
            panelTop: panel.top
          });
        })();`
      });
      const result = JSON.parse(evaluation.result.value);
      const expectedOrder = "powerToggleBtn,brightnessDownBtn,brightnessUpBtn,readStatusBtn,readParamsBtn";
      if (result.scrollWidth > width) {
        throw new Error(`width ${width} overflows: scrollWidth=${result.scrollWidth}`);
      }
      if (result.buttonIds.join(",") !== expectedOrder) {
        throw new Error(`width ${width} unexpected order: ${result.buttonIds.join(",")}`);
      }
      for (const button of result.buttons) {
        if (button.left < 0 || button.right > width) {
          throw new Error(`width ${width} ${button.id} crosses viewport: ${button.left}/${button.right}`);
        }
        if (button.height < 40) {
          throw new Error(`width ${width} ${button.id} too short: ${button.height}`);
        }
      }
      if (width === 390) {
        const screenshot = await cdp.send("Page.captureScreenshot", {
          format: "png",
          captureBeyondViewport: true
        });
        fs.writeFileSync(
          path.join(SCREENSHOT_DIR, "2026-04-29-t028-command-panel-390x900.png"),
          Buffer.from(screenshot.data, "base64")
        );
      }
      results.push(result);
      process.stdout.write(
        `command-panel ${width}: scroll=${result.scrollWidth}, order=${result.buttonIds.join(">")}, ` +
          `panelTop=${result.panelTop.toFixed(1)}\n`
      );
    }
    fs.writeFileSync(
      path.join(ROOT, ".agent/reports/2026-04-29-t028-command-panel-layout-results.json"),
      JSON.stringify(results, null, 2)
    );
    cdp.close();
  } finally {
    vite.kill();
    chrome.kill();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
