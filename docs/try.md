这个方案方向没错，但**对 vivo 还不够**。你这个项目是 **Capacitor WebView**，黑色区域不一定是“系统栏颜色没设对”，更常见是：

1. **WebView 或 DecorView 背景没有真正绘制到系统栏背后**，所以系统栏透明后露出了 native window 的黑色背景。
2. **Web 层只做了 padding，没有做“背景延伸”**，所以内容避开了，但背景没铺过去。
3. **Capacitor/StatusBar 插件配置可能在 targetSdk 36 下已经失效**，还继续改 `overlaysWebView` / `backgroundColor` 就会越改越乱。
4. **native inset 注入到 CSS 时可能没有把 Android 物理 px 转成 WebView CSS px**，会导致 vivo 等高密度屏表现异常。

Android 官方现在的要求是：target SDK 35+ 在 Android 15 设备上默认 edge-to-edge，状态栏和手势导航栏透明，内容会绘制到系统栏后面，开发者必须自己处理 insets；三键导航还会有默认的半透明背景，并可能跟 `windowBackground` 相关。([Android Developers][1]) 另外，Android 文档也明确说，顶部 app bar 和底部导航栏应该延伸到屏幕边缘、绘制到系统栏后面。([Android Developers][2])

所以 vivo 上还黑，说明 T-027 只完成了“insets 计算”，但没有完成 **native 背景兜底 + WebView 绘制范围 + CSS 背景延伸**。

---

## 先让 Codex 加一个诊断开关

让它先临时加这个，不要猜：

```java
getWindow().getDecorView().setBackgroundColor(Color.MAGENTA);
findViewById(android.R.id.content).setBackgroundColor(Color.GREEN);
webView.setBackgroundColor(Color.TRANSPARENT);
```

然后在 CSS 里临时加：

```css
html,
body,
#app,
.shell {
  background: lime !important;
}
```

看 vivo 截图：

如果黑色变成 **洋红色**，说明 WebView 没画到系统栏区域，露出的是 `DecorView/windowBackground`。

如果黑色变成 **绿色/lime**，说明 native 已经铺到了，是 CSS 的 `.bottom-nav` / `.app-header` 没把背景延伸进去。

如果还是纯黑，说明有其他代码或插件在后面覆盖了系统栏、或者三键导航/厂商系统强制加了 system bar surface，需要查 `StatusBar` 插件、theme、`windowBackground`、contrast enforcement。

这个诊断比继续盲改 `navigationBarColor` 有用得多。尤其是手势导航下，Android 15+ 的 `setNavigationBarColor` 和 `setNavigationBarContrastEnforced` 对手势导航本来就不解决问题；官方文档写得很清楚，手势导航栏默认透明，`setNavigationBarColor` 对 gesture navigation 不生效，contrast enforcement 也不生效。([Android Developers][1])

---

## 让 Codex 改 T-027B：vivo / Capacitor WebView 强化版

直接把下面这段发给 Codex。

```text
请把 T-027 扩展为 T-027B：Android vivo / Capacitor WebView edge-to-edge hardening。

这次不要只处理 statusBarColor/navigationBarColor，也不要只给 Web CSS 注入 inset。vivo 上仍然有黑条，说明 WebView 或 DecorView 背景没有完整覆盖系统栏区域。

核心目标：
1. native window/decor/content/WebView 的背景不能是黑色。
2. WebView 必须 edge-to-edge。
3. Web DOM 背景必须铺满 viewport。
4. 顶部 header 背景要延伸到状态栏背后，header 内容避开状态栏。
5. 底部 bottom-nav 背景要延伸到手势栏/三键导航栏背后，tab 内容避开 bottom inset。
6. 对 vivo 额外增加 native system bar paint fallback：即使 WebView 没有画到系统栏后面，也不能露黑。
7. 不要返回 WindowInsetsCompat.CONSUMED。
8. 不要把根 .shell 整体 padding-top/padding-bottom 作为最终方案。
```

---

## Native 层必须补的点

### 1. Window / DecorView / ContentView 背景兜底

这个是 vivo 的关键。系统栏透明后，背后到底显示什么，取决于后面的绘制层。如果 WebView 没画到，露出来的就是 native window 背景。三键导航模式下，Android 15 文档也说明导航栏颜色可能匹配 window background，并且 `windowBackground` 需要是 color drawable 才能作为默认匹配来源。([Android Developers][1])

让 Codex 在 `MainActivity.java` 里加：

```java
private static final int EDGE_FALLBACK_COLOR = Color.rgb(246, 249, 255);
private static final int BOTTOM_BAR_FALLBACK_COLOR = Color.WHITE;

private void installNativeBackgroundFallback(Window window, WebView webView) {
    window.getDecorView().setBackgroundColor(EDGE_FALLBACK_COLOR);

    View content = findViewById(android.R.id.content);
    if (content != null) {
        content.setBackgroundColor(EDGE_FALLBACK_COLOR);
    }

    if (webView != null) {
        webView.setBackgroundColor(Color.TRANSPARENT);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
    }
}
```

不要让 `android:windowBackground`、`DecorView`、`android.R.id.content`、`WebView` 任何一层是黑色。

Theme 也补一个浅色 fallback：

```xml
<item name="android:windowBackground">#F6F9FF</item>
<item name="android:colorBackground">#F6F9FF</item>
<item name="android:statusBarColor">@android:color/transparent</item>
<item name="android:navigationBarColor">@android:color/transparent</item>
<item name="android:windowLightStatusBar">true</item>
<item name="android:windowLightNavigationBar">true</item>
<item name="android:enforceStatusBarContrast">false</item>
<item name="android:enforceNavigationBarContrast">false</item>
```

---

### 2. 对 vivo 加 native system bar paint fallback

这个是 T-027 里没有的。Android 官方也提到，如果需要自定义系统栏背景保护，可以在系统栏背后放置 view，并用 `statusBars` / `tappableElement` 获取高度。([Android Developers][1])

让 Codex 增加两个 native 兜底 View：

```text
在 DecorView 上增加两个不可点击的背景 View：

1. topSystemBarPaint
   - gravity = TOP
   - height = statusBars/displayCutout top inset
   - background = 页面顶部背景近似色，或者顶部渐变 drawable

2. bottomSystemBarPaint
   - gravity = BOTTOM
   - height = max(navigationBars.bottom, tappableElement.bottom, systemGestures.bottom)
   - background = bottom tab bar 的背景色，建议 #FFFFFF 或当前底栏颜色

这两个 View 只画系统栏区域，不参与点击，不改变 WebView 布局。
当 insets 变化时更新它们的高度。
```

这样即使 vivo 某些情况下 WebView 没有真正画到手势横杠背后，底下也不会露黑，至少会露出白色/浅色底栏背景。

---

### 3. Insets 监听要挂在 DecorView 和 WebView 上

Android 的 WebView insets 文档说明：WebView 只有在系统 UI 和 WebView bounds 发生重叠时才会拿到非零 inset；如果 WebView 没有碰到系统栏，safe-area 可能就是 0。官方建议可以通过 `setOnApplyWindowInsetsListener` 返回原始 `windowInsets`，给 Web 内容提供完整系统尺寸，但要避免重复 padding。([Android Developers][3])

所以不要只监听 WebView。建议：

```java
View decor = window.getDecorView();

ViewCompat.setOnApplyWindowInsetsListener(decor, (view, insets) -> {
    int baseTypes =
        WindowInsetsCompat.Type.systemBars()
            | WindowInsetsCompat.Type.displayCutout();

    Insets bars = insets.getInsets(baseTypes);
    Insets gestures = insets.getInsets(WindowInsetsCompat.Type.systemGestures());
    Insets tappable = insets.getInsets(WindowInsetsCompat.Type.tappableElement());

    int leftPx = bars.left;
    int topPx = bars.top;
    int rightPx = bars.right;
    int bottomPx = Math.max(
        bars.bottom,
        Math.max(gestures.bottom, tappable.bottom)
    );

    publishInsetsToWebView(leftPx, topPx, rightPx, bottomPx);
    updateNativeSystemBarPaintViews(topPx, bottomPx);

    return insets;
});

ViewCompat.setOnApplyWindowInsetsListener(webView, (view, insets) -> {
    // 不消费，让 WebView 自己也能收到变化通知
    return insets;
});

ViewCompat.requestApplyInsets(decor);
```

重点：**不要返回 `CONSUMED`**。WebView 官方文档特别提到，错误消费 insets 可能导致 WebView 保留旧 padding，出现 ghost padding。([Android Developers][3])

---

### 4. Native px 注入 CSS 前要转成 CSS px

Android `WindowInsets` 拿到的是 native 像素。WebView/CSS 里的 `px` 通常按 density-independent 的感知尺寸渲染；Android 文档说明，WebView 会把 CSS pixel 映射到 density-independent pixel。([Android Developers][4])

所以不要这样：

```java
"--native-inset-bottom", bottomPx + "px"
```

应该这样：

```java
private String pxToCssPx(int px) {
    float density = getResources().getDisplayMetrics().density;
    return String.format(Locale.US, "%.2fpx", px / density);
}
```

注入 JS 时：

```java
private void publishInsetsToWebView(int leftPx, int topPx, int rightPx, int bottomPx) {
    WebView webView = getBridge().getWebView();
    if (webView == null) return;

    String left = pxToCssPx(leftPx);
    String top = pxToCssPx(topPx);
    String right = pxToCssPx(rightPx);
    String bottom = pxToCssPx(bottomPx);

    String js =
        "(function(){"
            + "var r=document.documentElement;if(!r)return;"
            + "var v={left:'" + left + "',top:'" + top + "',right:'" + right + "',bottom:'" + bottom + "'};"
            + "r.style.setProperty('--native-inset-left',v.left);"
            + "r.style.setProperty('--native-inset-top',v.top);"
            + "r.style.setProperty('--native-inset-right',v.right);"
            + "r.style.setProperty('--native-inset-bottom',v.bottom);"
            + "window.__nativeSystemInsets=v;"
            + "if(window.solarRemoteApplySystemInsets){window.solarRemoteApplySystemInsets(v);}"
        + "})();";

    webView.post(() -> webView.evaluateJavascript(js, null));
}
```

另外要在 `onResume()`、`onConfigurationChanged()`、WebView 页面加载完成后再推一次，避免第一次 JS 注入时 DOM 还没准备好。

---

## Capacitor 配置也要改

你的项目 targetSdkVersion = 36，这一点非常关键。Capacitor 官方文档说，Android 16 / API 36+ 下，`@capacitor/status-bar` 的 `overlaysWebView` 和 `backgroundColor` 不再生效，因为它们依赖旧的 opt-out edge-to-edge 行为。([Capacitor][5])

所以不要让 Codex 继续改这些：

```ts
StatusBar: {
  overlaysWebView: false,
  backgroundColor: "#000000"
}
```

建议改成：

```ts
plugins: {
  SystemBars: {
    insetsHandling: "css",
    style: "LIGHT",
    hidden: false,
    animation: "NONE"
  },
  StatusBar: {
    style: "LIGHT"
  }
}
```

注意：Capacitor 这里的 `LIGHT` 表示**浅色背景上的深色系统栏图标**，适合你截图这种浅色页面；`DARK` 反而是深色背景上的浅色图标。([Capacitor][6])

Capacitor 的 `SystemBars` 是面向现代 edge-to-edge 的接口，文档还说明 Android WebView `< 140` 时 CSS `env(safe-area-inset-*)` 可能不稳定，因此插件会注入 `--safe-area-inset-*` 变量。([Capacitor][6])

---

## Web 层 CSS 要改成“背景延伸 + 内容避让”

T-027 里“移除 `.shell` 根整体 padding”是对的，但还要补两点：

1. `.shell`、`html`、`body`、`#app` 必须铺满全屏并有背景。
2. `.bottom-nav` 自己的背景必须延伸到 `bottom inset` 区域。

推荐 CSS 结构：

```css
:root {
  --native-inset-top: 0px;
  --native-inset-right: 0px;
  --native-inset-bottom: 0px;
  --native-inset-left: 0px;

  /* Capacitor SystemBars 可能会注入这些变量 */
  --safe-area-inset-top: 0px;
  --safe-area-inset-right: 0px;
  --safe-area-inset-bottom: 0px;
  --safe-area-inset-left: 0px;

  --edge-top: max(
    var(--native-inset-top),
    var(--safe-area-inset-top),
    env(safe-area-inset-top, 0px)
  );

  --edge-right: max(
    var(--native-inset-right),
    var(--safe-area-inset-right),
    env(safe-area-inset-right, 0px)
  );

  --edge-bottom: max(
    var(--native-inset-bottom),
    var(--safe-area-inset-bottom),
    env(safe-area-inset-bottom, 0px)
  );

  --edge-left: max(
    var(--native-inset-left),
    var(--safe-area-inset-left),
    env(safe-area-inset-left, 0px)
  );

  --page-bg: #f6f9ff;
  --bottom-nav-bg: rgba(255, 255, 255, 0.96);
  --bottom-nav-core-height: 72px;
}

html,
body,
#app {
  width: 100%;
  min-height: 100%;
  margin: 0;
  background: var(--page-bg);
}

body {
  overflow: hidden;
}

.shell {
  position: relative;
  width: 100%;
  height: 100vh;
  height: 100dvh;
  min-height: 100vh;
  padding: 0;
  overflow: hidden;
  background: var(--page-bg);
}

/* 防止 WebView overscroll 或内容高度不足时露出黑底 */
.shell::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: -1;
  background: var(--page-bg);
  pointer-events: none;
}

.app-header {
  padding-top: var(--edge-top);
  padding-left: max(24px, var(--edge-left));
  padding-right: max(24px, var(--edge-right));
  background: var(--page-bg);
}

.main-scroll,
.page-content {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: calc(
    var(--bottom-nav-core-height) + var(--edge-bottom) + 20px
  );
}

.bottom-nav {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;

  min-height: calc(var(--bottom-nav-core-height) + var(--edge-bottom));
  padding-bottom: var(--edge-bottom);
  padding-left: var(--edge-left);
  padding-right: var(--edge-right);

  box-sizing: border-box;
  background: var(--bottom-nav-bg);
  z-index: 50;
}

/* 底部兜底：确保系统手势横杠背后永远是 bottom-nav 背景 */
.bottom-nav::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: var(--edge-bottom);
  background: var(--bottom-nav-bg);
  pointer-events: none;
}

.bottom-nav-inner {
  height: var(--bottom-nav-core-height);
  display: flex;
  align-items: center;
  justify-content: space-around;
}
```

重点是：`.bottom-nav` 仍然 `bottom: 0`，不要 `bottom: var(--edge-bottom)`。
`bottom: var(--edge-bottom)` 会把底栏抬起来，下面又露出系统区域。正确做法是 **底栏在最底部，底栏内部 padding-bottom 避让系统手势区域**。

---

## index.html 也检查一下

确认 viewport meta 有 `viewport-fit=cover`：

```html
<meta
  name="viewport"
  content="width=device-width, initial-scale=1, viewport-fit=cover"
/>
```

Chrome/Android 的 edge-to-edge 文档也把 `viewport-fit=cover` 作为 Web 内容声明支持 edge-to-edge 的方式。([Chrome for Developers][7])

---

## JS 接收函数

在 `src/app.ts` 最早的位置注册：

```ts
declare global {
  interface Window {
    solarRemoteApplySystemInsets?: (insets: {
      top: string;
      right: string;
      bottom: string;
      left: string;
    }) => void;
    __nativeSystemInsets?: {
      top: string;
      right: string;
      bottom: string;
      left: string;
    };
  }
}

window.solarRemoteApplySystemInsets = (insets) => {
  const root = document.documentElement;

  root.style.setProperty('--native-inset-top', insets.top || '0px');
  root.style.setProperty('--native-inset-right', insets.right || '0px');
  root.style.setProperty('--native-inset-bottom', insets.bottom || '0px');
  root.style.setProperty('--native-inset-left', insets.left || '0px');

  root.classList.add('native-insets-ready');
};

// native 可能比 app.ts 更早注入
if (window.__nativeSystemInsets) {
  window.solarRemoteApplySystemInsets(window.__nativeSystemInsets);
}
```

---

## 最重要的结论

T-027 还没解决 vivo，通常不是因为 `WindowInsetsCompat` 方向错了，而是它少了这几个“硬兜底”：

```text
1. window/decor/content/WebView 背景不能黑。
2. WebView insets 注入要 px -> CSS px。
3. bottom-nav 要 bottom: 0，并用 padding-bottom 扩展背景，不要用 margin/bottom 抬起来。
4. 不要依赖 @capacitor/status-bar 的 overlaysWebView/backgroundColor，target 36 下它们已经不可靠或无效。
5. 加 native top/bottom system bar paint fallback，专门解决 vivo 这种 WebView 没画到系统栏背后的情况。
6. 手势导航黑底不是 contrastEnforced 能解决的；黑底说明背后没有被 App 画上颜色。
```

让 Codex 按 **T-027B** 改，不要继续围着 `statusBarColor` / `navigationBarColor` 打转。vivo 这种问题，要同时处理 **native 背景层、WebView insets、CSS 背景延伸、Capacitor 插件配置**。

