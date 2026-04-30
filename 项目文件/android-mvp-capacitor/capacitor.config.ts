import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.solar.remote',
  appName: 'Solar BLE MVP',
  webDir: 'dist',
  plugins: {
    SystemBars: {
      insetsHandling: 'disable',
      style: 'LIGHT',
      hidden: false,
      animation: 'NONE'
    }
  }
};

export default config;
