package com.solar.remote;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothGatt;
import android.bluetooth.BluetoothGattCallback;
import android.bluetooth.BluetoothGattCharacteristic;
import android.bluetooth.BluetoothGattDescriptor;
import android.bluetooth.BluetoothGattService;
import android.bluetooth.BluetoothManager;
import android.bluetooth.le.BluetoothLeScanner;
import android.bluetooth.le.ScanCallback;
import android.bluetooth.le.ScanResult;
import android.bluetooth.le.ScanSettings;
import android.content.Context;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.text.TextUtils;

import androidx.annotation.NonNull;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@CapacitorPlugin(
    name = "BleBridge",
    permissions = {
        @Permission(alias = "bleScan", strings = { Manifest.permission.BLUETOOTH_SCAN }),
        @Permission(alias = "bleConnect", strings = { Manifest.permission.BLUETOOTH_CONNECT }),
        @Permission(alias = "location", strings = { Manifest.permission.ACCESS_FINE_LOCATION })
    }
)
public class BleBridgePlugin extends Plugin {
    private static final UUID CLIENT_CONFIG_UUID = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb");
    private static final int MIN_SCAN_WINDOW_MS = 600;
    private static final int DEFAULT_SCAN_QUICK_MS = 1500;
    private static final int DEFAULT_SCAN_FULL_MS = 4200;
    private static final int DEFAULT_CONNECT_TIMEOUT_MS = 3200;
    private static final int DEFAULT_DISCOVER_TIMEOUT_MS = 1800;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Map<String, ScanResult> scanResults = new LinkedHashMap<>();

    private BluetoothAdapter bluetoothAdapter;
    private BluetoothGatt bluetoothGatt;
    private BluetoothLeScanner activeScanner;
    private ScanCallback activeScanCallback;
    private String activeNamePrefix = "";
    private boolean scanAllowFallbackNoPrefix = true;
    private boolean scanUsingFallbackNoPrefix = false;
    private int scanQuickWindowMs = DEFAULT_SCAN_QUICK_MS;
    private int scanFullWindowMs = DEFAULT_SCAN_FULL_MS;
    private boolean quickScanResolved = false;
    private boolean fullScanFinished = false;
    private String connectedDeviceId = "";
    private int connectTimeoutMs = DEFAULT_CONNECT_TIMEOUT_MS;
    private int discoverTimeoutMs = DEFAULT_DISCOVER_TIMEOUT_MS;

    private PluginCall activeScanCall;
    private PluginCall connectCall;
    private PluginCall subscribeCall;
    private PluginCall writeCall;

    private Runnable quickScanRunnable;
    private Runnable fullScanRunnable;
    private Runnable connectTimeoutRunnable;
    private Runnable discoverTimeoutRunnable;

    private final BluetoothGattCallback gattCallback = new BluetoothGattCallback() {
        @Override
        public void onConnectionStateChange(@NonNull BluetoothGatt gatt, int status, int newState) {
            if (newState == BluetoothGatt.STATE_CONNECTED) {
                connectedDeviceId = gatt.getDevice().getAddress();
                clearConnectTimeout();
                emitConnectionState("discovering", null);
                startDiscoverTimeout();
                if (!gatt.discoverServices()) {
                    rejectConnectCall("discoverServices returned false.");
                    emitConnectionState("error", "discoverServices-start-failed");
                }
                return;
            }
            if (newState == BluetoothGatt.STATE_DISCONNECTED) {
                clearConnectTimeout();
                clearDiscoverTimeout();
                connectedDeviceId = "";
                emitConnectionState("disconnected", statusMessage(status));
                if (connectCall != null) {
                    connectCall.reject("Disconnected before service discovery.");
                    connectCall = null;
                }
                if (subscribeCall != null) {
                    subscribeCall.reject("Disconnected during subscribe.");
                    subscribeCall = null;
                }
                cleanupGatt();
            }
        }

        @Override
        public void onServicesDiscovered(@NonNull BluetoothGatt gatt, int status) {
            clearDiscoverTimeout();
            if (connectCall == null) {
                return;
            }
            if (status == BluetoothGatt.GATT_SUCCESS) {
                connectCall.resolve();
                emitConnectionState("connected", null);
            } else {
                connectCall.reject("Service discovery failed: " + statusMessage(status));
                emitConnectionState("error", "discover-failed-" + statusMessage(status));
            }
            connectCall = null;
        }

        @Override
        public void onCharacteristicChanged(@NonNull BluetoothGatt gatt, @NonNull BluetoothGattCharacteristic characteristic) {
            JSObject payload = new JSObject();
            payload.put("deviceId", gatt.getDevice().getAddress());
            payload.put("packetHex", bytesToHex(characteristic.getValue()));
            payload.put("receivedAt", System.currentTimeMillis());
            notifyListeners("notify", payload);
        }

        @Override
        public void onDescriptorWrite(@NonNull BluetoothGatt gatt, @NonNull BluetoothGattDescriptor descriptor, int status) {
            if (subscribeCall == null) {
                return;
            }
            if (status == BluetoothGatt.GATT_SUCCESS) {
                subscribeCall.resolve();
                emitConnectionState("ready", null);
            } else {
                subscribeCall.reject("Notify subscribe failed: " + statusMessage(status));
                emitConnectionState("error", "subscribe-failed-" + statusMessage(status));
            }
            subscribeCall = null;
        }

        @Override
        public void onCharacteristicWrite(@NonNull BluetoothGatt gatt, @NonNull BluetoothGattCharacteristic characteristic, int status) {
            if (writeCall == null) {
                return;
            }
            if (status == BluetoothGatt.GATT_SUCCESS) {
                writeCall.resolve();
            } else {
                writeCall.reject("Write failed: " + statusMessage(status));
            }
            writeCall = null;
        }
    };

    @PluginMethod
    public void scan(PluginCall call) {
        if (!hasRequiredPermissions()) {
            requestAllPermissions(call, "permissionsCallback");
            return;
        }
        ensureAdapter();
        if (bluetoothAdapter == null) {
            call.reject("Bluetooth adapter not found.");
            return;
        }
        if (!bluetoothAdapter.isEnabled()) {
            call.reject("Bluetooth is disabled.");
            return;
        }

        cancelActiveScan();

        activeNamePrefix = call.getString("namePrefix", "");
        scanQuickWindowMs = Math.max(call.getInt("quickWindowMs", DEFAULT_SCAN_QUICK_MS), MIN_SCAN_WINDOW_MS);
        int fullWindow = call.getInt("fullWindowMs", DEFAULT_SCAN_FULL_MS);
        scanFullWindowMs = Math.max(fullWindow, scanQuickWindowMs);
        scanAllowFallbackNoPrefix = call.getBoolean("allowFallbackNoPrefix", true);
        scanUsingFallbackNoPrefix = false;
        quickScanResolved = false;
        fullScanFinished = false;
        scanResults.clear();
        activeScanCall = call;

        emitConnectionState("scanning", null);
        if (!startScanWithPrefix(activeNamePrefix)) {
            call.reject("Failed to start BLE scan.");
            activeScanCall = null;
            emitConnectionState("error", "scan-start-failed");
            return;
        }
        emitScanProgress("quick", false);

        quickScanRunnable = this::handleQuickScanWindowReached;
        fullScanRunnable = this::handleFullScanWindowReached;
        handler.postDelayed(quickScanRunnable, scanQuickWindowMs);
        handler.postDelayed(fullScanRunnable, scanFullWindowMs);
    }

    @PluginMethod
    public void connect(PluginCall call) {
        if (!hasRequiredPermissions()) {
            requestAllPermissions(call, "permissionsCallback");
            return;
        }
        ensureAdapter();
        if (bluetoothAdapter == null) {
            call.reject("Bluetooth adapter not found.");
            return;
        }

        String deviceId = call.getString("deviceId");
        if (TextUtils.isEmpty(deviceId)) {
            call.reject("deviceId is required.");
            return;
        }

        connectTimeoutMs = Math.max(call.getInt("connectTimeoutMs", DEFAULT_CONNECT_TIMEOUT_MS), 1000);
        discoverTimeoutMs = Math.max(call.getInt("discoverTimeoutMs", DEFAULT_DISCOVER_TIMEOUT_MS), 1000);

        BluetoothDevice device;
        try {
            device = bluetoothAdapter.getRemoteDevice(deviceId);
        } catch (IllegalArgumentException error) {
            call.reject("Invalid deviceId.");
            return;
        }

        clearConnectTimeout();
        clearDiscoverTimeout();
        cleanupGatt();
        connectCall = call;
        emitConnectionState("connecting", null);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            bluetoothGatt = device.connectGatt(getContext(), false, gattCallback, BluetoothDevice.TRANSPORT_LE);
        } else {
            bluetoothGatt = device.connectGatt(getContext(), false, gattCallback);
        }
        if (bluetoothGatt == null) {
            connectCall = null;
            call.reject("connectGatt returned null.");
            emitConnectionState("error", "connectGatt-null");
            return;
        }
        startConnectTimeout();
    }

    @PluginMethod
    public void discover(PluginCall call) {
        if (!isGattReady(call)) {
            return;
        }
        JSArray services = new JSArray();
        for (BluetoothGattService service : bluetoothGatt.getServices()) {
            JSObject serviceObj = new JSObject();
            serviceObj.put("uuid", service.getUuid().toString().toLowerCase(Locale.US));
            JSArray chars = new JSArray();
            for (BluetoothGattCharacteristic characteristic : service.getCharacteristics()) {
                JSObject charObj = new JSObject();
                charObj.put("uuid", characteristic.getUuid().toString().toLowerCase(Locale.US));
                JSArray props = new JSArray();
                for (String prop : characteristicProps(characteristic.getProperties())) {
                    props.put(prop);
                }
                charObj.put("properties", props);
                chars.put(charObj);
            }
            serviceObj.put("characteristics", chars);
            services.put(serviceObj);
        }
        JSObject payload = new JSObject();
        payload.put("services", services);
        call.resolve(payload);
    }

    @PluginMethod
    public void subscribe(PluginCall call) {
        if (!isGattReady(call)) {
            return;
        }
        String notifyUuid = call.getString("notifyUUID");
        BluetoothGattCharacteristic characteristic = findCharacteristic(notifyUuid);
        if (characteristic == null) {
            call.reject("Notify characteristic not found.");
            return;
        }
        int props = characteristic.getProperties();
        boolean canNotify = (props & BluetoothGattCharacteristic.PROPERTY_NOTIFY) != 0;
        boolean canIndicate = (props & BluetoothGattCharacteristic.PROPERTY_INDICATE) != 0;
        if (!canNotify && !canIndicate) {
            call.reject("Characteristic does not support notify or indicate.");
            return;
        }
        boolean notified = bluetoothGatt.setCharacteristicNotification(characteristic, true);
        if (!notified) {
            call.reject("setCharacteristicNotification failed.");
            return;
        }
        BluetoothGattDescriptor descriptor = characteristic.getDescriptor(CLIENT_CONFIG_UUID);
        if (descriptor == null) {
            call.reject("CCCD descriptor not found.");
            return;
        }
        descriptor.setValue(
            canNotify
                ? BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
                : BluetoothGattDescriptor.ENABLE_INDICATION_VALUE
        );
        subscribeCall = call;
        emitConnectionState("subscribing", null);
        if (!bluetoothGatt.writeDescriptor(descriptor)) {
            subscribeCall = null;
            call.reject("writeDescriptor failed.");
            emitConnectionState("error", "subscribe-writeDescriptor-failed");
        }
    }

    @PluginMethod
    public void write(PluginCall call) {
        if (!isGattReady(call)) {
            return;
        }
        String writeUuid = call.getString("writeUUID");
        String payloadHex = call.getString("payloadHex", "");
        String writeType = call.getString("writeType", "write");
        BluetoothGattCharacteristic characteristic = findCharacteristic(writeUuid);
        if (characteristic == null) {
            call.reject("Write characteristic not found.");
            return;
        }
        byte[] value;
        try {
            value = hexToBytes(payloadHex);
        } catch (IllegalArgumentException error) {
            call.reject(error.getMessage());
            return;
        }
        boolean noResponse = "writeNoResponse".equalsIgnoreCase(writeType);
        characteristic.setWriteType(
            noResponse
                ? BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE
                : BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT
        );
        characteristic.setValue(value);
        if (!noResponse) {
            writeCall = call;
        }
        if (!bluetoothGatt.writeCharacteristic(characteristic)) {
            writeCall = null;
            call.reject("writeCharacteristic failed.");
            return;
        }
        if (noResponse) {
            call.resolve();
        }
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        clearConnectTimeout();
        clearDiscoverTimeout();
        cancelActiveScan();
        if (bluetoothGatt != null) {
            bluetoothGatt.disconnect();
            cleanupGatt();
        }
        connectedDeviceId = "";
        emitConnectionState("disconnected", null);
        call.resolve();
    }

    @PermissionCallback
    private void permissionsCallback(PluginCall call) {
        if (!hasRequiredPermissions()) {
            call.reject("Bluetooth permissions denied.");
            return;
        }
        String method = call.getMethodName();
        if ("scan".equals(method)) {
            scan(call);
            return;
        }
        if ("connect".equals(method)) {
            connect(call);
            return;
        }
        call.resolve();
    }

    private void handleQuickScanWindowReached() {
        if (activeScanCall == null || quickScanResolved) {
            return;
        }
        if (scanResults.isEmpty() && scanAllowFallbackNoPrefix && !scanUsingFallbackNoPrefix && !TextUtils.isEmpty(activeNamePrefix)) {
            scanUsingFallbackNoPrefix = true;
            startScanWithPrefix("");
            handler.postDelayed(this::resolveQuickScanResult, 650);
            return;
        }
        resolveQuickScanResult();
    }

    private void handleFullScanWindowReached() {
        if (fullScanFinished) {
            return;
        }
        fullScanFinished = true;
        resolveQuickScanResult();
        stopScanHardwareOnly();
        emitScanProgress("full", true);
        emitConnectionState("idle", null);
        clearScanTimers();
    }

    private void resolveQuickScanResult() {
        if (quickScanResolved) {
            return;
        }
        quickScanResolved = true;
        emitScanProgress("quick", false);
        if (activeScanCall != null) {
            activeScanCall.resolve(buildScanPayload());
            activeScanCall = null;
        }
        emitConnectionState("idle", null);
    }

    private boolean startScanWithPrefix(String prefix) {
        ensureAdapter();
        if (bluetoothAdapter == null) {
            return false;
        }
        BluetoothLeScanner scanner = bluetoothAdapter.getBluetoothLeScanner();
        if (scanner == null) {
            return false;
        }
        stopScanHardwareOnly();
        activeScanner = scanner;
        activeNamePrefix = prefix == null ? "" : prefix;
        activeScanCallback = new ScanCallback() {
            @Override
            public void onScanResult(int callbackType, ScanResult result) {
                BluetoothDevice device = result.getDevice();
                if (device == null) {
                    return;
                }
                String name = resolveDeviceName(result);
                if (!matchesPrefix(name, activeNamePrefix)) {
                    return;
                }
                scanResults.put(device.getAddress(), result);
                emitScanProgress(quickScanResolved ? "full" : "quick", false);
            }

            @Override
            public void onScanFailed(int errorCode) {
                rejectAndResetScan("Scan failed: " + errorCode);
            }
        };
        ScanSettings settings = new ScanSettings.Builder()
            .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
            .build();
        try {
            activeScanner.startScan(Collections.emptyList(), settings, activeScanCallback);
            return true;
        } catch (IllegalStateException error) {
            rejectAndResetScan("Scan start failed: " + error.getMessage());
            return false;
        }
    }

    private void rejectAndResetScan(String reason) {
        if (activeScanCall != null) {
            activeScanCall.reject(reason);
            activeScanCall = null;
        }
        emitConnectionState("error", reason);
        cancelActiveScan();
    }

    private JSObject buildScanPayload() {
        JSObject payload = new JSObject();
        payload.put("devices", buildDeviceArray());
        return payload;
    }

    private JSArray buildDeviceArray() {
        JSArray devices = new JSArray();
        for (ScanResult result : scanResults.values()) {
            BluetoothDevice device = result.getDevice();
            if (device == null) {
                continue;
            }
            JSObject item = new JSObject();
            item.put("deviceId", device.getAddress());
            item.put("name", resolveDeviceName(result));
            item.put("rssi", result.getRssi());
            devices.put(item);
        }
        return devices;
    }

    private void emitScanProgress(String stage, boolean completed) {
        JSObject payload = new JSObject();
        payload.put("devices", buildDeviceArray());
        payload.put("stage", stage);
        payload.put("completed", completed);
        payload.put("usedFallbackNoPrefix", scanUsingFallbackNoPrefix);
        payload.put("emittedAt", System.currentTimeMillis());
        notifyListeners("scanProgress", payload);
    }

    private void cancelActiveScan() {
        clearScanTimers();
        stopScanHardwareOnly();
        activeScanCall = null;
        quickScanResolved = false;
        fullScanFinished = false;
        scanUsingFallbackNoPrefix = false;
    }

    private void stopScanHardwareOnly() {
        if (activeScanner != null && activeScanCallback != null) {
            try {
                activeScanner.stopScan(activeScanCallback);
            } catch (IllegalStateException ignored) {
                // Ignore scanner stop failures when bluetooth state changes abruptly.
            }
        }
        activeScanCallback = null;
        activeScanner = null;
    }

    private void clearScanTimers() {
        if (quickScanRunnable != null) {
            handler.removeCallbacks(quickScanRunnable);
            quickScanRunnable = null;
        }
        if (fullScanRunnable != null) {
            handler.removeCallbacks(fullScanRunnable);
            fullScanRunnable = null;
        }
    }

    private void startConnectTimeout() {
        clearConnectTimeout();
        connectTimeoutRunnable = () -> {
            if (connectCall == null) {
                return;
            }
            connectCall.reject("Connect timeout.");
            connectCall = null;
            emitConnectionState("error", "connect-timeout");
            if (bluetoothGatt != null) {
                bluetoothGatt.disconnect();
            }
            cleanupGatt();
        };
        handler.postDelayed(connectTimeoutRunnable, connectTimeoutMs);
    }

    private void clearConnectTimeout() {
        if (connectTimeoutRunnable != null) {
            handler.removeCallbacks(connectTimeoutRunnable);
            connectTimeoutRunnable = null;
        }
    }

    private void startDiscoverTimeout() {
        clearDiscoverTimeout();
        discoverTimeoutRunnable = () -> {
            if (connectCall == null) {
                return;
            }
            connectCall.reject("Service discovery timeout.");
            connectCall = null;
            emitConnectionState("error", "discover-timeout");
            if (bluetoothGatt != null) {
                bluetoothGatt.disconnect();
            }
            cleanupGatt();
        };
        handler.postDelayed(discoverTimeoutRunnable, discoverTimeoutMs);
    }

    private void clearDiscoverTimeout() {
        if (discoverTimeoutRunnable != null) {
            handler.removeCallbacks(discoverTimeoutRunnable);
            discoverTimeoutRunnable = null;
        }
    }

    private void rejectConnectCall(String reason) {
        if (connectCall == null) {
            return;
        }
        connectCall.reject(reason);
        connectCall = null;
    }

    private void emitConnectionState(String state, String reason) {
        JSObject payload = new JSObject();
        payload.put("state", state);
        if (reason != null) {
            payload.put("reason", reason);
        }
        notifyListeners("connectionState", payload);
    }

    private void ensureAdapter() {
        if (bluetoothAdapter != null) {
            return;
        }
        Context context = getContext();
        BluetoothManager manager = (BluetoothManager) context.getSystemService(Context.BLUETOOTH_SERVICE);
        if (manager != null) {
            bluetoothAdapter = manager.getAdapter();
        }
    }

    private boolean isGattReady(PluginCall call) {
        if (bluetoothGatt == null) {
            call.reject("No connected gatt.");
            return false;
        }
        return true;
    }

    private BluetoothGattCharacteristic findCharacteristic(String uuidString) {
        if (bluetoothGatt == null || TextUtils.isEmpty(uuidString)) {
            return null;
        }
        UUID target;
        try {
            target = UUID.fromString(uuidString.toLowerCase(Locale.US));
        } catch (IllegalArgumentException error) {
            return null;
        }
        for (BluetoothGattService service : bluetoothGatt.getServices()) {
            for (BluetoothGattCharacteristic characteristic : service.getCharacteristics()) {
                if (target.equals(characteristic.getUuid())) {
                    return characteristic;
                }
            }
        }
        return null;
    }

    private List<String> characteristicProps(int flags) {
        List<String> props = new ArrayList<>();
        if ((flags & BluetoothGattCharacteristic.PROPERTY_READ) != 0) {
            props.add("read");
        }
        if ((flags & BluetoothGattCharacteristic.PROPERTY_WRITE) != 0) {
            props.add("write");
        }
        if ((flags & BluetoothGattCharacteristic.PROPERTY_WRITE_NO_RESPONSE) != 0) {
            props.add("writeNoResponse");
        }
        if ((flags & BluetoothGattCharacteristic.PROPERTY_NOTIFY) != 0) {
            props.add("notify");
        }
        if ((flags & BluetoothGattCharacteristic.PROPERTY_INDICATE) != 0) {
            props.add("indicate");
        }
        return props;
    }

    private String resolveDeviceName(ScanResult result) {
        BluetoothDevice device = result.getDevice();
        if (device != null && !TextUtils.isEmpty(device.getName())) {
            return device.getName();
        }
        if (result.getScanRecord() != null && !TextUtils.isEmpty(result.getScanRecord().getDeviceName())) {
            return result.getScanRecord().getDeviceName();
        }
        return "Unknown";
    }

    private boolean matchesPrefix(String name, String prefix) {
        if (TextUtils.isEmpty(prefix)) {
            return true;
        }
        if (TextUtils.isEmpty(name)) {
            return false;
        }
        return name.toLowerCase(Locale.US).startsWith(prefix.toLowerCase(Locale.US));
    }

    private byte[] hexToBytes(String raw) {
        String normalized = raw == null ? "" : raw.replaceAll("[^0-9a-fA-F]", "");
        if (normalized.length() == 0 || normalized.length() % 2 != 0) {
            throw new IllegalArgumentException("Invalid payloadHex.");
        }
        byte[] output = new byte[normalized.length() / 2];
        for (int i = 0; i < normalized.length(); i += 2) {
            output[i / 2] = (byte) Integer.parseInt(normalized.substring(i, i + 2), 16);
        }
        return output;
    }

    private String bytesToHex(byte[] bytes) {
        if (bytes == null || bytes.length == 0) {
            return "";
        }
        StringBuilder builder = new StringBuilder(bytes.length * 2);
        for (byte item : bytes) {
            builder.append(String.format(Locale.US, "%02X", item));
        }
        return builder.toString();
    }

    private String statusMessage(int status) {
        return String.valueOf(status);
    }

    private void cleanupGatt() {
        clearConnectTimeout();
        clearDiscoverTimeout();
        if (bluetoothGatt != null) {
            bluetoothGatt.close();
            bluetoothGatt = null;
        }
    }
}
