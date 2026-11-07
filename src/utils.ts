export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// 100000 -> "100.000" (tự viết để không phụ thuộc ngôn ngữ của máy)
export const groupDigits = (s: string | number) =>
  String(Math.round(Number(s) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

export const money = (n: number) => groupDigits(n) + " VNĐ";

export const todayStr = () => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
};

const toDate = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

export const daysBetween = (a: string, b: string) =>
  Math.round((toDate(b).getTime() - toDate(a).getTime()) / 86400000);

export const addDays = (s: string, n: number) => {
  const d = toDate(s);
  d.setDate(d.getDate() + n);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
};

export const fmtDate = (s: string) => {
  if (!s) return "";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
};

export const tripDayCount = (start: string, end: string) =>
  Math.max(1, daysBetween(start, end) + 1);

export const countdownText = (start: string, end: string) => {
  const today = todayStr();
  const toStart = daysBetween(today, start);
  if (toStart > 0) return `Còn ${toStart} ngày nữa khởi hành`;
  if (daysBetween(today, end) >= 0)
    return `Đang đi, ngày ${daysBetween(start, today) + 1}/${tripDayCount(start, end)}`;
  return "Chuyến đi đã kết thúc";
};

export const mapsUrl = (place: string) =>
  "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(place);

export type TripStatus = "upcoming" | "ongoing" | "past";
export const tripStatus = (start: string, end: string): TripStatus => {
  const today = todayStr();
  if (daysBetween(today, start) > 0) return "upcoming";
  if (daysBetween(today, end) >= 0) return "ongoing";
  return "past";
};

const WEEKDAYS = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];
export const weekdayName = (s: string) => WEEKDAYS[toDate(s).getDay()];

// "2027-03-05" -> { day: "05", month: "thg 3" } cho khối ngày trên thẻ chuyến đi
export const dayMonth = (s: string) => {
  const [, m, d] = s.split("-");
  return { day: d, month: "thg " + Number(m) };
};

// Rút gọn ngày dd/mm cho dòng thông tin ngắn
export const fmtShort = (s: string) => {
  if (!s) return "";
  const [, m, d] = s.split("-");
  return `${d}/${m}`;
};
