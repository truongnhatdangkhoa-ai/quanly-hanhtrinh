// Đọc tọa độ và tên từ link Google Maps hoặc chữ tọa độ do người dùng dán vào ô tìm (không dùng mạng, dễ thử).
export type LinkPoint = { lat: number; lng: number; name: string };

const ok = (lat: number, lng: number) => Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);
const NUM = "(-?\\d{1,3}(?:\\.\\d+)?)";
const PAIR = new RegExp(NUM + "\\s*,\\s*" + NUM);

function pair(a: string | undefined, b: string | undefined): { lat: number; lng: number } | null {
  if (a === undefined || b === undefined) return null;
  const lat = parseFloat(a);
  const lng = parseFloat(b);
  return ok(lat, lng) ? { lat, lng } : null;
}

const dec = (s: string) => {
  try {
    return decodeURIComponent(s.replace(/\+/g, " "));
  } catch {
    return s.replace(/\+/g, " ");
  }
};

/** Lấy địa chỉ web đầu tiên trong đoạn chữ (Google Maps khi chia sẻ gửi cả tên lẫn link) */
export function extractUrl(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s"'<>]+/i);
  return m ? m[0].replace(/[).,;]+$/, "") : null;
}

export const isShortMapsLink = (url: string) => /^https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|g\.co\/kgs|share\.google)\//i.test(url);

/** Chữ tọa độ trần, ví dụ "10.4034, 105.0123" */
export function parsePlainCoords(text: string): LinkPoint | null {
  const t = text.trim();
  if (!/^[-+\d.\s,;°NSEW]+$/i.test(t)) return null;
  const m = t.match(PAIR);
  const p = m ? pair(m[1], m[2]) : null;
  return p ? { ...p, name: "" } : null;
}

/** Tên địa điểm trong đường dẫn dạng /maps/place/Tên/@... */
function nameFromPath(url: string): string {
  const m = url.match(/\/maps\/place\/([^/@?]+)/i);
  if (!m) return "";
  const n = dec(m[1]).trim();
  return /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(n) ? "" : n;
}

/** Tọa độ trong link Google Maps đầy đủ. Ưu tiên tọa độ của địa điểm (!3d!4d) hơn tâm khung nhìn (@) */
export function parseMapsUrl(url: string): LinkPoint | null {
  let u = url;
  try {
    u = decodeURIComponent(url);
  } catch {
    /* giữ nguyên */
  }
  const name = nameFromPath(url);
  const tries: RegExp[] = [
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
    /[?&](?:q|query|ll|destination|daddr|center|saddr)=(?:[^&]*?[(@:])?\s*(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/,
    /\/maps\/(?:search|dir)\/(?:[^/]*\/)*?(-?\d{1,3}\.\d+),\+?(-?\d{1,3}\.\d+)/,
    /\/maps\/place\/(-?\d{1,3}\.\d+),\+?(-?\d{1,3}\.\d+)/,
    /@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/,
  ];
  for (const re of tries) {
    const m = u.match(re);
    const p = m ? pair(m[1], m[2]) : null;
    if (p) return { ...p, name };
  }
  return null;
}

/** Tìm tọa độ trong nội dung trang (khi link rút gọn không cho đọc địa chỉ cuối) */
export function parseMapsPage(html: string): LinkPoint | null {
  const m1 = html.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  const m2 = html.match(/center=(-?\d+\.\d+)(?:%2C|,)(-?\d+\.\d+)/);
  const m3 = html.match(/@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/);
  for (const m of [m1, m2, m3]) {
    const p = m ? pair(m[1], m[2]) : null;
    if (p) {
      const t = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
      const name = t ? t[1].replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s*[-·]\s*Google Maps.*$/i, "").trim() : "";
      return { ...p, name: name === "Google Maps" ? "" : name };
    }
  }
  return null;
}

/** Tên kèm theo trong đoạn chữ chia sẻ: phần chữ nằm trước link (ô tìm một dòng có thể nuốt xuống dòng) */
export function nameBeforeUrl(text: string): string {
  const i = text.search(/https?:\/\//i);
  if (i <= 0) return "";
  return text.slice(0, i).replace(/\s+/g, " ").trim().slice(0, 120);
}
