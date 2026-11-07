import { useEffect, useRef, useState } from "react";
import * as L from "leaflet";
import Icon from "./Icon";
import MapPicker from "./MapPicker";
import { byDayTime, directionsUrl, hasPin } from "./geo";
import { createMap, pinIcon } from "./mapKit";
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

export default function TripMap({ trip, stops, onChange }: Props) {
  const days = tripDayCount(trip.startDate, trip.endDate);
  const [day, setDay] = useState(0); // 0 = tất cả các ngày
  const [pinning, setPinning] = useState<Stop | null>(null);

  const sorted = [...stops].sort(byDayTime);
  const pinned = sorted.filter(hasPin);
  const unpinned = sorted.filter((s) => !hasPin(s));
  const shown = day ? pinned.filter((s) => s.day === day) : pinned;

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
              onClick={() => setDay(d)}
            >
              {d === 0 ? "Tất cả" : "Ngày " + d}
            </button>
          ))}
        </div>
      )}

      {pinned.length > 0 ? (
        <MapView stops={shown} />
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

function MapView({ stops }: { stops: (Stop & { lat: number; lng: number })[] }) {
  const host = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

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
  const sig = stops.map((s) => [s.id, s.lat, s.lng, s.day, s.time, s.place, s.done].join("|")).join(";");
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
      if (list.length > 1) L.polyline(latlngs, { color, weight: 3, opacity: 0.7, dashArray: "6 8" }).addTo(layer);
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
      {stops.length > 1 && <div className="map-legend">Đường nét đứt nối thẳng các điểm theo giờ, không phải đường đi thực tế</div>}
    </div>
  );
}
