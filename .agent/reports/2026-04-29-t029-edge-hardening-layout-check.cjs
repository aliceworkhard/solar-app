const fs = require("fs");
const http = require("http");
const path = require("path");
const { spawn } = require("child_process");

const ROOT = "C:/Users/SJGK8/Desktop/PROJECT/太阳能遥控器app";
const APP_DIR = path.join(ROOT, "项目文件/android-mvp-capacitor");
const SCREENSHOT_DIR = path.join(ROOT, ".agent/reports/screenshots");
const RESULTS_PATH = path.join(ROOT, ".agent/reports/2026-04-29-t029-edge-hardening-layout-results.json");
const CHROME_PATH = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const APP_PORT = 5178;
const DEBUG_PORT = 9228;
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
    req.setTimeout(3000, () => req.destroy(new Error(`Timeout requesting ${url}`)));
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
    req.setTimeout(3000, () => req.destroy(new Error(`Timeout requesting ${url}`)));
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

function isTransparent(color) {
  return color === "transparent" || color === "rgba(0, 0, 0, 0)";
}

async function main() {
  const results = [];
  const vite = startProcess("npm.cmd", ["run", "dev", "--", "--host", "127.0.0.1", "--port", String(APP_PORT)], {
    cwd: APP_DIR
  });
  const chromeUserDataDir = path.join(process.env.TEMP || APP_DIR, `solar-remote-t029-chrome-${Date.now()}`);
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
      await waitFor(
        async () => {
          const ready = await cdp.send("Runtime.evaluate", {
            returnByValue: true,
            expression: `Boolean(document.querySelector(".bottom-nav") && window.solarRemoteApplySystemInsets)`
          });
          if (!ready.result.value) {
            throw new Error("App shell not ready");
          }
          return true;
        },
        `app shell ${width}`
      );

      const evaluation = await cdp.send("Runtime.evaluate", {
        returnByValue: true,
        expression: `(() => {
          window.solarRemoteApplySystemInsets?.({ top: "31.5px", right: "2px", bottom: "24.25px", left: "1px" });
          const docStyle = getComputedStyle(document.documentElement);
          const bodyStyle = getComputedStyle(document.body);
          const appStyle = getComputedStyle(document.querySelector("#app"));
          const shellStyle = getComputedStyle(document.querySelector(".shell"));
          const headerTitle = document.querySelector(".app-header .page-title h1").getBoundingClientRect();
          const nav = document.querySelector(".bottom-nav").getBoundingClientRect();
          const activeItem = document.querySelector(".bottom-nav-item.active").getBoundingClientRect();
          const main = document.querySelector("main").getBoundingClientRect();
          return JSON.stringify({
            width: window.innerWidth,
            height: window.innerHeight,
            scrollWidth: document.documentElement.scrollWidth,
            nativeTop: docStyle.getPropertyValue("--native-inset-top").trim(),
            nativeRight: docStyle.getPropertyValue("--native-inset-right").trim(),
            nativeBottom: docStyle.getPropertyValue("--native-inset-bottom").trim(),
            nativeLeft: docStyle.getPropertyValue("--native-inset-left").trim(),
            systemTop: docStyle.getPropertyValue("--system-top").trim(),
            systemBottom: docStyle.getPropertyValue("--system-bottom").trim(),
            htmlBg: docStyle.backgroundImage !== "none" ? docStyle.backgroundImage : docStyle.backgroundColor,
            bodyBg: bodyStyle.backgroundImage !== "none" ? bodyStyle.backgroundImage : bodyStyle.backgroundColor,
            appBg: appStyle.backgroundImage !== "none" ? appStyle.backgroundImage : appStyle.backgroundColor,
            shellBg: shellStyle.backgroundImage !== "none" ? shellStyle.backgroundImage : shellStyle.backgroundColor,
            navBg: getComputedStyle(document.querySelector(".bottom-nav")).backgroundColor,
            headerTitle,
            nav,
            activeItem,
            mainPaddingBottom: getComputedStyle(document.querySelector("main")).paddingBottom,
            mainBottom: main.bottom
          });
        })();`
      });
      if (evaluation.exceptionDetails) {
        throw new Error(`Runtime.evaluate failed: ${evaluation.exceptionDetails.text}`);
      }
      const result = JSON.parse(evaluation.result.value);
      results.push(result);

      if (result.scrollWidth > width) {
        throw new Error(`width ${width} overflows: scrollWidth=${result.scrollWidth}`);
      }
      if (result.nativeTop !== "31.5px" || result.nativeBottom !== "24.25px") {
        throw new Error(`width ${width} native inset mismatch: ${result.nativeTop}/${result.nativeBottom}`);
      }
      if (result.systemTop !== "31.5px" || result.systemBottom !== "24.25px") {
        throw new Error(`width ${width} legacy system inset mismatch: ${result.systemTop}/${result.systemBottom}`);
      }
      if (result.headerTitle.top < 31.5) {
        throw new Error(`width ${width} header overlaps top inset: ${result.headerTitle.top}`);
      }
      if (Math.abs(result.nav.bottom - result.height) > 1) {
        throw new Error(`width ${width} bottom nav does not reach viewport bottom: ${result.nav.bottom}/${result.height}`);
      }
      if (result.activeItem.bottom > result.height - 24.25) {
        throw new Error(`width ${width} active tab overlaps bottom inset: ${result.activeItem.bottom}`);
      }
      for (const [name, value] of [
        ["html", result.htmlBg],
        ["body", result.bodyBg],
        ["app", result.appBg],
        ["shell", result.shellBg],
        ["nav", result.navBg]
      ]) {
        if (isTransparent(value)) {
          throw new Error(`width ${width} ${name} background is transparent`);
        }
      }

      if (width === 390) {
        const screenshot = await cdp.send("Page.captureScreenshot", {
          format: "png",
          captureBeyondViewport: true
        });
        fs.writeFileSync(
          path.join(SCREENSHOT_DIR, "2026-04-29-t029-edge-hardening-390x900.png"),
          Buffer.from(screenshot.data, "base64")
        );
      }

      process.stdout.write(
        `edge-hardening ${width}: scroll=${result.scrollWidth}, top=${result.nativeTop}, bottom=${result.nativeBottom}, ` +
          `headerTop=${result.headerTitle.top.toFixed(1)}, navBottom=${result.nav.bottom.toFixed(1)}, ` +
          `activeBottom=${result.activeItem.bottom.toFixed(1)}, mainPadding=${result.mainPaddingBottom}\n`
      );
    }

    fs.writeFileSync(RESULTS_PATH, JSON.stringify(results, null, 2));
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
