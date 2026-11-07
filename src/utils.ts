export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const money = (n: number) =>
  Math.round(n).toLocaleString("vi-VN") + " ₫";

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
