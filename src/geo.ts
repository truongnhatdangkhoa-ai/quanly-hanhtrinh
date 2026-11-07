import type { Stop } from "./types";

// Tìm địa điểm / đổi tọa độ thành tên bằng Nominatim (OpenStreetMap), miễn phí, không cần khóa API.
// Quy định của Nominatim: tối đa 1 yêu cầu/giây, chỉ tìm khi người dùng bấm tìm (không tự gợi ý khi đang gõ).

export type LatLng = { lat: number; lng: number };
export type Place = LatLng & { name: string; address: string };
export type Bounds = { west: number; south: number; east: number; north: number };

const NOMINATIM = "https://nominatim.openstreetmap.org";

export const hasPin = <T extends { lat?: number; lng?: number }>(s: T): s is T & LatLng =>
  typeof s.lat === "number" && typeof s.lng === "number" && isFinite(s.lat) && isFinite(s.lng);

export const coordsText = (p: LatLng) => `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`;

// Chỉ đường bằng Google Maps tới đúng tọa độ đã ghim
export const directionsUrl = (p: LatLng) =>
  `https://www.google.com/maps/dir/?api=1&destination=${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;

export const byDayTime = (a: Stop, b: Stop) =>
  a.day - b.day || (a.time || "99:99").localeCompare(b.time || "99:99");

type NomItem = {
  lat?: string;
  lon?: string;
  name?: string;
  display_name?: string;
  address?: Record<string, string>;
  error?: string;
};

function nameOf(it: NomItem): string {
  if (it.name && it.name.trim()) return it.name.trim();
  const a = it.address ?? {};
  const road = a.road || a.pedestrian || a.footway || a.path;
  if (road) return [a.house_number, road].filter(Boolean).join(" ");
  const area = a.suburb || a.village || a.town || a.city || a.county || a.state;
  if (area) return area;
  return (it.display_name ?? "").split(", ")[0] || "";
}

function toPlace(it: NomItem): Place | null {
  const lat = Number(it.lat);
  const lng = Number(it.lon);
  if (!isFinite(lat) || !isFinite(lng)) return null;
  const name = nameOf(it);
  const parts = (it.display_name ?? "").split(", ");
  // Địa chỉ = phần còn lại của tên đầy đủ, bỏ đoạn đầu nếu nó chính là tên
  const address = (parts[0] === name ? parts.slice(1) : parts).join(", ");
  return { name, address, lat, lng };
}

// fetch có giới hạn thời gian (CapacitorHttp có thể bỏ qua AbortSignal nên dùng race)
function getJson<T>(url: string): Promise<T> {
  const timeout = new Promise<never>((_, rej) => window.setTimeout(() => rej(new Error("timeout")), 12000));
  const req = fetch(url, { headers: { Accept: "application/json" } }).then((r) => {
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json() as Promise<T>;
  });
  return Promise.race([req, timeout]);
}

// Xếp hàng các yêu cầu, cách nhau tối thiểu ~1,1 giây
let chain: Promise<unknown> = Promise.resolve();
let lastCall = 0;
function throttled<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(async () => {
    const wait = lastCall + 1100 - Date.now();
    if (wait > 0) await new Promise((r) => window.setTimeout(r, wait));
    lastCall = Date.now();
    return fn();
  });
  chain = run.catch(() => undefined);
  return run;
}

export function searchPlaces(q: string, near?: Bounds): Promise<Place[]> {
  const params = new URLSearchParams({
    format: "jsonv2",
    q,
    limit: "6",
    addressdetails: "1",
    "accept-language": "vi",
  });
  // Ưu tiên (không bắt buộc) kết quả trong khung bản đồ đang xem
  if (near) params.set("viewbox", `${near.west},${near.north},${near.east},${near.south}`);
  return throttled(() => getJson<NomItem[]>(`${NOMINATIM}/search?${params}`)).then((rows) =>
    rows.map(toPlace).filter((p): p is Place => p !== null),
  );
}

export function reversePlace(ll: LatLng): Promise<Place | null> {
  const params = new URLSearchParams({
    format: "jsonv2",
    lat: String(ll.lat),
    lon: String(ll.lng),
    zoom: "18",
    addressdetails: "1",
    "accept-language": "vi",
  });
  return throttled(() => getJson<NomItem>(`${NOMINATIM}/reverse?${params}`)).then((it) =>
    it.error ? null : toPlace({ ...it, lat: String(ll.lat), lon: String(ll.lng) }),
  );
}
