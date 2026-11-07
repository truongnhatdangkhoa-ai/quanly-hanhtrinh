import { useEffect, useRef, useState } from "react";
import * as L from "leaflet";
import Icon from "./Icon";
import MapPicker from "./MapPicker";
import { byDayTime, directionsUrl, hasPin } from "./geo";
import { createMap, pinIcon } from "./mapKit";
import { MAX_PREFETCH, planTiles, prefetchTiles } from "./offlineMap";
import { applyOrder, fmtKm, fmtMin, optimizeRoute, pathLen, roadRoute, type RouteInfo, type RouteLine, type RouteResult } from "./route";
import type { Stop, Trip } from "./types";
import { tripDayCount } from "./utils";

type Props = {
  trip: Trip;
  stops: Stop[];
  onChange: (next: Stop[]) => void; // danh sách điểm dừng của chuyến này
};

// Màu theo ngày lấy từ biến CSS --day-0..--day-5 (xoay vòng)
const dayIdx = (day: number) => (Math.max(1, day) - 1) % 6;

function popupEl(s: Stop & { lat: number; lng: number }): HTMLElement {
  // Dựng bằng DOM + textContent để tên địa điểm gõ tay không thể chèn mã HTML
  const box = document.createElement("div");
  box.className = "map-pop";
  const name = document.createElement("strong");
  name.textContent = s.place;
  const sub = document.createElement("span");
  sub.textContent = `Ngày ${s.day}${s.time ? " · " + s.time : ""}${s.done ? " · đã đến" : ""}`;
  const link = document.createElement("a");
  link.href = directionsUrl(s);
  link.target = "_blank";
  link.rel = "noreferrer";
  link.textContent = "Chỉ đường";
  box.append(name, sub, link);
  return box;
}

function useOnline() {
  const [on, setOn] = useState(navigator.onLine);
  useEffect(() => {
    const u = () => setOn(true);
    const d = () => setOn(false);
    window.addEventListener("online", u);
    window.addEventListener("offline", d);
    return () => {
      window.removeEventListener("online", u);
      window.removeEventListener("offline", d);
    };
  }, []);
  return on;
}

export default function TripMap({ trip, stops, onChange }: Props) {
  const days = tripDayCount(trip.startDate, trip.endDate);
  const [day, setDay] = useState(0); // 0 = tất cả các ngày
  const [pinning, setPinning] = useState<Stop | null>(null);
  const [plan, setPlan] = useState<{ order: Stop[]; times: string[]; result: RouteResult } | null>(null);
  const [dayRoute, setDayRoute] = useState<RouteInfo | null>(null);
  const [routing, setRouting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const online = useOnline();

  const sorted = [...stops].sort(byDayTime);
  const pinned = sorted.filter(hasPin);
  const unpinned = sorted.filter((s) => !hasPin(s));
  const shown = day ? pinned.filter((s) => s.day === day) : pinned; // đã theo thứ tự giờ hiện tại

  const pickDay = (d: number) => {
    setDay(d);
    setPlan(null);
    setNotice("");
  };

  // Quãng đường thật của ngày đang xem theo thứ tự hiện tại (cần mạng, không có thì giữ đường nét đứt)
  const routeKey = day && shown.length >= 2 ? shown.map((s) => `${s.id}:${s.lat},${s.lng}`).join("|") : "";
  useEffect(() => {
    setDayRoute(null);
    if (!routeKey) return;
    let alive = true;
    setRouting(true);
    roadRoute(shown)
      .then((r) => alive && setDayRoute(r))
      .catch(() => undefined)
      .finally(() => alive && setRouting(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey]);

  const optimize = async () => {
    setBusy(true);
    setNotice("");
    try {
      const r = await optimizeRoute(shown);
      if (r.order.every((v, i) => v === i)) setNotice("Thứ tự hiện tại đã là tuyến ngắn nhất tìm được.");
      else setPlan({ order: r.order.map((i) => shown[i]), times: shown.map((s) => s.time), result: r });
    } finally {
      setBusy(false);
    }
  };

  const applyPlan = () => {
    if (!plan) return;
    onChange(applyOrder(stops, plan.order, plan.times));
    setPlan(null);
    setNotice(`Đã sắp xếp lại ngày ${day}. Giờ được gán lại theo thứ tự mới.`);
  };

  const saved = plan && plan.result.duration !== null && dayRoute ? dayRoute.distance - plan.result.distance : 0;

  if (stops.length === 0) {
    return (
      <div className="tripmap-empty">
        <div className="empty-state">
          <div className="empty-art">
            <Icon name="map" size={40} stroke={1.6} />
          </div>
          <h2>Chưa có điểm dừng nào</h2>
          <p>Thêm điểm dừng ở tab Lịch trình. Điểm nào được ghim trên bản đồ sẽ hiện ở đây.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tripmap">
      {pinned.length > 0 && (
        <div className="daychips" role="tablist" aria-label="Lọc theo ngày">
          {[0, ...Array.from({ length: days }, (_, i) => i + 1)].map((d) => (
            <button
              key={d}
              role="tab"
              aria-selected={day === d}
              className={"chip" + (day === d ? " on" : "")}
              onClick={() => pickDay(d)}
            >
              {d === 0 ? "Tất cả" : "Ngày " + d}
            </button>
          ))}
        </div>
      )}

      {pinned.length >= 3 && day === 0 && (
        <div className="routebar">
          <span className="txt">Chọn một ngày để xem quãng đường và nhờ app gợi ý thứ tự đi hợp lý.</span>
        </div>
      )}
      {day !== 0 && shown.length >= 2 && (
        <div className="routebar">
          {plan ? (
            <>
              <span className="txt">
                <b>Tuyến gợi ý: {fmtKm(plan.result.distance)}</b>
                {plan.result.duration !== null ? ` · khoảng ${fmtMin(plan.result.duration)} lái xe` : " theo đường chim bay (chưa có mạng nên chỉ ước tính)"}
                {saved >= 300 && ` · ngắn hơn ${fmtKm(saved)} so với hiện tại`}
                <br />
                <span className="muted">Điểm đầu giữ nguyên làm nơi xuất phát. Chưa tính giờ mở cửa, giờ ăn, giờ nghỉ của bé.</span>
              </span>
              <button className="pill-btn solid" onClick={applyPlan}>
                <Icon name="check" size={16} stroke={2.4} /> Áp dụng
              </button>
              <button className="pill-btn" onClick={() => setPlan(null)}>
                Hủy
              </button>
            </>
          ) : (
            <>
              <span className="txt">
                {dayRoute ? (
                  <>
                    <b>{fmtKm(dayRoute.distance)}</b> · khoảng {fmtMin(dayRoute.duration)} lái xe · {shown.length} điểm
                    {dayRoute.cached && <span className="muted"> · dùng đường đã lưu từ lần có mạng</span>}
                  </>
                ) : routing ? (
                  "Đang tính quãng đường…"
                ) : (
                  <>
                    <b>≈ {fmtKm(pathLen(shown, shown.map((_, i) => i)))}</b> theo đường chim bay · {shown.length} điểm
                    <br />
                    <span className="muted">{online ? "Chưa lấy được đường bộ, thử lại sau." : "Đang offline nên chưa có quãng đường thật."}</span>
                  </>
                )}
                {notice && (
                  <>
                    <br />
                    <span className="muted">{notice}</span>
                  </>
                )}
              </span>
              {shown.length >= 3 && (
                <button className="pill-btn" onClick={optimize} disabled={busy}>
                  <Icon name="route" size={16} /> {busy ? "Đang tính…" : "Sắp xếp tuyến"}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {pinned.length > 0 ? (
        <MapView online={online} stops={plan ? plan.order : shown} line={plan ? plan.result.line : day ? dayRoute?.line ?? null : null} />
      ) : (
        <div className="tripmap-empty grow">
          <div className="empty-state">
            <div className="empty-art">
              <Icon name="pin" size={40} stroke={1.6} />
            </div>
            <h2>Chưa có điểm nào được ghim</h2>
            <p>Chạm vào tên điểm dừng bên dưới để chọn vị trí của nó trên bản đồ.</p>
          </div>
        </div>
      )}

      {unpinned.length > 0 && (
        <div className="unpinned">
          <div className="field-title">{unpinned.length} điểm chưa có vị trí, chạm để ghim</div>
          <div className="chip-row">
            {unpinned.map((s) => (
              <button key={s.id} className="chip soft" onClick={() => setPinning(s)}>
                <Icon name="pin" size={15} />
                <span className="ellipsis">{s.place}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {pinning && (
        <MapPicker
          destination={trip.destination}
          nearby={pinned}
          initialName={pinning.place}
          confirmLabel="Ghim điểm này"
          onClose={() => setPinning(null)}
          onPick={(p) => {
            // Giữ nguyên tên người dùng đã đặt, chỉ thêm tọa độ
            onChange(stops.map((s) => (s.id === pinning.id ? { ...s, lat: p.lat, lng: p.lng } : s)));
            setPinning(null);
          }}
        />
      )}
    </div>
  );
}

function MapView({ stops, line, online }: { stops: (Stop & { lat: number; lng: number })[]; line: RouteLine | null; online: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const [dl, setDl] = useState<{ done: number; total: number } | null>(null);
  const [dlMsg, setDlMsg] = useState("");
  const stopRef = useRef({ cancelled: false });
  useEffect(() => () => void (stopRef.current.cancelled = true), []);

  // Lưu sẵn các ô bản đồ quanh những điểm đang hiện để dùng khi mất sóng (giới hạn MAX_PREFETCH ô mỗi lần)
  const saveArea = async () => {
    const map = mapRef.current;
    if (!map || dl || stops.length === 0) return;
    const b = L.latLngBounds(stops.map((s) => [s.lat, s.lng] as L.LatLngTuple));
    b.extend([b.getSouth() - 0.006, b.getWest() - 0.006]);
    b.extend([b.getNorth() + 0.006, b.getEast() + 0.006]);
    const area = b.pad(0.25);
    const z0 = Math.min(16, map.getBoundsZoom(area));
    const tiles = planTiles(area, z0);
    setDlMsg("");
    setDl({ done: 0, total: tiles.length });
    stopRef.current.cancelled = false;
    const r = await prefetchTiles(tiles, (done, total) => setDl({ done, total }), stopRef.current);
    setDl(null);
    setDlMsg(
      r.failed > tiles.length / 2
        ? "Chưa lưu được, kiểm tra kết nối mạng rồi thử lại."
        : `Đã lưu bản đồ khu vực này (${r.saved + r.had} ô${r.failed ? ", " + r.failed + " ô lỗi" : ""}). Mất sóng vẫn xem được.`,
    );
  };

  useEffect(() => {
    if (!host.current) return;
    const map = createMap(host.current);
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  // Vẽ lại ghim khi danh sách đổi; dùng chữ ký để không vẽ lại (và đóng bong bóng thông tin) mỗi lần render
  const sig =
    stops.map((s) => [s.id, s.lat, s.lng, s.day, s.time, s.place, s.done].join("|")).join(";") +
    "#" +
    (line ? line.length + ":" + line[0]?.join(",") : "");
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    const css = getComputedStyle(document.documentElement);
    const pts: L.LatLngTuple[] = [];

    const byDay = new Map<number, typeof stops>();
    for (const s of stops) byDay.set(s.day, [...(byDay.get(s.day) ?? []), s]);

    byDay.forEach((list, d) => {
      const i = dayIdx(d);
      const color = css.getPropertyValue("--day-" + i).trim() || css.getPropertyValue("--accent").trim();
      const latlngs = list.map((s) => [s.lat, s.lng] as L.LatLngTuple);
      if (line) L.polyline(line, { color, weight: 5, opacity: 0.8 }).addTo(layer); // đường bộ thật
      else if (list.length > 1) L.polyline(latlngs, { color, weight: 3, opacity: 0.7, dashArray: "6 8" }).addTo(layer);
      list.forEach((s, n) => {
        L.marker([s.lat, s.lng], {
          icon: pinIcon({ label: String(n + 1), cls: "d" + i + (s.done ? " done" : "") }),
          title: s.place,
        })
          .bindPopup(popupEl(s))
          .addTo(layer);
        pts.push([s.lat, s.lng]);
      });
    });

    if (pts.length === 1) map.setView(pts[0], 15);
    else if (pts.length > 1) map.fitBounds(L.latLngBounds(pts), { padding: [48, 48], maxZoom: 16 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  return (
    <div className="tripmap-canvas">
      <div ref={host} className="map-canvas" />
      {!online && (
        <div className="map-note">Đang offline: bản đồ chỉ hiện các khu vực đã xem hoặc đã lưu. Ghim và đường nét đứt vẫn dùng được.</div>
      )}
      {online && (
      <button type="button" className="map-dl" onClick={() => void saveArea()} disabled={!!dl} title={"Lưu bản đồ khu vực này (tối đa " + MAX_PREFETCH + " ô)"}>
        <Icon name="download" size={16} />
        {dl ? `Đang lưu ${dl.done}/${dl.total}` : "Lưu bản đồ offline"}
      </button>
      )}
      {dlMsg && !dl && (
        <button type="button" className="map-dlmsg" onClick={() => setDlMsg("")}>
          {dlMsg}
        </button>
      )}
      {stops.length > 1 && (
        <div className="map-legend">
          {line ? "Đường bộ ước tính cho ô tô" : "Đường nét đứt nối thẳng các điểm theo thứ tự, không phải đường đi thực tế"}
        </div>
      )}
    </div>
  );
}
