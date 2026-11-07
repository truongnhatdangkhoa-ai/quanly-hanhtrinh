import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { AndroidSettings, IOSSettings, NativeSettings } from "capacitor-native-settings";

export type LocResult =
  | { ok: true; lat: number; lng: number }
  // denied: chưa cấp quyền; off: GPS/dịch vụ vị trí đang tắt; unsupported/failed: lỗi khác
  | { ok: false; reason: "denied" | "off" | "unsupported" | "failed" };

const granted = (s?: string) => s === "granted";

/** Lấy vị trí hiện tại. Trên APK: tự hiện hộp thoại xin quyền của Android; trên trình duyệt dùng navigator.geolocation. */
export async function getMyPosition(): Promise<LocResult> {
  if (Capacitor.isNativePlatform()) {
    try {
      let p = await Geolocation.checkPermissions();
      if (!granted(p.location) && !granted(p.coarseLocation)) {
        p = await Geolocation.requestPermissions({ permissions: ["location"] });
      }
      if (!granted(p.location) && !granted(p.coarseLocation)) return { ok: false, reason: "denied" };
      const g = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
      return { ok: true, lat: g.coords.latitude, lng: g.coords.longitude };
    } catch (e) {
      const m = String((e as { message?: string })?.message ?? e).toLowerCase();
      if (m.includes("denied")) return { ok: false, reason: "denied" };
      if (m.includes("not enabled") || m.includes("disabled") || m.includes("location services")) {
        return { ok: false, reason: "off" };
      }
      return { ok: false, reason: "failed" };
    }
  }
  if (!("geolocation" in navigator)) return { ok: false, reason: "unsupported" };
  return new Promise<LocResult>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (g) => resolve({ ok: true, lat: g.coords.latitude, lng: g.coords.longitude }),
      (err) => resolve({ ok: false, reason: err.code === 1 ? "denied" : "failed" }),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  });
}

/** Chỉ có ý nghĩa trên APK; trên trình duyệt không mở được cài đặt. */
export const canOpenSettings = () => Capacitor.isNativePlatform();

/** Mở trang cài đặt của ứng dụng (để bật quyền Vị trí) hoặc cài đặt GPS. */
export async function openLocationSettings(which: "app" | "gps") {
  try {
    await NativeSettings.open({
      optionAndroid: which === "app" ? AndroidSettings.ApplicationDetails : AndroidSettings.Location,
      optionIOS: IOSSettings.App,
    });
  } catch {
    /* bản APK cũ chưa có plugin: người dùng tự mở Cài đặt */
  }
}
