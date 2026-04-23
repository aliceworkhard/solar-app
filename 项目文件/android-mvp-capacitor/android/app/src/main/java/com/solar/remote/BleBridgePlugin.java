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

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Map<String, ScanResult> scanResults = new LinkedHashMap<>();

    private BluetoothAdapter bluetoothAdapter;
    private BluetoothGatt bluetoothGatt;
    private ScanCallback activeScanCallback;
    private String activeNamePrefix = "";
    private String connectedDeviceId = "";

    private PluginCall activeScanCall;
    private PluginCall connectCall;
    private PluginCall subscribeCall;
    private PluginCall writeCall;

    private final BluetoothGattCallback gattCallback = new BluetoothGattCallback() {
        @Override
        public void onConnectionStateChange(@NonNull BluetoothGatt gatt, int status, int newState) {
            if (newState == BluetoothGatt.STATE_CONNECTED) {
                connectedDeviceId = gatt.getDevice().getAddress();
                emitConnectionState("connected", null);
                gatt.discoverServices();
                return;
            }
            if (newState == BluetoothGatt.STATE_DISCONNECTED) {
                connectedDeviceId = "";
                emitConnectionState("disconnected", statusMessage(status));
                if (connectCall != null) {
                    connectCall.reject("Disconnected before service discovery.");
                    connectCall = null;
                }
                cleanupGatt();
            }
        }

        @Override
        public void onServicesDiscovered(@NonNull BluetoothGatt gatt, int status) {
            if (connectCall == null) {
                return;
            }
            if (status == BluetoothGatt.GATT_SUCCESS) {
                connectCall.resolve();
            } else {
                connectCall.reject("Service discovery failed: " + statusMessage(status));
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
            } else {
                subscribeCall.reject("Notify subscribe failed: " + statusMessage(status));
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
        BluetoothLeScanner scanner = bluetoothAdapter.getBluetoothLeScanner();
        if (scanner == null) {
            call.reject("Bluetooth scanner unavailable.");
            return;
        }

        if (activeScanCallback != null) {
            scanner.stopScan(activeScanCallback);
            activeScanCallback = null;
        }

        activeNamePrefix = call.getString("namePrefix", "");
        int timeoutMs = call.getInt("timeoutMs", 5000);
        scanResults.clear();
        activeScanCall = call;
        emitConnectionState("scanning", null);

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
            }

            @Override
            public void onScanFailed(int errorCode) {
                if (activeScanCall != null) {
                    activeScanCall.reject("Scan failed: " + errorCode);
                    activeScanCall = null;
                }
            }
        };

        scanner.startScan(activeScanCallback);
        handler.postDelayed(() -> finishScan(scanner), Math.max(timeoutMs, 1000));
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

        BluetoothDevice device;
        try {
            device = bluetoothAdapter.getRemoteDevice(deviceId);
        } catch (IllegalArgumentException error) {
            call.reject("Invalid deviceId.");
            return;
        }

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
        }
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
        if (!bluetoothGatt.writeDescriptor(descriptor)) {
            subscribeCall = null;
            call.reject("writeDescriptor failed.");
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

    private void finishScan(BluetoothLeScanner scanner) {
        if (activeScanCallback != null) {
            scanner.stopScan(activeScanCallback);
            activeScanCallback = null;
        }
        if (activeScanCall == null) {
            return;
        }
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
        JSObject payload = new JSObject();
        payload.put("devices", devices);
        activeScanCall.resolve(payload);
        activeScanCall = null;
        emitConnectionState("idle", null);
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
        if (bluetoothGatt != null) {
            bluetoothGatt.close();
            bluetoothGatt = null;
        }
    }
}
