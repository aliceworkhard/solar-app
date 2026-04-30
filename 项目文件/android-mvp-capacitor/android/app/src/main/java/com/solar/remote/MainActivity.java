package com.solar.remote;

import android.content.pm.ApplicationInfo;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewParent;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebView;
import android.widget.FrameLayout;

import androidx.activity.OnBackPressedCallback;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private enum EdgeStrategy {
        TRANSPARENT_EDGE_WITH_STRIPS,
        COLOR_MATCH_SAFE,
        VISUAL_FALLBACK
    }

    private static final String EDGE_TAG = "EdgeT031";
    private static final String EDGE_BUILD_ID = "T031-system-bars-final";
    private static final boolean EDGE_PROBE_COLORS = false;
    private static final EdgeStrategy EDGE_STRATEGY = EdgeStrategy.TRANSPARENT_EDGE_WITH_STRIPS;

    private static final int EDGE_CONTENT_BG = Color.rgb(232, 244, 255);
    private static final int EDGE_TOP_STRIP_BG = Color.rgb(242, 248, 255);
    private static final int EDGE_BOTTOM_STRIP_BG = Color.rgb(223, 239, 255);
    private static final int EDGE_PROBE_STATUS_COLOR = Color.rgb(255, 255, 0);
    private static final int EDGE_PROBE_NAVIGATION_COLOR = Color.rgb(255, 0, 255);
    private static final int EDGE_PROBE_TOP_STRIP_COLOR = Color.rgb(0, 255, 255);
    private static final int EDGE_PROBE_BOTTOM_STRIP_COLOR = Color.rgb(0, 255, 0);

    private View topSystemBarStrip;
    private View bottomSystemBarStrip;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        setTheme(R.style.AppTheme_NoActionBar);
        registerPlugin(BleBridgePlugin.class);
        applyT031SystemBars("before-super");
        super.onCreate(savedInstanceState);
        logT031Identity("after-super");
        applyT031SystemBars("after-super");
        installNativeWindowBackground();
        installT031SystemBarStrips();
        installFinalWebViewBackground();
        installSystemInsetsBridge();
        publishT031BuildIdentityToWeb();
        publishEdgeModeToWeb(EDGE_STRATEGY);
        applyT031SystemBars("bridge-ready");
        scheduleT031SystemBarReapply();
        installNativeBackDispatch();
    }

    @Override
    public void onResume() {
        super.onResume();
        logT031Identity("onResume");
        applyT031SystemBars("onResume");
        publishT031BuildIdentityToWeb();
        publishEdgeModeToWeb(EDGE_STRATEGY);
        requestSystemInsetsDispatch();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (!hasFocus) {
            return;
        }
        applyT031SystemBars("window-focus");
        publishT031BuildIdentityToWeb();
        publishEdgeModeToWeb(EDGE_STRATEGY);
    }

    private void applyT031SystemBars(String stage) {
        Window window = getWindow();
        WindowCompat.setDecorFitsSystemWindows(window, false);
        WindowCompat.enableEdgeToEdge(window);
        View decorView = window.getDecorView();
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
        window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_NAVIGATION);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            window.setStatusBarColor(resolveT031StatusBarColor());
            window.setNavigationBarColor(resolveT031NavigationBarColor());
        }

        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, decorView);
        if (controller != null) {
            boolean lightBars = EDGE_STRATEGY != EdgeStrategy.VISUAL_FALLBACK || shouldUseProbeColors();
            controller.setAppearanceLightStatusBars(lightBars);
            controller.setAppearanceLightNavigationBars(lightBars);
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            window.setNavigationBarContrastEnforced(false);
            window.setStatusBarContrastEnforced(false);
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            WindowManager.LayoutParams attributes = window.getAttributes();
            attributes.layoutInDisplayCutoutMode = Build.VERSION.SDK_INT >= Build.VERSION_CODES.R
                ? WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS
                : WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            window.setAttributes(attributes);
        }

        ViewCompat.requestApplyInsets(decorView);
        decorView.post(() -> ViewCompat.requestApplyInsets(decorView));
        Log.d(
            EDGE_TAG,
            "applyT031SystemBars stage=" + stage
                + " build=" + EDGE_BUILD_ID
                + " sdk=" + Build.VERSION.SDK_INT
                + " targetSdk=" + getApplicationInfo().targetSdkVersion
                + " manufacturer=" + Build.MANUFACTURER
                + " model=" + Build.MODEL
                + " package=" + getPackageName()
                + " activity=" + MainActivity.class.getName()
                + " strategy=" + EDGE_STRATEGY.name()
                + " probe=" + shouldUseProbeColors()
                + " statusColor=" + Integer.toHexString(window.getStatusBarColor())
                + " navColor=" + Integer.toHexString(window.getNavigationBarColor())
        );
    }

    private int resolveT031StatusBarColor() {
        if (shouldUseProbeColors()) {
            return EDGE_PROBE_STATUS_COLOR;
        }
        if (EDGE_STRATEGY == EdgeStrategy.COLOR_MATCH_SAFE) {
            return EDGE_TOP_STRIP_BG;
        }
        if (EDGE_STRATEGY == EdgeStrategy.VISUAL_FALLBACK) {
            return Color.BLACK;
        }
        return EDGE_TOP_STRIP_BG;
    }

    private int resolveT031NavigationBarColor() {
        if (shouldUseProbeColors()) {
            return EDGE_PROBE_NAVIGATION_COLOR;
        }
        if (EDGE_STRATEGY == EdgeStrategy.COLOR_MATCH_SAFE) {
            return EDGE_BOTTOM_STRIP_BG;
        }
        if (EDGE_STRATEGY == EdgeStrategy.VISUAL_FALLBACK) {
            return Color.BLACK;
        }
        return EDGE_BOTTOM_STRIP_BG;
    }

    private void scheduleT031SystemBarReapply() {
        View decorView = getWindow().getDecorView();
        decorView.postDelayed(() -> applyT031SystemBars("post-100ms"), 100);
        decorView.postDelayed(() -> {
            applyT031SystemBars("post-500ms");
            publishT031BuildIdentityToWeb();
            publishEdgeModeToWeb(EDGE_STRATEGY);
        }, 500);
    }

    private void installNativeWindowBackground() {
        Window window = getWindow();
        View decorView = window.getDecorView();
        View contentView = decorView.findViewById(android.R.id.content);

        window.setBackgroundDrawable(new ColorDrawable(EDGE_CONTENT_BG));
        decorView.setBackgroundColor(EDGE_CONTENT_BG);
        if (contentView != null) {
            contentView.setBackgroundColor(EDGE_CONTENT_BG);
        }
    }

    private void installT031SystemBarStrips() {
        View decorView = getWindow().getDecorView();
        if (!(decorView instanceof FrameLayout)) {
            return;
        }

        FrameLayout decorFrame = (FrameLayout) decorView;
        topSystemBarStrip = createSystemBarStrip(resolveTopSystemBarStripColor());
        bottomSystemBarStrip = createSystemBarStrip(resolveBottomSystemBarStripColor());

        decorFrame.addView(
            topSystemBarStrip,
            new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                0,
                Gravity.TOP
            )
        );
        decorFrame.addView(
            bottomSystemBarStrip,
            new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                0,
                Gravity.BOTTOM
            )
        );
        topSystemBarStrip.bringToFront();
        bottomSystemBarStrip.bringToFront();
    }

    private View createSystemBarStrip(int color) {
        View view = new View(this);
        view.setBackgroundColor(color);
        view.setClickable(false);
        view.setFocusable(false);
        view.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);
        return view;
    }

    private int resolveTopSystemBarStripColor() {
        return shouldUseProbeColors() ? EDGE_PROBE_TOP_STRIP_COLOR : EDGE_TOP_STRIP_BG;
    }

    private int resolveBottomSystemBarStripColor() {
        return shouldUseProbeColors() ? EDGE_PROBE_BOTTOM_STRIP_COLOR : EDGE_BOTTOM_STRIP_BG;
    }

    private void installFinalWebViewBackground() {
        if (getBridge() == null || getBridge().getWebView() == null) {
            return;
        }
        WebView webView = getBridge().getWebView();
        webView.setBackgroundColor(EDGE_CONTENT_BG);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
    }

    private void installSystemInsetsBridge() {
        if (getBridge() == null || getBridge().getWebView() == null) {
            return;
        }

        WebView webView = getBridge().getWebView();
        View decorView = getWindow().getDecorView();
        ViewCompat.setOnApplyWindowInsetsListener(decorView, (view, insets) -> {
            Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            Insets cutout = insets.getInsets(WindowInsetsCompat.Type.displayCutout());
            Insets systemGestures = insets.getInsets(WindowInsetsCompat.Type.systemGestures());
            Insets tappableElement = insets.getInsets(WindowInsetsCompat.Type.tappableElement());

            int left = maxInsets(systemBars.left, cutout.left, systemGestures.left, tappableElement.left);
            int top = maxInsets(systemBars.top, cutout.top);
            int right = maxInsets(systemBars.right, cutout.right, systemGestures.right, tappableElement.right);
            int bottom = maxInsets(systemBars.bottom, cutout.bottom, systemGestures.bottom, tappableElement.bottom);
            int contentLeft = maxInsets(systemBars.left, cutout.left);
            int contentRight = maxInsets(systemBars.right, cutout.right);

            updateT031SystemBarStrips(top, bottom);
            dispatchSystemInsetsToWebView(webView, left, top, right, bottom, contentLeft, contentRight);
            return insets;
        });
        requestSystemInsetsDispatch();
    }

    private void dispatchSystemInsetsToWebView(
        WebView webView,
        int left,
        int top,
        int right,
        int bottom,
        int contentLeft,
        int contentRight
    ) {
        webView.post(() -> {
            int webViewWidthPx = webView.getWidth();
            float density = getResources().getDisplayMetrics().density;
            String script = "(function(){"
                + "var i={"
                + "topPx:" + top + ","
                + "rightPx:" + right + ","
                + "bottomPx:" + bottom + ","
                + "leftPx:" + left + ","
                + "contentLeftPx:" + contentLeft + ","
                + "contentRightPx:" + contentRight + ","
                + "density:" + jsNumber(density) + ","
                + "webViewWidthPx:" + webViewWidthPx + ","
                + "diagnosticColors:" + shouldUseProbeColors()
                + "};"
                + "i.viewportWidth=window.innerWidth||0;"
                + "window.__nativeSystemInsets=i;"
                + "if(window.solarRemoteApplySystemInsets){window.solarRemoteApplySystemInsets(i);}"
                + "})();";
            webView.evaluateJavascript(script, null);
        });
    }

    private void publishT031BuildIdentityToWeb() {
        if (getBridge() == null || getBridge().getWebView() == null) {
            return;
        }
        WebView webView = getBridge().getWebView();
        String script = "(function(){"
            + "window.__edgeBuildId='" + EDGE_BUILD_ID + "';"
            + "if(document.documentElement){document.documentElement.dataset.edgeBuild='" + EDGE_BUILD_ID + "';}"
            + "if(!window.__edgeBuildLogged&&window.console&&console.info){"
            + "window.__edgeBuildLogged=true;console.info('[EdgeT031] build id = " + EDGE_BUILD_ID + "');"
            + "}"
            + "})();";
        webView.post(() -> webView.evaluateJavascript(script, null));
    }

    private void publishEdgeModeToWeb(EdgeStrategy strategy) {
        if (getBridge() == null || getBridge().getWebView() == null) {
            return;
        }
        WebView webView = getBridge().getWebView();
        String mode = edgeModeForStrategy(strategy);
        String script = "window.solarRemoteSetEdgeMode&&window.solarRemoteSetEdgeMode('" + mode + "');";
        webView.post(() -> webView.evaluateJavascript(script, null));
    }

    private String edgeModeForStrategy(EdgeStrategy strategy) {
        if (strategy == EdgeStrategy.COLOR_MATCH_SAFE) {
            return "color-match";
        }
        if (strategy == EdgeStrategy.VISUAL_FALLBACK) {
            return "visual-fallback";
        }
        return "transparent";
    }

    private void requestSystemInsetsDispatch() {
        View decorView = getWindow().getDecorView();
        decorView.post(() -> ViewCompat.requestApplyInsets(decorView));
        View contentView = decorView.findViewById(android.R.id.content);
        if (contentView != null) {
            contentView.post(() -> ViewCompat.requestApplyInsets(contentView));
        }
        if (getBridge() == null || getBridge().getWebView() == null) {
            return;
        }
        WebView webView = getBridge().getWebView();
        webView.post(() -> {
            ViewParent parent = webView.getParent();
            if (parent instanceof View) {
                ViewCompat.requestApplyInsets((View) parent);
            }
            ViewCompat.requestApplyInsets(webView);
        });
    }

    private void updateT031SystemBarStrips(int top, int bottom) {
        updateSystemBarStripHeight(topSystemBarStrip, top);
        updateSystemBarStripHeight(bottomSystemBarStrip, bottom);
    }

    private void updateSystemBarStripHeight(View view, int height) {
        if (view == null) {
            return;
        }
        ViewGroup.LayoutParams params = view.getLayoutParams();
        if (params == null || params.height == height) {
            return;
        }
        params.height = height;
        view.setLayoutParams(params);
        view.bringToFront();
    }

    private int maxInsets(int... values) {
        int max = 0;
        for (int value : values) {
            max = Math.max(max, value);
        }
        return max;
    }

    private String jsNumber(float value) {
        if (Float.isNaN(value) || Float.isInfinite(value) || value <= 0) {
            return "0";
        }
        return Float.toString(value);
    }

    private boolean shouldUseProbeColors() {
        return EDGE_PROBE_COLORS
            && (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
    }

    private void logT031Identity(String stage) {
        Log.d(
            EDGE_TAG,
            "identity stage=" + stage
                + " build=" + EDGE_BUILD_ID
                + " package=" + getPackageName()
                + " manufacturer=" + Build.MANUFACTURER
                + " model=" + Build.MODEL
                + " sdk=" + Build.VERSION.SDK_INT
                + " targetSdk=" + getApplicationInfo().targetSdkVersion
                + " activity=" + MainActivity.class.getName()
        );
    }

    private void installNativeBackDispatch() {
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                dispatchBackToWebView();
            }
        });
    }

    private void dispatchBackToWebView() {
        if (getBridge() == null || getBridge().getWebView() == null) {
            finish();
            return;
        }

        WebView webView = getBridge().getWebView();
        webView.evaluateJavascript(
            "window.solarRemoteHandleNativeBack ? window.solarRemoteHandleNativeBack() : 'exit';",
            result -> {
                if (result != null && result.contains("handled")) {
                    return;
                }
                finish();
            }
        );
    }
}
