const fs = require("fs");
const http = require("http");
const path = require("path");
const { spawn } = require("child_process");

const ROOT = "C:/Users/SJGK8/Desktop/PROJECT/太阳能遥控器app";
const APP_DIR = path.join(ROOT, "项目文件/android-mvp-capacitor");
const SCREENSHOT_DIR = path.join(ROOT, ".agent/reports/screenshots");
const RESULTS_PATH = path.join(ROOT, ".agent/reports/2026-04-29-t030-edge-supplemental-layout-results.json");
const CHROME_PATH = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const APP_PORT = 5179;
const DEBUG_PORT = 9229;
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
  return width <= 360 ? 10 : width <= 430 ? 12 : 14;
}

async function main() {
  const results = [];
  const vite = startProcess("npm.cmd", ["run", "dev", "--", "--host", "127.0.0.1", "--port", String(APP_PORT)], {
    cwd: APP_DIR
  });
  const chromeUserDataDir = path.join(process.env.TEMP || APP_DIR, `solar-remote-t030-chrome-${Date.now()}`);
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
          const docStyle = getComputedStyle(document.documentElement);
          const shell = document.querySelector(".shell");
          const shellStyle = getComputedStyle(shell);
          const headerTitle = document.querySelector(".app-header .page-title h1").getBoundingClientRect();
          const nav = document.querySelector(".bottom-nav").getBoundingClientRect();
          const activeItem = document.querySelector(".bottom-nav-item.active").getBoundingClientRect();
          return JSON.stringify({
            width: window.innerWidth,
            height: window.innerHeight,
            scrollWidth: document.documentElement.scrollWidth,
            nativeTop: docStyle.getPropertyValue("--native-inset-top").trim(),
            nativeRight: docStyle.getPropertyValue("--native-inset-right").trim(),
            nativeBottom: docStyle.getPropertyValue("--native-inset-bottom").trim(),
            nativeLeft: docStyle.getPropertyValue("--native-inset-left").trim(),
            contentSafeLeft: docStyle.getPropertyValue("--content-safe-left").trim(),
            contentSafeRight: docStyle.getPropertyValue("--content-safe-right").trim(),
            diagnosticBackground: docStyle.getPropertyValue("--edge-diagnostic-dom-background").trim(),
            shellPaddingLeft: shellStyle.paddingLeft,
            shellPaddingRight: shellStyle.paddingRight,
            navBottom: nav.bottom,
            activeItemBottom: activeItem.bottom,
            headerTitleTop: headerTitle.top,
            meta: window.__nativeSystemInsetsMeta
          });
        })();`
      });
      if (evaluation.exceptionDetails) {
        throw new Error(`Runtime.evaluate failed: ${evaluation.exceptionDetails.text}`);
      }
      const result = JSON.parse(evaluation.result.value);
      results.push(result);

      const expectedPadding = `${expectedShellPadding(width)}px`;
      if (result.scrollWidth > width) {
        throw new Error(`width ${width} overflows: scrollWidth=${result.scrollWidth}`);
      }
      if (result.nativeLeft !== "16px" || result.nativeRight !== "18px") {
        throw new Error(`width ${width} native side inset mismatch: ${result.nativeLeft}/${result.nativeRight}`);
      }
      if (result.contentSafeLeft !== "0px" || result.contentSafeRight !== "0px") {
        throw new Error(`width ${width} content safe should ignore side gestures: ${result.contentSafeLeft}/${result.contentSafeRight}`);
      }
      if (result.shellPaddingLeft !== expectedPadding || result.shellPaddingRight !== expectedPadding) {
        throw new Error(`width ${width} shell padding compressed: ${result.shellPaddingLeft}/${result.shellPaddingRight}, expected ${expectedPadding}`);
      }
      if (result.headerTitleTop < 32) {
        throw new Error(`width ${width} header overlaps top inset: ${result.headerTitleTop}`);
      }
      if (Math.abs(result.navBottom - result.height) > 1) {
        throw new Error(`width ${width} bottom nav does not reach viewport bottom: ${result.navBottom}/${result.height}`);
      }
      if (result.activeItemBottom > result.height - 24) {
        throw new Error(`width ${width} active tab overlaps bottom inset: ${result.activeItemBottom}`);
      }
      if (result.diagnosticBackground !== "transparent") {
        throw new Error(`width ${width} diagnostic DOM background should be off: ${result.diagnosticBackground}`);
      }
      if (!result.meta || result.meta.ratioApplied) {
        throw new Error(`width ${width} expected matching density metadata without ratio fallback`);
      }

      process.stdout.write(
        `edge-supplemental ${width}: shellPadding=${result.shellPaddingLeft}/${result.shellPaddingRight}, ` +
          `nativeSides=${result.nativeLeft}/${result.nativeRight}, contentSafe=${result.contentSafeLeft}/${result.contentSafeRight}, ` +
          `navBottom=${result.navBottom.toFixed(1)}, activeBottom=${result.activeItemBottom.toFixed(1)}\n`
      );
    }

    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 900,
      deviceScaleFactor: 1,
      mobile: true
    });
    await cdp.send("Page.navigate", { url: APP_URL });
    await wait(800);
    const mismatch = await cdp.send("Runtime.evaluate", {
      returnByValue: true,
      expression: `(() => {
        window.solarRemoteApplySystemInsets?.({
          topPx: 60,
          bottomPx: 60,
          density: 3,
          webViewWidthPx: 1080,
          diagnosticColors: false
        });
        const docStyle = getComputedStyle(document.documentElement);
        return JSON.stringify({
          nativeTop: docStyle.getPropertyValue("--native-inset-top").trim(),
          meta: window.__nativeSystemInsetsMeta
        });
      })();`
    });
    const mismatchResult = JSON.parse(mismatch.result.value);
    if (mismatchResult.nativeTop !== "21.67px" || !mismatchResult.meta?.ratioApplied) {
      throw new Error(`ratio fallback failed: ${JSON.stringify(mismatchResult)}`);
    }
    results.push({ ratioFallback: mismatchResult });

    const screenshot = await cdp.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true
    });
    fs.writeFileSync(
      path.join(SCREENSHOT_DIR, "2026-04-29-t030-edge-supplemental-390x900.png"),
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
