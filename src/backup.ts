import { Capacitor } from "@capacitor/core";
import type { Data, Expense, Stop, Trip } from "./types";

// Sao lưu / khôi phục dữ liệu ra file JSON.
// Định dạng file: { app, format, exportedAt, appVersion, data: { trips, stops, expenses } }

export const BACKUP_APP = "hanh-trinh";
export const BACKUP_FORMAT = 1;

export type Backup = {
  app: string;
  format: number;
  exportedAt: string;
  appVersion: string;
  data: Data;
};

export function makeBackup(data: Data): Backup {
  return {
    app: BACKUP_APP,
    format: BACKUP_FORMAT,
    exportedAt: new Date().toISOString(),
    appVersion: __APP_VERSION__,
    data,
  };
}

export function backupFileName(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `hanh-trinh-sao-luu-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}.json`;
}

export const backupJson = (data: Data) => JSON.stringify(makeBackup(data), null, 2);

/* ───────────── Đọc và kiểm tra file nhập ───────────── */

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown) => (typeof v === "string" ? v : "");
const num = (v: unknown) => (typeof v === "number" && isFinite(v) ? v : Number(v) || 0);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type ParsedBackup = { data: Data; exportedAt: string; skipped: number };

// Trả về dữ liệu đã làm sạch, hoặc ném Error với thông báo tiếng Việt
export function parseBackup(text: string): ParsedBackup {
  let raw: unknown;
  try {
    raw = JSON.parse(text.replace(/^﻿/, ""));
  } catch {
    throw new Error("File không đọc được. Hãy chọn đúng file sao lưu .json của Hành Trình.");
  }
  if (!isObj(raw)) throw new Error("File không phải bản sao lưu của Hành Trình.");

  // Chấp nhận cả dạng có vỏ bọc { data: {...} } lẫn dạng { trips, stops, expenses }
  const body = isObj(raw.data) ? raw.data : raw;
  if (isObj(raw.data) && raw.app !== undefined && raw.app !== BACKUP_APP) {
    throw new Error("File này thuộc ứng dụng khác, không phải Hành Trình.");
  }
  if (typeof raw.format === "number" && raw.format > BACKUP_FORMAT) {
    throw new Error("File sao lưu tạo bởi bản app mới hơn. Hãy cập nhật app rồi thử lại.");
  }
  if (!Array.isArray(body.trips) || (body.stops !== undefined && !Array.isArray(body.stops)) || (body.expenses !== undefined && !Array.isArray(body.expenses))) {
    throw new Error("File không phải bản sao lưu của Hành Trình.");
  }

  let skipped = 0;
  const trips: Trip[] = [];
  for (const t of body.trips) {
    if (!isObj(t) || !str(t.id) || !str(t.name).trim() || !DATE_RE.test(str(t.startDate)) || !DATE_RE.test(str(t.endDate))) {
      skipped++;
      continue;
    }
    trips.push({
      id: str(t.id),
      name: str(t.name),
      destination: str(t.destination),
      startDate: str(t.startDate),
      endDate: str(t.endDate),
      budget: Math.max(0, Math.round(num(t.budget))),
    });
  }
  const ids = new Set(trips.map((t) => t.id));

  const stops: Stop[] = [];
  for (const s of (body.stops as unknown[] | undefined) ?? []) {
    if (!isObj(s) || !str(s.id) || !ids.has(str(s.tripId))) {
      skipped++;
      continue;
    }
    stops.push({
      id: str(s.id),
      tripId: str(s.tripId),
      day: Math.max(1, Math.round(num(s.day)) || 1),
      time: str(s.time),
      place: str(s.place),
      note: str(s.note),
      done: s.done === true,
    });
  }

  const expenses: Expense[] = [];
  for (const e of (body.expenses as unknown[] | undefined) ?? []) {
    if (!isObj(e) || !str(e.id) || !ids.has(str(e.tripId))) {
      skipped++;
      continue;
    }
    expenses.push({
      id: str(e.id),
      tripId: str(e.tripId),
      date: str(e.date),
      category: str(e.category) || "khac",
      amount: Math.max(0, Math.round(num(e.amount))),
      note: str(e.note),
    });
  }

  return { data: { trips, stops, expenses }, exportedAt: str(raw.exportedAt), skipped };
}

/* ───────────── Gộp / thay thế ───────────── */

function mergeById<T extends { id: string }>(cur: T[], inc: T[]): T[] {
  const map = new Map(cur.map((x) => [x.id, x]));
  for (const x of inc) map.set(x.id, x); // trùng id: ưu tiên bản trong file
  return [...map.values()];
}

export function mergeData(cur: Data, inc: Data): Data {
  return {
    trips: mergeById(cur.trips, inc.trips),
    stops: mergeById(cur.stops, inc.stops),
    expenses: mergeById(cur.expenses, inc.expenses),
  };
}

/* ───────────── Xuất file ───────────── */

export type ExportResult = "shared" | "downloaded" | "cancelled";

// Trong app Android: ghi file vào bộ nhớ tạm rồi mở bảng chia sẻ (lưu vào Tệp, Drive, gửi Zalo...).
// Trên trình duyệt: tải file xuống. Nếu app chưa có plugin (chưa cài lại APK) thì ném lỗi để giao diện đưa ra phương án sao chép.
export async function exportBackup(data: Data): Promise<ExportResult> {
  const json = backupJson(data);
  const name = backupFileName();

  if (!Capacitor.isNativePlatform()) {
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return "downloaded";
  }

  const { Filesystem, Directory, Encoding } = await import("@capacitor/filesystem");
  const { Share } = await import("@capacitor/share");
  const written = await Filesystem.writeFile({ path: name, data: json, directory: Directory.Cache, encoding: Encoding.UTF8 });
  try {
    await Share.share({ title: "Sao lưu Hành Trình", dialogTitle: "Lưu hoặc gửi file sao lưu", url: written.uri });
    return "shared";
  } catch (e) {
    if (/cancel/i.test(String((e as Error)?.message ?? e))) return "cancelled";
    throw e;
  }
}

// Phương án dự phòng: chép nội dung sao lưu vào bộ nhớ tạm của máy
export async function copyBackup(data: Data): Promise<boolean> {
  const json = backupJson(data);
  try {
    await navigator.clipboard.writeText(json);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = json;
    ta.style.cssText = "position:fixed;opacity:0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      /* bỏ qua */
    }
    ta.remove();
    return ok;
  }
}
