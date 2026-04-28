package com.solar.remote;

import android.os.Bundle;
import android.webkit.WebView;

import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BleBridgePlugin.class);
        super.onCreate(savedInstanceState);
        installNativeBackDispatch();
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
