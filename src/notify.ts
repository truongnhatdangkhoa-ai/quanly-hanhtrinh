import { Capacitor } from "@capacitor/core";
import { LocalNotifications, type LocalNotificationSchema } from "@capacitor/local-notifications";
import type { Data } from "./types";
import { addDays } from "./utils";

// Thông báo nhắc (chỉ chạy trên APK). Mỗi lần dữ liệu đổi, huỷ hết thông báo cũ rồi đặt lại toàn bộ
// các nhắc còn ở tương lai, nên sửa/xóa điểm dừng hay chuyến đi đều tự khớp.

export const canNotify = () => Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("LocalNotifications");
// Đang chạy giao diện mới trên APK cũ (chưa có plugin thông báo): cần cài lại APK
export const notifyNeedsApk = () => Capacitor.isNativePlatform() && !Capacitor.isPluginAvailable("LocalNotifications");
const MAX_PENDING = 60; // Android giới hạn số báo thức; chỉ đặt các nhắc gần nhất

export type NotifyPerm = "granted" | "denied" | "unsupported";

export async function notifyPermission(ask: boolean): Promise<NotifyPerm> {
  if (!canNotify()) return "unsupported";
  try {
    let p = await LocalNotifications.checkPermissions();
    if (p.display !== "granted" && ask && p.display !== "denied") p = await LocalNotifications.requestPermissions();
    // Android 13+: đã từ chối hai lần thì requestPermissions không hiện hộp thoại nữa, chỉ còn cách mở cài đặt
    if (p.display !== "granted" && ask) p = await LocalNotifications.requestPermissions();
    return p.display === "granted" ? "granted" : "denied";
  } catch {
    return "denied";
  }
}

export const REMIND_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "Đúng giờ" },
  { value: 15, label: "Trước 15 phút" },
  { value: 60, label: "Trước 1 giờ" },
  { value: 1440, label: "Trước 1 ngày" },
];

const remindText = (m: number) =>
  m === 0 ? "Đến giờ rồi" : m < 60 ? `Còn ${m} phút` : m < 1440 ? `Còn ${Math.round(m / 60)} giờ` : `Còn ${Math.round(m / 1440)} ngày`;

function at(date: string, hhmm: string): Date {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = hhmm.split(":").map(Number);
  return new Date(y, (mo || 1) - 1, d || 1, h || 0, mi || 0, 0, 0);
}

type Item = { when: Date; title: string; body: string };

export function buildReminders(data: Data, now = new Date()): Item[] {
  const items: Item[] = [];
  for (const t of data.trips) {
    if (t.remindDeparture) {
      items.push({ when: at(addDays(t.startDate, -1), "20:00"), title: t.name, body: "Ngày mai khởi hành. Kiểm tra hành lý và giấy tờ nhé." });
      items.push({ when: at(t.startDate, "07:00"), title: t.name, body: "Hôm nay khởi hành. Chúc cả nhà thượng lộ bình an!" });
    }
  }
  const trips = new Map(data.trips.map((t) => [t.id, t]));
  for (const s of data.stops) {
    if (s.remind === undefined || !s.time || s.done) continue;
    const t = trips.get(s.tripId);
    if (!t) continue;
    const when = new Date(at(addDays(t.startDate, s.day - 1), s.time).getTime() - s.remind * 60000);
    items.push({ when, title: s.place, body: `${remindText(s.remind)} · ${s.time} · Ngày ${s.day} · ${t.name}` });
  }
  return items
    .filter((i) => i.when.getTime() > now.getTime() + 5000)
    .sort((a, b) => a.when.getTime() - b.when.getTime())
    .slice(0, MAX_PENDING);
}

let chain: Promise<void> = Promise.resolve();

/** Đặt lại toàn bộ thông báo theo dữ liệu hiện tại. Không tự xin quyền; chưa có quyền thì bỏ qua. */
export function syncReminders(data: Data): Promise<void> {
  if (!canNotify()) return Promise.resolve();
  chain = chain
    .then(async () => {
      const perm = await notifyPermission(false);
      if (perm !== "granted") return;
      const pend = await LocalNotifications.getPending();
      if (pend.notifications.length) await LocalNotifications.cancel({ notifications: pend.notifications });
      const list: LocalNotificationSchema[] = buildReminders(data).map((i, n) => ({
        id: n + 1,
        title: i.title,
        body: i.body,
        schedule: { at: i.when, allowWhileIdle: true },
      }));
      if (list.length) await LocalNotifications.schedule({ notifications: list });
    })
    .catch(() => undefined);
  return chain;
}
