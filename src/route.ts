import { getJson, type LatLng } from "./geo";
import type { Stop } from "./types";

// Tính đường đi và gợi ý thứ tự ghé các điểm.
// Có mạng: dùng OSRM (máy chủ công cộng, miễn phí) để lấy đường bộ thật cho ô tô.
// Không có mạng hoặc máy chủ bận: tự tính theo đường chim bay (thuật toán gần nhất + 2-opt) ngay trên máy.

const OSRM = "https://router.project-osrm.org";
const MAX_TRIP_POINTS = 12; // gợi ý tối ưu tối đa ngần này điểm qua OSRM
const MAX_ROUTE_POINTS = 25;

export type RouteLine = [number, number][]; // [vĩ độ, kinh độ]
export type RouteInfo = { distance: number; duration: number; line: RouteLine }; // mét, giây
export type RouteResult = { order: number[]; distance: number; duration: number | null; line: RouteLine | null };

const coordStr = (pts: LatLng[]) => pts.map((p) => `${p.lng.toFixed(6)},${p.lat.toFixed(6)}`).join(";");
const flip = (c: [number, number][]): RouteLine => c.map(([lng, lat]) => [lat, lng]);

type OsrmGeom = { coordinates: [number, number][] };

// Đường đi thật theo đúng thứ tự các điểm đưa vào
export async function roadRoute(pts: LatLng[]): Promise<RouteInfo> {
  if (pts.length < 2 || pts.length > MAX_ROUTE_POINTS) throw new Error("số điểm không hợp lệ");
  const d = await getJson<{ code: string; routes?: { distance: number; duration: number; geometry: OsrmGeom }[] }>(
    `${OSRM}/route/v1/driving/${coordStr(pts)}?overview=full&geometries=geojson`,
  );
  const r = d.routes?.[0];
  if (d.code !== "Ok" || !r) throw new Error("không có đường đi");
  return { distance: r.distance, duration: r.duration, line: flip(r.geometry.coordinates) };
}

async function osrmTrip(pts: LatLng[]): Promise<RouteResult> {
  // Điểm đầu giữ nguyên làm điểm xuất phát, điểm cuối để máy chủ tự chọn
  const d = await getJson<{
    code: string;
    trips?: { distance: number; duration: number; geometry: OsrmGeom }[];
    waypoints?: { waypoint_index: number }[];
  }>(`${OSRM}/trip/v1/driving/${coordStr(pts)}?source=first&destination=any&roundtrip=false&overview=full&geometries=geojson`);
  const t = d.trips?.[0];
  if (d.code !== "Ok" || !t || !d.waypoints || d.waypoints.length !== pts.length) throw new Error("không tối ưu được");
  const order: number[] = new Array(pts.length);
  d.waypoints.forEach((w, i) => {
    order[w.waypoint_index] = i;
  });
  for (let i = 0; i < pts.length; i++) if (order[i] === undefined) throw new Error("kết quả không hợp lệ"); // mảng thưa: some() sẽ bỏ qua ô trống
  if (order[0] !== 0) throw new Error("kết quả không hợp lệ");
  return { order, distance: t.distance, duration: t.duration, line: flip(t.geometry.coordinates) };
}

/* ───────────── Tự tính tại chỗ (đường chim bay) ───────────── */

const rad = (x: number) => (x * Math.PI) / 180;
export function haversine(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 12742000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

function pathLen(pts: LatLng[], order: number[]): number {
  let s = 0;
  for (let i = 1; i < order.length; i++) s += haversine(pts[order[i - 1]], pts[order[i]]);
  return s;
}

function localOrder(pts: LatLng[]): number[] {
  const n = pts.length;
  const order = [0];
  const left = new Set<number>();
  for (let i = 1; i < n; i++) left.add(i);
  while (left.size) {
    const last = pts[order[order.length - 1]];
    let best = -1;
    let bd = Infinity;
    left.forEach((j) => {
      const d = haversine(last, pts[j]);
      if (d < bd) {
        bd = d;
        best = j;
      }
    });
    order.push(best);
    left.delete(best);
  }
  // 2-opt cho đường đi hở, điểm đầu cố định
  let improved = true;
  for (let pass = 0; improved && pass < 50; pass++) {
    improved = false;
    for (let i = 1; i < n - 1; i++) {
      for (let k = i + 1; k < n; k++) {
        const a = pts[order[i - 1]];
        const b = pts[order[i]];
        const c = pts[order[k]];
        const d = k + 1 < n ? pts[order[k + 1]] : null;
        const before = haversine(a, b) + (d ? haversine(c, d) : 0);
        const after = haversine(a, c) + (d ? haversine(b, d) : 0);
        if (after < before - 1) {
          order.splice(i, k - i + 1, ...order.slice(i, k + 1).reverse());
          improved = true;
        }
      }
    }
  }
  return order;
}

// pts[0] là điểm xuất phát (giữ nguyên). Trả về thứ tự mới dưới dạng chỉ số của pts.
export async function optimizeRoute(pts: LatLng[]): Promise<RouteResult> {
  if (pts.length >= 3 && pts.length <= MAX_TRIP_POINTS) {
    try {
      return await osrmTrip(pts);
    } catch {
      /* offline hoặc máy chủ bận: tính tại chỗ */
    }
  }
  const order = pts.length >= 3 ? localOrder(pts) : pts.map((_, i) => i);
  return { order, distance: pathLen(pts, order), duration: null, line: null };
}

// Áp thứ tự mới cho các điểm của một ngày. Các "khung giờ" cũ được giữ và gán lại theo thứ tự mới
// (điểm thứ i trong tuyến mới nhận khung giờ thứ i), các điểm khác của chuyến giữ nguyên.
export function applyOrder(all: Stop[], newOrder: Stop[], times: string[]): Stop[] {
  const updated = newOrder.map((s, i) => ({ ...s, time: times[i] ?? "" }));
  const ids = new Set(newOrder.map((s) => s.id));
  let k = 0;
  return all.map((s) => (ids.has(s.id) ? updated[k++] : s));
}

export const fmtKm = (m: number) => (m < 1000 ? Math.round(m) + " m" : (m / 1000).toFixed(m < 10000 ? 1 : 0).replace(".", ",") + " km");

export const fmtMin = (sec: number) => {
  const m = Math.max(1, Math.round(sec / 60));
  return m < 60 ? m + " phút" : `${Math.floor(m / 60)} giờ${m % 60 ? " " + (m % 60) + " phút" : ""}`;
};
