import { useCallback, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import type { BundleInfo } from "@capgo/capacitor-updater";

// Tự cập nhật giao diện không cần cài lại APK.
// Mỗi lần push, CI đăng lên GitHub Releases: HanhTrinh.apk + bundle.zip (giao diện) + update.json (số build mới nhất).
// App so số build đang chạy (__APP_BUILD__) với update.json; nếu mới hơn thì tải bundle.zip về,
// dùng ở lần mở app kế tiếp (hoặc ngay khi bấm "Cập nhật ngay").
// Chỉ chạy trong app Android; trên web/dev thì tắt.

type Remote = { version: string; build: number; bundle: string; url: string };

export type UpdateState =
  | { kind: "off" }
  | { kind: "checking" }
  | { kind: "latest" }
  | { kind: "downloading"; build: number }
  | { kind: "ready"; build: number; bundle: BundleInfo }
  | { kind: "error" };

const LOCAL_BUILD = Number(__APP_BUILD__) || 0;
const INFO_URL = __APP_REPO__ ? `https://github.com/${__APP_REPO__}/releases/latest/download/update.json` : "";
const ENABLED = Capacitor.isNativePlatform() && !!INFO_URL && LOCAL_BUILD > 0;
const MIN_GAP_MS = 10 * 60 * 1000; // không kiểm tra dày hơn 10 phút một lần khi quay lại app

// Báo cho plugin biết giao diện mới chạy ổn. Nếu bản vừa tải bị lỗi và không gọi được hàm này
// trong vài giây đầu, plugin tự quay về bản trước đó.
export async function markAppReady() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { CapacitorUpdater } = await import("@capgo/capacitor-updater");
    await CapacitorUpdater.notifyAppReady();
  } catch {
    /* bỏ qua */
  }
}

export function useUpdater() {
  const [state, setState] = useState<UpdateState>({ kind: ENABLED ? "checking" : "off" });
  const busy = useRef(false);
  const last = useRef(0);

  const check = useCallback(async (force = false) => {
    if (!ENABLED || busy.current) return;
    if (!force && Date.now() - last.current < MIN_GAP_MS) return;
    busy.current = true;
    last.current = Date.now();
    try {
      setState((s) => (s.kind === "ready" ? s : { kind: "checking" }));
      const res = await fetch(INFO_URL, { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const info = (await res.json()) as Remote;
      if (!(info.build > LOCAL_BUILD)) {
        setState((s) => (s.kind === "ready" ? s : { kind: "latest" }));
        return;
      }
      setState({ kind: "downloading", build: info.build });
      const { CapacitorUpdater } = await import("@capgo/capacitor-updater");
      const bundle = await CapacitorUpdater.download({ url: info.url, version: info.bundle });
      await CapacitorUpdater.next({ id: bundle.id }); // chắc chắn dùng ở lần mở sau
      setState({ kind: "ready", build: info.build, bundle });
    } catch {
      setState((s) => (s.kind === "ready" ? s : { kind: "error" }));
    } finally {
      busy.current = false;
    }
  }, []);

  // Kiểm tra khi mở app và mỗi khi quay lại app
  useEffect(() => {
    if (!ENABLED) return;
    void check(true);
    const onVisible = () => document.visibilityState === "visible" && void check(false);
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [check]);

  // Dùng bản mới ngay: plugin tải lại giao diện, dữ liệu trong localStorage giữ nguyên
  const apply = useCallback(async () => {
    if (state.kind !== "ready") return;
    try {
      const { CapacitorUpdater } = await import("@capgo/capacitor-updater");
      await CapacitorUpdater.set(state.bundle);
    } catch {
      setState({ kind: "error" });
    }
  }, [state]);

  return { state, check: () => check(true), apply, enabled: ENABLED };
}
