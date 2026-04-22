# Android BLE MVP

Capacitor + TypeScript MVP for:

- BLE transport (`FFF0/FFF1/FFF2`)
- command protocol (`CommandBuilder / ResponseParser / Crc`)
- 2 pages UI:
  - device home
  - device detail control

## Run

```bash
npm.cmd install
npm.cmd run dev
```

## Android workflow

```bash
npm.cmd run sync
npm.cmd run android:open
```

## Notes

- `writeType` is auto-detected from discovered characteristic properties.
- hidden debug panel can be toggled by tapping the title area 5 times.
- native plugin is implemented at:
  - `android/app/src/main/java/com/solar/remote/BleBridgePlugin.java`

