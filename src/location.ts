import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { AndroidSettings, IOSSettings, NativeSettings } from "capacitor-native-settings";

export type LocResult =
  | { ok: true; lat: number; lng: number }
  // denied: chưa cấp quyền; off: GPS/dịch vụ vị trí đang tắt; unsupported/failed: lỗi khác
  // legacy: app đang chạy giao diện mới trên APK cũ (thiếu plugin native), cần cài lại APK
  | { ok: false; reason: "denied" | "off" | "unsupported" | "failed"; legacy: boolean };

const granted = (s?: string) => s === "granted";

// Cách của trình duyệt/WebView; thử độ chính xác cao trước, không được thì hạ xuống thấp (trong nhà, GPS yếu)
function browserPosition(): Promise<{ lat: number; lng: number } | "denied" | "failed"> {
  const once = (high: boolean, timeout: number) =>
    new Promise<{ lat: number; lng: number } | "denied" | "failed">((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (g) => resolve({ lat: g.coords.latitude, lng: g.coords.longitude }),
        (err) => resolve(err.code === 1 ? "denied" : "failed"),
        { enableHighAccuracy: high, timeout, maximumAge: 60000 },
      );
    });
  return once(true, 10000).then((r) => (r === "failed" ? once(false, 15000) : r));
}

/** Lấy vị trí hiện tại. Trên APK mới: hộp thoại xin quyền của Android qua plugin; APK cũ hoặc trình duyệt: navigator.geolocation. */
export async function getMyPosition(): Promise<LocResult> {
  const native = Capacitor.isNativePlatform();
  const hasPlugin = native && Capacitor.isPluginAvailable("Geolocation");
  if (hasPlugin) {
    try {
      let p = await Geolocation.checkPermissions();
      if (!granted(p.location) && !granted(p.coarseLocation)) {
        p = await Geolocation.requestPermissions({ permissions: ["location"] });
      }
      if (!granted(p.location) && !granted(p.coarseLocation)) return { ok: false, reason: "denied", legacy: false };
      try {
        const g = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
        return { ok: true, lat: g.coords.latitude, lng: g.coords.longitude };
      } catch {
        // Trong nhà GPS yếu: thử lại bằng định vị mạng/wifi
        const g = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 });
        return { ok: true, lat: g.coords.latitude, lng: g.coords.longitude };
      }
    } catch (e) {
      const m = String((e as { message?: string })?.message ?? e).toLowerCase();
      if (m.includes("denied")) return { ok: false, reason: "denied", legacy: false };
      if (m.includes("not enabled") || m.includes("disabled") || m.includes("location services")) {
        return { ok: false, reason: "off", legacy: false };
      }
      // Lỗi lạ từ plugin: thử cách của WebView trước khi bỏ cuộc
    }
  }
  if (!("geolocation" in navigator)) return { ok: false, reason: "unsupported", legacy: native && !hasPlugin };
  const r = await browserPosition();
  if (typeof r === "object") return { ok: true, ...r };
  return { ok: false, reason: r, legacy: native && !hasPlugin };
}

/** Chỉ có ý nghĩa trên APK; trên trình duyệt không mở được cài đặt. */
export const canOpenSettings = () => Capacitor.isNativePlatform();

export const openAppSettings = (): Promise<boolean> => openLocationSettings("app");

/** Mở trang cài đặt của ứng dụng (để bật quyền Vị trí) hoặc cài đặt GPS. */
export async function openLocationSettings(which: "app" | "gps"): Promise<boolean> {
  try {
    await NativeSettings.open({
      optionAndroid: which === "app" ? AndroidSettings.ApplicationDetails : AndroidSettings.Location,
      optionIOS: IOSSettings.App,
    });
    return true;
  } catch {
    return false; // APK cũ chưa có plugin: người dùng tự mở Cài đặt
  }
}
