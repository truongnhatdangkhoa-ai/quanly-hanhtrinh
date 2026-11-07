import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.hanhtrinh.dulich",
  appName: "Hành Trình",
  webDir: "dist",
  android: { allowMixedContent: false },
  plugins: {
    // Tự cập nhật giao diện: app tự kiểm tra GitHub Releases (xem src/updater.ts), tắt chế độ đám mây mặc định của plugin
    CapacitorUpdater: { autoUpdate: false },
    // fetch đi qua lớp mạng của Android để không bị chặn CORS khi gọi GitHub
    CapacitorHttp: { enabled: true },
  },
};

export default config;
