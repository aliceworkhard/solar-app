require("module").Module._initPaths();

const path = require("path");
const { chromium } = require("playwright");

const screenshotDir = path.resolve(
  "C:/Users/SJGK8/Desktop/PROJECT/太阳能遥控器app/.agent/reports/screenshots"
);

function rowCount(rects) {
  return new Set(rects.map((rect) => Math.round(rect.top))).size;
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PW_CHROMIUM_EXECUTABLE || undefined
  });
  const page = await browser.newPage();
  const results = [];

  for (const width of [320, 360, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("http://127.0.0.1:5173", { waitUntil: "networkidle" });
    await page.locator('[data-bottom-tab="profile"]').click();
    await page.waitForSelector(".profile-panel.active");
    await page.screenshot({
      path: path.join(screenshotDir, `2026-04-28-t026-profile-${width}x900.png`),
      fullPage: true
    });

    results.push(
      await page.evaluate(() => {
        const rects = (selector) =>
          Array.from(document.querySelectorAll(selector)).map((node) => {
            const rect = node.getBoundingClientRect();
            return {
              top: rect.top,
              left: rect.left,
              right: rect.right,
              width: rect.width,
              height: rect.height
            };
          });
        const nav = document.querySelector(".bottom-nav").getBoundingClientRect();
        return {
          view: "profile",
          width: window.innerWidth,
          scrollWidth: document.documentElement.scrollWidth,
          stats: rects(".profile-device-stats > div"),
          scenes: rects(".profile-scene-grid > div"),
          nav: { top: nav.top, bottom: nav.bottom, height: nav.height },
          safeBottom: getComputedStyle(document.documentElement).getPropertyValue("--safe-bottom").trim(),
          shellPaddingBottom: getComputedStyle(document.querySelector(".shell")).paddingBottom
        };
      })
    );

    await page.locator('[data-bottom-tab="scene"]').click();
    await page.waitForSelector(".scene-panel.active");
    results.push(
      await page.evaluate(() => ({
        view: "scene",
        width: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth
      }))
    );

    await page.locator('[data-bottom-tab="device"]').click();
    await page.waitForSelector(".home-panel.active");
    results.push(
      await page.evaluate(() => ({
        view: "device",
        width: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth
      }))
    );
  }

  await browser.close();

  for (const item of results) {
    if (item.scrollWidth > item.width) {
      throw new Error(`${item.view} ${item.width} overflow: scrollWidth=${item.scrollWidth}`);
    }
    if (item.view === "profile") {
      const statsRows = rowCount(item.stats);
      const sceneRows = rowCount(item.scenes);
      if (statsRows !== 1) {
        throw new Error(`profile ${item.width} stats rows=${statsRows}`);
      }
      if (sceneRows !== 1) {
        throw new Error(`profile ${item.width} scene rows=${sceneRows}`);
      }
      console.log(
        `profile ${item.width}: scroll=${item.scrollWidth}, ` +
          `statsRows=${statsRows}, sceneRows=${sceneRows}, ` +
          `navHeight=${item.nav.height.toFixed(1)}, safeBottom=${item.safeBottom}, ` +
          `shellPaddingBottom=${item.shellPaddingBottom}`
      );
    } else {
      console.log(`${item.view} ${item.width}: scroll=${item.scrollWidth}`);
    }
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
