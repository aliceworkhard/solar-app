const fs = require("fs");
const http = require("http");
const path = require("path");
const { spawn } = require("child_process");

const ROOT = path.resolve(__dirname, "../..");
const APP_DIR = path.join(ROOT, "\u9879\u76ee\u6587\u4ef6/android-mvp-capacitor");
const SCREENSHOT_DIR = path.join(ROOT, ".agent/reports/screenshots");
const RESULTS_PATH = path.join(ROOT, ".agent/reports/2026-04-30-t033-edge-spacing-layout-results.json");
const CHROME_PATH = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const APP_PORT = 5183;
const DEBUG_PORT = 9233;
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

function expectedShellPadding(width) {
  return width <= 360 ? 8 : width <= 430 ? 10 : 12;
}

function runStaticChecks() {
  const styles = fs.readFileSync(path.join(APP_DIR, "src/styles.css"), "utf8");
  if (!/\.bottom-nav\s*\{[^}]*bottom:\s*0;/s.test(styles)) {
    throw new Error("Bottom nav must stay attached to bottom: 0");
  }
  if (!styles.includes("--edge-top")) {
    throw new Error("Header spacing must keep using edge top inset variables");
  }
}

async function main() {
  runStaticChecks();
  const results = [];
  const vite = startProcess("npm.cmd", ["run", "dev", "--", "--host", "127.0.0.1", "--port", String(APP_PORT)], {
    cwd: APP_DIR
  });
  const chromeUserDataDir = path.join(process.env.TEMP || APP_DIR, `solar-remote-t033-edge-spacing-chrome-${Date.now()}`);
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
            expression: `Boolean(document.querySelector(".bottom-nav") && window.solarRemoteApplySystemInsets && window.__edgeBuildId)`
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
          window.solarRemoteApplySystemInsets?.({
            topPx: 96,
            rightPx: 54,
            bottomPx: 72,
            leftPx: 48,
            contentLeftPx: 0,
            contentRightPx: 0,
            density: 3,
            webViewWidthPx: window.innerWidth * 3,
            diagnosticColors: false
          });
          const shell = document.querySelector(".shell");
          const header = document.querySelector(".app-header");
          const title = document.querySelector(".app-header .page-title h1");
          const navEl = document.querySelector(".bottom-nav");
          const activeItem = document.querySelector(".bottom-nav-item.active");
          const statusTab = document.querySelector('.detail-tab-button[data-detail-target="status"]');
          const controlTab = document.querySelector('.detail-tab-button[data-detail-target="controls"]');
          const beforeStyle = getComputedStyle(header, "::before");
          const shellStyle = getComputedStyle(shell);
          const navStyle = getComputedStyle(navEl);
          const titleRect = title.getBoundingClientRect();
          const navRect = navEl.getBoundingClientRect();
          const activeRect = activeItem.getBoundingClientRect();
          return JSON.stringify({
            width: window.innerWidth,
            height: window.innerHeight,
            scrollWidth: document.documentElement.scrollWidth,
            edgeBuildId: window.__edgeBuildId,
            headerBeforeDisplay: beforeStyle.display,
            titleTop: titleRect.top,
            navBottom: navRect.bottom,
            navPaddingBottom: navStyle.paddingBottom,
            activeItemBottom: activeRect.bottom,
            shellPaddingLeft: shellStyle.paddingLeft,
            shellPaddingRight: shellStyle.paddingRight,
            defaultStatusActive: statusTab.classList.contains("active") && statusTab.getAttribute("aria-selected") === "true",
            controlsInactive: !controlTab.classList.contains("active")
          });
        })();`
      });
      const result = JSON.parse(evaluation.result.value);
      results.push(result);

      const expectedPadding = `${expectedShellPadding(width)}px`;
      if (result.edgeBuildId !== "T031-system-bars-final") {
        throw new Error(`width ${width} missing edge build id`);
      }
      if (result.headerBeforeDisplay !== "none") {
        throw new Error(`width ${width} header rectangle layer is visible`);
      }
      if (result.titleTop < 31.5 || result.titleTop > 32.75) {
        throw new Error(`width ${width} title was not micro-adjusted upward: ${result.titleTop}`);
      }
      if (Math.abs(result.navBottom - result.height) > 1) {
        throw new Error(`width ${width} bottom nav not attached to viewport bottom`);
      }
      if (Number.parseFloat(result.navPaddingBottom) > 18.5) {
        throw new Error(`width ${width} bottom nav padding was not tightened: ${result.navPaddingBottom}`);
      }
      if (result.activeItemBottom > result.height - 14) {
        throw new Error(`width ${width} active tab is too close to gesture inset: ${result.activeItemBottom}`);
      }
      if (result.scrollWidth > width) {
        throw new Error(`width ${width} overflows: scrollWidth=${result.scrollWidth}`);
      }
      if (result.shellPaddingLeft !== expectedPadding || result.shellPaddingRight !== expectedPadding) {
        throw new Error(`width ${width} shell padding not widened as expected: ${result.shellPaddingLeft}/${result.shellPaddingRight}`);
      }
      if (!result.defaultStatusActive || !result.controlsInactive) {
        throw new Error(`width ${width} detail default active state regressed`);
      }
    }

    const screenshot = await cdp.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true
    });
    fs.writeFileSync(
      path.join(SCREENSHOT_DIR, "2026-04-30-t033-edge-spacing-390x900.png"),
      Buffer.from(screenshot.data, "base64")
    );

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
