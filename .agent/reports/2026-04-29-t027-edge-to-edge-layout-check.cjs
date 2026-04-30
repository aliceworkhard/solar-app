require("module").Module._initPaths();

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const SYSTEM_TOP = 32;
const SYSTEM_BOTTOM = 24;
const SCREENSHOT_DIR = "C:/Users/SJGK8/Desktop/PROJECT/太阳能遥控器app/.agent/reports/screenshots";

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

function rowCount(rects) {
  return new Set(rects.map((rect) => Math.round(rect.top))).size;
}

async function applyInsets(page, top = SYSTEM_TOP, bottom = SYSTEM_BOTTOM) {
  await page.evaluate(
    ({ topInset, bottomInset }) => {
      window.solarRemoteApplySystemInsets?.({
        top: topInset,
        right: 0,
        bottom: bottomInset,
        left: 0
      });
    },
    { topInset: top, bottomInset: bottom }
  );
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
    await applyInsets(page);
    if (width === 390) {
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, "2026-04-29-t027-edge-device-390x900.png"),
        fullPage: true
      });
    }

    results.push(
      await page.evaluate(() => {
        const headerTitle = document.querySelector(".app-header .page-title h1").getBoundingClientRect();
        const nav = document.querySelector(".bottom-nav").getBoundingClientRect();
        const activeItem = document.querySelector(".bottom-nav-item.active").getBoundingClientRect();
        const main = document.querySelector("main").getBoundingClientRect();
        return {
          view: "device",
          width: window.innerWidth,
          height: window.innerHeight,
          scrollWidth: document.documentElement.scrollWidth,
          systemTop: Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--system-top")),
          systemBottom: Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--system-bottom")),
          headerTitle,
          nav,
          activeItem,
          mainPaddingBottom: getComputedStyle(document.querySelector("main")).paddingBottom,
          mainBottom: main.bottom
        };
      })
    );

    await page.locator('[data-bottom-tab="profile"]').click();
    await page.waitForSelector(".profile-panel.active");
    await applyInsets(page);
    results.push(
      await page.evaluate(() => {
        const rects = (selector) =>
          Array.from(document.querySelectorAll(selector)).map((node) => {
            const rect = node.getBoundingClientRect();
            return { top: rect.top, bottom: rect.bottom };
          });
        return {
          view: "profile",
          width: window.innerWidth,
          height: window.innerHeight,
          scrollWidth: document.documentElement.scrollWidth,
          stats: rects(".profile-device-stats > div"),
          scenes: rects(".profile-scene-grid > div")
        };
      })
    );
  }

  await browser.close();

  for (const item of results) {
    if (item.scrollWidth > item.width) {
      throw new Error(`${item.view} ${item.width} overflow: scrollWidth=${item.scrollWidth}`);
    }
    if (item.view === "device") {
      if (item.headerTitle.top < item.systemTop) {
        throw new Error(`device ${item.width} header overlaps status inset: ${item.headerTitle.top} < ${item.systemTop}`);
      }
      if (Math.abs(item.nav.bottom - item.height) > 1) {
        throw new Error(`device ${item.width} bottom nav does not reach viewport bottom: ${item.nav.bottom}/${item.height}`);
      }
      if (item.activeItem.bottom > item.height - item.systemBottom) {
        throw new Error(
          `device ${item.width} active tab overlaps bottom inset: ${item.activeItem.bottom} > ${item.height - item.systemBottom}`
        );
      }
      console.log(
        `device ${item.width}: scroll=${item.scrollWidth}, headerTop=${item.headerTitle.top.toFixed(1)}, ` +
          `navBottom=${item.nav.bottom.toFixed(1)}, activeItemBottom=${item.activeItem.bottom.toFixed(1)}, ` +
          `mainPaddingBottom=${item.mainPaddingBottom}`
      );
    } else {
      const statsRows = rowCount(item.stats);
      const sceneRows = rowCount(item.scenes);
      if (statsRows !== 1) {
        throw new Error(`profile ${item.width} stats rows=${statsRows}`);
      }
      if (sceneRows !== 1) {
        throw new Error(`profile ${item.width} scene rows=${sceneRows}`);
      }
      console.log(`profile ${item.width}: scroll=${item.scrollWidth}, statsRows=${statsRows}, sceneRows=${sceneRows}`);
    }
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
